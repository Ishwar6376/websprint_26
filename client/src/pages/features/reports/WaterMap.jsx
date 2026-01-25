import { useEffect, useState } from "react";
// Assuming you have this from your other files, otherwise use a standard library wrapper
import GoogleMapComponent from "../../../components/google-map"; 

const MOCK_WATER_INCIDENTS = [
  { id: 101, lat: 0.001, lng: 0.001, type: "leak" }, // Offset from user
  { id: 102, lat: -0.002, lng: 0.002, type: "shortage" },
];

export default function WaterMap({ userLocation, activeReport }) {
  const [markers, setMarkers] = useState([]);

  // Simulate fetching nearby water incidents
  useEffect(() => {
    if (userLocation) {
      const nearby = MOCK_WATER_INCIDENTS.map(inc => ({
        ...inc,
        lat: userLocation.lat + inc.lat,
        lng: userLocation.lng + inc.lng
      }));
      setMarkers(nearby);
    }
  }, [userLocation]);

  return (
    <div className="w-full h-full relative group">
      {/* Map Implementation */}
      <GoogleMapComponent
        userLocation={userLocation}
        markers={markers}
        // Passing a custom map style ID if you have one, or use standard
        mapId="YOUR_WATER_MAP_ID" 
        selectedFeature="water" // To color markers blue in your generic component
      />

      {/* Floating Map Controls (Overlay) */}
      <div className="absolute top-6 right-6 flex flex-col gap-2">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold text-zinc-300">Active Leaks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-500"></span>
            <span className="text-xs font-bold text-zinc-300">Resolved</span>
          </div>
        </div>
      </div>

      {/* Aesthetic Overlay (Vignette) */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
    </div>
  );
}