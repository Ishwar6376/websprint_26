import { db } from "../../firebaseadmin/firebaseadmin.js";

export const saveFireReport = async (req, res) => {
  try {
    const data = req.body;
    const { userId, geohash } = data;

    if (!userId || !geohash) {
      return res.status(400).json({ message: "Missing userId or geohash" });
    }

    const dataToSave = { ...data };
    delete dataToSave.userId;
    delete dataToSave.geohash;

    const reportDocRef = db
      .collection("fireReports")
      .doc(geohash)
      .collection("reports")
      .doc(userId)
      .collection("userReports")
      .doc();

    await reportDocRef.set({
      ...dataToSave,
      status: "PENDING",
      createdAt: new Date()
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Fire report saved",
      reportId: reportDocRef.id
    });

  } catch (error) {
    console.error("Fire save error:", error);
    res.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};
