import sys
from ibkr_client import IBKRFlexClient, load_config
from parser import parse_ibkr_xml, flat_print_report

def main():
    try:
        config = load_config()
    except FileNotFoundError as e:
        print(e)
        sys.exit(1)

    client = IBKRFlexClient(config["token"], config["query_id"])
    
    try:
        ref_code = client.trigger_report()
        xml_report = client.get_report(ref_code)
        
        # Save XML for debugging if needed
        with open("last_report.xml", "w") as f: 
            f.write(xml_report)
        print("Debug: Raw XML saved to 'last_report.xml'")
        
        results = parse_ibkr_xml(xml_report)
        flat_print_report(results)
        
    except Exception as e:
        import traceback
        print(f"Error during execution: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
