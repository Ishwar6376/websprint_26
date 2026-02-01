import express from "express"
const router=express.Router()
import { saveElectricityReport } from "../controllers/aiReports/electricityReports.js"
import { saveInfrastructureReport } from "../controllers/aiReports/infraReports.js"
import { saveWasteReport } from "../controllers/aiReports/wasteReports.js"
import { saveWaterReport } from "../controllers/aiReports/waterReports.js"
import { saveUncertainReport } from "../controllers/aiReports/uncertainReports.js"
import { updateInfrastructureReports } from "../controllers/updateReports/infraUpdate.js"
import { updateWasteReports } from "../controllers/updateReports/wasteUpdate.js"
import { updateWaterReports } from "../controllers/updateReports/waterUpdate.js"
import { updateelectricityReports } from "../controllers/updateReports/electricityUpdate.js"
import {fetch3Reports} from "../controllers/fetchReports/fetch3Reports.js"
import { checkJwt } from "../auth/authMiddleware.js"
import {resolveReport} from "../controllers/report/report.controller.js"
import { saveFireReport } from "../controllers/aiReports/fireReports.js";          
import { updateFireReports } from "../controllers/updateReports/fireUpdate.js";
import { FireReport } from "../controllers/saveReports/saveFireReport.js"
import {FetchAdminFireHistory} from "../controllers/saveReports/fetchAdminFireHistory.js"
router.post('/waterReports',saveWaterReport)
router.post('/wasteReports',saveWasteReport)
router.post('/infrastructureReports',saveInfrastructureReport)
router.post('/electricityReports',saveElectricityReport)
router.post('/uncertainReports',saveUncertainReport)
router.post('/updatewaterReports',updateWaterReports)
router.post('/updatewasteReports',updateWasteReports)
router.post('/updateinfrastructureReports',updateInfrastructureReports)
router.post('/updateelectricityReports',updateelectricityReports)
router.post('/fetch3Reports',checkJwt,fetch3Reports)
router.put('/resolve',resolveReport)
router.post('/fireReports', saveFireReport);                
router.post('/updatefireReports', updateFireReports);  
router.post('/saveFireReport',FireReport); 
router.get('/FetchAdminFireHistory',FetchAdminFireHistory)
  


export default router