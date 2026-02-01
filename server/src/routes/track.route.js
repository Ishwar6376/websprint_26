import express from "express"

import {checkJwt} from "../auth/authMiddleware.js"
import {trackReport,confirmResolution,rejectResolution} from "../controllers/track/track.controller.js"

const router=express.Router();

router.get("/:reportId",checkJwt,trackReport);
router.post("/confirm",confirmResolution);
router.post("/reject",rejectResolution)
export default router;