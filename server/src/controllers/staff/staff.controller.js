import {db} from ".././../firebaseadmin/firebaseadmin.js"
import admin from 'firebase-admin';
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
      reportGeohash,imageUrl
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
      deadline: deadline ? admin.firestore.Timestamp.fromDate(new Date(deadline)) : null
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