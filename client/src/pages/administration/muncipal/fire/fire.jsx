import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  ArrowLeft,
  LogOut,
  Flame,
  MapPin,
  AlertOctagon,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Truck,
  Inbox
} from "lucide-react";
import { useAuthStore } from "../../../../store/useAuthStore";
import { api } from "../../../../lib/api.js";

export default function FireAdmin() {
  const navigate = useNavigate();
  const { logout } = useAuth0();
  const { user: storedUser } = useAuthStore();

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [activeTab, setActiveTab] = useState("current");

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get("/api/municipal/fire/reports");
        setZones(res.data?.zones || []);
      } catch (err) {
        console.error("Error fetching fire zones:", err);
        setZones([]);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, []);

  const priorityMap = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const { currentReports, assignedReports, resolvedReports } = useMemo(() => {
    if (!selectedZone) return { currentReports: [], assignedReports: [], resolvedReports: [] };
    const reports = selectedZone.reports || [];

    const current = reports.filter(r => r.status !== "RESOLVED" && r.status !== "ASSIGNED" && r.status !== "IN_PROGRESS");
    const assigned = reports.filter(r => r.status === "ASSIGNED" || r.status === "IN_PROGRESS");
    const resolved = reports.filter(r => r.status === "RESOLVED");

    const sortByPriority = list =>
      list.sort((a, b) => (priorityMap[a.severity] ?? 99) - (priorityMap[b.severity] ?? 99));

    return {
      currentReports: sortByPriority(current),
      assignedReports: sortByPriority(assigned),
      resolvedReports: sortByPriority(resolved)
    };
  }, [selectedZone]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "RESOLVED":
        return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Resolved" };
      case "ASSIGNED":
      case "IN_PROGRESS":
        return { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Truck, label: "Dispatched" };
      default:
        return { color: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock, label: status };
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full h-20 px-8 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => selectedZone ? setSelectedZone(null) : navigate("/administration")} className="p-2 rounded-full hover:bg-slate-100">
            <ArrowLeft className="w-6 h-6 text-slate-500" />
          </button>
          <div className="w-10 h-10 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center text-red-600">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">Smart Fire Control</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Emergency Response Management
            </p>
          </div>
        </div>

        <button
          onClick={() => logout({ returnTo: window.location.origin })}
          className="h-11 w-11 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 text-slate-500" />
        </button>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">

        {/* ZONES GRID */}
        {!selectedZone ? (
          <>
            <h2 className="text-3xl font-black mb-2">Fire Incident Zones</h2>
            <p className="text-slate-500 mb-6">Clusters of emergency alerts</p>

            {loading ? (
              <div className="text-slate-400">Loading zones...</div>
            ) : zones.length === 0 ? (
              <div className="text-slate-400">No fire zones found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zones.map(zone => (
                  <button key={zone.zoneId} onClick={() => setSelectedZone(zone)} className="bg-white border rounded-[2rem] p-6 text-left hover:shadow-xl">
                    <h3 className="text-2xl font-black">Zone {zone.zoneId.toUpperCase()}</h3>
                    <p className="text-xs text-slate-400">Geohash: {zone.geohash}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (

          /* REPORTS VIEW */
          <div>
            <h2 className="text-2xl font-bold mb-4">Zone {selectedZone.zoneId}</h2>

            {(activeTab === "current" ? currentReports : activeTab === "assigned" ? assignedReports : resolvedReports).map(report => {
              const badge = getStatusBadge(report.status);
              const StatusIcon = badge.icon;

              return (
                <div key={report.id} className="bg-white border rounded-2xl p-4 mb-4 flex gap-4">
                  <img src={report.imageUrl} className="w-40 h-40 object-cover rounded-xl" />

                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{report.title}</h3>
                    <p className="text-sm text-slate-500 mb-2">{report.aiAnalysis}</p>

                    <div className="flex gap-2 mb-2">
                      <div className={`px-3 py-1 text-xs font-bold border rounded ${badge.color}`}>
                        <StatusIcon className="w-4 h-4 inline mr-1" />
                        {badge.label}
                      </div>
                    </div>

                    {activeTab === "current" && (
                      <button
                        onClick={() =>
                          navigate(`/assign/fire/${selectedZone.geohash}`, {
                            state: { prefill: { ...report, department: "fire" } }
                          })
                        }
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
                      >
                        Dispatch Fire Team
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
