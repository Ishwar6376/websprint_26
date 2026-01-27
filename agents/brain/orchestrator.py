import asyncio
from langgraph.graph import StateGraph, START, END
from state import AgentState
from brain.electric_agent import electric_agent_node
from brain.waste_agent import waste_agent_node
from brain.water_agent import water_agent_node
from brain.infra_agent import infra_agent_node
from brain.finalizer import finalizer_node

from brain.locality_check_agent import locality_submission_graph
def run_submission_process(state: AgentState):
    """
    Wrapper to invoke the compiled locality/submission subgraph.
    This encapsulates the entire Locality Check -> Save/Update logic.
    """
    return locality_submission_graph.invoke(state)
orchestrator_builder = StateGraph(AgentState)
orchestrator_builder.add_node("electric_agent", electric_agent_node)
orchestrator_builder.add_node("waste_agent", waste_agent_node)
orchestrator_builder.add_node("water_agent", water_agent_node)
orchestrator_builder.add_node("infra_agent", infra_agent_node)
orchestrator_builder.add_node("finalizer", finalizer_node)
orchestrator_builder.add_node("submission_process", run_submission_process)
orchestrator_builder.add_edge(START, "electric_agent")
orchestrator_builder.add_edge(START, "waste_agent")
orchestrator_builder.add_edge(START, "water_agent")
orchestrator_builder.add_edge(START, "infra_agent")
orchestrator_builder.add_edge("electric_agent", "finalizer")
orchestrator_builder.add_edge("waste_agent", "finalizer")
orchestrator_builder.add_edge("water_agent", "finalizer")
orchestrator_builder.add_edge("infra_agent", "finalizer")
orchestrator_builder.add_edge("finalizer", "submission_process")
orchestrator_builder.add_edge("submission_process", END)

app = orchestrator_builder.compile()