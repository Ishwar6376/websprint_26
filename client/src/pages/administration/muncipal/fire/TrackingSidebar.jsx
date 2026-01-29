import React, { useEffect, useState, useRef } from "react";
import { GoogleMap, DirectionsRenderer, Marker, OverlayView } from "@react-google-maps/api";
import { ref, onValue } from "firebase/database";
import { db } from "../../../../firebase/firebase"; 
import { X, MapPin, Navigation, User, Loader2 } from "lucide-react";

const containerStyle = { width: "100%", height: "100%" };
const FIRE_TRUCK_ICON = "/icons/fire-truck.png"; 

export default function TrackingSidebar({ report, onClose, isLoaded }) {
  const [truckLocation, setTruckLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [stats, setStats] = useState({ distance: "", duration: "" });
  const [dataStatus, setDataStatus] = useState("loading");
  const mapRef = useRef(null);

  const onLoad = (map) => {
    mapRef.current = map;
  };

  // --- NEW LOGIC: AUTO-CLOSE IF REPORT REMOVED ---
  useEffect(() => {
    if (!report?.id || !report?.geohash) return;

    const reportRef = ref(db, `fireAlerts/${report.geohash}/${report.id}`);

    const unsubscribe = onValue(reportRef, (snapshot) => {
      // If the snapshot does NOT exist, the record was deleted from the DB
      if (!snapshot.exists()) {
        onClose(); // Trigger the close action automatically
      }
    });

    return () => unsubscribe();
  }, [report, onClose]);
  // ------------------------------------------------

  // Logic to track the Truck/Staff Location
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
        setDataStatus("found");
      } else {
        console.warn("Staff location not found");
        setDataStatus("not_found");
      }
    });

    return () => unsubscribe();
  }, [report]);

  // Logic for Directions Service
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
          if (mapRef.current) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(truckLocation); 
            bounds.extend(destination);  

            mapRef.current.fitBounds(bounds, {
              top: 50, bottom: 200, left: 50, right: 50 
            }); 
          }
      

        } else {
          console.error("Directions request failed:", status);
        }
      }
    );
  }, [isLoaded, truckLocation, report]); 

  if (!isLoaded) return <div className="h-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="h-full flex flex-col bg-white shadow-2xl relative z-40 border-l border-slate-200">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live Unit Tracking
          </h3>
          <p className="text-xs text-slate-500">Unit: {report.assignedToName || "Unknown"}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative w-full bg-slate-100">
        {dataStatus === "not_found" && (
           <div className="absolute top-4 left-4 right-4 z-10 bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100">
             ⚠️ Signal lost. Waiting for unit location update...
           </div>
        )}

        <GoogleMap
          mapContainerStyle={containerStyle}
          center={truckLocation || { lat: parseFloat(report.coords.lat), lng: parseFloat(report.coords.lng) }}
          zoom={15}
          onLoad={onLoad} // Capture map instance
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
          }}
        >
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                // ORANGE LINE LOGIC (#ea580c is orange-600)
                polylineOptions: { strokeColor: "#ea580c", strokeWeight: 6 }
              }}
            />
          )}

          {/* Truck Marker */}
          {truckLocation && (
            <Marker
              position={truckLocation}
              icon={{
                url: FIRE_TRUCK_ICON,
                scaledSize: new window.google.maps.Size(48, 48),
                anchor: new window.google.maps.Point(24, 24)
              }}
              zIndex={50}
            />
          )}

          {/* Incident / User Custom Marker (OverlayView) */}
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
                  src={report.imageUrl} 
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

        {/* Stats Card Overlay */}
        <div className="absolute bottom-6 left-4 right-4 bg-white/95 backdrop-blur rounded-xl shadow-xl border border-slate-100 p-4">
           <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-3">
               <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600">
                 <Navigation className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated Arrival</p>
                 <p className="text-xl font-black text-slate-800 leading-none">{stats.duration || "--"}</p>
               </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Distance</p>
                <p className="text-sm font-bold text-slate-600">{stats.distance || "--"}</p>
             </div>
           </div>
           <div className="pt-3 border-t border-slate-100 flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs font-medium text-slate-600 line-clamp-2">{report.address}</p>
           </div>
        </div>
      </div>
    </div>
  );
}