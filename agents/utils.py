import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from state import AgentAnalysis, SeverityLevel

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash", 
    temperature=0,
    max_retries=2
)

# --- GLOBAL CONTEXT FOR ALL AGENTS ---
# This ensures every agent knows they are part of a 4-agent system.
GLOBAL_CONTEXT = """
SYSTEM ARCHITECTURE:
You are one of 4 specialist agents in a civic issue reporting system. The 4 agents are:
1. WASTE (Garbage, sanitation, cleanliness)
2. WATER (Floods, leakage, sewage, supply)
3. ELECTRICITY (Wires, poles, transformers, power)
4. INFRASTRUCTURE (Roads, buildings, public assets)

YOUR GOAL:
You must determine if the image falls under YOUR specific jurisdiction.
- If the issue clearly belongs to another department, your confidence score must be LOW (0.0 - 0.2).
- Example: If you are the WASTE agent and you see a broken water pipe, do not report it as "debris." It is a WATER issue.
- Your 'confidence' score is not just "do I see an object," but "is this MY department's responsibility?"
"""

async def analyze_image_category(
    image_url: str, 
    system_prompt: str,
    user_description: str = None
) -> AgentAnalysis:
    """
    Sends image + optional user description to Gemini.
    Enforces strict JSON output including a generated title.
    """
    context_text = "Analyze this image according to your instructions."

    if user_description:
        context_text += f"\n\nUSER REPORT DESCRIPTION: '{user_description}'\n(Use this context to inform the title and reasoning, but prioritize visual evidence for the severity.)"
    
    # Updated formatting instructions to enforce Jurisdictional Confidence
    formatting_instruction = """
    \nIMPORTANT: You must strictly output ONLY valid JSON. 
    Do not add Markdown formatting (like ```json). 
    
    Generate a concise 'title' (max 10 words) that summarizes the visual content and the user description.
    
    The JSON structure must be:
    {
      "title": "A short, descriptive summary of the incident",
      "confidence": 0.95, 
      "severity": "HIGH", 
      "reasoning": "Explain WHY this falls under your jurisdiction specifically, or why it belongs to another agent."
    }
    
    NOTE ON CONFIDENCE:
    - 0.0 - 0.3: This issue belongs to a different department (or is irrelevant).
    - 0.4 - 0.6: Ambiguous / overlapping jurisdiction.
    - 0.7 - 1.0: Clearly and exclusively YOUR department's responsibility.
    """
    
    # Combine Global Context + Specific Agent Role + Formatting
    final_system_prompt = GLOBAL_CONTEXT + "\n\n" + system_prompt + formatting_instruction

    message = HumanMessage(
        content=[
            {"type": "text", "text": context_text},
            {"type": "image_url", "image_url": image_url},
        ]
    )
    
    try:
        response = await llm.ainvoke([SystemMessage(content=final_system_prompt), message])
        raw_content = response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw_content)
        
        return AgentAnalysis(
            title=data.get("title", "Untitled Analysis"), 
            confidence=float(data.get("confidence", 0.0)),
            severity=SeverityLevel(data.get("severity", "LOW")), 
            reasoning=data.get("reasoning", "No reasoning provided")
        )

    except Exception as e:
        print(f" AI Analysis Failed: {e}")
        return AgentAnalysis(
            title="Analysis Error",
            confidence=0.0, 
            severity=SeverityLevel.LOW, 
            reasoning=f"Error during analysis: {str(e)}"
        )