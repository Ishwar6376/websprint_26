from state import AgentState, ReportCategory, SeverityLevel

ROUTE_MAPPING = {
    ReportCategory.WATER: "reports/waterReports",
    ReportCategory.WASTE: "reports/wasteReports",
    ReportCategory.INFRASTRUCTURE: "reports/infrastructureReports",
    ReportCategory.ELECTRICITY: "reports/electricityReports",
    ReportCategory.UNCERTAIN: "reports/uncertainReports"
}

def finalizer_node(state: AgentState):
    print(" Finalizer: Deciding the winner...")
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
            "severity": SeverityLevel.LOW,
            "route": "reports/uncertainReports"  
        }
    results.sort(key=lambda x: x["data"].confidence, reverse=True)
    winner = results[0]
    if winner["data"].confidence < 0.2:
        return {
            "assigned_category": ReportCategory.UNCERTAIN,
            "aiAnalysis": "The image provided does not clearly match any reportable category.",
            "severity": SeverityLevel.LOW,
            "route": "reports/uncertainReports"  
        }
    winning_category = winner["category"]
    selected_route = ROUTE_MAPPING.get(winning_category, "reports/uncertainReports")

    return {
        "assigned_category": winning_category,
        "severity": winner["data"].severity,
        "aiAnalysis": winner["data"].reasoning,
        "route": selected_route  
    }