import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useState, useCallback, useMemo } from "react";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const center = { lat: 20.5937, lng: 78.9629 };

// Keeping default map colors as requested
const mapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: false, // Hiding default zoom to keep UI super clean (can enable if needed)
};

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
    try {
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
    } catch (e) {
      console.error("Failed to fetch reports", e);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const stats = useMemo(() => {
    const counts = { TOTAL: markers.length };
    Object.keys(icons).forEach(dept => counts[dept] = 0);
    markers.forEach(m => {
      if (counts[m.department] !== undefined) {
        counts[m.department]++;
      }
    });
    return counts;
  }, [markers]);

  if (!isLoaded) return <div className="h-screen w-full bg-zinc-100 flex items-center justify-center animate-pulse">Loading...</div>;

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* --- FLOATING TITLE CARD (Top Left) --- */}
      <div className="absolute top-6 left-6 z-50 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 rounded-2xl pointer-events-auto flex items-center gap-4 min-w-[280px]">
           <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
           </div>
           <div>
              <h1 className="text-gray-900 font-black text-lg leading-tight tracking-tight">City Overview</h1>
              <div className="flex items-center gap-2 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Updates</p>
              </div>
           </div>
           <div className="ml-auto text-right">
              <span className="block text-2xl font-black text-gray-900 leading-none">{stats.TOTAL}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase">Reports</span>
           </div>
        </div>
      </div>

      {/* --- FLOATING EXIT BUTTON (Top Right) --- */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={() => window.history.back()}
          className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] h-12 w-12 rounded-full flex items-center justify-center text-gray-600 hover:text-red-600 hover:scale-110 transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* --- GLASS DOCK SIDEBAR (Left Center) --- */}
      <div className="absolute top-1/2 -translate-y-1/2 left-6 z-40">
        <div className="flex flex-col gap-3 bg-white/80 backdrop-blur-xl p-2 rounded-2xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          {Object.entries(icons).map(([dept, iconUrl]) => (
            <div key={dept} className="group relative flex items-center justify-center">
              {/* Tooltip on Hover */}
              <div className="absolute left-14 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                 {dept} <span className="text-gray-400 ml-1">|</span> <span className="text-blue-400 ml-1">{stats[dept]}</span>
              </div>
              
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform cursor-help">
                 <img src={iconUrl} className="w-6 h-6 object-contain opacity-80 group-hover:opacity-100" alt={dept} />
              </div>
              
              {/* Badge Count */}
              {stats[dept] > 0 && (
                <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-sm border border-white">
                  {stats[dept]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* --- MAP COMPONENT --- */}
      <div className="w-full h-full">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={5}
          options={mapOptions}
        >
          {markers.map((r) => (
            <Marker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              icon={{
                url: icons[r.department],
                scaledSize: new window.google.maps.Size(42, 42),
                anchor: new window.google.maps.Point(21, 21), // Center anchor
              }}
              onClick={() => setSelected(r)}
              animation={window.google.maps.Animation.DROP}
            />
          ))}

          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
              options={{ 
                 maxWidth: 340,
                 disableAutoPan: false,
                 pixelOffset: new window.google.maps.Size(0, -20)
              }}
            >
              {/* MODERN CARD LAYOUT */}
              <div className="w-[260px] font-sans">
                {/* Image Area */}
                <div className="relative h-36 w-full rounded-xl overflow-hidden shadow-inner bg-gray-50">
                   {selected.imageUrl ? (
                      <img src={selected.imageUrl} className="w-full h-full object-cover" alt="Incident" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs font-medium">
                         No Image
                      </div>
                   )}
                   <div className="absolute top-2 left-2">
                      <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 shadow-sm">
                         {selected.department}
                      </span>
                   </div>
                </div>

                {/* Content Area */}
                <div className="pt-3 pb-1">
                   <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">{selected.title}</h3>
                   <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
                      {selected.description}
                   </p>

                   <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <div className="bg-white p-1 rounded-full shadow-sm">
                        <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">
                        {selected.address || "Location unavailable"}
                      </span>
                   </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}