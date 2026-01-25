import { db } from "../../firebaseadmin/firebaseadmin.js";

export const fetchWasteZones = async (req, res) => {
  try {
    const snapshot = await db.collectionGroup("userReports").get();

    if (snapshot.empty) {
      return res.status(200).json({ status: "SUCCESS", count: 0, zones: [] });
    }

    const rawReports = [];

    snapshot.forEach((doc) => {
      
      const pathSegments = doc.ref.path.split("/");

      if (pathSegments[0] !== "wasteReports") {
        return;
      }

      const data = doc.data();
      let geohash = data.geohash;

      if (!geohash && pathSegments.length > 1) {
        geohash = pathSegments[1];
      }

      if (geohash) {
        rawReports.push({ ...data, id: doc.id, geohash: geohash });
      }
    });

    const zonesMap = {};

    rawReports.forEach((report) => {
      const localityKey = report.geohash.substring(0, 5);

      if (!zonesMap[localityKey]) {
        zonesMap[localityKey] = {
          zoneId: localityKey,
          geohash: localityKey,
          totalReports: 0,
          criticalCount: 0,
          highCount: 0,
          clearedCount: 0,
          reports: [],
          center: report.location || { lat: 0, lng: 0 },
        };
      }

      const zone = zonesMap[localityKey];
      zone.totalReports++;

      if (report.severity === "CRITICAL") zone.criticalCount++;
      if (report.severity === "HIGH") zone.highCount++;
      if (report.status === "VERIFIED") zone.clearedCount++;

      zone.reports.push(report);
    });

    const zonesArray = Object.values(zonesMap).sort(
      (a, b) => b.totalReports - a.totalReports,
    );

    return res.status(200).json({
      status: "SUCCESS",
      count: zonesArray.length,
      zones: zonesArray,
    });
  } catch (error) {
    console.error("Error fetching waste zones:", error);
    return res.status(500).json({ status: "FAILED", message: error.message });
  }
};

export const fetchInfraZones = async (req, res) => {
  try {
    const snapshot = await db.collectionGroup("userReports").get();

    if (snapshot.empty) {
      return res.status(200).json({ status: "SUCCESS", count: 0, zones: [] });
    }

    const rawReports = [];

    snapshot.forEach((doc) => {
      
      const pathSegments = doc.ref.path.split("/");

      if (pathSegments[0] !== "infrastructureReports") {
        return;
      }

      const data = doc.data();
      let geohash = data.geohash;

      if (!geohash && pathSegments.length > 1) {
        geohash = pathSegments[1];
      }

      if (geohash) {
        rawReports.push({ ...data, id: doc.id, geohash: geohash });
      }
    });

    const zonesMap = {};

    rawReports.forEach((report) => {
      const localityKey = report.geohash.substring(0, 5);

      if (!zonesMap[localityKey]) {
        zonesMap[localityKey] = {
          zoneId: localityKey,
          geohash: localityKey,
          totalReports: 0,
          criticalCount: 0,
          highCount: 0,
          clearedCount: 0,
          reports: [],
          center: report.location || { lat: 0, lng: 0 },
        };
      }

      const zone = zonesMap[localityKey];
      zone.totalReports++;

      if (report.severity === "CRITICAL") zone.criticalCount++;
      if (report.severity === "HIGH") zone.highCount++;
      if (report.status === "VERIFIED") zone.clearedCount++;

      zone.reports.push(report);
    });

    const zonesArray = Object.values(zonesMap).sort(
      (a, b) => b.totalReports - a.totalReports,
    );

    return res.status(200).json({
      status: "SUCCESS",
      count: zonesArray.length,
      zones: zonesArray,
    });
  } catch (error) {
    console.error("Error fetching infrastructureReports zones:", error);
    return res.status(500).json({ status: "FAILED", message: error.message });
  }
};
