import xmltodict
import pandas as pd
import io

def parse_ibkr_xml(xml_content):
    """
    Parses IBKR Flex Query XML and returns a dictionary of DataFrames for different sections.
    """
    data_dict = xmltodict.parse(xml_content)
    
    # The structure usually has FlexStatements -> FlexStatement
    if "FlexQueryResponse" not in data_dict or "FlexStatements" not in data_dict["FlexQueryResponse"]:
        return {}, None, {}
    
    statements = data_dict["FlexQueryResponse"]["FlexStatements"].get("FlexStatement", [])
    
    # Ensure statements is always a list
    if not isinstance(statements, list):
        statements = [statements]
    
    print(f"Debug: Found {len(statements)} statement(s).")
    
    # Dictionary to collect list of DataFrames for each section
    collected_data = {
        "Trades": [],
        "CashTransactions": [],
        "OpenPositions": [],
        "ChangeInDividendAccruals": [],
        "CashReport": [],
        "EquitySummaryInBase": [],
        "FIFOPerformanceSummaryInBase": []
    }
    
    sections_to_extract = list(collected_data.keys())

    for statement in statements:
        # acct_id = statement.get('@accountId')
        # print(f"Debug: Processing statement for account {acct_id}")
        
        for section in sections_to_extract:
            if section in statement and statement[section] is not None:
                # Handle the inner tag name (e.g. Trades -> Trade, OpenPositions -> OpenPosition)
                tag_name = section[:-1]
                if section == "Trades": tag_name = "Trade"
                if section == "CashTransactions": tag_name = "CashTransaction"
                if section == "ChangeInDividendAccruals": tag_name = "ChangeInDividendAccrual"
                if section == "CashReport": tag_name = "CashReportCurrency"
                if section == "EquitySummaryInBase": tag_name = "EquitySummaryByReportDateInBase"
                if section == "FIFOPerformanceSummaryInBase": tag_name = "FIFOPerformanceSummaryUnderlying"

                section_data = statement[section]
                if isinstance(section_data, dict):
                    items = section_data.get(tag_name, [])
                    # Handle single item vs list
                    if isinstance(items, dict):
                        items = [items]
                    if items:
                        collected_data[section].append(pd.DataFrame(items))
    
    # Extract metadata - use @reportDate (the date the data corresponds to)
    # instead of @whenGenerated (when the report was created)
    last_update = None
    if statements:
        # Try to find @reportDate from the first statement
        for s in statements:
            # @reportDate is typically in the statement attributes
            last_update = s.get('@toDate') or s.get('@reportDate')
            if last_update:
                break
    
    # Fallback: check at the root level
    if not last_update:
        flex_response = data_dict.get("FlexQueryResponse", {})
        last_update = flex_response.get("@toDate") or flex_response.get("@reportDate")

    results = {}
    for section, df_list in collected_data.items():
        if df_list:
            results[section] = pd.concat(df_list, ignore_index=True)
        else:
            results[section] = pd.DataFrame()

    # --- Calculate Portfolio Summary ---
    summary = {
        "total_equity": 0.0,
        "estimated_cash": 0.0,
        "total_unrealized_pnl": 0.0,
        "total_realized_pnl": 0.0,
        "total_position_value": 0.0,
        "dividend_accruals": 0.0,
        "top_positions": [],
        "change_vs_last": 0.0 # Placeholder
    }

    if not results["OpenPositions"].empty:
        df = results["OpenPositions"]
        
        # Ensure numeric columns
        cols_to_numeric = ["@positionValue", "@percentOfNAV", "@fifoPnlUnrealized", "@costBasisMoney"]
        for col in cols_to_numeric:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
        
        # Use Market Value ("@positionValue") instead of Cost Basis
        total_pos_value = df["@positionValue"].sum()
        total_pnl = df["@fifoPnlUnrealized"].sum()
        
        # Calculate Real Cash from CashReport
        total_cash = 0.0
        if not results["CashReport"].empty:
            cash_df = results["CashReport"]
            # Filter for base summary to avoid double counting if multiple entries exist, or just sum 'endingCash'
            # Usually strict base currency summary has currency="BASE_SUMMARY"
            base_cash_rows = cash_df[cash_df["@currency"] == "BASE_SUMMARY"]
            if not base_cash_rows.empty:
                # Use endingCash from the summary row
                total_cash = pd.to_numeric(base_cash_rows["@endingCash"], errors='coerce').sum()
            else:
                # Fallback: sum all endingCash if BASE_SUMMARY not explicitly found (rare for base report)
                 total_cash = pd.to_numeric(cash_df["@endingCash"], errors='coerce').sum()
        else:
             # Fallback to old estimation if CashReport is missing for some reason
            total_nav_pct = df["@percentOfNAV"].sum()
            if total_nav_pct > 0:
                 estimated_equity = total_pos_value / (total_nav_pct / 100.0)
                 total_cash = estimated_equity - total_pos_value

        # Calculate Dividend Accruals
        total_dividend_accruals = 0.0
        if not results["EquitySummaryInBase"].empty:
            eq_df = results["EquitySummaryInBase"]
            if "@dividendAccruals" in eq_df.columns:
                eq_df["@dividendAccruals"] = pd.to_numeric(eq_df["@dividendAccruals"], errors='coerce').fillna(0.0)
                
                # We need the LATEST entry for EACH account
                # Assuming 'accountId' is present. If not, we might take the global latest if it's one account.
                if "@accountId" in eq_df.columns and "@reportDate" in eq_df.columns:
                    # Sort by date desc
                    eq_df = eq_df.sort_values(by="@reportDate", ascending=False)
                    # Drop duplicates by accountId, keeping first (latest)
                    latest_eq = eq_df.drop_duplicates(subset=["@accountId"])
                    total_dividend_accruals = latest_eq["@dividendAccruals"].sum()
                else:
                    # Fallback: just take the last row's dividend accruals if structure implies sequence
                    # Or sum if it's somehow split. Safe bet is finding unique latest report.
                    pass
        
        # Calculate Realized PnL per symbol and Overall
        total_realized_pnl = 0.0
        realized_pnl_map = {}
        if not results["FIFOPerformanceSummaryInBase"].empty:
            fifo_df = results["FIFOPerformanceSummaryInBase"]
            # Extract per-symbol realized PnL
            if "@totalRealizedPnl" in fifo_df.columns and "@symbol" in fifo_df.columns:
                symbol_rows = fifo_df[fifo_df["@symbol"].notna() & (fifo_df["@symbol"] != "")]
                if not symbol_rows.empty:
                    symbol_pnl = symbol_rows.copy()
                    symbol_pnl["@totalRealizedPnl"] = pd.to_numeric(symbol_pnl["@totalRealizedPnl"], errors='coerce').fillna(0.0)
                    # Strip symbols and convert to uppercase for consistency
                    symbol_pnl["@symbol"] = symbol_pnl["@symbol"].astype(str).str.strip().str.upper()
                    realized_pnl_map = symbol_pnl.groupby("@symbol")["@totalRealizedPnl"].sum().to_dict()
            
            # Extract Overall Total
            if "@description" in fifo_df.columns and "@totalRealizedPnl" in fifo_df.columns:
                total_rows = fifo_df[fifo_df["@description"] == "Total (All Assets)"]
                if not total_rows.empty:
                    total_realized_pnl = pd.to_numeric(total_rows["@totalRealizedPnl"], errors='coerce').sum()

        # Merge Realized PnL into OpenPositions
        if "OpenPositions" in results and not results["OpenPositions"].empty:
            # We must modify results["OpenPositions"] directly to be sure it persists
            results["OpenPositions"]["realized_pnl"] = 0.0 # Initialize
            if "@symbol" in results["OpenPositions"].columns:
                # Create a normalized symbol column for mapping
                symbols_norm = results["OpenPositions"]["@symbol"].astype(str).str.strip().str.upper()
                results["OpenPositions"]["realized_pnl"] = symbols_norm.map(realized_pnl_map).fillna(0.0)
                
                # Update our local 'df' reference if needed (it should already be updated)
                df = results["OpenPositions"]

        total_equity = total_pos_value + total_cash + total_dividend_accruals

        summary["total_equity"] = float(round(total_equity, 2))
        summary["estimated_cash"] = float(round(total_cash, 2))
        summary["total_unrealized_pnl"] = float(round(total_pnl, 2))
        summary["total_realized_pnl"] = float(round(total_realized_pnl, 2))
        summary["total_position_value"] = float(round(total_pos_value, 2))
        summary["dividend_accruals"] = float(round(total_dividend_accruals, 2))
        
        # Get top 5 positions by value
        df_sorted = df.sort_values(by="@positionValue", ascending=False).head(5)
        top_positions = []
        for _, row in df_sorted.iterrows():
            top_positions.append({
                "symbol": row.get("@symbol", "Unknown"),
                "value": float(round(row.get("@positionValue", 0), 2)),
                "pnl": float(round(row.get("@fifoPnlUnrealized", 0), 2)),
                "realized_pnl": float(round(row.get("realized_pnl", 0), 2)),
                "allocation": float(round(row.get("@percentOfNAV", 0), 2))
            })
        summary["top_positions"] = top_positions

    # Ensure all numeric values in summary are JSON-safe
    import math
    import numpy as np

    def make_json_safe(obj):
        if isinstance(obj, dict):
            return {k: make_json_safe(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [make_json_safe(item) for item in obj]
        elif isinstance(obj, (float, np.floating)):
            if math.isnan(obj) or math.isinf(obj):
                return 0.0
            return float(obj)
        return obj

    summary = make_json_safe(summary)

    return results, last_update, summary

def flat_print_report(results):
    for section, df in results.items():
        print(f"\n=== {section} ===")
        if not df.empty:
            # Show top 10 if too large
            print(df.head(10).to_string())
        else:
            print("No data available in this section.")
