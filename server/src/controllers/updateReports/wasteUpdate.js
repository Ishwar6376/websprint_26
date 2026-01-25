import { db } from '../../firebaseadmin/firebaseadmin.js';
import admin from 'firebase-admin';

export const updateWasteReports = async (req, res) => {
  try {
    const { userId, email, reportId, geohash, updatedAt } = req.body;

    // 1. Debug Log: Look at this in your terminal when the error happens!
    console.log("DEBUG: Update Payload Received:", req.body);

    // 2. Strict Validation (Email IS required)
    if (!userId || !email || !reportId || !geohash) {
      console.error(`❌ Validation Failed! Missing fields. userId: ${userId}, email: ${email}, reportId: ${reportId}, geohash: ${geohash}`);
      return res.status(400).json({
        message: "Missing required fields: userId, email, reportId, or geohash."
      });
    }

    // 3. Update Logic (Using your existing nested path)
    const reportDocRef = db
      .collection('wasteReports')
      .doc(geohash)
      .collection('reports')
      .doc(userId)
      .collection('userReports')
      .doc(reportId);

    // Check if doc exists before updating (Optional but recommended)
    const doc = await reportDocRef.get();
    if (!doc.exists) {
        console.error("❌ Document not found at path:", reportDocRef.path);
        return res.status(404).json({ message: "Report document not found." });
    }

    await reportDocRef.update({
      interests: admin.firestore.FieldValue.arrayUnion(email),
      upvotes: admin.firestore.FieldValue.increment(1),
      updatedAt: updatedAt || admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      status: "VERIFIED",
      message: "Waste report updated successfully",
      reportId
    });

  } catch (error) {
    console.error("Update Waste Report Error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};