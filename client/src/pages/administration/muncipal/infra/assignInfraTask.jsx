import React, { useState, useEffect } from "react";
// UPDATE 1: Import useSearchParams
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom"; 
import { getDatabase, ref, onValue, off } from "firebase/database";
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Send
} from "lucide-react";
import { api } from "@/lib/api"; 
import { useAuth0 } from "@auth0/auth0-react";

export default function AssignTask() {
  const { geoHash } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getAccessTokenSilently } = useAuth0();

  // UPDATE 2: Get Report ID from URL
  const [searchParams] = useSearchParams();
  const reportIdFromUrl = searchParams.get("reportId");

  // Fallback to location state for pre-filled text (Title/Desc)
  const prefill = location.state?.prefill || {};

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedStaff, setSelectedStaff] = useState(null);
  
  const [formData, setFormData] = useState({
    title: prefill.title || "", 
    description: prefill.description || "",
    priority: prefill.priority || "MEDIUM",
    deadline: "",
    address: prefill.address || "Zone Center",
    lat: prefill.location.lat, 
    lng: prefill.location.lng,
    reporterEmail:prefill.email

  });

  
  useEffect(() => {
    const db = getDatabase();
    const zoneRef = ref(db, `staff/waste/${geoHash}`);
    const listener = onValue(zoneRef, (snapshot) => {
        const data = snapshot.val();
        setStaffList(data ? Object.entries(data).map(([k, v]) => ({ id: k.replace('_', '|'), ...v })) : []);
        setLoading(false);
    });
    return () => off(zoneRef, listener);
  }, [geoHash]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return alert("Please select a staff member");

    setSubmitting(true);
    try {
      const token = await getAccessTokenSilently();
      
      await api.post('/api/staff/tasks/assign', {
        ...formData,
        reportId: reportIdFromUrl || prefill.reportId || null, 
        department:prefill.department,
        assignedTo: selectedStaff.id,
        assignedToName: selectedStaff.name,
        zoneGeohash: geoHash,
        email:prefill.reporterEmail,
        imageUrl:prefill.imageUrl,
        reportGeohash: prefill.reportGeohash,
        location: {
          lat: formData.lat,
          lng: formData.lng
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("Task Assigned Successfully!");
      navigate(-1);
      
    } catch (error) {
      console.error(error);
      alert("Failed to assign task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Assign Task</h1>
            <div className="flex gap-2 text-sm text-slate-500">
                <span className="font-mono bg-slate-200 px-2 rounded text-slate-700">{geoHash}</span>
                {/* Visual Confirmation that we are linked */}
                {reportIdFromUrl && (
                    <span className="font-mono bg-emerald-100 text-emerald-700 px-2 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Report Linked
                    </span>
                )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ... (Keep Staff List Sidebar EXACTLY the same) ... */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Available Staff ({staffList.length})
            </h3>
            <div className="space-y-3 h-[500px] overflow-y-auto pr-2">
              {loading ? <p className="text-slate-400 text-sm italic">Scanning zone...</p> : 
               staffList.length === 0 ? <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl text-sm border border-yellow-200">No active staff found.</div> : 
               staffList.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedStaff(staff)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3
                      ${selectedStaff?.id === staff.id ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 hover:border-emerald-400"}
                    `}
                  >
                    <img src={staff.picture} alt="" className="w-10 h-10 rounded-full bg-slate-200" />
                    <div>
                      <p className={`text-sm font-bold ${selectedStaff?.id === staff.id ? "text-white" : "text-slate-900"}`}>{staff.name}</p>
                      <p className={`text-[10px] font-mono ${selectedStaff?.id === staff.id ? "text-slate-400" : "text-slate-500"}`}>Online</p>
                    </div>
                  </button>
               ))
              }
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Show ID in UI for debugging/confirmation */}
              {reportIdFromUrl && (
                <div className="text-xs text-slate-400 font-mono uppercase tracking-widest">
                    Linking Task to Report ID: {reportIdFromUrl}
                </div>
              )}
              
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-medium"
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline</label>
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