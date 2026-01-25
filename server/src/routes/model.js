import express from "express"
const router=express.Router()
import orchestrate_agent_1 from "../controllers/women/women_model_layer1.js"
import throttle_agent from "../controllers/women/throttle_agent.js"
router.post('/agent1',orchestrate_agent_1)
router.post('/throttle',throttle_agent)
export default router