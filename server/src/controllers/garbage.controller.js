import { db } from "../firebaseadmin/firebaseadmin.js";

export async function getUserGarbageReport(req, res) {
    try {
        const userId = req.auth?.payload?.sub;

        if (!userId) {
            return res.status(401).json({ message: "User ID not found in token" });
        }

        console.log("Fetching reports for User ID:", userId);

        const snapshot = await db.collection("garbageReports")
            .where("userId", "==", userId)
            .get();

        if (snapshot.empty) {
            return res.status(200).json({ reports: [] });
        }

        const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`Found ${reports.length} reports.`);

        return res.status(200).json({ reports });

    } catch (error) {
        console.error("Error fetching garbage reports:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}



export async function getGarbageReportById(req, res) {
  try {
    const { id } = req.params;
    console.log(id)
    const userId = req.auth?.payload?.sub; 

    if (!id) {
      return res.status(400).json({ message: "Report ID is required" });
    }

   
    const docRef = db.collection("garbageReports").doc(id);
    const docSnap = await docRef.get();

    
    if (!docSnap.exists) {
      return res.status(404).json({ message: "Report not found" });
    }

    const data = docSnap.data();

   
    if (data.userId !== userId) {
       return res.status(403).json({ message: "Unauthorized to view this report" });
    }

    
    return res.status(200).json({
      report: {
        id: docSnap.id,
        ...data,
      },
    });

  } catch (error) {
    console.error("Error fetching report details:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}