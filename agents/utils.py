import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from state import AgentAnalysis, SeverityLevel

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash", 
    temperature=0,
    max_retries=2
)

async def analyze_image_category(
    image_url: str, 
    system_prompt: str,
    user_description: str = None
) -> AgentAnalysis:
    """
    Sends image + optional user description to Gemini.
    Enforces strict JSON output.
    """
    context_text = "Analyze this image according to your instructions."
    if user_description:
        context_text += f"\n\nUSER REPORT DESCRIPTION: '{user_description}'\n(Use this context if the image is unclear, but prioritize visual evidence.)"
    formatting_instruction = """
    \nIMPORTANT: You must strictly output ONLY valid JSON. 
    Do not add Markdown formatting (like ```json). 
    The JSON structure must be:
    {
      "confidence": 0.95,
      "severity": "HIGH", 
      "reasoning": "Detailed explanation here"
    }
    """
    
    final_system_prompt = system_prompt + formatting_instruction

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
            confidence=float(data.get("confidence", 0.0)),
            severity=SeverityLevel(data.get("severity", "LOW")), 
            reasoning=data.get("reasoning", "No reasoning provided")
        )

    except Exception as e:
        print(f" AI Analysis Failed: {e}")
        return AgentAnalysis(
            confidence=0.0, 
            severity=SeverityLevel.LOW, 
            reasoning=f"Error during analysis: {str(e)}"
        )