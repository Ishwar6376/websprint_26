import { db } from "../../firebaseadmin/firebaseadmin.js";
import admin from 'firebase-admin';

export const trackReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    

    const snapshot = await db.collectionGroup('userReports')
      .where('id', '==', reportId) 
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "Report not found" });
    }

    const reportData = snapshot.docs[0].data();
    res.json(reportData);

  } catch (error) {
    console.error("Track Report Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const confirmResolution = async (req, res) => {
  try {
    const { taskId, reportId } = req.body;

    if (!taskId || !reportId) {
      return res.status(400).json({ message: "Missing Task ID or Report ID" });
    }

    const taskRef = db.collection('tasks').doc(taskId);
    await taskRef.update({
      status: 'COMPLETED',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const reportQuery = await db.collectionGroup('userReports')
      .where('id', '==', reportId)
      .limit(1)
      .get();

    if (!reportQuery.empty) {
      await reportQuery.docs[0].ref.update({
        status: 'RESOLVED', // Matches your timeline step status
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(200).json({ success: true, message: "Issue closed successfully" });
  } catch (error) {
    console.error("Confirmation Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const rejectResolution = async (req, res) => {
  try {
    const { taskId, reportId, reason } = req.body;

    if (!taskId || !reportId) {
      return res.status(400).json({ message: "Missing Task ID or Report ID" });
    }

    
    await db.collection('tasks').doc(taskId).update({
      status: 'PENDING',
      rejectionReason: reason || "Citizen was not satisfied with the resolution.",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

   
    const reportQuery = await db.collectionGroup('userReports')
      .where('id', '==', reportId)
      .limit(1)
      .get();

    if (!reportQuery.empty) {
      await reportQuery.docs[0].ref.update({
        status: 'ASSIGNED', 
        rejectionReason: reason,
        proofImageUrl: admin.firestore.FieldValue.delete(), 
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(200).json({ message: "Task returned to staff for rework" });
  } catch (error) {
    console.error("Rejection Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};