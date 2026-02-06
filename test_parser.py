from parser import parse_ibkr_xml
import os
import pandas as pd

if __name__ == "__main__":
    if os.path.exists("last_report.xml"):
        with open("last_report.xml", "r") as f:
            xml_report = f.read()
        results, last_update, summary = parse_ibkr_xml(xml_report)
        print(f"Last update: {last_update}")
        print("\n=== Portfolio Summary ===")
        print(summary)
        
        if "OpenPositions" in results and not results["OpenPositions"].empty:
            df = results["OpenPositions"]
            print("\n=== OpenPositions Columns ===")
            print(df.columns.tolist())
            print(f"\nTotal Rows: {len(df)}")
            print("\nSample Data (First Row):")
            print(df.iloc[0].to_dict())
        else:
            print("OpenPositions section not found or empty.")
    else:
        print("last_report.xml not found")
