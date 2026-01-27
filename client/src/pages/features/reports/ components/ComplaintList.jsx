import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { Droplets, Trash2, Zap, Building2, HelpCircle, Loader2 } from "lucide-react";
import { api } from "../../../../lib/api"; 
import { useAuth0 } from "@auth0/auth0-react";
export default function ComplaintList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAccessTokenSilently } = useAuth0(); 
  const navigate = useNavigate(); 
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = await getAccessTokenSilently({
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });

        const res = await api.post('/api/reports/fetch3Reports', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("response for reports",res.data);
        setReports(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [getAccessTokenSilently]);

  const formatTimeAgo = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput._seconds ? dateInput._seconds * 1000 : dateInput);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };
  const getStatusColor = (status) => {
    const normalized = status?.toUpperCase();
    if (normalized === "RESOLVED") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (normalized === "IN_PROGRESS" || normalized === "ASSIGNED") return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (normalized === "VERIFIED") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
  };
  const getSeverityStyle = (severity) => {
    const s = severity?.toUpperCase();
    if (s === 'CRITICAL' || s === 'HIGH') return 'bg-red-500/10 border-red-500/20 text-red-400';
    if (s === 'MEDIUM') return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    return 'bg-slate-800 border-white/5 text-slate-400'; 
  };
  const getCategoryIcon = (category) => {
    // [CHANGE] Switched to use the new assigned_category values
    switch(category?.toUpperCase()) {
      case "WATER": return <Droplets className="w-5 h-5" />;
      case "WASTE": return <Trash2 className="w-5 h-5" />;
      case "ELECTRICITY": return <Zap className="w-5 h-5" />;
      case "INFRASTRUCTURE": return <Building2 className="w-5 h-5" />;
      default: return <HelpCircle className="w-5 h-5" />;
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>;

  return (
    <div className="space-y-3">
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-zinc-500 border border-dashed border-white/10 rounded-xl">
          <p className="text-xs">No reports found.</p>
        </div>
      ) : (
        reports.map((report) => (
          <div 
            key={report.id} 
            onClick={() => navigate(`/track/${report.id}`)}
            className="group flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {/* [CHANGE] Pass assigned_category to the icon function */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${getSeverityStyle(report.severity)}`}>
                {getCategoryIcon(report.assigned_category)}
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {/* [CHANGE] Use assigned_category for the fallback title */}
                  <h4 className="text-sm font-bold text-zinc-200 capitalize truncate max-w-[160px]">
                    {report.title || (report.assigned_category ? `${report.assigned_category.toLowerCase()} Issue` : "Report Issue")}
                  </h4>
                  {report.createdAt && (
                    <span className="text-[10px] text-zinc-600 flex items-center gap-0.5 shrink-0">
                       • {formatTimeAgo(report.createdAt)}
                    </span>
                  )}
                </div>
                
                <p className="text-[11px] text-zinc-500 font-medium truncate max-w-[140px] leading-tight mt-0.5">
                  {report.address || "Location unavailable"}
                </p>
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(report.status)}`}>
              {report.status === 'success' ? 'Received' : report.status || 'Open'}
            </div>
          </div>
        ))
      )}
      
      {reports.length > 0 && (
        <button 
          onClick={(e) => {
            e.stopPropagation(); 
            navigate('/dashboard/history');
          }}
          className="w-full py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors border-t border-white/5 mt-1"
        >
          View Full History
        </button>
      )}
    </div>
  );
}