from typing import List, Optional, TypedDict, Dict
from pydantic import BaseModel, Field
from enum import Enum

# --- Enums ---
class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ReportStatus(str, Enum):
    INITIATED = "INITIATED"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    RESOLVED = "RESOLVED"

class ReportCategory(str, Enum):
    WATER = "WATER"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    WASTE = "WASTE"
    ELECTRICITY = "ELECTRICITY"
    UNCERTAIN = "UNCERTAIN"

# --- Reusable Model for What an Agent Returns ---
class AgentAnalysis(BaseModel):
    confidence: float = Field(description="Confidence score 0.0 to 1.0")
    severity: SeverityLevel
    reasoning: str
    
# --- Core Data Models ---
class Location(BaseModel):
    lat: float
    lng: float

# --- The Segregated State ---
class AgentState(TypedDict):
    # 1. Inputs
    title: str
    imageUrl: str
    location: Location
    address: str
    email: str
    interests: List[str]
    description:str

    # 2. Segregated Agent Outputs (Explicit slots for each)
    water_analysis: Optional[AgentAnalysis]
    waste_analysis: Optional[AgentAnalysis]
    infra_analysis: Optional[AgentAnalysis]
    electric_analysis: Optional[AgentAnalysis]

    # 3. Final Decision (The Winner)
    aiAnalysis: Optional[str]
    severity: Optional[SeverityLevel]
    assigned_category: Optional[ReportCategory]
    status: ReportStatus
    
    # 4. Metadata
    upvotes: int
    downvotes: int
    createdAt: str
    updatedAt: str