import express from "express";
import { db } from "../firebaseadmin/firebaseadmin.js"; 
import { pushNotificationToUser } from "../utils/pushNotification.js";
import { checkJwt } from "../auth/authMiddleware.js";

const router = express.Router();



router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
   
    const snapshot = await db.collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

   
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching from Firestore:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.patch("/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;

    await db.collection("notifications").doc(notificationId).update({ isRead: true });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/trigger", async (req, res) => {
  try {

    const { userId, message, type, link } = req.body; 

    const docRef = db.collection("notifications").doc();
    
    const notificationData = {
      id: docRef.id,
      userId,
      message,
      type: type || 'info',
      link: link || null, 
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await docRef.set(notificationData);
    await pushNotificationToUser(userId, notificationData);

    res.json({ success: true, data: notificationData });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
export default router;