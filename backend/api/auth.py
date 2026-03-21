import os
import httpx
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
import urllib.parse

router = APIRouter()

# This should match the redirect URI configured in Google Cloud Console
REDIRECT_URI = "http://localhost:8030/api/auth/callback"

# OAuth2 scopes - Using cloud-platform for broader compatibility
SCOPES = "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid https://www.googleapis.com/auth/cloud-platform"

@router.get("/auth/login")
async def login():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="Google OAuth2 credentials not configured.")

    params = {
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "select_account"
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)

@router.get("/auth/callback")
async def callback(request: Request):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing.")

    # Exchange code for tokens manually using httpx to avoid flow state issues
    async with httpx.AsyncClient() as client:
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        
        response = await client.post(token_url, data=data)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to exchange token: {response.text}")
        
        tokens = response.json()
        access_token = tokens.get("access_token")
        
        # Redirect back to frontend with the token in URL
        # The frontend will capture this and save to localStorage
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(f"{frontend_url}?access_token={access_token}")
