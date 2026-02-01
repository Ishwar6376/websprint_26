import {db} from ".././../firebaseadmin/firebaseadmin.js"
import admin from 'firebase-admin';
import {pushNotificationToUser} from "../../utils/pushNotification.js"

export const getTask = async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub; 

    const tasksRef = db.collection('tasks');
    const snapshot = await tasksRef
      .where('assignedTo', '==', userId)
      .where('status', 'in', ['PENDING', 'IN_PROGRESS'])
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const tasks = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        ...data,
        
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        deadline: data.deadline ? data.deadline.toDate().toISOString() : null
      });
    });

    res.json(tasks);

  } catch (error) {
    console.error("Error fetching staff tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
export const getAllPastTask = async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub; 


    const tasksRef = db.collection('tasks');
    const snapshot = await tasksRef
      .where('assignedTo', '==', userId)
      .where('status', 'in', ['COMPLETED', 'VERIFIED', 'RESOLVED'])
      .get();
    if (snapshot.empty) {
      return res.json([]);
    }
    const tasks = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        deadline: data.deadline ? data.deadline.toDate().toISOString() : null,
        completedAt: data.completedAt ? data.completedAt.toDate().toISOString() : null
      });
    });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching past tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
export const assignTask = async (req, res) => {
  try {
    const { 
      title, description, priority, deadline, 
      assignedTo, assignedToName, zoneGeohash, location,
      reportId, email: reporterEmail, department,
      reportGeohash,imageUrl,severity,address,reporterUserId
    } = req.body;
    
    const assignedBy = req.auth?.payload?.sub || req.user?.sub; 

    if (!assignedTo || !title) return res.status(400).json({ message: "Missing required fields." });

  
    const newTask = {
      title,
      description: description || "",
      priority: priority || "MEDIUM", 
      status: "PENDING",
      assignedTo,
      assignedToName: assignedToName || "Staff Member",
      assignedBy,
      zoneGeohash, 
      department: department || 'waste',
      location: location || {},
      reportId: reportId || null, 
      reporterEmail: reporterEmail || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      imageUrl:imageUrl,
      deadline: deadline ? admin.firestore.Timestamp.fromDate(new Date(deadline)) : null,
      severity,
      address,
      reporterUserId

    };

    const taskRef = await db.collection('tasks').add(newTask);

    
    if (reportId && reporterEmail) {
      const userSnapshot = await db.collection('users').where('email', '==', reporterEmail).limit(1).get();

      if (!userSnapshot.empty) {
        const reporterUid = userSnapshot.docs[0].data().uid;
        
       
        const targetHash = reportGeohash || zoneGeohash;
        
        const reportPath = `${department}Reports/${targetHash}/reports/${reporterUid}/userReports/${reportId}`;
        
        try {
          await db.doc(reportPath).update({ 
            status: 'ASSIGNED', 
            assignedTaskId: taskRef.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Report updated at: ${reportPath}`);
        } catch (updateErr) {
          console.error(`Failed to update report at ${reportPath}`, updateErr);
        }
      }
    }

    res.status(201).json({ message: "Task assigned successfully", taskId: taskRef.id });

  } catch (error) {
    console.error("Error assigning task:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const resolveTask = async (req, res) => {
  try {
    const { taskId, proofImageUrl } = req.body;
    const staffId = req.auth?.payload?.sub;

    if (!proofImageUrl) {
      return res.status(400).json({ message: "Proof image URL is required." });
    }

    const taskDoc = await db.collection('tasks').doc(taskId).get();
    if (!taskDoc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    const taskData = taskDoc.data();
    const { reportId, reporterEmail, department } = taskData;


    await taskDoc.ref.update({
      status: 'USERVERIFICATION',
      proofImageUrl: proofImageUrl,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (reportId) {
      // 2. Update the Citizen's Report in Main DB
      const reportSnapshot = await db.collectionGroup('userReports')
        .where('id', '==', reportId)
        .limit(1)
        .get();

      if (!reportSnapshot.empty) {
        const reportDoc = reportSnapshot.docs[0];
        const reportData = reportDoc.data();
        
        // CRITICAL FIX: Extract userId from report data
        const reporterUid = reportData.userId; 

        await reportDoc.ref.update({
          status: "USERVERIFICATION",
          proofImageUrl: proofImageUrl,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 3. Persistent Notification
        const notificationRef = db.collection("notifications").doc();
        const notificationPayload = {
          id: notificationRef.id,
          userId: reporterUid,
          message: `Update: Your ${department} report has been resolved. Click to view proof.`,
          type: 'success',
          link: `/track/${reportId}`,
          isRead: false,
          createdAt: new Date().toISOString()
        };

        await notificationRef.set(notificationPayload);

        // 4. Real-time Push
        await pushNotificationToUser(reporterUid, notificationPayload);
        
        console.log(`Main DB Report ${reportId} updated and user ${reporterUid} notified.`);
      }
    }

    res.status(200).json({ message: "Task resolved and citizen notified" });

  } catch (error) {
    console.error("Resolve Task Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};