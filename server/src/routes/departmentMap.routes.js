import express from "express";
import { db } from "../firebaseadmin/firebaseadmin.js";

const router = express.Router();

router.get("/:department", async (req, res) => {
  try {
    const department = req.params.department?.toUpperCase();

    let reports = [];

    // 🔥 FIRE REPORTS (DIFFERENT COLLECTION)
    if (department === "FIRE") {
      const snap = await db.collection("archived_reports").get();
      reports = snap.docs.map(doc => ({
        id: doc.id,
        department: "FIRE",
        ...doc.data(),
      }));
    }

    // 🔥 OTHER DEPARTMENTS
    else {
      const snap = await db.collectionGroup("userReports").get();

      reports = snap.docs
        .map(doc => {
          const data = doc.data();
          const path = doc.ref.path;

          let dept = "";
          if (path.includes("waterReports")) dept = "WATER";
          if (path.includes("wasteReports")) dept = "WASTE";
          if (path.includes("electricityReports")) dept = "ELECTRICITY";
          if (path.includes("infrastructureReports")) dept = "INFRASTRUCTURE";

          return { id: doc.id, department: dept, ...data };
        })
        .filter(r => r.department === department);
    }

    res.json({ success: true, data: reports });
  } catch (err) {
    console.error("DEPT MAP ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
