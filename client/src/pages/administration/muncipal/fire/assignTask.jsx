import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getDatabase, ref, onValue, off } from "firebase/database";
import {
  ArrowLeft,
  MapPin,
  User,
  CheckCircle2,
  Send,
  Flame
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth0 } from "@auth0/auth0-react";

export default function AssignFireTask() {
  const { geoHash } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getAccessTokenSilently } = useAuth0();

  const [searchParams] = useSearchParams();
  const reportIdFromUrl = searchParams.get("reportId");

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
    address: prefill.address || "Incident Location",
    lat: prefill.location?.lat,
    lng: prefill.location?.lng,
    imageUrl: prefill.imageUrl,
    reporterEmail: prefill.email
  });

  // 🔥 Fetch Fire Staff (NOT waste)
  useEffect(() => {
    const db = getDatabase();
    const zoneRef = ref(db, `staff/fire/${geoHash}`);

    const listener = onValue(zoneRef, (snapshot) => {
      const data = snapshot.val();
      setStaffList(
        data ? Object.entries(data).map(([k, v]) => ({ id: k.replace('_', '|'), ...v })) : []
      );
      setLoading(false);
    });

    return () => off(zoneRef, listener);
  }, [geoHash]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return alert("Select a fire response unit");

    setSubmitting(true);
    try {
      const token = await getAccessTokenSilently();

      await api.post('/api/staff/tasks/assign', {
        ...formData,
        reportId: reportIdFromUrl || prefill.reportId || null,
        department: "fire",   // 🔥 IMPORTANT CHANGE
        assignedTo: selectedStaff.id,
        assignedToName: selectedStaff.name,
        zoneGeohash: geoHash,
        email: prefill.reporterEmail,
        imageUrl: prefill.imageUrl,
        reportGeohash: prefill.reportGeohash,
        location: { lat: formData.lat, lng: formData.lng }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("🔥 Fire Response Team Dispatched!");
      navigate(-1);

    } catch (error) {
      console.error(error);
      alert("Dispatch failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-red-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border rounded-full hover:bg-red-100">
            <ArrowLeft className="w-5 h-5 text-red-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-red-700 flex items-center gap-2">
              <Flame className="w-6 h-6" /> Dispatch Fire Task
            </h1>
            <div className="flex gap-2 text-sm text-slate-500">
              <span className="font-mono bg-red-100 text-red-800 px-2 rounded">{geoHash}</span>
              {reportIdFromUrl && (
                <span className="font-mono bg-emerald-100 text-emerald-700 px-2 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Report Linked
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* STAFF SIDEBAR */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-red-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Fire Units Available ({staffList.length})
            </h3>

            <div className="space-y-3 h-[500px] overflow-y-auto pr-2">
              {loading ? <p className="text-slate-400 text-sm italic">Scanning response units...</p> :
                staffList.length === 0 ? (
                  <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl text-sm border border-yellow-200">
                    No fire units online.
                  </div>
                ) : staffList.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedStaff(staff)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all
                      ${selectedStaff?.id === staff.id
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white border-slate-200 hover:border-red-400"}`}
                  >
                    <img src={staff.picture} alt="" className="w-10 h-10 rounded-full bg-slate-200" />
                    <div>
                      <p className="text-sm font-bold">{staff.name}</p>
                      <p className="text-[10px] font-mono opacity-70">Online</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* FORM */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">

              <input
                required
                className="w-full p-3 bg-slate-50 border rounded-xl font-bold"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />

              <textarea
                rows="4"
                className="w-full p-3 bg-slate-50 border rounded-xl"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="bg-slate-50 p-4 rounded-xl border flex items-center gap-3">
                <MapPin className="w-5 h-5 text-red-600" />
                <input
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="bg-transparent w-full"
                />
              </div>

              <button
                disabled={submitting || !selectedStaff}
                className="w-full py-4 bg-red-600 text-white rounded-xl font-bold flex justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Dispatching..." : "Dispatch Fire Team"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
