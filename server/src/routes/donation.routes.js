import express from "express";
import {
  createDonation,
  getDonations,
} from "../controllers/donation.controller.js";
import { checkJwt } from "../auth/authMiddleware.js";
import { upload } from "../../middlewares/upload.js";

const router = express.Router();

router.post(
  "/",
  checkJwt,
  upload.single("image"),
  createDonation
);

router.get("/", getDonations);

export default router;





