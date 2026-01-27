import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { ArrowLeft, MapPin, User, Send, Zap, Clock, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth0 } from "@auth0/auth0-react";

export default function AssignElectricityTask() {
  const { geoHash } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getAccessTokenSilently } = useAuth0();

  const [searchParams] = useSearchParams();
  const reportIdFromUrl = searchParams.get("reportId");

  // ✅ STABLE PREFILL
  const prefill = useMemo(() => location.state?.prefill || null, [location.state]);

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    deadline: "",
    address: "",
    lat: "",
    lng: "",
  });

  // ✅ Sync form with report data
  useEffect(() => {
    if (!prefill) return;

    setFormData(prev => ({
      ...prev,
      title: prefill.title || "",
      description: prefill.description || "",
      priority: prefill.priority || "MEDIUM",
      address: prefill.address || "",
      lat: prefill.location?.lat || "",
      lng: prefill.location?.lng || "",
    }));
  }, [prefill]);

  // ⚡ Live Staff Tracking from Firebase
  useEffect(() => {
    const db = getDatabase();
    const zoneRef = ref(db, `staff/electricity/${geoHash}`);

    const listener = onValue(zoneRef, (snapshot) => {
      const data = snapshot.val();
      setStaffList(
        data ? Object.entries(data).map(([k, v]) => ({ id: k.replace("_", "|"), ...v })) : []
      );
      setLoading(false);
    });

    return () => off(zoneRef, listener);
  }, [geoHash]);

  const handleSubmit = async () => {
    if (!selectedStaff) return alert("Please select an electrician from the list.");

    setSubmitting(true);
    try {
      const token = await getAccessTokenSilently();

      await api.post("/api/staff/tasks/assign", {
        ...formData,
        reportId: reportIdFromUrl || prefill?.reportId || null,
        department: "electricity",
        assignedTo: selectedStaff.id,
        assignedToName: selectedStaff.name,
        zoneGeohash: geoHash,
        email: prefill?.email,
        imageUrl: prefill?.imageUrl,
        reportGeohash: prefill?.reportGeohash,
        location: { lat: formData.lat, lng: formData.lng }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("⚡ Task successfully assigned to technician.");
      navigate(-1);

    } catch (err) {
      console.error(err);
      alert("Assignment failed. Please check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* HEADER AREA */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase rounded-md tracking-wider">
                  Assignment Center
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Zone: {geoHash}
                </span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Assign Repair Task</h1>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-700 uppercase">Grid Online</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: STAFF LIST */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> 
                Field Technicians ({staffList.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-yellow-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scanning Grid...</p>
              </div>
            ) : staffList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                <ShieldAlert className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-400">No technicians found in this zone.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map(staff => (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedStaff(staff)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 group
                      ${selectedStaff?.id === staff.id 
                        ? "bg-slate-900 border-slate-900 shadow-xl shadow-slate-200 -translate-y-1" 
                        : "bg-white border-slate-200 hover:border-yellow-400 hover:shadow-md"}`}
                  >
                    <div className="relative">
                      <img src={staff.picture} className="w-12 h-12 rounded-xl object-cover" alt="" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-black ${selectedStaff?.id === staff.id ? "text-white" : "text-slate-900"}`}>
                        {staff.name}
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${selectedStaff?.id === staff.id ? "text-slate-400" : "text-slate-400"}`}>
                        Technician ID: {staff.id.slice(-5)}
                      </p>
                    </div>
                    <Zap className={`w-4 h-4 ${selectedStaff?.id === staff.id ? "text-yellow-400" : "text-slate-200 group-hover:text-yellow-400"}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: TASK DETAILS */}
          <div className="lg:col-span-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
              
              {/* Form Section: Title */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Issue Overview</label>
                <input
                  placeholder="e.g. Transformer Sparking at Block C"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-yellow-400 transition-all outline-none"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Form Section: Priority & Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Priority Level</label>
                  <div className="relative">
                    <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-yellow-400 transition-all outline-none appearance-none"
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Resolution Deadline</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="datetime-local"
                      className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-yellow-400 transition-all outline-none"
                      value={formData.deadline}
                      onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Form Section: Description */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Technical Instructions</label>
                <textarea
                  rows="4"
                  placeholder="Provide specific instructions for the technician..."
                  className="w-full mt-2 p-5 bg-slate-50 border border-slate-100 rounded-3xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-yellow-400 transition-all outline-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Form Section: Address */}
              <div className="bg-slate-900 p-5 rounded-3xl flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Location</p>
                  <input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="bg-transparent w-full text-white font-bold text-sm outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                          onClick={handleSubmit}
                          disabled={!selectedStaff || submitting}
                          className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all
                            ${!selectedStaff || submitting 
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-100 hover:scale-[1.02]"}`}
                        >
                          {submitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              Assign Task
                            </>
                          )}
                        </button>


            </div>
          </div>

        </div>
      </div>
    </div>
  );
}