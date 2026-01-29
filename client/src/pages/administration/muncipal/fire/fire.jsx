import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useJsApiLoader } from "@react-google-maps/api"; 
import {
  ArrowLeft,
  LogOut,
  Flame,
  Truck,
  CheckCircle2,
  MapPin,
  Grid3X3,
  Zap,
  Map as MapIcon,
  Clock,
  AlertTriangle,
  X,
  History,
  FileText
} from "lucide-react";
import { getDatabase, ref, onValue, get, update } from "firebase/database";
import { db } from "../../../../firebase/firebase"; 
import TrackingSidebar from "./TrackingSidebar"; 
import {api} from "../../../../lib/api"

// --- UTILS ---
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

// Helper to format duration
const formatDuration = (start, end) => {
  if (!start || !end) return "--";
  const diffMs = new Date(end) - new Date(start);
  const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
  const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
  if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
  return `${diffMins}m`;
};

const libraries = ["places"];

// --- TOAST COMPONENT ---
const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
    {toasts.map((toast) => (
      <div 
        key={toast.id} 
        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border min-w-[300px] animate-in slide-in-from-right duration-300 ${
          toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 
          'bg-white border-slate-100 text-slate-800'
        }`}
      >
        <div className={`mt-0.5 p-1 rounded-full ${
          toast.type === 'error' ? 'bg-red-200' : 
          toast.type === 'success' ? 'bg-emerald-200' : 'bg-slate-200'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : 
           toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : 
           <Clock className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">{toast.title}</h4>
          <p className="text-xs opacity-90 mt-1">{toast.message}</p>
        </div>
        <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    ))}
  </div>
);

export default function FireAdmin() {
  const navigate = useNavigate();
  const { logout } = useAuth0();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries
  });

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState(null); 
  const [activeTab, setActiveTab] = useState("current");
  const [assigningId, setAssigningId] = useState(null);
  const [trackingReport, setTrackingReport] = useState(null);

  // --- NEW STATE: VIEW MODE ---
  const [isHistoryView, setIsHistoryView] = useState(false);

  // --- NEW STATE: ARCHIVED REPORTS (FROM BACKEND) ---
  const [archivedReports, setArchivedReports] = useState([]);
  
  const [toasts, setToasts] = useState([]);

  // Helper to add toast
  const addToast = useCallback((title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000); 
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    setTrackingReport(null);
  }, [activeTab, selectedZoneId, isHistoryView]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/api/reports/FetchAdminFireHistory'); 
      if (res.data) {
        const mappedData = res.data.map(r => ({
          ...r,
          id: r._id || r.id, 
          timestamp: r.timestamp, 
          completedAt: r.archivedAt, 
          title: r.userName ? `Fire Reported by ${r.userName}` : "Anonymous Report",
          imageUrl: r.userProfileUrl, 
          status: "RESOLVED_HISTORY",
          geohash: r.geohash || r.location?.geohash, 
          
          address: r.address || r.location?.address,
          coords: {
              lat: r.coords?.lat || r.location?.lat,
              lng: r.coords?.lng || r.location?.lng
          }
        }));
        setArchivedReports(mappedData);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, []);

  // Trigger fetch when entering History View
  useEffect(() => {
    if (isHistoryView) {
      fetchHistory();
    }
  }, [isHistoryView, fetchHistory]);


  // Load Live Data (Firebase)
  useEffect(() => {
    const alertsRef = ref(db, 'fireAlerts/');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setZones([]); setLoading(false); return; }

      const loadedZones = Object.entries(data).map(([geohashKey, alertsMap]) => {
        if (!alertsMap || typeof alertsMap !== 'object') return null;
        const reportsArray = Object.entries(alertsMap).map(([alertId, alertData]) => ({
          id: alertId,
          ...alertData,
          title: alertData.userName ? `Fire Reported by ${alertData.userName}` : "Anonymous Report",
          imageUrl:alertData.userProfileUrl,  
          severity: alertData.status === "CRITICAL" ? "CRITICAL" : "HIGH",
          coords: alertData.location,
          address: alertData.location?.address || "GPS Coordinates Only",
          geohash: geohashKey 
        }));
        reportsArray.sort((a, b) => b.timestamp - a.timestamp);
        return { zoneId: geohashKey, geohash: geohashKey, reports: reportsArray };
      }).filter(Boolean);

      loadedZones.sort((a, b) => b.reports.length - a.reports.length);
      setZones(loadedZones);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); 

  const selectedZone = useMemo(() => {
    if (!selectedZoneId) return null;
    return zones.find(z => z.zoneId === selectedZoneId) || null;
  }, [zones, selectedZoneId]);


  // --- UPDATED FILTER LOGIC (REMOVED RESOLVED FROM HERE) ---
  const { currentReports, assignedReports } = useMemo(() => {
    if (!selectedZone) return { currentReports: [], assignedReports: [] };
    
    const liveReports = selectedZone.reports || [];

    // Filter 1: Current (Unassigned, not Resolved)
    const current = liveReports.filter(r => 
      r.status !== "RESOLVED" && r.status !== "ASSIGNED" && r.status !== "COMMUTING"
    );

    // Filter 2: Assigned (Including RESOLVED from Firebase)
    const assigned = liveReports.filter(r => 
      r.status === "ASSIGNED" || r.status === "COMMUTING" || r.status === "RESOLVED"
    );

    return { 
        currentReports: current, 
        assignedReports: assigned
    };
  }, [selectedZone]);

  // Core Assignment Logic
  const attemptDispatch = useCallback(async (report, isManualTrigger = false) => {
    const fireLat = report.coords?.lat;
    const fireLng = report.coords?.lng;

    if (!fireLat || !fireLng) {
      if (isManualTrigger) addToast("Dispatch Failed", "Report has no GPS coordinates.", "error");
      return false;
    }

    try {
      const staffRef = ref(db, `staff/fire/${report.geohash}`);
      const snapshot = await get(staffRef);

      if (!snapshot.exists()) {
        if (isManualTrigger) addToast("No Units Found", "No staff registered in this sector.", "error");
        return false;
      }

      const staffData = snapshot.val();
      const availableStaff = [];
      Object.entries(staffData).forEach(([staffId, data]) => {
        if (data.status === "AVAILABLE" && data.coords) {
          const dist = getDistanceFromLatLonInKm(fireLat, fireLng, data.coords.lat, data.coords.lng);
          availableStaff.push({
            id: staffId,
            ...data,
            distance: dist
          });
        }
      });

      if (availableStaff.length === 0) {
        if (isManualTrigger) addToast("Units Busy", "All units in this sector are currently engaged.", "error");
        return false;
      }

      availableStaff.sort((a, b) => a.distance - b.distance);
      const bestUnit = availableStaff[0];

      const updates = {};
      
      updates[`fireAlerts/${report.geohash}/${report.id}/status`] = "ASSIGNED";
      updates[`fireAlerts/${report.geohash}/${report.id}/assignedTo`] = bestUnit.userId; 
      updates[`fireAlerts/${report.geohash}/${report.id}/assignedToName`] = bestUnit.name;
      updates[`fireAlerts/${report.geohash}/${report.id}/assignedAt`] = Date.now();

      updates[`staff/fire/${report.geohash}/${bestUnit.id}/status`] = "ENGAGED";
      updates[`staff/fire/${report.geohash}/${bestUnit.id}/currentTask`] = report.id;

      await update(ref(db), updates);

      addToast("Unit Dispatched", `${bestUnit.name} assigned (${bestUnit.distance.toFixed(1)}km away).`, "success");
      return true;

    } catch (error) {
      console.error("Dispatch logic failed:", error);
      if (isManualTrigger) addToast("System Error", "Dispatch failed. Check console.", "error");
      return false;
    }
  }, [addToast]);

  const handleManualAssign = async (report) => {
    setAssigningId(report.id);
    await attemptDispatch(report, true); 
    setAssigningId(null);
  };

  const processingRef = useRef(new Set()); 

  useEffect(() => {
    const autoDispatchLoop = async () => {
      if (!currentReports || currentReports.length === 0) return;
      const pendingReports = currentReports.filter(r => !processingRef.current.has(r.id));

      if (pendingReports.length > 0) {
        console.log(`Auto-Dispatcher: Attempting to assign ${pendingReports.length} pending reports...`);
      }

      for (const report of pendingReports) {
        processingRef.current.add(report.id); 
        const success = await attemptDispatch(report, false); 
        if (!success) {
           processingRef.current.delete(report.id); 
        }
      }
    };

    autoDispatchLoop();
    const intervalId = setInterval(autoDispatchLoop, 120000);
    return () => clearInterval(intervalId);

  }, [currentReports, attemptDispatch]);


  const handleToggleTracking = (report) => {
    if (trackingReport?.id === report.id) {
      setTrackingReport(null); 
    } else {
      setTrackingReport(report); 
    }
  };

  const getZoneSeverityStyles = (count) => {
    if (count > 5) return { cardBorder: "border-red-200 bg-red-50", iconBg: "bg-red-600 text-white", badgeBg: "bg-red-100 text-red-700", pulse: true };
    if (count >= 3) return { cardBorder: "border-orange-200 bg-orange-50", iconBg: "bg-orange-500 text-white", badgeBg: "bg-orange-100 text-orange-700", pulse: false };
    return { cardBorder: "border-slate-200 bg-white", iconBg: "bg-slate-100 text-slate-500", badgeBg: "bg-slate-100 text-slate-600", pulse: false };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "RESOLVED_HISTORY": return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: History, label: "Archived" };
      case "RESOLVED": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Resolved (Pending)" };
      case "ASSIGNED": 
      case "COMMUTING": return { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Truck, label: status === "COMMUTING" ? "En Route" : "Dispatched" };
      default: return { color: "bg-red-100 text-red-700 border-red-200 animate-pulse", icon: Flame, label: "CRITICAL SOS" };
    }
  };

  const getTabCount = (tabName) => {
    if (tabName === "current") return currentReports.length;
    if (tabName === "assigned") return assignedReports.length;
    return 0;
  };

  // --- NAVIGATION HANDLER ---
  const handleBack = () => {
    if (trackingReport) {
      setTrackingReport(null);
    } else if (selectedZoneId) {
      setSelectedZoneId(null);
    } else if (isHistoryView) {
      setIsHistoryView(false);
    } else {
      navigate("/administration");
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden"> 
      {/* Toast Overlay */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <header className="h-20 px-6 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 rounded-full hover:bg-slate-100">
            <ArrowLeft className="w-6 h-6 text-slate-500" />
          </button>
          <div className="w-10 h-10 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center text-red-600">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">Smart Fire Control</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              {isHistoryView ? "Historical Data Archive" : "Live Grid View"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            {/* --- NEW HISTORY BUTTON --- */}
            <button 
                onClick={() => {
                    setSelectedZoneId(null);
                    setTrackingReport(null);
                    setIsHistoryView(true);
                }} 
                className={`h-11 px-4 flex items-center gap-2 rounded-full border transition-all ${
                    isHistoryView 
                    ? "bg-slate-900 text-white border-slate-900" 
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
            >
                <History className="w-5 h-5" />
                <span className="text-xs font-bold hidden md:inline">History</span>
            </button>

            <button onClick={() => logout({ returnTo: window.location.origin })} className="h-11 w-11 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:bg-red-50">
                <LogOut className="w-5 h-5 text-slate-500" />
            </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 h-[calc(100vh-80px)] overflow-hidden relative">
        
        {/* LEFT SIDE: List View */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8 transition-all duration-300 ${trackingReport ? 'hidden md:block w-full md:w-1/2 lg:w-3/5' : 'w-full'}`}>
          
          {/* --- VIEW 1: HISTORY VIEW --- */}
          {isHistoryView ? (
             <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-black font-mono">Incident History</h2>
                    <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
                        {archivedReports.length} Records Found
                    </div>
                </div>

                <div className="space-y-4 pb-20">
                    {archivedReports.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>No historical records found.</p>
                        </div>
                    ) : (
                        archivedReports.map(report => {
                             const badge = getStatusBadge(report.status);
                             const StatusIcon = badge.icon;
                             return (
                                <div key={report.id} className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col md:flex-row gap-5 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="w-full md:w-32 h-32 shrink-0 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-100">
                                    <img src={report.imageUrl} className="w-full h-full object-cover" onError={(e) => {e.target.style.display='none'}} />
                                    <div className="absolute inset-0 flex items-center justify-center -z-10"><Flame className="w-8 h-8 text-slate-300" /></div>
                                  </div>
                                  <div className="flex-1 py-1 flex flex-col">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{report.title}</h3>
                                            <p className="text-xs text-slate-400 font-mono mt-1">Sector: {report.geohash ? report.geohash.toUpperCase() : "N/A"}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs font-mono text-slate-400">
                                            Date: {new Date(report.timestamp).toLocaleDateString()}
                                            </span>
                                            <span className="block text-xs font-mono text-emerald-600 font-bold mt-0.5">
                                            Completed: {new Date(report.completedAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-1 mb-2">
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                            Duration: {formatDuration(report.timestamp, report.completedAt)}
                                        </span>
                                    </div>

                                    <div className="my-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-1 text-slate-700 font-bold text-xs"><MapPin className="w-3 h-3" />{report.address}</div>
                                    </div>

                                    <div className="mt-auto pt-2">
                                        <div className={`px-3 py-1.5 w-fit text-xs font-bold border rounded-full flex items-center gap-2 ${badge.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {badge.label}
                                        </div>
                                    </div>
                                  </div>
                                </div>
                             )
                        })
                    )}
                </div>
             </div>
          ) : !selectedZone ? (
             /* --- VIEW 2: LIVE GRID --- */
             <>
                <h2 className="text-3xl font-black mb-2">Active Fire Zones</h2>
                <p className="text-slate-500 mb-6">Real-time Hotspots Grouped by Localities</p>
                {loading ? <div className="text-slate-400">Syncing...</div> : zones.length === 0 ? <div className="text-slate-400 text-center py-20">No active fire alerts.</div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {zones.map(zone => {
                      const activeCount = zone.reports.filter(r => r.status !== 'RESOLVED').length;
                      const styles = getZoneSeverityStyles(activeCount);
                      return (
                        <button key={zone.zoneId} onClick={() => setSelectedZoneId(zone.zoneId)} className={`border rounded-[2rem] p-6 text-left hover:shadow-xl transition-all relative overflow-hidden ${styles.cardBorder}`}>
                          <div className="flex justify-between items-start mb-6"><div className={`p-3 rounded-2xl ${styles.iconBg}`}><Grid3X3 className="w-6 h-6" /></div><span className={`text-xs font-bold px-3 py-1 rounded-full border border-black/5 ${styles.badgeBg}`}>{activeCount} Active</span></div>
                          <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">Sector ID</p><h3 className="text-3xl font-black font-mono text-slate-800">{zone.geohash.toUpperCase()}</h3></div>
                        </button>
                      );
                    })}
                  </div>
                )}
             </>
          ) : (
            /* --- VIEW 3: SELECTED ZONE DETAILS --- */
            <div className="max-w-4xl mx-auto"> 
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div><h2 className="text-3xl font-black font-mono">Sector {selectedZone.geohash.toUpperCase()}</h2></div>
                <div className="flex bg-white border p-1 rounded-xl w-fit">
                  {['current', 'assigned'].map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize flex items-center gap-2 transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                        {tab} <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{getTabCount(tab)}</span>
                      </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pb-20">
                {(activeTab === "current" ? currentReports : assignedReports).map(report => {
                  const badge = getStatusBadge(report.status);
                  const StatusIcon = badge.icon;
                  const isBeingTracked = trackingReport?.id === report.id;

                  return (
                    <div key={report.id} className={`bg-white border rounded-3xl p-5 flex flex-col md:flex-row gap-5 shadow-sm hover:shadow-md transition-shadow ${isBeingTracked ? 'border-orange-400 ring-2 ring-orange-100' : ''}`}>
                      <div className="w-full md:w-32 h-32 shrink-0 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-100">
                        <img src={report.imageUrl} className="w-full h-full object-cover" onError={(e) => {e.target.style.display='none'}} />
                        <div className="absolute inset-0 flex items-center justify-center -z-10"><Flame className="w-8 h-8 text-slate-300" /></div>
                      </div>
                      <div className="flex-1 py-1 flex flex-col">
                        <div className="flex justify-between items-start">
                          <div><h3 className="text-lg font-bold text-slate-900">{report.title}</h3></div>
                          <div className="text-right">
                            <span className="block text-xs font-mono text-slate-400">
                              Init: {new Date(report.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        <div className="my-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-1 text-slate-700 font-bold text-xs"><MapPin className="w-3 h-3" />{report.address}</div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-2">
                           <div className={`px-3 py-1.5 text-xs font-bold border rounded-full flex items-center gap-2 ${badge.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {badge.label} {report.assignedToName && <span className="opacity-75">- {report.assignedToName}</span>}
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="flex gap-2">
                            {activeTab === "current" && (
                              <button 
                                onClick={() => handleManualAssign(report)} 
                                disabled={assigningId === report.id} 
                                className={`px-4 py-2 rounded-lg text-xs font-bold shadow-red-200 flex items-center gap-2 transition-all disabled:opacity-50 ${assigningId === report.id ? 'bg-slate-100 text-slate-400' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                              >
                                {assigningId === report.id ? <Clock className="w-3 h-3 animate-spin"/> : <Zap className="w-3 h-3 fill-current" />}
                                {assigningId === report.id ? "Locating..." : "Auto Dispatch"}
                              </button>
                            )}

                            {activeTab === "assigned" && (
                              report.status === "COMMUTING" ? (
                                <button 
                                  onClick={() => handleToggleTracking(report)}
                                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border
                                    ${isBeingTracked 
                                      ? "bg-orange-600 text-white border-orange-600 shadow-md" 
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                                >
                                  {isBeingTracked ? (
                                      <> <MapIcon className="w-3 h-3 fill-current" /> Tracking... </>
                                  ) : (
                                      <> <MapIcon className="w-3 h-3" /> Track Unit </>
                                  )}
                                </button>
                              ) : report.status === "RESOLVED" ? (
                                // Pending Resolution Indicator
                                <span className="text-xs font-bold text-emerald-600 animate-pulse px-2">
                                  Waiting for User Confirmation...
                                </span>
                              ) : (
                                <button disabled className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed">
                                   <Clock className="w-3 h-3" /> Preparing...
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {(activeTab === "current" ? currentReports : assignedReports).length === 0 && (
                   <div className="text-center py-20 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                      <p>No reports found in this category.</p>
                   </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDE: Tracking Sidebar */}
        {trackingReport && (
          <aside className="absolute inset-0 md:static w-full md:w-1/2 lg:w-2/5 h-full bg-white transition-all duration-300 z-30 flex flex-col border-l border-slate-200 shadow-xl">
            <TrackingSidebar 
              report={trackingReport} 
              onClose={() => setTrackingReport(null)}
              isLoaded={isLoaded}
            />
          </aside>
        )}
      </div>
    </div>
  );
}