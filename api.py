from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import os
import json
import numpy as np
import pandas as pd
from ibkr_client import IBKRFlexClient, load_config
from parser import parse_ibkr_xml
from database import (
    create_user, 
    get_user_by_username, 
    update_user_profile, 
    update_user_password,
    get_user_preferences,
    update_user_preferences
)
from auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    get_current_user, 
    validate_password_strength,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    Token
)

# --- App Setup ---
app = FastAPI(title="IBKR Flex Analytics API")

# Enable CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- User Directory Management ---
def get_user_dir(user_id: str):
    base_dir = "users"
    user_dir = os.path.join(base_dir, user_id)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

# --- Models ---
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserProfileUpdate(BaseModel):
    email: Optional[str] = None
    display_name: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    default_currency: Optional[str] = None

# --- Auth Endpoints ---
@app.post("/auth/register")
async def register(user: UserCreate):
    # Validate password strength
    password_error = validate_password_strength(user.password)
    if password_error:
        raise HTTPException(
            status_code=400, 
            detail=password_error
        )
    
    hashed_password = get_password_hash(user.password)
    success = create_user(user.username, hashed_password)
    
    if not success:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create user directory for their data
    get_user_dir(user.username)
    
    return {"message": "User created successfully"}

@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_username(form_data.username)
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user_id": user["username"]}

# --- User Settings Endpoints ---
@app.get("/user/profile")
async def get_user_profile(current_user: str = Depends(get_current_user)):
    """Get user profile information."""
    user = get_user_by_username(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "username": user["username"],
        "email": user.get("email"),
        "display_name": user.get("display_name"),
        "created_at": user.get("created_at")
    }

@app.put("/user/profile")
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update user profile information."""
    success = update_user_profile(
        current_user,
        email=profile_data.email,
        display_name=profile_data.display_name
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    
    return {"message": "Profile updated successfully"}

@app.post("/user/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: str = Depends(get_current_user)
):
    """Change user password."""
    # Verify current password
    user = get_user_by_username(current_user)
    if not user or not verify_password(password_data.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Validate new password strength
    password_error = validate_password_strength(password_data.new_password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)
    
    # Update password
    new_hashed_password = get_password_hash(password_data.new_password)
    success = update_user_password(current_user, new_hashed_password)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    return {"message": "Password changed successfully"}

@app.get("/user/preferences")
async def get_preferences(current_user: str = Depends(get_current_user)):
    """Get user preferences."""
    prefs = get_user_preferences(current_user)
    
    if not prefs:
        # Return default preferences if none exist
        return {
            "theme": "dark",
            "language": "en",
            "default_currency": "USD"
        }
    
    return {
        "theme": prefs.get("theme", "dark"),
        "language": prefs.get("language", "en"),
        "default_currency": prefs.get("default_currency", "USD")
    }

@app.put("/user/preferences")
async def update_preferences(
    prefs_data: UserPreferencesUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update user preferences."""
    success = update_user_preferences(
        current_user,
        theme=prefs_data.theme,
        language=prefs_data.language,
        default_currency=prefs_data.default_currency
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update preferences")
    
    return {"message": "Preferences updated successfully"}

# --- Protected Endpoints ---
@app.get("/")
async def root():
    return {"message": "IBKR Flex Analytics API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/config")
async def get_account_config(current_user: str = Depends(get_current_user)):
    try:
        user_dir = get_user_dir(current_user)
        config_path = os.path.join(user_dir, "config.json")
        
        if not os.path.exists(config_path):
             return {
                "query_id": "",
                "token_masked": ""
            }
            
        config = load_config(config_path)
        token = config.get("token", "")
        masked_token = token[:4] + "*" * (len(token) - 8) + token[-4:] if len(token) > 8 else "****"
        return {
            "query_id": config.get("query_id", ""),
            "token_masked": masked_token
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/config")
async def update_config(new_config: dict, current_user: str = Depends(get_current_user)):
    try:
        if "token" not in new_config or "query_id" not in new_config:
            raise HTTPException(status_code=400, detail="Missing token or query_id")
        
        user_dir = get_user_dir(current_user)
        config_path = os.path.join(user_dir, "config.json")
        
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
async def sync_report(current_user: str = Depends(get_current_user)):
    try:
        user_dir = get_user_dir(current_user)
        config_path = os.path.join(user_dir, "config.json")
        
        if not os.path.exists(config_path):
            raise HTTPException(status_code=404, detail="Configuration not found. Please set it up first.")
            
        config = load_config(config_path)
        client = IBKRFlexClient(config["token"], config["query_id"])
        
        ref_code = client.trigger_report()
        xml_report = client.get_report(ref_code)
        
        report_path = os.path.join(user_dir, "last_report.xml")
        with open(report_path, "w") as f:
            f.write(xml_report)
            
        results, last_update, summary = parse_ibkr_xml(xml_report)
        
        serializable_results = {}
        for section, df in results.items():
            if not df.empty:
                df_clean = df.replace({np.nan: None, np.inf: None, -np.inf: None})
                serializable_results[section] = df_clean.to_dict(orient="records")
            else:
                serializable_results[section] = []
        
        last_sync = datetime.now().isoformat()
        sync_state_path = os.path.join(user_dir, "sync_state.json")
        with open(sync_state_path, "w") as f:
            json.dump({"last_sync": last_sync}, f)
        
        # Clean summary dict for NaNs
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
async def get_latest_report(current_user: str = Depends(get_current_user)):
    user_dir = get_user_dir(current_user)
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
                df_clean = df.replace({np.nan: None, np.inf: None, -np.inf: None})
                serializable_results[section] = df_clean.to_dict(orient="records")
            else:
                serializable_results[section] = []
        
        last_sync = None
        sync_state_path = os.path.join(user_dir, "sync_state.json")
        if os.path.exists(sync_state_path):
            try:
                with open(sync_state_path, "r") as f:
                    last_sync = json.load(f).get("last_sync")
            except:
                pass
        
        if not last_sync:
            mtime = os.path.getmtime(report_path)
            last_sync = datetime.fromtimestamp(mtime).isoformat()

        # Clean summary dict for NaNs
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
    port = int(os.getenv("API_PORT", 8000))
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=reload)
