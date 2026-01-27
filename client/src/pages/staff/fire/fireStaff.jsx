import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Clock, 
  Camera, 
  CheckCircle, 
  Navigation,
  LogOut,
  Flame
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { getDatabase, ref, set, onDisconnect, remove } from "firebase/database";
import ngeohash from "ngeohash";
import { api } from "@/lib/api";

const db = getDatabase();

export default function FireStaffDashboard() {
  const { logout, user, getAccessTokenSilently } = useAuth0();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [uploadingId, setUploadingId] = useState(null);

  // 🔥 FETCH FIRE TASKS
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();

        const endpoint = activeTab === "active"
          ? "/api/staff/tasks/active"
          : "/api/staff/tasks/history";

        const res = await api.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // only fire department tasks
        const fireTasks = res.data.filter(t => t.department === "fire");
        setTasks(fireTasks);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchTasks();
  }, [user, activeTab, getAccessTokenSilently]);

  // 📍 FIRE UNIT LIVE TRACKING
  useEffect(() => {
    if (!user) return;

    let watchId = null;
    let currentRef = null;

    const updateLocation = (position) => {
      const { latitude, longitude } = position.coords;
      const geohash = ngeohash.encode(latitude, longitude, 5);
      const sanitizedUserId = user.sub.replace('|', '_');

      const path = `staff/fire/${geohash}/${sanitizedUserId}`;
      const userRef = ref(db, path);

      const staffData = {
        name: user.name,
        email: user.email,
        picture: user.picture,
        coords: { lat: latitude, lng: longitude },
        status: "ONLINE",
        lastSeen: Date.now()
      };

      if (currentRef && currentRef.toString() !== userRef.toString()) {
        remove(currentRef);
      }

      currentRef = userRef;
      set(userRef, staffData);
      onDisconnect(userRef).remove();
    };

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(updateLocation);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (currentRef) remove(currentRef);
    };
  }, [user]);

  // 📸 COMPLETE FIRE TASK
  const handleUploadProof = async (taskId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingId(taskId);

    try {
      const token = await getAccessTokenSilently();
      const formData = new FormData();
      formData.append("image", file);
      formData.append("taskId", taskId);

      await api.post("/api/staff/tasks/resolve", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });

      setTasks(prev => prev.filter(t => t.id !== taskId));
      alert("🔥 Fire handled successfully!");

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const openMaps = (coords) => {
    if (coords?.lat && coords?.lng) {
      window.open(`http://maps.google.com/maps?q=${coords.lat},${coords.lng}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-red-50 pb-20 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">

      {/* HEADER */}
      <div className="bg-red-600 text-white p-6 rounded-b-[2rem] shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Fire Response Unit</p>
            <h1 className="text-2xl font-black">{user?.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
              <span className="text-xs font-bold text-yellow-300">ON EMERGENCY DUTY</span>
            </div>
          </div>
          <button onClick={() => logout()} className="bg-red-700 p-2 rounded-full">
            <LogOut className="w-5 h-5 text-yellow-200" />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="px-6 mt-6 flex gap-6 border-b border-red-200">
        <button onClick={() => setActiveTab("active")} className={`pb-3 text-sm font-bold ${activeTab==="active" ? "text-red-700" : "text-slate-400"}`}>Active Fires</button>
        <button onClick={() => setActiveTab("history")} className={`pb-3 text-sm font-bold ${activeTab==="history" ? "text-red-700" : "text-slate-400"}`}>History</button>
      </div>

      {/* TASK LIST */}
      <div className="p-6 space-y-6">
        {loading ? <p className="text-center text-slate-400">Loading...</p> :
          tasks.map(task => (
            <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">

              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20 rounded-xl bg-red-100 overflow-hidden">
                  {task.image ? <img src={task.image} className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-red-300 m-auto"/>}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{task.title}</h3>
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <MapPin className="w-3 h-3" /> {task.location?.address}
                  </div>
                  {task.deadline && (
                    <div className="flex items-center gap-1 text-orange-600 text-xs font-bold">
                      <Clock className="w-3 h-3" />
                      Due {new Date(task.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  )}
                </div>
              </div>

              {activeTab === 'active' && (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => openMaps(task.location)} className="py-3 bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    <Navigation className="w-4 h-4" /> Navigate
                  </button>

                  <label className="py-3 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
                    <Flame className="w-4 h-4" /> Fire Resolved
                    <input type="file" className="hidden" onChange={(e)=>handleUploadProof(task.id,e)} />
                  </label>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="mt-3 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 text-xs font-bold py-2">
                  <CheckCircle className="w-4 h-4" /> Incident Closed
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}
