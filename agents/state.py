from typing import List, Optional, TypedDict, Dict,Literal
from pydantic import BaseModel, Field
from enum import Enum
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
class AgentAnalysis(BaseModel):
    confidence: float = Field(description="Confidence score 0.0 to 1.0")
    severity: SeverityLevel
    reasoning: str
    
class Location(BaseModel):
    lat: float
    lng: float

class AgentState(TypedDict):
    userId:str
    imageUrl: str
    location: Location
    address: str
    email: str
    interests: List[str]
    description:str
    reportId:str
    geohash:str
    locality_imageUrl=Optional[str]
    locality_email=Optional[str]
    locality_userId=Optional[str]


    water_analysis: Optional[AgentAnalysis]
    waste_analysis: Optional[AgentAnalysis]
    infra_analysis: Optional[AgentAnalysis]
    electric_analysis: Optional[AgentAnalysis]

    aiAnalysis: Optional[str]
    severity: Optional[SeverityLevel]
    assigned_category: Optional[ReportCategory]
    status: ReportStatus
    route:str
    tool:Literal["SAVE","UPDATE"]
    
    upvotes: int
    downvotes: int
    createdAt: str
    updatedAt: str