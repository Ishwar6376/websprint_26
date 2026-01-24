import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Route Imports
import authRoutes from "./src/routes/auth.js";
import roomRoutes from "./src/routes/room.js";
import modelRoutes from "./src/routes/model.js";
import geeRoutes from "./src/routes/geeRoutes.js";
import donationRoutes from "./src/routes/donation.routes.js";
import interestRoutes from "./src/routes/interest.routes.js";
import garbageRoutes from "./src/routes/garbage.route.js";
import jobRoutes from "./src/routes/job.route.js";
import setalertRoutes from "./src/routes/setalertsRoutes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import complaintRoutes from "./src/routes/complaint.routes.js";
import complaintStatsRoutes from "./src/routes/complaintStats.routes.js";
import complaintHistoryRoutes from "./src/routes/complaintHistory.routes.js";
import voiceRoutes from "./src/routes/voiceRoutes.js"
import localityRoutes from "./src/routes/locality.routes.js"
import reportRoutes from "./src/routes/report.routes.js"
const app = express();


console.log("CORS ORIGIN:", process.env.CORS_ORIGIN);

app.use(
  cors({
    origin: [process.env.CORS_ORIGIN, "http://localhost:5173",process.env.VITE_API_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());



app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/model", modelRoutes);
app.use("/api/gee", geeRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/garbage", garbageRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/alerts", setalertRoutes);

import municipalRoute from "./src/routes/waste.route.js"

app.use("/api/municipal",municipalRoute);






import staff from "./src/routes/staff.js"
app.use("/api/staff",staff);


import trackReport from "./src/routes/track.route.js"
app.use("/api/track",trackReport);

app.use('/uploads', express.static('uploads'));
app.use("/api/chats", chatRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/complaint-stats",complaintStatsRoutes);
app.use("/api/complaint-history",complaintHistoryRoutes);
app.use("/api/voice",voiceRoutes);
app.use("/api/locality",localityRoutes)
// app.use("/api/reports",reportRoutes)


app.get("/health", (req, res) => res.status(200).json({ message: "server is healthy" }));

export { app };