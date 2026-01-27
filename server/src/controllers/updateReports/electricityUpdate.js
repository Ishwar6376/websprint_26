import { db } from '../../firebaseadmin/firebaseadmin.js';
import admin from 'firebase-admin';

export const updateelectricityReports = async (req, res) => {
  try {
    const { userId, email, reportId, geohash, updatedAt } = req.body;

    if (!userId || !email || !reportId || !geohash) {
      return res.status(400).json({
        message: "Missing userId or email or reportId or geohash in payload"
      });
    }

    const reportDocRef = db
      .collection('electricityReports')
      .doc(geohash)
      .collection('reports')
      .doc(userId)
      .collection('userReports')
      .doc(reportId);

    await reportDocRef.update({
      interests: admin.firestore.FieldValue.arrayUnion(email),
      upvotes: admin.firestore.FieldValue.increment(1),
      updatedAt: updatedAt || admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      status: "VERIFIED",
      message: "Electricity report updated successfully",
      reportId
    });

  } catch (error) {
    console.error("Error updating electricity report:", error);
    return res.status(500).json({
      status: "FAILED",
      message: error.message,
    });
  }
};
