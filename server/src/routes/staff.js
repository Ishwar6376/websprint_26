import express from "express";
import {getTask,getAllPastTask,assignTask} from "../controllers/staff/staff.controller.js"
import {checkJwt} from "../auth/authMiddleware.js"


const router = express.Router();

router.get('/tasks/active',checkJwt,getTask);
router.get('/tasks/history',checkJwt,getAllPastTask);
router.post('/tasks/assign',checkJwt,assignTask);

export default router;