import os
import requests
import google.generativeai as genai
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from datetime import datetime, timezone
from typing import Literal
from langgraph.graph import StateGraph, START, END
from state import AgentState

load_dotenv()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
TIMEOUT = 10

if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found!")
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
def load_image_from_url(url: str) -> Image.Image:
    """Fetches an image directly from a Cloudinary URL."""
    if not url: return None
    try:
        response = requests.get(url, timeout=TIMEOUT)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))
    except Exception as e:
        print(f"Failed to load Cloudinary image from {url}: {e}")
        return None
def verify_image_similarity(new_image_url: str, existing_image_url: str) -> bool:
    """Uses Gemini to compare visual similarity between two report images."""
    if not new_image_url or not existing_image_url:
        return False
    try:
        img_new = load_image_from_url(new_image_url)
        img_existing = load_image_from_url(existing_image_url)

        if not img_new or not img_existing:
            return False
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = (
            "You are an expert civic issue surveyor. "
            "Compare these two images. Image 1 is a new report, Image 2 is an existing database record. "
            "Do these two images depict the EXACT same specific incident (e.g., exact same pothole, same pile of trash) "
            "in the same location? Ignore lighting differences. "
            "Return ONLY the word 'TRUE' if they are the same, or 'FALSE' if different."
        )

        response = model.generate_content([prompt, img_new, img_existing])
        result = response.text.strip().upper()
        print(f"Similarity Check Result: {result}")
        return "TRUE" in result
    except Exception as e:
        print(f"Image similarity check failed: {e}")
        return False

# --- Nodes ---

def locality_check_agent(state: AgentState):
    """
    Checks if a report is a duplicate using Geohash + Visual Verification.
    Decides whether to trigger 'SAVE' or 'UPDATE'.
    """
    print("--- Locality Check Node ---")
    category_endpoints = {
        "WATER": "/api/locality/waterCheck",
        "INFRASTRUCTURE": "/api/locality/infraCheck",
        "WASTE": "/api/locality/wasteCheck",
        "ELECTRICITY": "/api/locality/electricityCheck",
    }

    category = state.get("assigned_category")
    endpoint_path = category_endpoints.get(category)
    
    if not endpoint_path:
        print("Tool used is save, and endpoint not found ")
        return {"tool": "SAVE"}

    try:
        url = f"{BACKEND_URL}{endpoint_path}"
        loc = state.get("location")
        location_data = loc.dict() if hasattr(loc, 'dict') else loc

        payload = {
            "location": location_data,
            "geohash": state.get("geohash")
        }
        
        # Verify Duplicate
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        data = response.json()
        print("data", data)

        if data.get("duplicateFound") is True:
            # ✅ FIX: Define variable FIRST
            report_data = data.get("data", {}) 
            
            # ✅ FIX: Then print it
            print(f"report data: {report_data}") 

            existing_backend_url = report_data.get("imageUrl")
            current_user_url = state.get("imageUrl")
            
            # Visual Verification
            if verify_image_similarity(current_user_url, existing_backend_url):
                print("Duplicate confirmed via visual check.")
                return {
                    "tool": "UPDATE",
                    "locality_imageUrl": existing_backend_url,
                    "locality_userId": report_data.get("userId"),
                    "locality_email": report_data.get("locality_email"),
                    "locality_reportId": report_data.get("reportId")
                }
            else:
                print("Visual check failed (images different). Saving as new.")
                return {"tool": "SAVE", "locality_imageUrl": None, "locality_userId": None}

        print("No duplicate found by Geohash.")
        return {"tool": "SAVE", "locality_imageUrl": None, "locality_userId": None}

    except Exception as e:
        print(f"Locality check failed with error: {e}. Defaulting to SAVE.")
        return {"tool": "SAVE"}
def save_report_tool(state: AgentState):
    """Creates a NEW report in the database."""
    print("--- Save Report Node ---")
    route = state.get("route")
    
    if not route:
        print("Error: No route found in state for saving.")
        return {"status": "FAILED"}

    try:
        base = BACKEND_URL.rstrip("/")
        path = route.lstrip("/")
        url = f"{base}/{path}"
        if not path.startswith("api/"):
            url = f"{base}/api/{path}"
        else:
            url = f"{base}/{path}"
        print(f"DEBUG: Saving to URL: {url}")
        
        category = state.get("assigned_category")
        analysis_map = {
            "WATER": state.get("water_analysis"),
            "WASTE": state.get("waste_analysis"),
            "INFRASTRUCTURE": state.get("infra_analysis"),
            "ELECTRICITY": state.get("electric_analysis"),
            "UNCERTAIN": state.get("uncertain_analysis")
        }
        
        current_analysis = analysis_map.get(category)
        current_time = datetime.now(timezone.utc).isoformat()
        
        payload = {
            "userId": state.get("userId"),
            "email": state.get("email"),
            "imageUrl": state.get("imageUrl"),
            "location": state["location"].dict() if hasattr(state["location"], 'dict') else state["location"],
            "geohash": state.get("geohash"),
            "description": state.get("description"),
            "address": state.get("address"),
            "severity": current_analysis.severity if current_analysis else "MEDIUM",
            "confidence": current_analysis.confidence if current_analysis else 0.0,
            "aiAnalysis": current_analysis.reasoning if current_analysis else "",
            "title": current_analysis.title if current_analysis else "Untitled Report",
            "status": "VERIFIED", 
            "upvotes": 0,
            "downvotes": 0,
            "createdAt": current_time,
            "updatedAt": current_time,
            "interests": [],
            "assigned_category":state.get("assigned_category")

        }

        response = requests.post(url, json=payload, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        report_id = data.get("reportId") or data.get("id")
        
        print(f"Report SAVED successfully: {report_id}")
        return {"status": "VERIFIED", "reportId": report_id}
    except Exception as e:
        print(f"Failed to SAVE report to {url}: {e}")
        return {"status": "FAILED"}

def update_report_tool(state: AgentState):
    """Updates an EXISTING report in the database."""
    print("--- Update Report Node ---")
    route = state.get("updatedRoute")
    
    if not route:
        print("Error: No updatedRoute found in state for updating.")
        return {"status": "FAILED"}

    try:
        base = BACKEND_URL.rstrip("/")
        path = route.lstrip("/")
        url = f"{base}/{path}"
        if not path.startswith("api/"):
            url = f"{base}/api/{path}"
        else:
            url = f"{base}/{path}"
        current_time = datetime.now(timezone.utc).isoformat()
        
        payload = {
            "email": state.get("locality_email"),
            "userId": state.get("locality_userId"),
            "reportId": state.get("locality_reportId"),
            "updatedAt": current_time,
            "geohash": state.get("geohash")
        }
        
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        report_id = data.get("reportId") or data.get("id")

        print(f"Report UPDATED successfully: {report_id}")
        return {"status": "VERIFIED", "reportId": report_id}
        
    except Exception as e:
        print(f"Failed to UPDATE report to {url}: {e}")
        return {"status": "FAILED"}

# --- Graph Configuration ---

def route_locality(state: AgentState) -> Literal["save_report_tool", "update_report_tool"]:
    """Router to decide between saving new or updating existing."""
    if state.get("tool") == "UPDATE":
        return "update_report_tool"
    return "save_report_tool"

# Build the Subgraph
locality_builder = StateGraph(AgentState)

# Add Nodes
locality_builder.add_node("locality_check", locality_check_agent)
locality_builder.add_node("save_report_tool", save_report_tool)
locality_builder.add_node("update_report_tool", update_report_tool)

# Add Edges
locality_builder.add_edge(START, "locality_check")

locality_builder.add_conditional_edges(
    "locality_check",
    route_locality,
    {
        "save_report_tool": "save_report_tool",
        "update_report_tool": "update_report_tool"
    }
)

locality_builder.add_edge("save_report_tool", END)
locality_builder.add_edge("update_report_tool", END)

# Compile the graph
locality_submission_graph = locality_builder.compile()