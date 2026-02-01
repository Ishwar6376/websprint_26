import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

// Standard Hook for loading Maps across the app
export const useGoogleMaps = () =>
  useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"], 
  });

const containerStyle = { width: "100%", height: "100vh" };

// Department Icons mapping
const icons = {
  FIRE: "/icons/fire-map-report.png",
  WATER: "/icons/water-map-report.png",
  ELECTRICITY: "/icons/electricity-map-report.png",
  WASTE: "/icons/waste-map-report.png",
  INFRASTRUCTURE: "/icons/infra-map-report.png",
};

export default function DepartmentComplaintMap() {
  const { department } = useParams();
  const { isLoaded } = useGoogleMaps();

  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!department) return;

    const fetchReports = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/department-map/${department}`);
        const json = await res.json();

        const markerData = (json.data || [])
          .map(r => {
            const lat = parseFloat(r.location?.lat);
            const lng = parseFloat(r.location?.lng);
            if (isNaN(lat) || isNaN(lng)) return null;
            return { ...r, lat, lng };
          })
          .filter(Boolean);

        setMarkers(markerData);
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };

    fetchReports();
  }, [department]);

  if (!isLoaded) return <div className="bg-black h-screen flex items-center justify-center text-white font-bold">LOADING GOOGLE MAPS...</div>;

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="absolute top-0 left-0 right-0 h-14 bg-zinc-900 text-white flex items-center justify-between px-4 z-50 border-b border-white/10 shadow-lg">
        <h2 className="font-bold text-sm uppercase tracking-wider">📍 {department} Department Feed</h2>
        <button onClick={() => window.history.back()} className="bg-red-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500 transition-colors">
          ← BACK
        </button>
      </div>

      <div className="pt-14 h-full">
        <GoogleMap 
          mapContainerStyle={containerStyle} 
          // Centered on India
          center={{ lat: 20.5937, lng: 78.9629 }} 
          zoom={5}
          options={{
            streetViewControl: false,
            mapTypeControl: true, // Allows users to switch to Satellite view if needed
            fullscreenControl: false,
          }}
        >
          {markers.map((r) => (
            <Marker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              icon={{
                url: icons[r.department] || "/icons/default-map-report.png",
                // Increased size (45x45) for better visibility
                scaledSize: new window.google.maps.Size(45, 45),
                origin: new window.google.maps.Point(0, 0),
                anchor: new window.google.maps.Point(22, 22),
              }}
              onClick={() => setSelected(r)}
            />
          ))}

          {selected && (
            <InfoWindow 
              position={{ lat: selected.lat, lng: selected.lng }} 
              onCloseClick={() => setSelected(null)}
            >
              <div className="p-1 max-w-[220px] text-black">
                {selected.imageUrl && (
                    <img src={selected.imageUrl} className="w-full rounded-md mb-2 border border-zinc-200" alt="report" />
                )}
                <h4 className="font-bold text-sm mb-1">{selected.title}</h4>
                <p className="text-[11px] leading-tight text-zinc-600 mb-2">{selected.description}</p>
                <div className="text-[9px] font-bold text-zinc-500 border-t pt-1 uppercase">
                  {selected.address}
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}