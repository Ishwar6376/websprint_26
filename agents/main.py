import os
from jose import jwt
import requests
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- LANGGRAPH IMPORTS ---
from brain.layel_1 import app_graph, FrontendMessage
from brain.layel_2 import surveillance_agent
from brain.agent3 import analyze_emergency

# [CHANGE 1: Renamed 'app' to 'report_agent' to avoid conflict with FastAPI app]
from brain.orchestrator import app as report_agent 
from state import ReportStatus # Importing enums is good practice

app = FastAPI()
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")  # e.g. dev-xyz.us.auth0.com
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
ALGORITHMS = ["RS256"]
# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST SCHEMAS ---
class ChatRequest(BaseModel):
    roomId: str
    messages: List[FrontendMessage]
    currentUserMessage: str
    currentUserId: str

class RouteBatchRequest(BaseModel):
    payload: Dict[str, List[float]]

class ThrottleRequest(BaseModel):
    userId: str
    routeId: str
    message: List[FrontendMessage] 

class LocationModel(BaseModel):
    lat: float
    lng: float

class ReportRequest(BaseModel):
    imageUrl: str
    description: Optional[str] = ""
    location: LocationModel
    address: str
    status: str
    geohash: str

# --- AUTH HELPER ---

def fetch_user_profile(access_token: str):
    url = f"https://{AUTH0_DOMAIN}/userinfo"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to fetch user profile")

    return response.json()
def get_user_from_token(authorization: str = Header(...)):
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid auth header")

        token = authorization.split(" ")[1]

        # Fetch Auth0 public keys
        jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
        jwks = requests.get(jwks_url).json()

        unverified_header = jwt.get_unverified_header(token)

        rsa_key = None
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }

        if rsa_key is None:
            raise HTTPException(status_code=401, detail="Invalid token key")

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=AUTH0_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/"
        )
        profile = fetch_user_profile(token)
        return {
            "userId": payload["sub"],      # auth0|xxxxx
            "email": profile.get("email"),
        }

    except Exception as e:
        print("Auth error:", e)
        raise HTTPException(status_code=401, detail="Unauthorized")


# --- ENDPOINTS ---

@app.post("/reports")
async def create_report(
    req: ReportRequest, 
    user_info: dict = Depends(get_user_from_token) 
):
    try:
        secure_user_id = user_info["userId"]
        secure_email = user_info["email"]
        print(f"email ${secure_email} usr_Id ${secure_user_id}")

        print(f"--- Processing Report from: {secure_email} ---")

        initial_report_state = {
            "userId": secure_user_id,
            "email": secure_email,
            "imageUrl": req.imageUrl,
            "description": req.description,
            "location": {"lat": req.location.lat, "lng": req.location.lng},
            "geohash": req.geohash,
            "address": req.address,
            "status": req.status, 
            

            "locality_imageUrl": None,
            "locality_email": None,
            "locality_userId": None,
            "locality_reportId": None,

            "tool": "SAVE", 
            

            "water_analysis": None,
            "waste_analysis": None,
            "infra_analysis": None,
            "electric_analysis": None,
            "uncertain_analysis": None,
            "aiAnalysis": None,
            "severity": None,
            "assigned_category": None,
            "route": "",
            "updatedRoute": "",
            
 
            "reportId": None 
        }
        

        result = await report_agent.ainvoke(initial_report_state)
        

        category = result.get("assigned_category") 
        extracted_title = "Report Processed" 
        tool=result.get("tool")

        if category:
 
            analysis_key = f"{category.lower()}_analysis" 
            analysis_data = result.get(analysis_key)
            if analysis_data and hasattr(analysis_data, 'title'):
                extracted_title = analysis_data.title
            elif analysis_data and isinstance(analysis_data, dict):
                extracted_title = analysis_data.get('title', extracted_title)

        if result.get("reportId"):
             return {
                "status": "success",
                "message": "Report processed successfully",
                "reportId": result.get("reportId"),
                "category": category,
                "title": extracted_title, 
                "severity": result.get("severity"),
                "ai_analysis": result.get("aiAnalysis"),
                "tool":tool

            }
        else:
            return {
                "status": "partial_success",
                "message": "Analysis complete, but save might have failed.",
                "category": category,
                "ai_analysis": result.get("aiAnalysis")
            }

    except Exception as e:
        print(f"Error in Report Endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Orchestration Failed: {str(e)}")
@app.post("/agent1")
async def chat_endpoint(req: ChatRequest):
    try:
        initial_state = {
            "roomId": req.roomId,
            "messages": req.messages,
            "currentUserMessage": req.currentUserMessage,
            "currentUserId": req.currentUserId
        }
        config = {"configurable": {"thread_id": req.roomId}}
        
        # Invoke the LangGraph agent
        final_state = await app_graph.ainvoke(initial_state, config=config)
        decision = final_state["final_model_score"]
        
        return {
            "status": "success",
            "final_score": decision.final_safety_score,
            "trigger_sos": decision.trigger_sos, 
            "sos_context": decision.sos_context,
            "analysis": decision.reason,
            "details": {
                "sentiment": final_state.get("model_1"),
                "urgency": final_state.get("model_2"),
                "severity": final_state.get("model_3")
            }
        }
    except Exception as e:
        print(f"Error in Chat Endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/throttle")
async def throttle_push(req: ThrottleRequest):
    try:
        initial_state = {
            "userId": req.userId,
            "routeId": req.routeId,
            "message": req.message, 
            "context": None          
        }
        result = await analyze_emergency.ainvoke(initial_state)  
        final_msg = result.get("context", "No analysis generated")
        
        return {
            "status": "Emergency Marked",
            "ai_analysis": final_msg
        }
    except Exception as e:
        print(f"Error in throttle agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)