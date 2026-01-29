import React, { useEffect, useState, useRef } from "react";
import { GoogleMap, DirectionsRenderer, Marker, OverlayView } from "@react-google-maps/api";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase/firebase"; // Adjust path as needed
import { 
  MapPin, 
  Navigation, 
  Map as MapIcon, 
  Loader2,
  Phone
} from "lucide-react";

// --- STYLES & ASSETS ---
const containerStyle = { width: "100%", height: "100%", borderRadius: "0 0 12px 12px" }; // Adjusted radius for bottom only
const FIRE_TRUCK_ICON = "/icons/fire-truck.png"; 

// --- MAIN COMPONENT ---
export default function UserLiveTracking({ report, isLoaded }) {
  const [truckLocation, setTruckLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [stats, setStats] = useState({ distance: "", duration: "" });
  
  const mapRef = useRef(null);

  // Store map instance
  const onLoad = (map) => {
    mapRef.current = map;
  };

  // 1. Listen to Real-Time Truck Location
  useEffect(() => {
    if (!report?.assignedTo || !report?.geohash) return;

    const sanitizedId = report.assignedTo.replace(/[^a-zA-Z0-9]/g, '_');
    const staffRef = ref(db, `staff/fire/${report.geohash}/${sanitizedId}`);

    const unsubscribe = onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.coords) {
        setTruckLocation({ 
          lat: parseFloat(data.coords.lat), 
          lng: parseFloat(data.coords.lng) 
        });
      }
    });

    return () => unsubscribe();
  }, [report]);

  // 2. Calculate Route & Bounds
  useEffect(() => {
    if (!isLoaded || !truckLocation || !report?.coords || !window.google) return;

    const directionsService = new window.google.maps.DirectionsService();
    const destination = { 
      lat: parseFloat(report.coords.lat), 
      lng: parseFloat(report.coords.lng) 
    };

    directionsService.route(
      {
        origin: truckLocation,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          const leg = result.routes[0].legs[0];
          setStats({ distance: leg.distance.text, duration: leg.duration.text });

          // Fit bounds to show both user and truck
          if (mapRef.current) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(truckLocation);
            bounds.extend(destination);
            mapRef.current.fitBounds(bounds, { top: 40, bottom: 120, left: 40, right: 40 });
          }
        }
      }
    );
  }, [isLoaded, truckLocation, report]);

  if (!isLoaded) return <div className="w-80 h-96 flex items-center justify-center bg-white rounded-xl shadow-xl"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="w-96 h-[500px] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
      
      {/* 1. Header Card */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md z-10 relative">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Help is on the way
          </h3>
          <div className="flex items-center gap-1.5 mt-1 opacity-80">
            <Navigation className="w-3 h-3" />
            <p className="text-xs">{stats.duration ? `ETA: ${stats.duration}` : "Calculating..."}</p>
          </div>
        </div>
        
        {/* Unit Info / Call Button */}
        <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-slate-200">{report.assignedToName || "Unit #404"}</p>
                <p className="text-[10px] text-slate-400">Fire Response</p>
            </div>
            
            {/* CALL BUTTON - Triggers 'tel:' protocol */}
            <a 
              href="tel:112"
              className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center transition-colors cursor-pointer shadow-lg"
              title="Call Emergency Services"
            >
                <Phone className="w-4 h-4 text-white" />
            </a>
        </div>
      </div>

      {/* 2. Content Area (Map Only) */}
      <div className="flex-1 relative bg-slate-50">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={truckLocation || { lat: parseFloat(report.coords.lat), lng: parseFloat(report.coords.lng) }}
          zoom={14}
          onLoad={onLoad}
          options={{
            disableDefaultUI: true,
            zoomControl: true, 
          }}
        >
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: { strokeColor: "#ea580c", strokeWeight: 5 }
              }}
            />
          )}

          {/* Truck Marker */}
          {truckLocation && (
            <Marker
              position={truckLocation}
              icon={{
                url: FIRE_TRUCK_ICON,
                scaledSize: new window.google.maps.Size(40, 40),
              }}
            />
          )}

          {/* User Marker */}
          <OverlayView
            position={{ 
              lat: parseFloat(report.coords.lat), 
              lng: parseFloat(report.coords.lng) 
            }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div style={{ transform: "translate(-50%, -50%)" }} className="relative flex flex-col items-center">
              
              {/* Ping Animation */}
              <div className="absolute w-full h-full bg-orange-500/40 rounded-full animate-ping"></div>
              
              {/* Image Container */}
              <div className="relative w-14 h-14 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-200 z-10">
                <img 
                  src={report.userProfileUrl}
                  className="w-full h-full object-cover" 
                  alt="Victim"
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
                {/* Fallback Icon */}
                <div className="absolute inset-0 flex items-center justify-center -z-10">
                  <MapPin className="w-6 h-6 text-slate-400" />
                </div>
              </div>
              
              {/* Pointer Triangle */}
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white shadow-sm mt-[-2px] z-10"></div>
            </div>
          </OverlayView>
        </GoogleMap>
        
        {/* Mini Stats Footer (Overlay on Map) */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-100 flex justify-between items-center z-10">
           <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold">Distance</p>
              <p className="text-sm font-bold text-slate-700">{stats.distance || "--"}</p>
           </div>
           <div className="h-6 w-[1px] bg-slate-200"></div>
           <div className="text-right">
              <p className="text-[10px] uppercase text-slate-400 font-bold">Location</p>
              <p className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{report.address}</p>
           </div>
        </div>
      </div>
    </div>
  );
}