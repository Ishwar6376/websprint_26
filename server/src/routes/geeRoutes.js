import express from "express";
import { checkJwt } from "../auth/authMiddleware.js";
const router=express.Router()
import {generatefireReport } from "../controllers/gee/viirs.js";
import {generateFloodReport} from "../controllers/gee/sentinel1.js";
import { generateLandHeatReport } from "../controllers/gee/landsat8_9.js";
import {generateDeforestationReport} from "../controllers/gee/copernicus.js"
import {generatePollutantsReport} from "../controllers/gee/sentinel5p.js"
import {generateCoastalReport} from "../controllers/gee/landsat.js"
router.post('/generatefireReport',checkJwt,generatefireReport)
router.post('/generateFloodReport',checkJwt,generateFloodReport)
router.post('/generateLandHeatReport',checkJwt,generateLandHeatReport)
router.post('/generateDeforestationReport',checkJwt,generateDeforestationReport)
router.post('/generatePollutantsReport',checkJwt,generatePollutantsReport)
router.post('/generateCoastalReport',checkJwt,generateCoastalReport)

export default router;