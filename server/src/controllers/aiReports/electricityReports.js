import { db } from '../../firebaseadmin/firebaseadmin.js';

export const saveElectricityReport = async (req, res) => {
  try {
    const data = req.body;
    const { userId, geohash } = data;

    if (!userId || !geohash) {
      return res.status(400).json({ message: "Missing userId or geohash in payload" });
    }

    const dataToSave = { ...data };
    delete dataToSave.userId;
    delete dataToSave.geohash;
    const reportDocRef = db
      .collection('electricityReports')
      .doc(geohash)
      .collection('reports')
      .doc(userId)
      .collection('userReports')
      .doc();
    await reportDocRef.set(dataToSave);
    console.log(`Electricity Report Saved: ${geohash} -> ${userId} -> ${reportDocRef.id}`);
    return res.status(200).json({
      status: "VERIFIED",
      message: "Electricity report saved successfully",
      reportId: reportDocRef.id
    });

  } catch (error) {
    console.error("Error saving electricity report:", error);
    return res.status(500).json({ status: "FAILED", message: error.message });
  }
};
