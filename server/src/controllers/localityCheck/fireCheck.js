import { db } from '../../firebaseadmin/firebaseadmin.js';

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const fireCheck = async (req, res) => {
  try {
    const { location, geohash } = req.body;

    if (!location?.lat || !location?.lng || !geohash) {
      return res.status(400).json({ message: "Invalid location or geohash data" });
    }

    const reportsCollectionRef = db
      .collection("fireReports")   // 🔥 FIRE COLLECTION
      .doc(geohash)
      .collection("reports");

    const userDocRefs = await reportsCollectionRef.listDocuments();

    if (userDocRefs.length === 0) {
      console.log("[Fire] No reports in this geohash yet.");
      return res.status(200).json({ duplicateFound: false });
    }

    let closestReport = null;
    let minDistance = Infinity;

    for (const userDocRef of userDocRefs) {
      const userId = userDocRef.id;

      const reportsSnapshot = await userDocRef
        .collection("userReports")
        .get();

      reportsSnapshot.forEach(reportDoc => {
        const reportData = reportDoc.data();

        if (reportData.location?.lat && reportData.location?.lng) {
          const distance = getDistanceInMeters(
            location.lat,
            location.lng,
            reportData.location.lat,
            reportData.location.lng
          );

          // 🔥 Fire spreads — allow bigger radius (15 meters)
          if (distance <= 15 && distance < minDistance) {
            minDistance = distance;

            closestReport = {
              imageUrl: reportData.imageUrl,
              userId,
              reportId: reportDoc.id,
              locality_email: reportData.email
            };
          }
        }
      });
    }

    if (closestReport) {
      console.log("[Fire] Duplicate fire incident found.");
      return res.status(200).json({
        duplicateFound: true,
        data: closestReport
      });
    }

    return res.status(200).json({ duplicateFound: false });

  } catch (error) {
    console.error("Error in fireCheck:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};
