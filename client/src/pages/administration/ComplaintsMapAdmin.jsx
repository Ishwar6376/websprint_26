import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useState, useCallback, useMemo } from "react";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const center = { lat: 20.5937, lng: 78.9629 }; // India center

const icons = {
  FIRE: "/icons/fire-map-report.png",
  WATER: "/icons/water-map-report.png",
  ELECTRICITY: "/icons/electricity-map-report.png",
  WASTE: "/icons/waste-map-report.png",
  INFRASTRUCTURE: "/icons/infra-map-report.png",
};

export default function AdminComplaintsMap() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);

  const fetchReports = useCallback(async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/map-reports`);
    const json = await res.json();
    const reports = json.data || [];

    const markerData = reports
      .map(r => {
        const lat = parseFloat(r.location?.lat);
        const lng = parseFloat(r.location?.lng);
        if (!lat || !lng) return null;
        return { ...r, lat, lng };
      })
      .filter(Boolean);

    setMarkers(markerData);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  /** * NEW: Calculate counts based on current markers 
   */
  const stats = useMemo(() => {
    const counts = { TOTAL: markers.length };
    // Initialize all departments to 0 so they show up even if empty
    Object.keys(icons).forEach(dept => counts[dept] = 0);
    
    markers.forEach(m => {
      if (counts[m.department] !== undefined) {
        counts[m.department]++;
      }
    });
    return counts;
  }, [markers]);

  if (!isLoaded) return <div className="text-white p-10">Loading Map...</div>;

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* HEADER BAR */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-zinc-900 text-white flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
            <h2 className="font-bold text-sm">📍 City Complaints Overview</h2>
            <span className="bg-zinc-700 text-[10px] px-2 py-0.5 rounded border border-zinc-600">
                TOTAL: {stats.TOTAL}
            </span>
        </div>
        <button
          onClick={() => window.history.back()}
          className="bg-red-600 px-4 py-1.5 rounded-lg text-xs font-semibold"
        >
          ← Back
        </button>
      </div>

      {/* NEW: FLOATING STATS SIDEBAR */}
      <div className="absolute top-20 left-4 z-40 flex flex-col gap-2 pointer-events-none">
        {Object.entries(icons).map(([dept, iconUrl]) => (
          <div 
            key={dept} 
            className="flex items-center gap-3 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-xl border border-gray-200 min-w-[140px] pointer-events-auto"
          >
            <img src={iconUrl} className="w-7 h-7 object-contain" alt={dept} />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase leading-none">{dept}</span>
              <span className="text-base font-black text-gray-900">{stats[dept]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MAP */}
      <div className="pt-14">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={5}
          options={{ 
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false
          }}
        >
          {markers.map((r) => (
            <Marker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              icon={{
                url: icons[r.department],
                scaledSize: new window.google.maps.Size(35, 35),
              }}
              onClick={() => setSelected(r)}
            />
          ))}

          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div style={{ width: 200, padding: '2px', color: 'black' }}>
                {selected.imageUrl && (
                    <img 
                        src={selected.imageUrl} 
                        style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }} 
                    />
                )}
                <b className="text-sm block">{selected.title}</b>
                <p className="text-xs text-gray-600 mt-1">{selected.description}</p>
                <hr className="my-2" />
                <p style={{ fontSize: 10 }} className="text-gray-400 italic">{selected.address}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}