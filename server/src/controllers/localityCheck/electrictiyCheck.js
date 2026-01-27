import { db } from '../../firebaseadmin/firebaseadmin.js';
import ngeohash from 'ngeohash'; // You likely need this package

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

export const electricityCheck = async (req, res) => {
  try {
    const { location, geohash } = req.body;

    if (!location?.lat || !location?.lng || !geohash) {
      return res.status(400).json({ message: "Invalid location or geohash data" });
    }

    // 1. Get the center geohash and its 8 neighbors
    const neighbors = ngeohash.neighbors(geohash);
    const geohashesToCheck = [geohash, ...neighbors];

    let closestReport = null;
    let minDistance = Infinity;

    // 2. Loop through ALL 9 geohashes
    // Use Promise.all to fetch them in parallel for speed
    await Promise.all(geohashesToCheck.map(async (hash) => {
      
      const reportsCollectionRef = db
        .collection("electricityReports")
        .doc(hash) // Check this specific hash
        .collection("reports");

      const userDocRefs = await reportsCollectionRef.listDocuments();

      if (userDocRefs.length === 0) return;

      // Check users in this hash
      for (const userDocRef of userDocRefs) {
        const userId = userDocRef.id;
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

            // Distance check (6 meters)
            if (distance <= 6 && distance < minDistance) {
              minDistance = distance;
              closestReport = {
                imageUrl: reportData.imageUrl,
                userId,
                reportId: reportDoc.id,             
                locality_email: reportData.email,
                distance: distance // Useful for debugging
              };
            }
          }
        });
      }
    }));

    if (closestReport) {
      console.log(`[Electricity] Duplicate found. Distance: ${closestReport.distance}m`);
      return res.status(200).json({
        duplicateFound: true,
        data: closestReport
      });
    }

    return res.status(200).json({ duplicateFound: false });

  } catch (error) {
    console.error("Error in electricityCheck:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};