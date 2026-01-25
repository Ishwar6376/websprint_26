import express from "express";
import room_data from "../controllers/women/room_data.js";
import log_suspicious from "../controllers/women/log-suspicious.js";
import throttle_room from "../controllers/women/throttle_room.js";
import log_sos from "../controllers/women/log-sos.js";
import getAlertDetails from "../controllers/women/getalertdetails.js";
import getSuspiciousActivity from "../controllers/women/roomController.js";
const router = express.Router();
router.post("/room_data",room_data)
router.post("/log-suspicious",log_suspicious)
router.post("/log-sos",log_sos)
router.post("/throttle-room",throttle_room)
router.post("/get-alert-details",getAlertDetails)
router.post("/get-suspicious",getSuspiciousActivity)

export default router;

