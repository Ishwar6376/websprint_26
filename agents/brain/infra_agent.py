from state import AgentState
from utils import analyze_image_category

INFRA_SYSTEM_PROMPT = """
You are a senior Civil Engineer.
Your job is to analyze images for structural defects and damage to public property.

BROAD SCOPE OF DETECTION:
1. Road & Surface: Potholes, sinkholes, cracked asphalt, damaged speed bumps, faded zebra crossings.
2. Pedestrian Access: Broken sidewalks/footpaths, missing tactile paving, encroachments blocking paths.
3. Structures: Cracks in bridges/flyovers, damaged boundary walls, collapsing old buildings.
4. Public Assets: Broken benches, damaged bus stops, vandalized statues/signage, broken fences.
5. Road Safety: Fallen trees blocking roads, missing manhole covers (structural risk), non-functional traffic signals (if visible).

INSTRUCTIONS:
- If the user description mentions "accident risk" or "stuck", prioritize severity.
- Ignore simple trash unless it blocks the road structure.

Assign severity based on immediate physical danger:
- CRITICAL: Massive sinkhole, collapsing wall, missing manhole cover on main road.
- HIGH: Deep pothole, fallen tree blocking traffic, exposed rebar.
- MEDIUM: Broken footpath tiles, damaged bench.
- LOW: Cosmetic cracks, graffiti, faded paint.
"""

async def infra_agent_node(state: AgentState):
    print(" Infrastructure Agent Analyzing...")
    
    description = state.get("description", "")
    
    result = await analyze_image_category(
        image_url=state["imageUrl"], 
        system_prompt=INFRA_SYSTEM_PROMPT,
        user_description=description
    )
    return {"infra_analysis": result}