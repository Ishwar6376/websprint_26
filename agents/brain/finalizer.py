import json
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser

from state import AgentState, ReportCategory, SeverityLevel
from utils import llm  

ROUTE_MAPPING = {
    ReportCategory.WATER: "reports/waterReports",
    ReportCategory.WASTE: "reports/wasteReports",
    ReportCategory.INFRASTRUCTURE: "reports/infrastructureReports",
    ReportCategory.ELECTRICITY: "reports/electricityReports",
    ReportCategory.UNCERTAIN: "reports/uncertainReports"
}

UPDATED_ROUTE_MAPPING = {
    ReportCategory.WATER: "reports/updatewaterReports",
    ReportCategory.WASTE: "reports/updatewasteReports",
    ReportCategory.INFRASTRUCTURE: "reports/updateinfrastructureReports",
    ReportCategory.ELECTRICITY: "reports/updateelectricityReports",
}


class FinalVerdict(BaseModel):
    selected_category: str = Field(description="The winning category: WATER, WASTE, INFRASTRUCTURE, ELECTRICITY, or UNCERTAIN")
    title: str = Field(description="A consolidated title for the report")
    severity: str = Field(description="The final severity level: LOW, MEDIUM, HIGH, or CRITICAL")
    reasoning: str = Field(description="Why you chose this category over the others. Explain the conflict resolution.")

JUDGE_SYSTEM_PROMPT = """
You are the City Operations Supervisor (The Judge).
You have received analysis reports from 4 specialist agents regarding a single image of a civic issue.
Your job is to review their findings, resolve conflicts, and determine the ONE true category of the issue.

THE SPECIALISTS:
1. WASTE AGENT (Garbage, sanitation)
2. WATER AGENT (Flooding, leakage)
3. INFRASTRUCTURE AGENT (Roads, buildings, broken assets)
4. ELECTRIC AGENT (Wires, power)

HOW TO JUDGE:
1. Compare Confidence: High confidence (>0.8) usually indicates a strong match.
2. Read Reasoning: If the Waste Agent sees "rubble" (0.8) but Infra Agent sees "collapsed wall" (0.9), Infra wins because the wall is the source.
3. Resolve Overlap:
   - "Water on road" -> usually Water Agent (unless it's just rain on a broken road).
   - "Trash in drain" -> usually Waste Agent (unless it caused a massive flood).
4. Uncertainty: If ALL agents have low confidence (<0.4), output "UNCERTAIN".

OUTPUT FORMAT:
You must strictly output valid JSON matching the FinalVerdict schema.
"""


async def finalizer_node(state: AgentState):
    print(" Judge Agent Deciding...")
    
    waste = state.get("waste_analysis")
    water = state.get("water_analysis")
    infra = state.get("infra_analysis")
    electric = state.get("electric_analysis")

    def format_agent(name, data):
        if not data:
            return f"{name}: Did not run."
        return f"""
        {name}:
        - Confidence: {data.confidence}
        - Title: {data.title}
        - Severity: {data.severity}
        - Reasoning: {data.reasoning}
        """

    reports_text = f"""
    USER DESCRIPTION: '{state.get('description', 'None')}'
    
    --- AGENT REPORTS ---
    {format_agent("WASTE AGENT", waste)}
    {format_agent("WATER AGENT", water)}
    {format_agent("INFRASTRUCTURE AGENT", infra)}
    {format_agent("ELECTRICITY AGENT", electric)}
    """

    parser = PydanticOutputParser(pydantic_object=FinalVerdict)
    
    final_prompt = JUDGE_SYSTEM_PROMPT + "\n\n" + parser.get_format_instructions()

    try:

        response = await llm.ainvoke([
            SystemMessage(content=final_prompt),
            HumanMessage(content=reports_text)
        ])
        

        verdict = parser.parse(response.content)

        category_enum = ReportCategory.UNCERTAIN
        try:
            category_enum = ReportCategory(verdict.selected_category.upper())
        except ValueError:
            print(f"Warning: Judge returned invalid category '{verdict.selected_category}'. Defaulting to UNCERTAIN.")
            category_enum = ReportCategory.UNCERTAIN

        severity_enum = SeverityLevel.LOW
        try:
            severity_enum = SeverityLevel(verdict.severity.upper())
        except ValueError:
            severity_enum = SeverityLevel.LOW

        # 6. Return Final State
        return {
            "assigned_category": category_enum,
            "severity": severity_enum,
            "aiAnalysis": verdict.reasoning, 
            "title": verdict.title,
            "route": ROUTE_MAPPING.get(category_enum, ROUTE_MAPPING[ReportCategory.UNCERTAIN]),
            "updatedRoute": UPDATED_ROUTE_MAPPING.get(category_enum)
        }

    except Exception as e:
        print(f" Judge Agent Failed: {e}")
    
        results = []
        if water: results.append({"c": ReportCategory.WATER, "d": water})
        if waste: results.append({"c": ReportCategory.WASTE, "d": waste})
        if infra: results.append({"c": ReportCategory.INFRASTRUCTURE, "d": infra})
        if electric: results.append({"c": ReportCategory.ELECTRICITY, "d": electric})
        
        if not results:
            return {
                "assigned_category": ReportCategory.UNCERTAIN,
                "aiAnalysis": "System Failure.",
                "title": "Error",
                "severity": SeverityLevel.LOW,
                "route": ROUTE_MAPPING[ReportCategory.UNCERTAIN],
                "updatedRoute": None
            }
            
        results.sort(key=lambda x: x["d"].confidence, reverse=True)
        winner = results[0]
        
        return {
            "assigned_category": winner["c"],
            "severity": winner["d"].severity,
            "aiAnalysis": winner["d"].reasoning + " (Fallback Logic)",
            "title": winner["d"].title,
            "route": ROUTE_MAPPING[winner["c"]],
            "updatedRoute": UPDATED_ROUTE_MAPPING.get(winner["c"])
        }