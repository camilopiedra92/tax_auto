import requests
import xmltodict
import time
import os
import json

class IBKRFlexClient:
    def __init__(self, token, query_id):
        self.token = token
        self.query_id = query_id
        self.base_url = "https://www.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest"
        self.fetch_url = "https://www.interactivebrokers.com/Universal/servlet/FlexStatementService.GetStatement"

    def trigger_report(self):
        """Step 1: Request the report generation."""
        params = {
            "t": self.token,
            "q": self.query_id,
            "v": "3" # API Version
        }
        # Hide most of the token for security but show everything else
        masked_token = self.token[:4] + "*" * (len(self.token) - 8) + self.token[-4:] if len(self.token) > 8 else "****"
        print(f"Triggering report...")
        print(f"  - Query ID: {self.query_id}")
        print(f"  - Token (masked): {masked_token}")
        
        response = requests.get(self.base_url, params=params)
        
        if response.status_code != 200:
            raise Exception(f"HTTP Error {response.status_code}: {response.text}")
        
        try:
            data = xmltodict.parse(response.text)
        except Exception:
            raise Exception(f"Failed to parse IBKR response: {response.text}")

        if "FlexStatementResponse" in data:
            status = data["FlexStatementResponse"].get("Status")
            if status == "Success":
                return data["FlexStatementResponse"]["ReferenceCode"]
            else:
                error_msg = data["FlexStatementResponse"].get("ErrorMessage", "Unknown error")
                error_code = data["FlexStatementResponse"].get("ErrorCode", "No code")
                print(f"IBKR Error Code: {error_code}")
                if "test" in str(self.query_id).lower():
                    print("TIP: Your Query ID seems to be 'test'. IBKR Query IDs are usually numbers (e.g., 854321).")
                raise Exception(f"IBKR Error: {error_msg}")
        else:
            raise Exception(f"Unexpected response format: {response.text}")

    def get_report(self, reference_code, max_retries=5, delay=5):
        """Step 2: Fetch the generated report using the reference code."""
        params = {
            "t": self.token,
            "q": reference_code,
            "v": "3"
        }
        
        for i in range(max_retries):
            print(f"Fetching report (attempt {i+1}/{max_retries})...")
            response = requests.get(self.fetch_url, params=params)
            
            if response.status_code != 200:
                print(f"Wait for report generation... ({response.status_code})")
                time.sleep(delay)
                continue
            
            # The response could be XML with an error or the actual report
            try:
                data = xmltodict.parse(response.text)
                if "FlexStatementResponse" in data and data["FlexStatementResponse"]["Status"] == "Warn":
                    print(f"Report not ready yet: {data['FlexStatementResponse']['ErrorMessage']}")
                    time.sleep(delay)
                    continue
                return response.text
            except Exception:
                # If it's not valid XML error, it might be the actual report (which is also XML but different structure)
                return response.text
                
        raise Exception("Timeout waiting for report generation.")

def load_config(config_path="config.json"):
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config file not found at {config_path}. Please create it based on config.json.example")
    with open(config_path, 'r') as f:
        return json.load(f)
