// GET /api/track/:reportId
import {db} from "../../firebaseadmin/firebaseadmin.js"
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
    console.log(error)
    res.status(500).json({ error: error.message });
  }
};