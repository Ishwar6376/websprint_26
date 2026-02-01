import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  MapPin, 
  Camera, 
  CheckCircle, 
  Navigation,
  LogOut,
  ArrowLeft,
  Timer,
  Loader,
  AlertTriangle,
  X,
  ShieldCheck,
  AlertOctagon
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { getDatabase, ref, set, onDisconnect, remove } from "firebase/database";
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from "@react-google-maps/api";
import ngeohash from "ngeohash";
import { api } from "../../../lib/api"; 
import { useAuthStore } from "@/store/useAuthStore";

const libraries = ["places", "geometry"];
const mapContainerStyle = { width: "100%", height: "100dvh", touchAction: "none" };
const defaultCenter = { lat: 25.4358, lng: 81.8463 }; 
const TRUCK_ICON = "/icons/recycling-truck.png"; 
const ROUTE_COLOR = "#10b981";

const db = getDatabase();

export default function WasteStaffDashboard() {
  const { logout, getAccessTokenSilently } = useAuth0();
  const user = useAuthStore((state) => state.user);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries
  });

  // --- STATE ---
  const [tasks, setTasks] = useState([]);
  const [recentlyResolved, setRecentlyResolved] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); 
  
  // 1. NEW STATE: Track history count independently
  const [historyCount, setHistoryCount] = useState(0);

  // Navigation & Location
  const [currentLocation, setCurrentLocation] = useState(null);
  const [navMode, setNavMode] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [distanceText, setDistanceText] = useState("");
  const [durationText, setDurationText] = useState("");
  const [distanceMeters, setDistanceMeters] = useState(Infinity);
  
  // Upload & Verification
  const [uploadingId, setUploadingId] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null); 
  
  const mapRef = useRef(null);

  // --- HELPER: Distance Calculation ---
  const getDistanceToTarget = useCallback(() => {
    if (!currentLocation || !activeTask || !window.google) return Infinity;
    const staffLoc = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
    const targetLoc = new window.google.maps.LatLng(activeTask.location.lat, activeTask.location.lng);
    return window.google.maps.geometry.spherical.computeDistanceBetween(staffLoc, targetLoc);
  }, [currentLocation, activeTask]);

  useEffect(() => {
    if (navMode && currentLocation && activeTask) {
      const dist = getDistanceToTarget();
      setDistanceMeters(dist);
    }
  }, [currentLocation, navMode, activeTask, getDistanceToTarget]);

  // --- FETCH TASKS ---
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();
        
        // 2. MODIFIED FETCH LOGIC:
        // Always ensure we have the history count, even if we are on the 'active' tab.
        if (activeTab === "active") {
            const [activeRes, historyRes] = await Promise.all([
                api.get("/api/staff/tasks/active", { headers: { Authorization: `Bearer ${token}` } }),
                api.get("/api/staff/tasks/history", { headers: { Authorization: `Bearer ${token}` } })
            ]);

            // Set Tasks to Active List
            const formattedTasks = activeRes.data.map(t => ({
                ...t,
                location: { ...t.location, lat: Number(t.location?.lat), lng: Number(t.location?.lng) }
            }));
            setTasks(formattedTasks);
            
            // Set Count from History List
            setHistoryCount(historyRes.data.length);

        } else {
            // If on History Tab, just fetch history
            const res = await api.get("/api/staff/tasks/history", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const formattedTasks = res.data.map(t => ({
                ...t,
                location: { ...t.location, lat: Number(t.location?.lat), lng: Number(t.location?.lng) }
            }));
            setTasks(formattedTasks);
            setHistoryCount(formattedTasks.length);
        }

      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTasks();
    }
  }, [user, activeTab, getAccessTokenSilently]);

  // --- REAL-TIME LOCATION TRACKING ---
  useEffect(() => {
    if (!user) return;
    let watchId = null;
    let currentRef = null;

    const updateLocation = (position) => {
      const { latitude, longitude } = position.coords;
      const newLoc = { lat: latitude, lng: longitude };
      setCurrentLocation(newLoc);

      const geohash = ngeohash.encode(latitude, longitude, 6);
      const sanitizedUserId = user.sub ? user.sub.replace('|', '_') : "anon";
      const path = `staff/waste/${geohash}/${sanitizedUserId}`;
      const userRef = ref(db, path);

      const staffData = {
        name: user.name || "Staff Member",
        email: user.email,
        picture: user.picture,
        coords: newLoc,
        status: navMode ? "BUSY" : "ONLINE",
        lastSeen: Date.now()
      };

      if (currentRef && currentRef.toString() !== userRef.toString()) {
        remove(currentRef);
      }
      currentRef = userRef;

      set(userRef, staffData);
      onDisconnect(userRef).remove();
    };

    const handleError = (err) => console.error("GPS Error:", err);

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        updateLocation, 
        handleError, 
        { enableHighAccuracy: true, distanceFilter: 5 } 
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (currentRef) remove(currentRef);
    };
  }, [user, navMode]);

  // --- NAVIGATION LOGIC ---
  const handleStartNavigation = (task) => {
    if (!currentLocation) {
      alert("Waiting for GPS location...");
      return;
    }
    setActiveTask(task);
    setNavMode(true);
  };

  const calculateRoute = useCallback(() => {
    if (!currentLocation || !activeTask || !window.google) return;
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
          setDistanceText(result.routes[0].legs[0].distance.text);
          setDurationText(result.routes[0].legs[0].duration.text);
        }
      }
    );
  }, [currentLocation, activeTask]);

  useEffect(() => {
    if (navMode && isLoaded && currentLocation && activeTask) {
      calculateRoute();
    }
  }, [navMode, isLoaded, currentLocation, activeTask, calculateRoute]);

  const exitNavigation = () => {
    setNavMode(false);
    setDirectionsResponse(null);
    setActiveTask(null);
    setDistanceMeters(Infinity);
  };

  // --- UPLOAD & AI VERIFICATION LOGIC ---
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user?.id || "anonymous");
    formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Cloudinary Upload failed");
      const data = await res.json(); 
      return data.secure_url;
    } catch (error) {
      console.error("Upload failed", error);
      throw error;
    }
  };

  const handleUploadProof = async (taskId, event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const taskToResolve = tasks.find(t => t.id === taskId);
    if (!taskToResolve) return;

    setUploadingId(taskId);

    try {
      const uploadedImageUrl = await uploadToCloudinary(file);
      const token = await getAccessTokenSilently();

      const payload = {
        staffimageUrl: uploadedImageUrl,
        imageUrl: taskToResolve.imageUrl || taskToResolve.image,
        geohash: taskToResolve.zoneGeohash,
        id: taskToResolve.id,
        userId: taskToResolve.reporterEmail,
        assignedTo: taskToResolve.assignedTo,
        reportId: taskToResolve.reportId,
        reporterUserId: taskToResolve.reporterUserId
      };

      const res = await api.post("/api/staff/tasks/resolve", payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000
      });
      const { confidence, reasoning } = res.data.data;
      
      // Update UI State locally
      setTasks(prev => prev.filter(t => t.id !== taskId));
      const resolvedTask = {
        ...taskToResolve,
        status: "RESOLVED",
        completedAt: new Date().toISOString(),
        aiData: { confidence, reasoning }
      };
      setRecentlyResolved(prev => [resolvedTask, ...prev]);
      
      // 3. UPDATE: Increment History Count locally so it reflects immediately
      setHistoryCount(prev => prev + 1);

      setNavMode(false);
      setVerificationResult({
        success: true,
        title: "Clean-up Verified!",
        message: reasoning || "Great job! The AI confirmed the waste is cleared.",
        confidence: confidence
      });

    } catch (error) {
      console.error("Resolve failed", error);
      setNavMode(false); 
      if (error.response && error.response.status === 422) {
        setVerificationResult({
          success: false,
          title: "Verification Failed",
          message: error.response.data.reasoning || "AI Verification Failed.",
          confidence: error.response.data.confidence
        });
      } else {
        setVerificationResult({
          success: false,
          title: "System Error",
          message: "Could not connect to the verification server.",
          confidence: 0
        });
      }
    } finally {
      setUploadingId(null);
    }
  };

  const getDisplayTasks = () => {
    if (activeTab === 'active') return tasks;
    const recentIds = new Set(recentlyResolved.map(t => t.id));
    const uniqueFetched = tasks.filter(t => !recentIds.has(t.id));
    return [...recentlyResolved, ...uniqueFetched];
  };

  const displayTasks = getDisplayTasks();

  // ------------------------------------------------------------------
  // UI COMPONENTS
  // ------------------------------------------------------------------
  
  const VerificationModal = () => {
    if (!verificationResult) return null;
    const isSuccess = verificationResult.success;
    return (
      <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all scale-100">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${isSuccess ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {isSuccess ? <ShieldCheck className="w-10 h-10 text-emerald-600" /> : <AlertOctagon className="w-10 h-10 text-rose-600" />}
            </div>
          </div>
          <h2 className={`text-2xl font-black text-center mb-2 ${isSuccess ? 'text-emerald-800' : 'text-rose-800'}`}>{verificationResult.title}</h2>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
            <p className="text-slate-600 text-sm font-medium text-center leading-relaxed">"{verificationResult.message}"</p>
          </div>
          <button onClick={() => setVerificationResult(null)} className={`w-full py-3.5 rounded-xl font-bold text-white transition-transform active:scale-95 shadow-lg ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}>
            {isSuccess ? "Continue Work" : "Try Again"}
          </button>
        </div>
      </div>
    );
  };

  if (navMode && isLoaded) {
    const isWithinRange = distanceMeters <= 50;
    return (
      <div className="fixed inset-0 z-[5000] bg-white h-[100dvh] w-full flex flex-col relative">
        <VerificationModal />
        <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto mt-2">
            <button onClick={exitNavigation} className="bg-white p-2.5 rounded-full shadow-lg active:scale-95 transition-transform">
              <ArrowLeft className="w-6 h-6 text-slate-800" />
            </button>
            <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 text-sm leading-tight">Navigating to Waste Site</h3>
              <p className="text-xs text-slate-500 truncate">{activeTask?.address}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 w-full h-full relative">
          <GoogleMap
            center={currentLocation || defaultCenter}
            zoom={18}
            mapContainerStyle={mapContainerStyle}
            ref={mapRef}
            options={{ zoomControl: false, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, heading: 0, gestureHandling: "greedy" }}
          >
            {directionsResponse && <DirectionsRenderer directions={directionsResponse} options={{ suppressMarkers: true, polylineOptions: { strokeColor: ROUTE_COLOR, strokeWeight: 6 } }} />}
            {currentLocation && <Marker position={currentLocation} icon={{ url: TRUCK_ICON, scaledSize: new window.google.maps.Size(60, 60), anchor: new window.google.maps.Point(30, 30) }} zIndex={100} />}
            {activeTask && <Marker position={activeTask.location} />}
          </GoogleMap>
        </div>
        <div className="absolute bottom-6 left-4 right-4 z-10 pb-safe">
          <div className="bg-white rounded-2xl shadow-2xl p-5 border border-slate-100">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Estimated Arrival</p>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-3xl font-black text-slate-800">{durationText || "--"}</h2>
                  <span className="text-slate-500 font-medium">({distanceText || "--"})</span>
                </div>
              </div>
              <div className="bg-emerald-100 p-3 rounded-full animate-pulse"><Timer className="w-6 h-6 text-emerald-600" /></div>
            </div>
            <label className={`w-full py-4 rounded-xl shadow-lg transition-all flex flex-col items-center justify-center relative overflow-hidden cursor-pointer ${!isWithinRange ? "bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-500/30"}`}>
              {uploadingId === activeTask?.id ? <span className="flex items-center gap-2 font-bold animate-pulse"><Loader className="w-5 h-5 animate-spin" /> Uploading & Verifying...</span> : !isWithinRange ? <><span className="flex items-center gap-2 font-bold text-sm"><AlertTriangle className="w-4 h-4" /> Move Closer to Resolve</span><span className="text-[10px] font-bold mt-1 opacity-70">{Math.round(distanceMeters - 50)} meters to go</span><div className="absolute bottom-0 left-0 h-1 bg-slate-300 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, 100 - ((distanceMeters - 50) / 2)))}%` }}></div></> : <span className="flex items-center gap-2 font-bold text-lg"><Camera className="w-5 h-5" /> Capture & Resolve</span>}
              <input type="file" accept="image/*" className="hidden" disabled={!isWithinRange || uploadingId === activeTask?.id} onChange={(e) => handleUploadProof(activeTask.id, e)} />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: LIST DASHBOARD MODE
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-slate-200">
      <VerificationModal />

      <div className="bg-slate-900 text-white p-6 rounded-b-[2rem] shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Welcome back</p>
            <h1 className="text-2xl font-black">{user?.name || "Field Officer"}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
              <span className="text-xs font-bold text-emerald-400">ON DUTY & TRACKING</span>
            </div>
          </div>
          <button onClick={() => logout()} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 transition-colors">
            <LogOut className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex gap-4">
          <div className="bg-slate-800/50 flex-1 p-3 rounded-xl border border-slate-700 backdrop-blur-sm">
            <span className="text-2xl font-black text-white block">
                {activeTab === 'active' ? tasks.length : '-'}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Pending</span>
          </div>
          <div className="bg-slate-800/50 flex-1 p-3 rounded-xl border border-slate-700 backdrop-blur-sm">
             <span className="text-2xl font-black text-emerald-400 block">
                 {/* 4. UPDATE: Use the dedicated historyCount state */}
                 {historyCount}
             </span>
             <span className="text-[10px] text-slate-400 uppercase font-bold">Done Today</span>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 flex gap-6 border-b border-slate-200">
        <button onClick={() => setActiveTab("active")} className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === "active" ? "text-slate-900" : "text-slate-400"}`}>
          My Tasks
          {activeTab === "active" && <span className="absolute bottom-0 left-0 w-full h-1 bg-slate-900 rounded-t-full" />}
        </button>
        <button onClick={() => setActiveTab("history")} className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === "history" ? "text-slate-900" : "text-slate-400"}`}>
          History
          {activeTab === "history" && <span className="absolute bottom-0 left-0 w-full h-1 bg-slate-900 rounded-t-full" />}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
           <div className="text-center py-10 text-slate-400 animate-pulse">
             <Loader className="w-6 h-6 animate-spin mx-auto mb-2"/>
             <p className="text-sm font-bold">Loading tasks...</p>
           </div>
        ) : displayTasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{activeTab === 'active' ? "You're all caught up!" : "No history found."}</p>
          </div>
        ) : (
          displayTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden group">
              
              <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider
                ${task.severity === 'CRITICAL' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}
              `}>
                {task.severity || "NORMAL"}
              </div>

              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {task.image || task.imageUrl ? (
                    <img src={task.image || task.imageUrl} className="w-full h-full object-cover" alt="Issue" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight mb-1">{task.title}</h3>
                  <div className="flex items-start gap-1 text-slate-500 text-xs mb-2">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{task?.address || "No Address Provided"}</span>
                  </div>
                  
                  {(activeTab === 'history' || task.status === 'RESOLVED') && task.aiData && (
                    <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <p className="text-[10px] text-emerald-700 font-medium">
                           <span className="font-bold">AI Note:</span> {task.aiData.reasoning}
                        </p>
                    </div>
                  )}
                </div>
              </div>

              {activeTab === 'active' && (
                <div className="w-full">
                  <button 
                    onClick={() => handleStartNavigation(task)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                  >
                    <Navigation className="w-4 h-4" />
                    Start Navigation
                  </button>
                </div>
              )}

              {(activeTab === 'history' || task.status === 'RESOLVED') && (
                <div className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 text-xs font-bold">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}