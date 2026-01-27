import React, { useState, useEffect } from "react";
import { 
  Trash2, 
  Filter, 
  CheckCircle, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Droplets, 
  Trash, 
  Building2,
  CalendarDays,
  Check,
  UserCheck,
  HardHat
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "@/store/useAuthStore";

const UserReportsDashboard = ({ userId }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL"); 
  const [filterCategory, setFilterCategory] = useState("ALL"); 
  
  const { getAccessTokenSilently } = useAuth0();
  const user = useAuthStore((s) => s.user);

  const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";
    if (dateVal._seconds) {
      return new Date(dateVal._seconds * 1000).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
      });
    }
    return new Date(dateVal).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = await getAccessTokenSilently({
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });

        const res = await api.get("/api/user/reports", {
            headers: { Authorization: `Bearer ${token}` },
        });
        
        const apiData = res.data?.data || { waste: [], infrastructure: [], water: [] };

        const allReports = [
          ...(apiData.waste || []).map(r => ({ ...r, type: "WASTE" })),
          ...(apiData.infrastructure || []).map(r => ({ ...r, type: "INFRA" })),
          ...(apiData.water || []).map(r => ({ ...r, type: "WATER" })),
        ];

        allReports.sort((a, b) => {
            const dateA = a.createdAt?._seconds || 0;
            const dateB = b.createdAt?._seconds || 0;
            return dateB - dateA;
        });

        setReports(allReports);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load reports", error);
        setLoading(false);
      }
    };

    if (user) {
        fetchReports();
    }
  }, [getAccessTokenSilently, user]);

  const handleMarkResolved = async (reportId) => {
    // Determine the action message based on current status (optional UX polish)
    const report = reports.find(r => r.id === reportId);
    const isWaiting = report?.status === "WAITING_APPROVAL";
    
    const confirmMsg = isWaiting 
      ? "Confirm that this issue has been fixed?" 
      : "Mark this report as resolved manually? This cannot be undone.";

    if (!window.confirm(confirmMsg)) return;

    try {
        const token = await getAccessTokenSilently({
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });

        // Backend call to update status to 'RESOLVED'
        await api.put(`/api/reports/resolve`, 
            { reportId }, 
            { headers: { Authorization: `Bearer ${token}` }}
        );

        // Optimistic Update
        setReports((prev) => prev.map((r) => 
            r.id === reportId ? { ...r, status: "RESOLVED" } : r
        ));

    } catch (error) {
        console.error("Error resolving report:", error);
        alert("Failed to update status. Please try again.");
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      // await api.delete(`/api/reports/${reportId}`); 
    } catch (error) {
      alert("Failed to delete report");
    }
  };

  const getFilteredReports = () => {
    return reports.filter((report) => {
      if (filterCategory !== "ALL" && report.type !== filterCategory) return false;
      
      // Strict filtering based on your workflow
      if (filterStatus === "RESOLVED") return report.status === "RESOLVED";
      if (filterStatus === "PENDING") return report.status !== "RESOLVED"; // Includes VERIFIED, ASSIGNED, WAITING_APPROVAL
      
      return true;
    });
  };

  const filteredData = getFilteredReports();

  const getStatusBadge = (status) => {
    switch (status) {
        case "RESOLVED":
            return (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    <CheckCircle size={14} /> Resolved
                </span>
            );
        case "WAITING_APPROVAL":
            return (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                    <UserCheck size={14} /> Waiting Your Approval
                </span>
            );
        case "ASSIGNED":
            return (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    <HardHat size={14} /> Assigned
                </span>
            );
        case "VERIFIED":
        default:
            return (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                    <Clock size={14} /> Verified / Pending
                </span>
            );
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "WASTE": return <Trash className="text-orange-500" size={18} />;
      case "INFRA": return <Building2 className="text-blue-500" size={18} />;
      case "WATER": return <Droplets className="text-cyan-500" size={18} />;
      default: return <AlertTriangle size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Reports</h1>
          <p className="text-gray-500 mt-1">Track the lifecycle of your submitted issues.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium">Total Submitted</div>
            <div className="text-2xl font-bold text-gray-800">{reports.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium">Pending Resolution</div>
            <div className="text-2xl font-bold text-orange-600">
              {reports.filter(r => r.status !== "RESOLVED").length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium">Resolved</div>
            <div className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.status === "RESOLVED").length}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {["ALL", "PENDING", "RESOLVED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filterStatus === tab 
                    ? "bg-white text-gray-800 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            <span className="text-gray-400 text-sm flex items-center gap-1">
              <Filter size={14} /> Type:
            </span>
            {["ALL", "WASTE", "INFRA", "WATER"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 border rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCategory === cat
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading reports...</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No reports found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((report) => (
              <div 
                key={report.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
              >
                {report.imageUrl && (
                    <div className="h-40 w-full overflow-hidden bg-gray-100 relative">
                        <img 
                            src={report.imageUrl} 
                            alt={report.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 right-2 shadow-sm">
                            {getStatusBadge(report.status)}
                        </div>
                    </div>
                )}

                {!report.imageUrl && (
                    <div className="p-4 flex justify-between items-start pb-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                {getTypeIcon(report.type)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                                    {report.type}
                                </h3>
                            </div>
                        </div>
                        {getStatusBadge(report.status)}
                    </div>
                )}

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">
                      {report.title || "Untitled Report"}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">
                    {report.description || report.aiAnalysis || "No details provided."}
                  </p>
                  
                  <div className="space-y-2 mt-auto">
                    {report.address && (
                        <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            <MapPin size={14} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{report.address}</span>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                        <div className="flex items-center gap-1">
                            <CalendarDays size={12} />
                            <span>{formatDate(report.createdAt)}</span>
                        </div>
                        {report.geohash && <span>Hash: {report.geohash}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      report.severity === "CRITICAL" ? "bg-red-50 text-red-600" :
                      report.severity === "HIGH" ? "bg-orange-50 text-orange-600" :
                      "bg-blue-50 text-blue-600"
                    }`}>
                      {report.severity || "NORMAL"}
                    </span>

                    <div className="flex gap-2">
                        {/* Logic: Users can approve if status is WAITING_APPROVAL.
                            (Optional: Can also allow manual resolve from VERIFIED/ASSIGNED if user fixes it themselves)
                        */}
                        {report.status !== "RESOLVED" && (
                            <button 
                                onClick={() => handleMarkResolved(report.id)}
                                className={`flex items-center gap-1 p-2 rounded-full transition-all ${
                                    report.status === "WAITING_APPROVAL" 
                                    ? "bg-green-600 text-white px-3 hover:bg-green-700 shadow-md"
                                    : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                                }`}
                                title="Mark as Resolved"
                            >
                                <Check size={18} />
                                {report.status === "WAITING_APPROVAL" && <span className="text-xs font-bold">Confirm Fix</span>}
                            </button>
                        )}

                        <button 
                          onClick={() => handleDelete(report.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                          title="Delete Report"
                        >
                          <Trash2 size={18} />
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserReportsDashboard;