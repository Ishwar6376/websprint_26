import {db} from "../../firebaseadmin/firebaseadmin.js"

export const FireReport = async (req, res) => {
  try {
    const reportDataToArchive = req.body || req.payload;

    if (!reportDataToArchive) {
      return res.status(400).json({ success: false, message: "No report data provided" });
    }
    const finalArchiveData = {
      ...reportDataToArchive,
      archivedAt: new Date().toISOString(), 
    };
    if (reportDataToArchive.id) {
      await db.collection("archived_reports")
        .doc(reportDataToArchive.id)
        .set(finalArchiveData);
    } else {
      await db.collection("archived_reports").add(finalArchiveData);
    }
    return res.status(200).json({ 
      success: true, 
      message: "Report archived successfully",
      reportId: reportDataToArchive.id
    });

  } catch (error) {
    console.error("Error archiving fire report:", error);
    
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error: Failed to archive report",
      error: error.message 
    });
  }
};