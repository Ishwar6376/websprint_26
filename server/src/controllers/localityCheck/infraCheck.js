export const infraCheck = async (req, res) => {
  try {
    const { location, geohash } = req.body;

    if (!location?.lat || !location?.lng || !geohash) {
      return res.status(400).json({ message: "Invalid location or geohash data" });
    }

    // 1. Get center hash + 8 neighbors
    const neighbors = ngeohash.neighbors(geohash);
    const geohashesToCheck = [geohash, ...neighbors];

    let closestReport = null;
    let minDistance = Infinity;

    // 2. Parallel execution for speed
    await Promise.all(geohashesToCheck.map(async (hash) => {
      const reportsCollectionRef = db
        .collection("infrastructureReports")
        .doc(hash)
        .collection("reports");

      // Use listDocuments to handle virtual docs
      const userDocRefs = await reportsCollectionRef.listDocuments();
      if (userDocRefs.length === 0) return;

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

            if (distance <= 6 && distance < minDistance) {
              minDistance = distance;
              closestReport = {
                imageUrl: reportData.imageUrl,
                userId: userId,
                reportId: reportDoc.id,
                locality_email: reportData.email,
                distance: distance
              };
            }
          }
        });
      }
    }));

    if (closestReport) {
      console.log(`[Infra] Duplicate found. Distance: ${closestReport.distance}m`);
      return res.status(200).json({ duplicateFound: true, data: closestReport });
    }

    return res.status(200).json({ duplicateFound: false });

  } catch (error) {
    console.error("Error in infraCheck:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};