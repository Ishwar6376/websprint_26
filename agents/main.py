import os
import jwt  # Ensure you have installed 'pyjwt' (pip install pyjwt)
from typing import List, Dict, Optional  # [CHANGE 1: Added Optional]
from fastapi import FastAPI, HTTPException, Header, Depends # [CHANGE 2: Added Header, Depends]
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, RootModel
from langchain_core.messages import AIMessage

# Internal project imports
from brain.layel_1 import app_graph, FrontendMessage
from brain.layel_2 import surveillance_agent
from brain.agent3 import analyze_emergency

app = FastAPI()

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

# [CHANGE 3: Defined LocationModel before usage]
class LocationModel(BaseModel):
    lat: float
    lng: float

class ReportRequest(BaseModel):
    imageUrl: str
    description: Optional[str] = ""
    location: LocationModel
    address: str
    status: str
    geohash:str

# --- AUTH HELPER ---
def get_user_from_token(authorization: str = Header(...)):
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, options={"verify_signature": False})
        
        return {
            "userId": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("name")
        }
    except Exception as e:
        print(f"Token Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Token")

# --- ENDPOINTS ---

@app.post("/reports")
async def create_report(
    req: ReportRequest, 
    user_info: dict = Depends(get_user_from_token) 
):
    try:
        secure_user_id = user_info["userId"]
        secure_email = user_info["email"]

        print(f"Secure Report from: {secure_email}")
        
        initial_report_state = {
            "imageUrl": req.imageUrl,
            "description": req.description,
            "location": {"lat": req.location.lat, "lng": req.location.lng},
            "geohash": req.geohash,
            "address": req.address,
            "userId": secure_user_id, # From Token
            "email": secure_email,    # From Token
            "status": req.status
        }
        
        # [CHANGE 4: Added return statement to complete the function]
        # TODO: Invoke your report agent here in the future
        return {
            "status": "success",
            "message": "Report received successfully",
            "report_id": "temp_id" 
        }

    except Exception as e:
        print(f"Error in Report Endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        
        # Invoke the analyze_emergency agent
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