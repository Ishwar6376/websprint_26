import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useEffect, useState } from "react";

const containerStyle = { width: "100%", height: "100%" };
const icons = {
  FIRE: "/icons/fire-map-report.png",
  WATER: "/icons/water-map-report.png",
  ELECTRICITY: "/icons/electricity-map-report.png",
  WASTE: "/icons/waste-map-report.png",
  INFRASTRUCTURE: "/icons/infra-map-report.png",
};



export default function ComplaintMap({ userLocation }) {
  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/map-reports`);
      const json = await res.json();
      const reports = json.data || [];

      const grouped = {};

      reports.forEach(r => {
        const lat = parseFloat(r.location?.lat);
        const lng = parseFloat(r.location?.lng);

        // ✅ FIXED CHECK
        if (isNaN(lat) || isNaN(lng)) return;

        const key = `${lat}_${lng}_${r.department}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ ...r, lat, lng });
      });

      const markerData = Object.values(grouped).map(group => ({
        lat: group[0].lat,
        lng: group[0].lng,
        department: group[0].department,
        reports: group
      }));

      setMarkers(markerData);

    } catch (err) {
      console.error("MAP LOAD ERROR:", err);
    }
  };

const handleVote = async (report, type) => {
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/map-reports/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: report.path,   // 🔥 THIS IS THE KEY
        type: type
      })
    });

    // update UI instantly
    setSelected(prev => ({
      ...prev,
      reports: prev.reports.map(r =>
        r.id === report.id
          ? { ...r, [type === "upvote" ? "upvotes" : "downvotes"]: (r[type === "upvote" ? "upvotes" : "downvotes"] || 0) + 1 }
          : r
      )
    }));

  } catch (err) {
    console.error("Vote failed:", err);
  }
};


  return (
    <GoogleMap mapContainerStyle={containerStyle} center={userLocation} zoom={14}>
      {markers.map((m, i) => (
        <Marker
            key={i}
            position={{ lat: m.lat, lng: m.lng }}
            onClick={() => setSelected(m)}
            icon={{
                url: icons[m.department],
                scaledSize: new window.google.maps.Size(35, 35), // icon size
  }}
/>

      ))}

      {selected && (
        <InfoWindow position={{ lat: selected.lat, lng: selected.lng }} onCloseClick={() => setSelected(null)}>
          <div style={{ maxHeight: 260, overflowY: "auto", width: 260, color: "black" }}>
            <h3>{selected.department} Complaints</h3>

            {selected.reports.map(r => (
              <div key={r.id} style={{ borderBottom: "1px solid #ccc", marginBottom: 8 }}>
                <img src={r.imageUrl} width="100%" />
                <b>{r.title}</b>
                <p>{r.description}</p>

               <button onClick={() => handleVote(r, "upvote")}>
  👍 {r.upvotes || 0}
</button>

<button onClick={() => handleVote(r, "downvote")}>
  👎 {r.downvotes || 0}
</button>


              </div>
            ))}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}