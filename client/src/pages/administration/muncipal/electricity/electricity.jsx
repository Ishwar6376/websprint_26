import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  ArrowLeft,
  LogOut,
  Zap,
  MapPin,
  AlertOctagon,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Truck,
  Inbox
} from "lucide-react";

import { api } from "@/lib/api";

export default function ElectricityAdmin() {
  const navigate = useNavigate();
  const { logout } = useAuth0();

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [activeTab, setActiveTab] = useState("current");

  // FETCH ZONES
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get("/api/municipal/electricity/reports");
        if (res.data && res.data.zones) {
          setZones(res.data.zones);
        } else {
          setZones([]);
        }
      } catch (err) {
        console.error("Error loading electricity zones", err);
        setZones([]);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, []);

  const priorityMap = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  // SPLIT REPORTS
  const { currentReports, assignedReports, resolvedReports } = useMemo(() => {
    if (!selectedZone) {
      return { currentReports: [], assignedReports: [], resolvedReports: [] };
    }

    const reports = selectedZone.reports || [];

    const current = reports.filter(
      r => r.status !== "RESOLVED" && r.status !== "ASSIGNED" && r.status !== "IN_PROGRESS"
    );

    const assigned = reports.filter(
      r => r.status === "ASSIGNED" || r.status === "IN_PROGRESS"
    );

    const resolved = reports.filter(r => r.status === "RESOLVED");

    const sortByPriority = (list) =>
      list.sort((a, b) => (priorityMap[a.severity] ?? 99) - (priorityMap[b.severity] ?? 99));

    return {
      currentReports: sortByPriority(current),
      assignedReports: sortByPriority(assigned),
      resolvedReports: sortByPriority(resolved),
    };
  }, [selectedZone]);

  // Status Badge Helper
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
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (selectedZone) {
                setSelectedZone(null);
                setActiveTab("current");
              } else {
                navigate("/administration");
              }
            }}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center justify-center text-yellow-600 shadow-sm">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">
              Power Grid
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Electricity Fault Monitoring
            </p>
          </div>
        </div>

        <button
          onClick={() => logout({ returnTo: window.location.origin })}
          className="h-11 w-11 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {!selectedZone ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Active Zones

              </h2>
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-amber-200 transition-colors">
  <div>
    <div className="flex items-center gap-2 mb-1">
      <div className="p-1.5 bg-amber-100 rounded-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="text-slate-900 font-semibold text-lg">Electricity Analysis</h3>
    </div>
    <p className="text-slate-500 text-sm italic">
      Electricity faults grouped by 5km² Geohash clusters
    </p>
  </div>
  
  <button
    onClick={() => navigate("/admin-map/ELECTRICITY")}
    className="group flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-5 py-2.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-amber-100 hover:shadow-lg active:scale-95"
  >
    <span className="text-sm">View Electricity Map</span>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  </button>
</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-yellow-500 rounded-full animate-spin" />
                Aggregating Grid Data...
              </div>
            ) : zones.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Zap className="w-12 h-12 mb-4 opacity-20" />
                <p>No active grid faults found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zones.map((zone) => (
                  // ... inside the zones.map in ElectricityAdmin
                    <button
                      key={zone.zoneId}
                      onClick={() => setSelectedZone(zone)}
                      className="group bg-white border border-slate-200 rounded-[2rem] p-6 text-left hover:shadow-xl hover:border-emerald-300 transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                          <MapPin className="w-7 h-7" />
                        </div>
                        {zone.criticalCount > 0 && (
                          <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3" />{" "}
                            {zone.criticalCount} Critical
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl font-black text-slate-900 mb-1">
                        Zone {zone.zoneId.toUpperCase()}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                        Geohash: {zone.geohash}
                      </p>

                      {/* Progress Bar Style Stats */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-600">
                          <span>Fault Reports</span>
                          <span>{zone.totalReports}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${(zone.criticalCount / zone.totalReports) * 100}%` }}
                            className="bg-rose-500 h-full"
                          />
                          <div
                            style={{ width: `${(zone.highCount / zone.totalReports) * 100}%` }}
                            className="bg-orange-400 h-full"
                          />
                          <div
                            style={{ width: `${(zone.clearedCount / zone.totalReports) * 100}%` }}
                            className="bg-emerald-500 h-full"
                          />
                        </div>
                      </div>

                      {/* The arrow icon now also turns emerald on hover */}
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-300">
                        <ChevronRight className="w-6 h-6 text-emerald-500" />
                      </div>
                    </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* VIEW 2: REPORTS LIST */
          <div className="animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => { setSelectedZone(null); setActiveTab("current"); }}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  Zone {selectedZone.zoneId.toUpperCase()}
                </h2>
                <p className="text-slate-500">Manage electricity fault reports</p>
              </div>
            </div>

            {/* TAB BUTTONS */}
            <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1">
              {[
                { id: "current", label: "Needs Action", icon: AlertOctagon, color: "text-rose-600", count: currentReports.length },
                { id: "assigned", label: "Dispatched", icon: Truck, color: "text-blue-600", count: assignedReports.length },
                { id: "resolved", label: "Resolved", icon: CheckCircle2, color: "text-emerald-600", count: resolvedReports.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-t-lg text-sm font-bold flex items-center gap-2 transition-all relative top-[1px]
                    ${activeTab === tab.id 
                      ? `bg-white ${tab.color} border border-slate-200 border-b-white` 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* REPORT LIST */}
            <div className="grid grid-cols-1 gap-4">
              {(() => {
                let displayReports = activeTab === "current" ? currentReports : activeTab === "assigned" ? assignedReports : resolvedReports;
                let emptyMessage = activeTab === "current" ? "No pending faults. Grid is stable!" : activeTab === "assigned" ? "No active dispatches." : "No resolved faults history.";

                if (displayReports.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <Inbox className="w-12 h-12 mb-2 opacity-20" />
                      <p>{emptyMessage}</p>
                    </div>
                  );
                }

                return displayReports.map((report) => {
                  const statusBadge = getStatusBadge(report.status);
                  const StatusIcon = statusBadge.icon;

                  return (
                    <div key={report.id || report._id} className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-col md:flex-row gap-6 hover:border-slate-300 transition-colors shadow-sm">
                      <img src={report.imageUrl} alt="Fault Evidence" className="w-full md:w-48 h-48 md:h-auto object-cover rounded-xl bg-slate-100" />
                      
                      <div className="py-4 pr-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1
                            ${report.severity === "CRITICAL" || report.severity === "HIGH" ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                            {report.severity === "CRITICAL" && <AlertOctagon className="w-3 h-3" />}
                            {report.severity} Priority
                          </span>
                          <span className="text-xs font-mono text-slate-400">{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-2">{report.title || "Electricity Fault"}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{report.aiAnalysis}</p>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start gap-2 mb-4">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-slate-600 font-medium break-all">{report.address}</p>
                        </div>

                        <div className="mt-auto flex gap-3">
                          <div className={`px-4 py-2 border rounded-lg flex items-center gap-2 text-xs font-bold ${statusBadge.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusBadge.label}
                          </div>

                          {activeTab === 'current' && (
                            <button
                              onClick={() => navigate(`/assign/electricity/${selectedZone.geohash}`, {
                                state: {
                                  prefill: {
                                    reportId: report.id || report._id,
                                    title: `Repair: ${report.title || "Fault"}`,
                                    description: `Original Report ID: ${report.id || report._id}\n\nAI Analysis: ${report.aiAnalysis}`,
                                    address: report.address,
                                    priority: report.severity,
                                    imageUrl: report.imageUrl,
                                    department: "electricity",
                                    reportGeohash: report.geohash,
                                    location: report.location,
                                    reporterEmail: report.email
                                  },
                                },
                              })}
                              className="flex-1 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
>
                              Assign Team
                            </button>
                          )}

                          <button 
                            onClick={() => navigate(`/track/${report.id || report._id}`)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                          >
                            <ExternalLink className="w-3 h-3" /> Track
                          </button>
  

                         

                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}