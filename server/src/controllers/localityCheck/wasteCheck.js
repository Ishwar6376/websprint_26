import { db } from '../../firebaseadmin/firebaseadmin.js';

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const wasteCheck = async (req, res) => {
  try {
    const { location, geohash } = req.body; // Ensure using req.body, not req.data
    
    // Safety check
    if (!location?.lat || !location?.lng || !geohash) {
      return res.status(400).json({ message: "Invalid location or geohash data" });
    }

    const reportsCollectionRef = db
      .collection("wasteReports")
      .doc(geohash)
      .collection("reports");

    // [FIX START] Use listDocuments() to find virtual/phantom documents
    // regular .get() ignores documents that weren't explicitly created
    const userDocRefs = await reportsCollectionRef.listDocuments(); 

    if (userDocRefs.length === 0) {
      console.log("No users (virtual or real) found in geohash.");
      return res.status(200).json({ duplicateFound: false });
    }
    // [FIX END]

    let closestReport = null;
    let minDistance = Infinity;

    // Loop through the DocumentReferences (not Snapshots)
    for (const userDocRef of userDocRefs) {
      const userId = userDocRef.id; // We get the ID from the reference

      // Now query the subcollection for this specific user
      const reportsSnapshot = await userDocRef.collection("userReports").get();

      reportsSnapshot.forEach(reportDoc => {
        const reportData = reportDoc.data();

        if (reportData.location?.lat && reportData.location?.lng) {
          const distance = getDistanceInMeters(
            location.lat,
            location.lng,
            reportData.location.lat,
            reportData.location.lng
          );

          // Check distance (e.g., 6 meters)
          if (distance <= 6 && distance < minDistance) {
            minDistance = distance;
            closestReport = {
              imageUrl: reportData.imageUrl,
              userId: userId,
              reportId: reportDoc.id,      
              locality_email: reportData.email
            };
          }
        }
      });
    }

    if (closestReport) {
      console.log("Duplicate found via locality check.");
      return res.status(200).json({
        duplicateFound: true,
        data: closestReport
      });
    }

    return res.status(200).json({ duplicateFound: false });
  } catch (error) {
    console.error("Error in wasteCheck:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};