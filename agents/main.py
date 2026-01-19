import os
from typing import List, Dict
from fastapi import FastAPI, HTTPException
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
    allow_origins=["*"],           # Allows all origins for debugging
    allow_credentials=True,
    allow_methods=["*"],           # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],           # Allows all headers
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


# --- ENDPOINTS ---

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