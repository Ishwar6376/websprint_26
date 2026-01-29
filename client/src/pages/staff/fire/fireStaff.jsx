import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  MapPin, 
  Clock, 
  Camera, 
  CheckCircle, 
  Navigation,
  LogOut,
  Loader,
  ShieldCheck,
  ArrowLeft,
  Timer,
  ThumbsUp
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { getDatabase, ref, set, onDisconnect, remove, onValue, update } from "firebase/database";
import ngeohash from "ngeohash";
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker, Polyline, OverlayView } from "@react-google-maps/api";
import { db } from "../../../firebase/firebase"; 
import { api } from "../../../lib/api"; // Import API utility

const libraries = ["places", "geometry"];

const mapContainerStyle = {
  width: "100%",
  height: "100dvh", 
  touchAction: "none" 
};

const defaultCenter = { lat: 25.4358, lng: 81.8463 }; 
const FIRE_TRUCK_ICON = "/icons/fire-truck.png"; 
const ROUTE_COLOR = "#ea580c";

export default function FireStaffDashboard() {
  const { logout, user } = useAuth0();
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries
  });

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [staffStatus, setStaffStatus] = useState("AVAILABLE"); 
  const [currentLocation, setCurrentLocation] = useState(null);
  const [navMode, setNavMode] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [fullPath, setFullPath] = useState([]); 
  const [remainingPath, setRemainingPath] = useState([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  const [isRedirecting, setIsRedirecting] = useState(false); 
  
  const mapRef = useRef(null);

  const getDistanceToTarget = () => {
    if (!currentLocation || !activeTask || !window.google) return Infinity;
    const staff = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
    const target = new window.google.maps.LatLng(activeTask.location.lat, activeTask.location.lng);
    return window.google.maps.geometry.spherical.computeDistanceBetween(staff, target);
  };

  const distanceToTarget = getDistanceToTarget();
  const isArrivalDisabled = distanceToTarget > 20; 

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setTasks([]); 

    if (activeTab === "active") {

      const alertsRef = ref(db, 'fireAlerts/');
      const unsubscribe = onValue(alertsRef, (snapshot) => {
        const data = snapshot.val();
        const myTasks = [];

        if (data) {
          Object.keys(data).forEach(geohash => {
            const alertsInGeohash = data[geohash];
            Object.keys(alertsInGeohash).forEach(alertId => {
              const alert = alertsInGeohash[alertId];
              if (alert.assignedTo === user?.sub) {
                 myTasks.push({
                  id: alertId,
                  title: alert.userName ? `Fire Response: ${alert.userName}` : "Emergency Response",
                  image: alert.imageUrl || alert.userProfileUrl, 
                  location: {
                    address: alert.location?.address || "GPS Coordinates",
                    lat: alert.location?.lat,
                    lng: alert.location?.lng
                  },
                  status: alert.status,
                  timestamp: alert.timestamp,
                  geohash: geohash
                });
              }
            });
          });
        }

        // Filter out resolved tasks for the 'Active' tab
        const activeTasks = myTasks.filter(t => t.status !== "RESOLVED");
        activeTasks.sort((a, b) => b.timestamp - a.timestamp);
        
        setTasks(activeTasks);
        
        // Update Status based on Active Missions
        const hasActiveMission = activeTasks.length > 0;
        setStaffStatus(hasActiveMission ? "ENGAGED" : "AVAILABLE");
        setLoading(false);
      });

      return () => unsubscribe();

    } else {
      // 2. HISTORY DATA (API / Firestore)
      const fetchHistory = async () => {
        try {
          // Reusing the same API endpoint used in Admin Dashboard
          const res = await api.get('/api/reports/FetchAdminFireHistory');
          
          if (res.data && Array.isArray(res.data)) {
            // FILTER: Only show reports assigned to THIS staff member
            const myHistory = res.data.filter(report => report.assignedTo === user.sub);

            const formattedHistory = myHistory.map(r => ({
              id: r._id || r.id,
              title: r.userName ? `Fire Response: ${r.userName}` : "Anonymous Report",
              image: r.imageUrl || r.userProfileUrl ,
              location: {
                address: r.address || r.location?.address || "Recorded Location",
                lat: r.coords?.lat || r.location?.lat,
                lng: r.coords?.lng || r.location?.lng
              },
              status: "RESOLVED",
              timestamp: r.timestamp,
              completedAt: r.archivedAt
            }));

            // Sort by completion time or timestamp (newest first)
            formattedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setTasks(formattedHistory);
          }
        } catch (error) {
          console.error("Failed to fetch history:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchHistory();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (!navMode || !activeTask) return;

    const taskRef = ref(db, `fireAlerts/${activeTask.geohash}/${activeTask.id}`);
    
    const unsubscribe = onValue(taskRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log("Mission closed. Starting redirect sequence.");
        setIsRedirecting(true);
        setWaitingForUser(false); 
        setTimeout(() => {
          setNavMode(false);
          setActiveTask(null);
          setDirectionsResponse(null);
          setFullPath([]);
          setRemainingPath([]);
          setIsRedirecting(false);
          setShowSuccessModal(true);
          setTimeout(() => setShowSuccessModal(false), 5000);
        }, 3000); 
      }
    });

    return () => unsubscribe();
  }, [navMode, activeTask]);

  useEffect(() => {
    if (!user) return;
    let watchId = null;

    const updateLocation = (position) => {
      const { latitude, longitude } = position.coords;
      const newLoc = { lat: latitude, lng: longitude };
      setCurrentLocation(newLoc);
      
      if (navMode && fullPath.length > 0) {
        updateRemainingPath(newLoc, fullPath);
      }

      const geohash = ngeohash.encode(latitude, longitude, 6);
      const sanitizedUserId = user.sub.replace(/[^a-zA-Z0-9]/g, '_');
      const newPath = `staff/fire/${geohash}/${sanitizedUserId}`;
      const storedOldPath = localStorage.getItem('last_staff_path');
      
      if (storedOldPath && storedOldPath !== newPath) {
        remove(ref(db, storedOldPath)).catch(console.warn);
      }
      localStorage.setItem('last_staff_path', newPath);

      const userRef = ref(db, newPath);
      const staffData = {
        userId: user.sub,
        name: user.name,
        email: user.email,
        picture: user.picture,
        coords: newLoc,
        status: staffStatus,
        lastSeen: Date.now(),
        device: navigator.userAgent
      };

      set(userRef, staffData);
      onDisconnect(userRef).remove();
    };

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(updateLocation, console.error, {
        enableHighAccuracy: true,
        distanceFilter: 5 
      });
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, staffStatus, navMode, fullPath]); 

  const updateRemainingPath = (currentLoc, pathPoints) => {
    if (!window.google || !pathPoints || pathPoints.length === 0) return;
    let closestIndex = -1;
    let minDistance = Infinity;
    pathPoints.forEach((point, index) => {
      const dist = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(currentLoc),
        point
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    if (closestIndex !== -1) {
      const slicedPath = pathPoints.slice(closestIndex);
      setRemainingPath([currentLoc, ...slicedPath]);
    }
  };

  const handleStartNavigation = async (task) => {
    if (!currentLocation) {
      alert("Waiting for your location...");
      return;
    }
    setActiveTask(task);
    setNavMode(true);
    setWaitingForUser(false); 
    setIsRedirecting(false);

    const updatePath = `fireAlerts/${task.geohash}/${task.id}`;
    try {
      await update(ref(db, updatePath), { status: "COMMUTING" });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleResolveTask = async () => {
    if (!activeTask) return;
    try {
      const taskRef = ref(db, `fireAlerts/${activeTask.geohash}/${activeTask.id}`);
      await update(taskRef, { status: "RESOLVED" });
      setWaitingForUser(true);
    } catch (error) {
      console.error("Error resolving task:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const calculateRoute = useCallback(() => {
    if (!currentLocation || !activeTask) return;
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: currentLocation,
        destination: activeTask.location,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirectionsResponse(result);
          setDistance(result.routes[0].legs[0].distance.text);
          setDuration(result.routes[0].legs[0].duration.text);
          const overviewPath = result.routes[0].overview_path;
          setFullPath(overviewPath);
          setRemainingPath(overviewPath); 
        } else {
          console.error(`error fetching directions ${result}`);
        }
      }
    );
  }, [currentLocation, activeTask]);

  useEffect(() => {
    if (navMode && isLoaded && currentLocation && activeTask && !directionsResponse) {
      calculateRoute();
    }
  }, [navMode, isLoaded, currentLocation, activeTask, calculateRoute, directionsResponse]);

  const exitNavigation = () => {
    setNavMode(false);
    setActiveTask(null);
    setDirectionsResponse(null);
    setFullPath([]);
    setRemainingPath([]);
    setWaitingForUser(false);
    setIsRedirecting(false);
  };

  if (!user || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader className="w-10 h-10 animate-spin text-slate-800 mb-4" />
        <p className="text-slate-500 text-sm font-medium">Syncing Network...</p>
      </div>
    );
  }

  if (navMode && isLoaded) {
    return (
      <div className="fixed inset-0 z-[5000] bg-white h-[100dvh] w-full flex flex-col relative">
        
        {/* --- REDIRECTING OVERLAY --- */}
        {isRedirecting && (
          <div className="absolute inset-0 z-[6000] bg-black/80 flex flex-col items-center justify-center animate-in fade-in duration-300 backdrop-blur-sm">
             <div className="bg-white p-8 rounded-3xl flex flex-col items-center gap-5 text-center max-w-[85%] shadow-2xl">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                   <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Mission Resolved!</h2>
                  <p className="text-slate-500 font-medium mt-1">Returning to dashboard...</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                  <Loader className="w-4 h-4 text-emerald-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Redirecting</span>
                </div>
             </div>
          </div>
        )}

        {/* Top Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto mt-2">
            <button onClick={exitNavigation} className="bg-white p-2.5 rounded-full shadow-lg active:scale-95 transition-transform">
              <ArrowLeft className="w-6 h-6 text-slate-800" />
            </button>
            <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 text-sm leading-tight">Navigating to Incident</h3>
              <p className="text-xs text-slate-500 truncate">{activeTask?.location.address}</p>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 w-full h-full relative">
          <GoogleMap
            center={currentLocation}
            zoom={18} 
            mapContainerStyle={mapContainerStyle}
            ref={mapRef}
            options={{
              zoomControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              heading: 0,
              tilt: 45,
              gestureHandling: "greedy",
            }}
          >
            {directionsResponse && (
              <DirectionsRenderer 
                directions={directionsResponse} 
                options={{
                  suppressMarkers: true,
                  suppressPolylines: true, 
                  preserveViewport: true  
                }}
              />
            )}
            {remainingPath.length > 0 && (
              <Polyline
                path={remainingPath}
                options={{
                  strokeColor: ROUTE_COLOR,
                  strokeOpacity: 1.0,
                  strokeWeight: 6,
                  geodesic: true,
                }}
              />
            )}
            {currentLocation && (
              <Marker 
                position={currentLocation} 
                icon={{
                  url: FIRE_TRUCK_ICON,
                  scaledSize: new window.google.maps.Size(60, 60), 
                  anchor: new window.google.maps.Point(30, 30)     
                }}
                zIndex={100}
              />
            )}
            {activeTask && (
              <OverlayView
                position={activeTask.location}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div style={{ transform: "translate(-50%, -50%)" }} className="relative flex flex-col items-center">
                  <div className="absolute w-full h-full bg-orange-500/40 rounded-full animate-ping"></div>
                  <div className="relative w-14 h-14 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-200 z-10">
                    <img 
                      src={activeTask.image} 
                      className="w-full h-full object-cover" 
                      alt="Victim"
                      onError={(e) => { e.target.style.display = 'none'; }} 
                    />
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                      <MapPin className="w-6 h-6 text-slate-400" />
                    </div>
                  </div>
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white shadow-sm mt-[-2px] z-10"></div>
                </div>
              </OverlayView>
            )}
          </GoogleMap>
        </div>

        {/* Bottom Action Card */}
        <div className="absolute bottom-6 left-4 right-4 z-10 pb-safe">
          <div className="bg-white rounded-2xl shadow-2xl p-5 border border-slate-100">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Estimated Arrival</p>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-3xl font-black text-slate-800">{duration || "--"}</h2>
                  <span className="text-slate-500 font-medium">({distance || "--"})</span>
                </div>
              </div>
              <div className="bg-orange-100 p-3 rounded-full animate-pulse">
                <Timer className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            
            <button 
              disabled={isArrivalDisabled || waitingForUser || isRedirecting}
              onClick={handleResolveTask}
              className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center relative overflow-hidden
                ${(isArrivalDisabled || waitingForUser || isRedirecting)
                  ? "bg-slate-100 text-slate-500 cursor-not-allowed shadow-none border border-slate-200" 
                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30"
                }`}
            >
              <span className="z-10 flex items-center gap-2">
                {waitingForUser ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Waiting for user confirmation...
                  </>
                ) : (
                  isArrivalDisabled ? "Arrive at Destination" : "Mark On Scene / Complete"
                )}
              </span>
              
              {!waitingForUser && isArrivalDisabled && distanceToTarget !== Infinity && (
                <span className="text-[10px] font-medium opacity-80 mt-0.5 z-10">
                  {`Move ${Math.round(distanceToTarget - 20)}m closer to unlock`}
                </span>
              )}
              
              {/* Progress Bar */}
              {!waitingForUser && isArrivalDisabled && (
                 <div className="absolute bottom-0 left-0 h-1 bg-slate-300 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, 100 - ((distanceToTarget - 20) / 5)))}%` }}></div>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD LIST VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-slate-200">
       
       {/* SUCCESS MODAL / POPUP */}
       {showSuccessModal && (
         <div className="absolute top-6 left-6 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-500">
           <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-2xl shadow-emerald-500/40 flex items-center gap-4">
              <div className="p-2 bg-white/20 rounded-full">
                <ThumbsUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Mission Successful</h3>
                <p className="text-emerald-100 text-xs">User confirmed resolution.</p>
              </div>
           </div>
         </div>
       )}

       <div className={`p-6 rounded-b-[2.5rem] shadow-xl sticky top-0 z-20 transition-colors duration-500 ${staffStatus === 'ENGAGED' ? 'bg-orange-600' : 'bg-slate-800'}`}>
        <div className="flex justify-between items-start mb-6 pt-safe">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-white/60" />
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Fire Response Unit</p>
            </div>
            <h1 className="text-2xl font-black text-white">{user?.name}</h1>
            
            <div className={`flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full w-fit backdrop-blur-md border ${staffStatus === 'ENGAGED' ? 'bg-orange-500/20 border-orange-400/30' : 'bg-emerald-500/20 border-emerald-400/30'}`}>
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${staffStatus === 'ENGAGED' ? 'bg-orange-300' : 'bg-emerald-400'}`}></div>
              <span className={`text-xs font-bold ${staffStatus === 'ENGAGED' ? 'text-orange-100' : 'text-emerald-100'}`}>
                {staffStatus === 'ENGAGED' ? 'ENGAGED IN MISSION' : 'ONLINE & AVAILABLE'}
              </span>
            </div>
          </div>
          <button onClick={() => logout({ returnTo: window.location.origin })} className="bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition">
            <LogOut className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-6 mt-6 flex gap-6 border-b border-slate-200">
        <button onClick={() => setActiveTab("active")} className={`pb-3 text-sm font-bold transition-colors ${activeTab==="active" ? "text-slate-800 border-b-2 border-slate-800" : "text-slate-400"}`}>
          Assigned Missions
        </button>
        <button onClick={() => setActiveTab("history")} className={`pb-3 text-sm font-bold transition-colors ${activeTab==="history" ? "text-slate-800 border-b-2 border-slate-800" : "text-slate-400"}`}>
          History
        </button>
      </div>

      <div className="p-6 space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-slate-800 font-bold text-lg">No History</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-[200px]">
              {activeTab === 'active' ? "Stand by. You are visible to the dispatcher." : "No mission history found."}
            </p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex gap-4 mb-5">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden relative shrink-0">
                  {task.image ? (
                    <img src={task.image} className="w-full h-full object-cover" alt="Scene" />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <Camera className="w-6 h-6 text-slate-300"/>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{task.title}</h3>
                  <div className="flex items-start gap-1.5 text-slate-500 text-xs mb-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" /> 
                    <span className="line-clamp-2 leading-relaxed">{task.location?.address}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wide">
                    <Clock className="w-3 h-3" />
                    {new Date(task.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>

              {activeTab === 'active' && (
                <div className="w-full">
                  <button 
                    onClick={() => handleStartNavigation(task)} 
                    className="w-full py-3.5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-200"
                  >
                    <Navigation className="w-4 h-4" /> Start Navigation
                  </button>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="mt-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 text-xs font-bold py-3">
                  <CheckCircle className="w-4 h-4" /> Mission Accomplished
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}