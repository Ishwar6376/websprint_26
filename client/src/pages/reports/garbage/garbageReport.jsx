import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom"; // 👈 Import for navigation
import { api } from "../../../lib/api.js";
import { 
  History, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  ArrowRight,
  Activity
} from "lucide-react";
import { Button } from "../../../ui/button"; // Assuming you have this UI component

export default function GarbageReports() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate(); // 👈 Initialize navigation

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setError(null);
        const token = await getAccessTokenSilently({
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });
        
        const res = await api.get("/api/reports/garbage", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setReports(res.data.reports);
      } catch (err) {
        console.error("Error fetching reports:", err);
        setError("Failed to load reports. Please try again later.");
      }
    };

    fetchReports();
  }, [getAccessTokenSilently]);

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 p-4 md:p-8 relative overflow-hidden font-sans">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950/0 to-slate-950/0 pointer-events-none" />

      <div className="space-y-6 max-w-3xl mx-auto relative z-10 mt-6"> 
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Your Contributions</h1>
            <p className="text-zinc-400 text-sm mt-1">Track the status of your submitted reports</p>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <History className="h-5 w-5 text-blue-400" />
          </div>
        </div>

        {/* 🔴 ERROR MESSAGE */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20 backdrop-blur-md">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 🟡 EMPTY STATE */}
        {reports.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-4 border border-dashed border-white/10 rounded-2xl bg-white/5">
            <div className="p-4 bg-white/5 rounded-full">
                <History className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">No complaints submitted yet</p>
          </div>
        ) : (
          /* 🟢 LIST OF REPORTS */
          <div className="grid gap-4">
            {reports.map((r) => (
              <div
                key={r.id}
                className="group relative bg-zinc-900/50 hover:bg-zinc-900/80 border border-white/10 hover:border-blue-500/30 p-5 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-blue-900/10"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left: Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                         {/* Status Badge */}
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${
                            r.status === 'RESOLVED' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                         }`}>
                            {r.status || 'OPEN'}
                         </span>
                         
                         <span className="text-zinc-500 text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(r.createdAt || r.timestamp)}
                         </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-200 transition-colors">
                      {r.title}
                    </h3>
                    
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${r.type === "DUSTBIN" ? "bg-blue-500" : "bg-red-500"}`} />
                        {r.type === "DUSTBIN" ? "Dustbin Request" : "Garbage Report"}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="shrink-0 flex sm:flex-col items-end gap-2">
                     <Button 
                        onClick={() => navigate(`/track/${r.id}`)}
                        className="bg-white/5 hover:bg-blue-600 hover:text-white text-zinc-300 border border-white/10 hover:border-transparent transition-all rounded-xl px-5 py-2 h-auto text-sm font-medium flex items-center gap-2"
                     >
                        <Activity className="h-4 w-4" />
                        Track Status
                        <ArrowRight className="h-3 w-3 opacity-50 group-hover:translate-x-1 transition-transform" />
                     </Button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}