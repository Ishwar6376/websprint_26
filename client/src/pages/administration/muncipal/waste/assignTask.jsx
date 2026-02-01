import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom"; 
import { getDatabase, ref, onValue, off } from "firebase/database";
import { 
  ArrowLeft, User, MapPin, Send, CheckCircle2, AlertOctagon, Clock, Zap, X
} from "lucide-react";

// FIX 1: Correct Relative Import Path (Adjust if needed based on folder structure)
import { api } from "../../../../lib/api"; 
import { useAuth0 } from "@auth0/auth0-react";

// --- TOAST COMPONENT ---
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const styles = type === 'success' 
    ? "bg-emerald-100 border-emerald-500 text-emerald-800" 
    : "bg-rose-100 border-rose-500 text-rose-800";

  return (
    <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 ${styles}`}>
      {type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertOctagon className="w-5 h-5"/>}
      <span className="font-bold text-sm">{message}</span>
      <button onClick={onClose}><X className="w-4 h-4 opacity-50 hover:opacity-100"/></button>
    </div>
  );
};

export default function AssignTask() {
  const { geoHash } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getAccessTokenSilently } = useAuth0();

  const [searchParams] = useSearchParams();
  const reportIdFromUrl = searchParams.get("reportId");
  const prefill = location.state?.prefill || {};

  // --- STATE ---
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [toast, setToast] = useState({ message: null, type: "" });
  
  // AUTOMATION STATE
  const [autoCheckCount, setAutoCheckCount] = useState(60); // Starts at 60 seconds
  const [isAutoAssigning, setIsAutoAssigning] = useState(true); // Switch to stop timer on manual interaction

  // --- HELPER: 24h Deadline ---
  const getAutoDeadline = () => {
    const date = new Date();
    date.setHours(date.getHours() + 24); 
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); 
    return date.toISOString().slice(0, 16); 
  };

  // --- HELPER: Haversine Distance (in km) ---
  const getDistance = (lat1, lon1, lat2, lon2) => {
    if(!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; 
  };
  
  const [formData, setFormData] = useState({
    title: prefill?.title || "", 
    description: prefill?.description || "",
    priority: prefill?.severity || "MEDIUM",
    deadline: getAutoDeadline(), 
    address: prefill?.address || "Zone Center",
    lat: prefill?.location?.lat || 0, 
    lng: prefill?.location?.lng || 0,
    imageUrl: prefill?.imageUrl || "",
    reporterEmail: prefill?.reporterEmail || ""
  });
  
  // --- 1. FIREBASE LISTENER ---
  useEffect(() => {
    const db = getDatabase();
    const zoneRef = ref(db, `staff/waste/${geoHash}`);
    const listener = onValue(zoneRef, (snapshot) => {
        const data = snapshot.val();
        const list = data ? Object.entries(data).map(([k, v]) => ({ id: k.replace('_', '|'), ...v })) : [];
        setStaffList(list);
        setLoading(false);
    });
    return () => off(zoneRef, listener);
  }, [geoHash]);

  // --- 2. CORE ASSIGNMENT LOGIC ---
  // Wrapped in useCallback so it can be used in useEffect
  const performAssignment = useCallback(async (staffMember, method = "manual") => {
    setSubmitting(true);
    // STOP AUTOMATION if assignment starts
    setIsAutoAssigning(false);

    try {
      const token = await getAccessTokenSilently();
      
      const payload = {
        ...formData,
        reportId: reportIdFromUrl || prefill.reportId || null, 
        department: prefill.department || "WASTE",
        assignedTo: staffMember.id,
        assignedToName: staffMember.name,
        zoneGeohash: geoHash,
        imageUrl: formData.imageUrl,
        email: formData.reporterEmail,
        reportGeohash: prefill.reportGeohash,
        reporterUserId: prefill.reporterUserId,
        location: { lat: formData.lat, lng: formData.lng },
        severity: formData.priority,
        address: formData.address
      };

      await api.post('/api/staff/tasks/assign', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const successMsg = method === "auto" 
        ? `Auto-assigned to nearest staff: ${staffMember.name}`
        : `Successfully assigned to ${staffMember.name}!`;

      setToast({ message: successMsg, type: "success" });
      
      setTimeout(() => {
        navigate(-1);
      }, 1500);

    } catch (error) {
      console.error("Assignment Error:", error);
      setToast({ message: "Failed to assign task. Try again.", type: "error" });
      setSubmitting(false);
      // Optional: Restart timer if it failed? 
      // setIsAutoAssigning(true); 
    }
  }, [formData, geoHash, reportIdFromUrl, prefill, getAccessTokenSilently, navigate]);

  // --- 3. MANUAL SUBMIT HANDLER ---
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!selectedStaff) {
        setToast({ message: "Please select a staff member first.", type: "error" });
        return;
    }
    // "manual" flag ensures correct toast message
    performAssignment(selectedStaff, "manual");
  };

  // --- 4. AUTO-ASSIGNMENT TIMER LOGIC ---
  useEffect(() => {
    // Stop if:
    // 1. We turned off auto-assign (user selected someone manually)
    // 2. We are currently submitting
    if (!isAutoAssigning || submitting) return;

    if (autoCheckCount > 0) {
      // Tick down every second
      const timer = setTimeout(() => setAutoCheckCount(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // TIMER HIT 0: EXECUTE ASSIGNMENT
      console.log("Timer finished! Calculating nearest staff...");

      if (staffList.length > 0 && formData.lat && formData.lng) {
          
          let closestStaff = null;
          let minDistance = Infinity;

          staffList.forEach((staff) => {
              if (staff.coords && staff.coords.lat && staff.coords.lng) {
                  const dist = getDistance(
                      formData.lat, 
                      formData.lng, 
                      staff.coords.lat, 
                      staff.coords.lng
                  );
                  if (dist < minDistance) {
                      minDistance = dist;
                      closestStaff = staff;
                  }
              }
          });

          if (closestStaff) {
              console.log(`Auto-assigning to ${closestStaff.name}`);
              performAssignment(closestStaff, "auto");
          } else {
              console.warn("No staff with valid coords found.");
              setToast({ message: "Auto-assign failed: No staff GPS found.", type: "error" });
              setIsAutoAssigning(false); // Stop trying
          }
      } else {
        console.warn("Requirements not met for auto-assign.");
      }
    }
  }, [autoCheckCount, isAutoAssigning, submitting, staffList, formData, performAssignment]);


  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans relative">
      
      {toast.message && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ ...toast, message: null })} 
        />
      )}

      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Assign Task</h1>
              <div className="flex gap-2 text-sm text-slate-500">
                  <span className="font-mono bg-slate-200 px-2 rounded text-slate-700">{geoHash}</span>
                  {(reportIdFromUrl || prefill.reportId) && (
                      <span className="font-mono bg-emerald-100 text-emerald-700 px-2 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Report Linked
                      </span>
                  )}
              </div>
            </div>
          </div>

          {/* VISUAL TIMER & STATUS */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <div className="relative">
                <Zap className={`w-5 h-5 ${isAutoAssigning ? 'text-amber-500 animate-pulse' : 'text-slate-300'}`} />
            </div>
            <div className="text-xs text-right">
                <p className="font-bold text-slate-700">Auto-Assign</p>
                <p className={`font-mono ${autoCheckCount < 10 ? 'text-rose-600 font-black' : 'text-slate-400'}`}>
                   {isAutoAssigning ? `00:${autoCheckCount.toString().padStart(2, '0')}` : 'PAUSED'}
                </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Staff List Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Available Staff ({staffList.length})
            </h3>
            <div className="space-y-3 h-[500px] overflow-y-auto pr-2">
              {loading ? <p className="text-slate-400 text-sm italic">Scanning zone...</p> : 
               staffList.length === 0 ? <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl text-sm border border-yellow-200">No active staff found.</div> : 
               staffList.map((staff) => {
                  // Calculate distance for UI display
                  let distDisplay = "";
                  if (formData.lat && formData.lng && staff.coords) {
                     const d = getDistance(formData.lat, formData.lng, staff.coords.lat, staff.coords.lng);
                     distDisplay = `${d.toFixed(1)} km away`;
                  }

                  return (
                    <button
                      key={staff.id}
                      onClick={() => {
                          // MANUAL INTERACTION: Select staff AND Pause Timer
                          setSelectedStaff(staff);
                          setIsAutoAssigning(false); 
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3
                        ${selectedStaff?.id === staff.id ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 hover:border-emerald-400"}
                      `}
                    >
                      <img src={staff.picture} alt="" className="w-10 h-10 rounded-full bg-slate-200" />
                      <div>
                        <p className={`text-sm font-bold ${selectedStaff?.id === staff.id ? "text-white" : "text-slate-900"}`}>{staff.name}</p>
                        <div className="flex items-center gap-2">
                           <p className={`text-[10px] font-mono ${selectedStaff?.id === staff.id ? "text-slate-400" : "text-slate-500"}`}>Online</p>
                           {distDisplay && <span className="text-[10px] text-emerald-500 font-bold">• {distDisplay}</span>}
                        </div>
                      </div>
                    </button>
                  );
               })
              }
            </div>
          </div>

          {/* Task Details Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleManualSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-900"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority Level</label>
                  <div className={`w-full p-3 rounded-xl border flex items-center gap-2 font-black text-sm
                    ${formData.priority === 'CRITICAL' ? 'bg-rose-50 border-rose-200 text-rose-600' : 
                      formData.priority === 'HIGH' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                      'bg-slate-50 border-slate-200 text-slate-600'}
                  `}>
                    <AlertOctagon className="w-4 h-4" />
                    {formData.priority}
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                    Deadline 
                    <span className="text-emerald-600 flex items-center gap-1"><Clock className="w-3 h-3"/> +24h Auto</span>
                  </label>
                  <input 
                    type="datetime-local" 
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-medium"
                    value={formData.deadline}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Details & Instructions</label>
                <textarea 
                  rows="4"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3 text-slate-600 text-sm">
                <MapPin className="w-5 h-5 text-emerald-500" />
                <input 
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="bg-transparent border-none focus:ring-0 w-full font-medium" 
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting || !selectedStaff}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Assigning..." : <> <Send className="w-4 h-4" /> Confirm Assignment </>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}