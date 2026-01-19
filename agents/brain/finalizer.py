from state import AgentState, ReportCategory, SeverityLevel

def finalizer_node(state: AgentState):
    print("⚖️ Finalizer: Deciding the winner...")
    results = []
    
    if state.get("water_analysis"):
        results.append({"category": ReportCategory.WATER, "data": state["water_analysis"]})
    if state.get("waste_analysis"):
        results.append({"category": ReportCategory.WASTE, "data": state["waste_analysis"]})
    if state.get("infra_analysis"):
        results.append({"category": ReportCategory.INFRASTRUCTURE, "data": state["infra_analysis"]})
    if state.get("electric_analysis"):
        results.append({"category": ReportCategory.ELECTRICITY, "data": state["electric_analysis"]})
    if not results:
        return {
            "assigned_category": ReportCategory.UNCERTAIN,
            "aiAnalysis": "Could not identify any specific issue.",
            "severity": SeverityLevel.LOW
        }
    results.sort(key=lambda x: x["data"].confidence, reverse=True)
    winner = results[0]
    if winner["data"].confidence < 0.2:
        return {
            "assigned_category": ReportCategory.UNCERTAIN,
            "aiAnalysis": "The image provided does not clearly match any reportable category (Water, Waste, Infrastructure, or Electricity).",
            "severity": SeverityLevel.LOW
        }

    return {
        "assigned_category": winner["category"],
        "severity": winner["data"].severity,
        "aiAnalysis": winner["data"].reasoning
    }