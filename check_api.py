
import requests
import json
import os

# Assume API is running on localhost:8000
API_URL = "http://localhost:8000"

def get_token():
    # Login to get token
    # This requires a valid user. I'll check if I can use an existing user or need to register one.
    # For now, I'll try to use the 'latest' endpoint directly if it doesn't require auth...
    # Wait, the endpoint IS protected.
    
    # Let's try to read the token from the frontend's localStorage if possible, but I can't do that easily from python.
    # I'll check if there is a way to get a token or if I can just mock the function.
    
    # Actually, `api.py` has a dependency `get_current_user`.
    # I can temporarily disable auth in `api.py` or just register a new user in this script.
    
    return register_and_login()

def register_and_login():
    session = requests.Session()
    username = "test_user_trades"
    password = "StrongPassword123!"
    
    # Register
    try:
        res = session.post(f"{API_URL}/auth/register", json={"username": username, "password": password})
    except Exception as e:
        print(f"Error registering: {e}")

    # Login
    res = session.post(f"{API_URL}/auth/login", data={"username": username, "password": password})
    if res.status_code == 200:
        return res.json()["access_token"]
    else:
        print(f"Login failed: {res.text}")
        return None

def check_trades():
    token = get_token()
    if not token:
        print("Could not get token.")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # First, need to ensure there is a report. 
    # Since I don't have IBKR creds, I might not be able to sync.
    # But maybe there is already a `last_report.xml` in the user directory?
    # I'll check the 'latest' endpoint.
    
    res = requests.get(f"{API_URL}/latest", headers=headers)
    
    if res.status_code == 200:
        data = res.json()
        print("Keys in data:", data.get("data", {}).keys())
        if "Trades" in data.get("data", {}):
            print(f"Trades count: {len(data['data']['Trades'])}")
            if len(data['data']['Trades']) > 0:
                print("First trade sample:", data['data']['Trades'][0])
        else:
            print("'Trades' key not found in data.")
            
    else:
        print(f"Failed to get latest report: {res.status_code} {res.text}")

if __name__ == "__main__":
    check_trades()
