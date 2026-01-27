import { memo, useState, useEffect } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import { Loader2, AlertCircle } from "lucide-react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";

// Dark Theme Map Styles
const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    {
      featureType: "road",
      elementType: "geometry.fill",
      stylers: [{ color: "#2c2c2c" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#000000" }],
    },
  ],
};

function ReportMap({ userLocation, refreshTrigger }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const { getAccessTokenSilently } = useAuth0();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  // Fetch Reports
  useEffect(() => {
    const fetchReports = async () => {
      if (!userLocation) return;
      try {
        const token = await getAccessTokenSilently({
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });

        // Using water endpoint as placeholder per instructions
        const res = await axios.get("/api/water", {
          params: { 
            lat: userLocation.lat, 
            lng: userLocation.lng,
            radius: 5000 
          },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setReports(res.data.reports || []);
      } catch (err) {
        console.error("Error fetching reports:", err);
      }
    };

    if (isLoaded) fetchReports();
  }, [isLoaded, userLocation, refreshTrigger, getAccessTokenSilently]);

  if (loadError) return <div className="flex h-full items-center justify-center text-zinc-500"><AlertCircle className="mr-2" /> Map Error</div>;
  if (!isLoaded) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={userLocation}
      zoom={15}
      options={mapOptions}
    >
      {/* 🧍 User Marker */}
      <Marker 
        position={userLocation} 
        title="You are here" 
        icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
        }}
      />

      {/* 📍 Report Markers */}
      {reports.map((r) => (
        <Marker
          key={r._id || r.id}
          position={{ lat: r.latitude || r.lat, lng: r.longitude || r.lng }}
          onClick={() => setSelectedReport(r)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: r.status === 'resolved' ? '#10b981' : (r.status === 'in_progress' ? '#3b82f6' : '#f59e0b'),
            fillOpacity: 0.9,
            strokeWeight: 1,
            strokeColor: "#ffffff",
            scale: 8,
          }}
        />
      ))}

      {/* ℹ️ Info Window */}
      {selectedReport && (
        <InfoWindow
          position={{ lat: selectedReport.latitude || selectedReport.lat, lng: selectedReport.longitude || selectedReport.lng }}
          onCloseClick={() => setSelectedReport(null)}
        >
          <div className="text-zinc-900 w-60 p-1">
            {selectedReport.imageUrl && (
                <img
                    src={selectedReport.imageUrl}
                    className="rounded-lg w-full h-28 object-cover bg-zinc-200 mb-2"
                    alt="report"
                    onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=No+Image'; }}
                />
            )}
            <div className="space-y-1">
              <h3 className="font-bold text-sm truncate">{selectedReport.title || "Issue Report"}</h3>
              <p className="text-xs text-zinc-600 line-clamp-3 leading-snug">{selectedReport.description}</p>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export default memo(ReportMap);