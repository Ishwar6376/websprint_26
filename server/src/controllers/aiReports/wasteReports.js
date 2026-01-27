import { db } from '../../firebaseadmin/firebaseadmin.js';

export const saveWasteReport = async (req, res) => {
  try {
    const data = req.body;
    const { userId, geohash } = data;

    if (!userId || !geohash) {
      return res.status(400).json({ message: "Missing userId or geohash in payload" });
    }

    

    const reportDocRef = db
      .collection('wasteReports')
      .doc(geohash)
      .collection('reports')
      .doc(userId)
      .collection('userReports')
      .doc();

    const dataToSave = { 
      ...data,
      id: reportDocRef.id,
      userId: userId,     
      geohash: geohash     
    };

    
    await reportDocRef.set(dataToSave);

    return res.status(200).json({
      status: "VERIFIED",
      message: "waste report saved successfully",
      reportId: reportDocRef.id
    });

  } catch (error) {
    console.error("Error saving waste report:", error);
    return res.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};