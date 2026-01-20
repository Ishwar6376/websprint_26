from state import AgentState
import os 
import requests
from dotenv import load_dotenv
load_dotenv()
if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found!")
def locality_check_agent(state:AgentState):
    if(state["assigned_category"]=="WATER"):
        try:
            backend_url=os.getenv("BACKEND_URL","http://localhost:3000")
            response=requests.post(f"{backend_url}/locality/waterCheck",json={
                "location":state["location"]
            },timeout=3)
             
        except Exception as e:return f"Failed{str(e)}"

    

    if(state["assigned_category"]=="INFRASTRUCTURE"):
        try:
            backend_url=os.getenv("BACKEND_URL","http://localhost:3000")
            response=requests.post(f"{backend_url}/locality/infraCheck",json={
                "location":state["location"]
            })
        except Exception as e:return f"Failed{str(e)}"

    if(state["assigned_category"]=="WASTE"):
        try:
            backend_url=os.getenv("BACKEND_URL","http://localhost:3000")
            response=requests.post(f"{backend_url}/locality/wasteCheck",json={
                "location":state["location"]
            })
        except Exception as e:return f"Failed{str(e)}"

    if(state["assigned_category"]=="ELECTRICITY"):
        try:
            backend_url=os.getenv("BACKEND_URL","http://localhost:3000")
            response=requests.post(f"{backend_url}/locality/electricityCheck",json={
                "location":state["location"]
            })
        except Exception as e:return f"Failed{str(e)}"

        