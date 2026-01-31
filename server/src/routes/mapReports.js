import express from "express";
import admin from "firebase-admin";
import { db } from "../firebaseadmin/firebaseadmin.js";

const router = express.Router();


// ================= GET MAP REPORTS =================
router.get("/", async (req, res) => {
  try {
    let reports = [];

    // 🔹 1. NORMAL REPORTS
    const snap = await db.collectionGroup("userReports").get();

    snap.forEach(doc => {
      const data = doc.data();
      const path = doc.ref.path;

      let department = "INFRASTRUCTURE";
      if (path.includes("wasteReports")) department = "WASTE";
      if (path.includes("waterReports")) department = "WATER";
      if (path.includes("electricityReports")) department = "ELECTRICITY";

      reports.push({
        id: doc.id,
        department,
        path,
        ...data
      });
    });

    // 🔥 2. FIRE REPORTS (ARCHIVED)
    const fireSnap = await db.collection("archived_reports").get();

    fireSnap.forEach(doc => {
      reports.push({
        id: doc.id,
        department: "FIRE",
        path: `archived_reports/${doc.id}`, // 🔥 needed for voting
        ...doc.data()
      });
    });

    res.json({ success: true, data: reports });

  } catch (err) {
    console.error("MAP REPORT ERROR:", err);
    res.status(500).json({ success: false });
  }
});


// ================= VOTING =================
router.post("/vote", async (req, res) => {
  try {
    const { path, type } = req.body;

    if (!path) return res.status(400).json({ error: "Path missing" });

    const docRef = db.doc(path);
    const field = type === "upvote" ? "upvotes" : "downvotes";

    await docRef.update({
      [field]: admin.firestore.FieldValue.increment(1),
    });

    res.json({ success: true });

  } catch (err) {
    console.error("VOTE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
