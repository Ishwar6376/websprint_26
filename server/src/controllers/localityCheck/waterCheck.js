import { db } from '../../firebaseadmin/firebaseadmin';

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
}

export const waterCheck = async (req, res) => {
    try {
        const { location, geohash } = req.body; 

        if (!location || !location.lat || !location.lng || !geohash) {
            return res.status(400).json({ message: "Invalid location or geohash data" });
        }

        const reportsRef = db.collection('waterReports').doc(geohash).collection('reports');
        const snapshot = await reportsRef.get();

        if (snapshot.empty) {
            return res.status(200).json({ duplicateFound: false });
        }

        let closestReport = null;
        let minDistance = Infinity;

        snapshot.forEach(doc => {
            const reportData = doc.data();
            const reportUserId = doc.id; 

            if (reportData.location?.lat && reportData.location?.lng) {
                const distance = getDistanceInMeters(
                    location.lat, location.lng, reportData.location.lat, reportData.location.lng
                );

                if (distance <= 6 && distance < minDistance) {
                    minDistance = distance;
                    closestReport = {
                        imageUrl: reportData.imageUrl,
                        geohash: geohash,
                        userId: reportUserId,
                        locality_email:reportData.email
                    };
                }
            }
        });

        if (closestReport) {
            return res.status(200).json({ duplicateFound: true, data: closestReport });
        } else {
            return res.status(200).json({ duplicateFound: false });
        }

    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};