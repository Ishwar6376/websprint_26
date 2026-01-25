import { useEffect, useState } from "react";
import { Droplets, Trash2, Zap, Building2, HelpCircle, Loader2 } from "lucide-react";
// import { api } from "../../../../lib/api"; // Commented out for now
import { useAuthStore } from "../../../../store/useAuthStore";
// import { useAuth0 } from "@auth0/auth0-react"; // Commented out for now

export default function ComplaintList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  // const { getAccessTokenSilently } = useAuth0(); 

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // --- DUMMY DATA MODE ---
        // Simulating network delay
        setTimeout(() => {
            const mockData = [
                {
                    reportId: "mock-001",
                    severity: "CRITICAL",
                    category: "WATER",
                    title: "Massive Pipe Leak",
                    address: "124, MG Road, Indiranagar",
                    status: "ASSIGNED"
                },
                {
                    reportId: "mock-002",
                    severity: "MEDIUM",
                    category: "WASTE",
                    title: "Garbage Overflow",
                    address: "Sector 4, HSR Layout",
                    status: "INITIATED"
                },
                {
                    reportId: "mock-003",
                    severity: "HIGH",
                    category: "ELECTRICITY",
                    title: "Exposed Live Wire",
                    address: "Near Central Park Gate 2",
                    status: "VERIFIED"
                },
                {
                    reportId: "mock-004",
                    severity: "LOW",
                    category: "INFRASTRUCTURE",
                    title: "Pothole",
                    address: "Koramangala 4th Block",
                    status: "RESOLVED"
                }
            ];
            setReports(mockData);
            setLoading(false);
        }, 1000);

        /* // --- REAL API CODE (Commented Out) ---
        const token = await getAccessTokenSilently();
        const res = await api.get(`/reports/user/${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReports(res.data || []);
        */

      } catch (err) {
        console.error("Failed to fetch history", err);
        setLoading(false);
      }
    };

    fetchReports();
  }, []); // Removed dependencies for dummy mode

  const getStatusColor = (status) => {
    switch(status) {
      case "RESOLVED": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "ASSIGNED": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "VERIFIED": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      default: return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"; // INITIATED
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case "WATER": return <Droplets className="w-5 h-5" />;
      case "WASTE": return <Trash2 className="w-5 h-5" />;
      case "ELECTRICITY": return <Zap className="w-5 h-5" />;
      case "INFRASTRUCTURE": return <Building2 className="w-5 h-5" />;
      default: return <HelpCircle className="w-5 h-5" />;
    }
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-zinc-500" /></div>;

  return (
    <div className="space-y-3">
      {reports.length === 0 ? (
        <div className="text-center text-zinc-500 text-xs py-4">No reports found.</div>
      ) : (
        // Slice(0, 3) to show only last 3 reports
        reports.slice(0, 3).map((report) => (
          <div 
            key={report.reportId || report.id} 
            className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                report.severity === 'CRITICAL' || report.severity === 'HIGH' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                {getCategoryIcon(report.category)}
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-zinc-200 uppercase">{report.title || report.category || "Report"}</h4>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
                  <span className="truncate max-w-[120px]">{report.address}</span>
                </div>
              </div>
            </div>

            <div className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(report.status)}`}>
              {report.status}
            </div>
          </div>
        ))
      )}
      
      <button className="w-full py-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors border-t border-white/5 mt-2">
        View All History
      </button>
    </div>
  );
}