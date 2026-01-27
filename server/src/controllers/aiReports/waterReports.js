import { db } from '../../firebaseadmin/firebaseadmin.js';

export const saveWaterReport = async (req, res) => {
  try {
    const data = req.body;
    const { userId, geohash } = data;

    if (!userId || !geohash) {
      return res.status(400).json({ message: "Missing userId or geohash in payload" });
    }

    const dataToSave = { ...data };

    const reportDocRef = db
      .collection('waterReports')
      .doc(geohash)
      .collection('reports')
      .doc(userId)
      .collection('userReports')
      .doc();
    const finalData = {
        ...dataToSave,
        id: reportDocRef.id, 
        createdAt: new Date() 
    };
    
    await reportDocRef.set(finalData);

    return res.status(200).json({
      status: "VERIFIED",
      message: "Water report saved successfully",
      reportId: reportDocRef.id
    });

  } catch (error) {
    return res.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};
