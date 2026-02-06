from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from ibkr_client import IBKRFlexClient, load_config
from parser import parse_ibkr_xml
import os
import numpy as np
import json
from datetime import datetime
import pandas as pd
from typing import Optional

app = FastAPI(title="IBKR Flex Analytics API")

# Enable CORS for frontend development
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_user_dir(user_id: str):
    base_dir = "users"
    user_dir = os.path.join(base_dir, user_id)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

@app.get("/")
async def root():
    return {"message": "IBKR Flex Analytics API is running"}

@app.get("/health")
async def health_check():
    print("Health check received")
    return {"status": "healthy"}

@app.get("/config")
async def get_account_config(x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-ID header is required")
    
    try:
        user_dir = get_user_dir(x_user_id)
        config_path = os.path.join(user_dir, "config.json")
        
        if not os.path.exists(config_path):
             return {
                "query_id": "",
                "token_masked": ""
            }
            
        config = load_config(config_path)
        # Return masked token for security
        token = config.get("token", "")
        masked_token = token[:4] + "*" * (len(token) - 8) + token[-4:] if len(token) > 8 else "****"
        return {
            "query_id": config.get("query_id", ""),
            "token_masked": masked_token
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/config")
async def update_config(new_config: dict, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-ID header is required")
        
    try:
        if "token" not in new_config or "query_id" not in new_config:
            raise HTTPException(status_code=400, detail="Missing token or query_id")
        
        user_dir = get_user_dir(x_user_id)
        config_path = os.path.join(user_dir, "config.json")
        
        # Load current config to merge or just overwrite
        config = {
            "token": str(new_config["token"]),
            "query_id": str(new_config["query_id"])
        }
        
        with open(config_path, "w") as f:
            json.dump(config, f, indent=4)
            
        return {"status": "success", "message": "Configuration updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync")
async def sync_report(x_user_id: Optional[str] = Header(None)):
    """Trigger a new report and fetch it."""
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-ID header is required")
        
    try:
        user_dir = get_user_dir(x_user_id)
        config_path = os.path.join(user_dir, "config.json")
        
        if not os.path.exists(config_path):
            raise HTTPException(status_code=404, detail="Configuration not found for this user. Please set it up first.")
            
        config = load_config(config_path)
        client = IBKRFlexClient(config["token"], config["query_id"])
        
        ref_code = client.trigger_report()
        xml_report = client.get_report(ref_code)
        
        # Save for debugging/caching in user directory
        report_path = os.path.join(user_dir, "last_report.xml")
        with open(report_path, "w") as f:
            f.write(xml_report)
            
        results, last_update, summary = parse_ibkr_xml(xml_report)
        
        # Convert DataFrames to dicts for JSON serialization
        serializable_results = {}
        for section, df in results.items():
            if not df.empty:
                # Replace NaN with None for JSON compliance
                df_clean = df.replace({np.nan: None, np.inf: None, -np.inf: None})
                serializable_results[section] = df_clean.to_dict(orient="records")
            else:
                serializable_results[section] = []
        
        # Save local sync time in user directory
        last_sync = datetime.now().isoformat()
        sync_state_path = os.path.join(user_dir, "sync_state.json")
        with open(sync_state_path, "w") as f:
            json.dump({"last_sync": last_sync}, f)
                
        # Clean summary dict for NaNs
        import math
        clean_summary = {}
        for k, v in summary.items():
            if isinstance(v, (float, np.floating)) and (np.isnan(v) or np.isinf(v)):
                clean_summary[k] = 0.0
            else:
                clean_summary[k] = v

        return {
            "status": "success",
            "data": serializable_results,
            "summary": clean_summary,
            "last_report_generated": last_update,
            "last_sync": last_sync
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/latest")
async def get_latest_report(x_user_id: Optional[str] = Header(None)):
    """Load the last saved report from file."""
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-ID header is required")
        
    user_dir = get_user_dir(x_user_id)
    report_path = os.path.join(user_dir, "last_report.xml")
    
    if not os.path.exists(report_path):
        return {"status": "error", "message": "No report found. Please sync first."}
        
    try:
        with open(report_path, "r") as f:
            xml_report = f.read()
            
        results, last_update, summary = parse_ibkr_xml(xml_report)
        
        serializable_results = {}
        for section, df in results.items():
            if not df.empty:
                # Replace NaN with None for JSON compliance
                df_clean = df.replace({np.nan: None, np.inf: None, -np.inf: None})
                serializable_results[section] = df_clean.to_dict(orient="records")
            else:
                serializable_results[section] = []
        
        # Load last sync time if exists
        last_sync = None
        sync_state_path = os.path.join(user_dir, "sync_state.json")
        if os.path.exists(sync_state_path):
            try:
                with open(sync_state_path, "r") as f:
                    last_sync = json.load(f).get("last_sync")
            except:
                pass
        
        # Fallback to the file's modification time if not in sync_state.json or file missing
        if not last_sync:
            mtime = os.path.getmtime(report_path)
            last_sync = datetime.fromtimestamp(mtime).isoformat()

        # Clean summary dict for NaNs
        import math
        clean_summary = {}
        for k, v in summary.items():
            if isinstance(v, (float, np.floating)) and (np.isnan(v) or np.isinf(v)):
                clean_summary[k] = 0.0
            else:
                clean_summary[k] = v

        return {
            "status": "success",
            "data": serializable_results,
            "summary": clean_summary,
            "last_report_generated": last_update,
            "last_sync": last_sync
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    # In production (Docker), we don't want reload=True by default
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=reload)
