import { db } from "../../firebaseadmin/firebaseadmin.js";

export const resolveReport = async (req, res) => {
  try {
    const { reportId } = req.body; 

    if (!reportId) {
      return res.status(400).json({ status: "FAILED", message: "Report ID is required" });
    }

    const snapshot = await db.collectionGroup("userReports")
      .where("id", "==", reportId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ status: "FAILED", message: "Report not found" });
    }

   
    const docRef = snapshot.docs[0].ref;

    await docRef.update({
      status: "RESOLVED",
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      status: "SUCCESS",
      message: "Report marked as resolved successfully"
    });

  } catch (error) {
    console.error("Error resolving report:", error);
    return res.status(500).json({ status: "FAILED", message: error.message });
  }
};