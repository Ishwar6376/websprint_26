import React, { useState, useEffect } from "react";
import {
  MapPin,
  Clock,
  Camera,
  CheckCircle,
  Navigation,
  LogOut,
  Zap
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { getDatabase, ref, set, onDisconnect, remove } from "firebase/database";
import ngeohash from "ngeohash";
import { api } from "@/lib/api";

const db = getDatabase();

export default function ElectricityStaffDashboard() {
  const { logout, user, getAccessTokenSilently } = useAuth0();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [uploadingId, setUploadingId] = useState(null);

  // 1. FETCH TASKS
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();

        const endpoint =
          activeTab === "active"
            ? "/api/staff/tasks/active"
            : "/api/staff/tasks/history";

        const res = await api.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setTasks(res.data);
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchTasks();
  }, [user, activeTab, getAccessTokenSilently]);

  // 2. LIVE GEOLOCATION TRACKING
  useEffect(() => {
    if (!user) return;

    let watchId = null;
    let currentRef = null;

    const updateLocation = (position) => {
      const { latitude, longitude } = position.coords;
      const geohash = ngeohash.encode(latitude, longitude, 5);
      const sanitizedUserId = user.sub.replace("|", "_");

      // Specific path for electricity staff
      const path = `staff/electricity/${geohash}/${sanitizedUserId}`;
      const userRef = ref(db, path);

      const staffData = {
        name: user.name || "Electricity Staff",
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
      watchId = navigator.geolocation.watchPosition(updateLocation, 
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (currentRef) remove(currentRef);
    };
  }, [user]);

  // 3. COMPLETE TASK
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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      setTasks(prev => prev.filter(t => t.id !== taskId));
      alert("Issue fixed successfully!");
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingId(null);
    }
  };

  const openMaps = (coords) => {
    if (coords?.lat && coords?.lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`,
        "_blank"
      );
    } else {
      alert("Location coordinates missing.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
      {/* HEADER - Styled like WasteStaff */}
      <div className="bg-slate-900 text-white p-6 rounded-b-[2rem] shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              Power Grid Division
            </p>
            <h1 className="text-2xl font-black">{user?.name || "Grid Technician"}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-yellow-400 uppercase">
                Live Grid Tracking
              </span>
            </div>
          </div>
          <button 
            onClick={() => logout()} 
            className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* STATS ROW */}
        <div className="flex gap-4">
          <div className="bg-slate-800/50 flex-1 p-3 rounded-xl border border-slate-700 backdrop-blur-sm">
            <span className="text-2xl font-black text-white block">
               {activeTab === 'active' ? tasks.length : '-'}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Open Faults</span>
          </div>
          <div className="bg-slate-800/50 flex-1 p-3 rounded-xl border border-slate-700 backdrop-blur-sm">
             <span className="text-2xl font-black text-emerald-400 block">
               {activeTab === 'history' ? tasks.length : '-'}
             </span>
             <span className="text-[10px] text-slate-400 uppercase font-bold">Resolved</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="px-6 mt-6 flex gap-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-3 text-sm font-bold transition-colors relative ${
            activeTab === "active" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          My Tasks
          {activeTab === "active" && <span className="absolute bottom-0 left-0 w-full h-1 bg-amber-500 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-sm font-bold transition-colors relative ${
            activeTab === "history" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          History
          {activeTab === "history" && <span className="absolute bottom-0 left-0 w-full h-1 bg-amber-500 rounded-t-full" />}
        </button>
      </div>

      {/* TASK LIST */}
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-10 text-slate-400 animate-pulse">
            <p className="text-sm font-bold">Loading grid tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">
              {activeTab === 'active' ? "Grid is stable. No pending tasks." : "No repair history found."}
            </p>
          </div>
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden group"
            >
              {/* PRIORITY BADGE */}
              <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider
                ${task.priority === 'CRITICAL' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}
              `}>
                {task.priority || "NORMAL"} Priority
              </div>

              <div className="flex gap-4 mb-4">
                {/* IMAGE */}
                <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {task.imageUrl || task.image ? (
                    <img
                      src={task.imageUrl || task.image}
                      className="w-full h-full object-cover"
                      alt="Fault"
                    />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-300" />
                  )}
                </div>

                {/* TEXT CONTENT */}
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 leading-tight mb-1">{task.title}</h3>
                  
                  <div className="flex items-start gap-1 text-slate-500 text-xs mb-2">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{task.location?.address || "Location detail unavailable"}</span>
                  </div>

                  {task.deadline && (
                    <div className="flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 w-fit px-2 py-1 rounded-md">
                      <Clock className="w-3 h-3" />
                      <span>SLA: {new Date(task.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              {activeTab === "active" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openMaps(task.location)}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    <Navigation className="w-4 h-4" /> Navigate
                  </button>

                  <label className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer relative overflow-hidden
                    ${uploadingId === task.id ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-emerald-600'}
                  `}>
                    {uploadingId === task.id ? (
                      <span className="animate-pulse">Uploading...</span>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Fix Completed
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleUploadProof(task.id, e)}
                      disabled={uploadingId === task.id}
                    />
                  </label>
                </div>
              )}

              {/* HISTORY STATUS */}
              {(activeTab === "history" || task.status === 'COMPLETED') && (
                <div className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 text-xs font-bold mt-2">
                  <CheckCircle className="w-4 h-4" /> 
                  Resolved {task.completedAt ? `on ${new Date(task.completedAt).toLocaleDateString()}` : ""}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}