import express from "express"

import {checkJwt} from "../auth/authMiddleware.js"
import {trackReport} from "../controllers/track/track.controller.js"

const router=express.Router();

router.get("/:reportId",checkJwt,trackReport);

export default router;