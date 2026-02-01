import os
from typing import Optional
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langchain_core.messages import HumanMessage
load_dotenv()
if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("Google API Key is not found")

class EvaluationSchema(BaseModel):
    confidence: float = Field(
        description="A score between 0.0 and 1.0 indicating confidence that the waste has been cleaned from the same location."
    )
    reasoning: str = Field(
        description="Brief explanation of why the score was given (e.g., 'Same wall pattern, waste gone')."
    )

class GraphState(BaseModel):
    imageUrl: str = Field(description="URL of the reported waste (Before)")
    staffimageUrl: str = Field(description="URL of the resolved proof (After)")
    
    confidence_result: Optional[EvaluationSchema] = Field(default=None, description="The evaluation result")

flash_model = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0, 
    max_retries=2,
)
structured_llm = flash_model.with_structured_output(EvaluationSchema)

async def finalizer(state: GraphState):
    """Compare the user uploaded waste image and the staff uploaded resolved image"""
    
    user_image_url = state.imageUrl
    staff_image_url = state.staffimageUrl
    message = HumanMessage(
        content=[
            {
                "type": "text",
                "text": (
                    "You are a Senior Waste Management Analyzer. Compare these two images.\n"
                    "Image 1: Reported Waste (Before)\n"
                    "Image 2: Staff Resolution (After)\n\n"
                    "Task:\n"
                    "1. Verify if the LOCATION is the same (check walls, ground, background objects).\n"
                    "2. Verify if the WASTE is gone.\n\n"
                    "Return a high confidence score (near 1.0) only if the location matches AND waste is cleared."
                ),
            },
            {"type": "image_url", "image_url": {"url": user_image_url}},
            {"type": "image_url", "image_url": {"url": staff_image_url}},
        ]
    )

    try:
        response = await structured_llm.ainvoke([message])
        return {"confidence_result": response}
        
    except Exception as e:
        print(f"Error evaluating images: {e}")
        return {
            "confidence_result": EvaluationSchema(
                confidence=0.0, 
                reasoning="Error processing images."
            )
        }
graph = StateGraph(GraphState)

graph.add_node('finalizer', finalizer)

graph.add_edge(START, 'finalizer')
graph.add_edge('finalizer', END)

workflow = graph.compile()