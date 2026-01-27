
import { db } from "../../firebaseadmin/firebaseadmin.js";

export const fetchReportsByUserId = async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;


    if (!userId) {
      return res.status(400).json({ status: "FAILED", message: "User ID is required" });
    }

    const snapshot = await db.collectionGroup("userReports")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc") 
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ 
        status: "SUCCESS", 
        data: { waste: [], infrastructure: [], water: [] } 
      });
    }

    const categorizedReports = {
      waste: [],
      infrastructure: [],
      water: []
    };

    snapshot.forEach((doc) => {
      const pathSegments = doc.ref.path.split("/");
      const rootCollection = pathSegments[0]; 
      
      const data = doc.data();
      
      let geohash = data.geohash;
      if (!geohash && pathSegments.length > 1) {
        geohash = pathSegments[1];
      }

      const reportObj = {
        ...data,
        id: doc.id,
        geohash: geohash,
        category: rootCollection 
      };

      
      if (rootCollection === "wasteReports") {
        categorizedReports.waste.push(reportObj);
      } else if (rootCollection === "infrastructureReports") {
        categorizedReports.infrastructure.push(reportObj);
      } else if (rootCollection === "waterReports") {
        categorizedReports.water.push(reportObj);
      }
    });

    return res.status(200).json({
      status: "SUCCESS",
      count: snapshot.size,
      data: categorizedReports,
    });

  } catch (error) {
    console.error("Error fetching user reports:", error);
    return res.status(500).json({ status: "FAILED", message: error.message });
  }
};