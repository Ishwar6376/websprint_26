import express from "express";
import admin from "firebase-admin"; // ✅ REQUIRED
import { db } from "../firebaseadmin/firebaseadmin.js";

const router = express.Router();


// ================= GET MAP REPORTS =================
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collectionGroup("userReports").get();

    const reports = snapshot.docs.map(doc => {
      const data = doc.data();
      const path = doc.ref.path;

      let department = "INFRASTRUCTURE";
      if (path.includes("wasteReports")) department = "WASTE";
      if (path.includes("waterReports")) department = "WATER";
      if (path.includes("electricityReports")) department = "ELECTRICITY";
      if (path.includes("fireReports")) department = "FIRE";

      return {
        id: doc.id,
        department,
        path,          // 🔥 IMPORTANT FOR VOTING
        ...data
      };
    });

    res.json({ success: true, data: reports });

  } catch (err) {
    console.error("MAP REPORT ERROR:", err);
    res.status(500).json({ success: false });
  }
});


// ================= VOTE =================
router.post("/vote", async (req, res) => {
  try {
    const { path, type } = req.body;

    if (!path) return res.status(400).json({ error: "Path missing" });

    const docRef = db.doc(path);  // ✅ direct Firestore path

    const field = type === "upvote" ? "upvotes" : "downvotes";

    await docRef.update({
      [field]: admin.firestore.FieldValue.increment(1)  // ✅ FIXED
    });

    res.json({ success: true });

  } catch (err) {
    console.error("VOTE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
