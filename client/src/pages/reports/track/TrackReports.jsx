import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { api } from "../../../lib/api.js";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Loader2,
  AlertTriangle,
  Bot,
  Truck,
  ShieldCheck,
  AlertOctagon
} from "lucide-react";
import { Button } from "../../../ui/button"; 

// Updated Timeline Steps to match your specific workflow
const STEPS = [
  { status: "OPEN", label: "Report Submitted", description: "Report received and pending review.", icon: Circle },
  { status: "VERIFIED", label: "Verified", description: "Issue verified by authority or AI.", icon: ShieldCheck },
  { status: "ASSIGNED", label: "Team Assigned", description: "Cleanup crew has been dispatched.", icon: Truck },
  { status: "RESOLVED", label: "Resolved", description: "The issue has been successfully cleared.", icon: CheckCircle2 },
];

export default function TrackReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        const token = await getAccessTokenSilently({
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });

        const res = await api.get(`/api/track/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Handle both direct object or nested report object
        setReport(res.data.report || res.data); 
      } catch (err) {
        console.error("Error fetching track details:", err);
        setError("Could not load report details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchReportDetails();
  }, [id, getAccessTokenSilently]);

  // Helper to map status to step index
  const getCurrentStepIndex = (status) => {
    const statusMap = {
      "OPEN": 0,
      "VERIFIED": 1,
      "ASSIGNED": 2, // Maps strictly to ASSIGNED
      "IN_PROGRESS": 2, // Fallback for legacy status
      "RESOLVED": 3
    };
    return statusMap[status] ?? 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  // Helper for Status Badge Colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'RESOLVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'ASSIGNED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'VERIFIED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  if (loading) return <div className="h-screen w-full bg-slate-950 flex items-center justify-center"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>;
  if (error || !report) return <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-zinc-400 gap-4"><AlertTriangle className="h-10 w-10 text-red-500" /><p>{error || "Report not found"}</p><Button onClick={() => navigate(-1)} variant="outline">Go Back</Button></div>;

  const currentStep = getCurrentStepIndex(report.status || "OPEN");

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white font-sans relative overflow-x-hidden selection:bg-blue-500/30">
      
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Report Status</h1>
          <p className="text-xs text-zinc-500 font-mono">ID: {report.id?.slice(0, 8)}...</p>
        </div>
        <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(report.status)}`}>
          {report.status}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-8 space-y-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Main Details (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Hero Image & Title */}
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm group">
              <div className="relative h-72 md:h-96 w-full bg-black/50 overflow-hidden">
                {report.imageUrl ? (
                  <img src={report.imageUrl} alt="Report" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-zinc-500">No Image Available</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6">
                  {/* Severity Badge */}
                  {report.severity && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 border
                      ${report.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}
                    `}>
                      <AlertOctagon className="w-3 h-3" />
                      {report.severity} SEVERITY
                    </span>
                  )}
                  <h2 className="text-2xl md:text-3xl font-bold text-white shadow-black drop-shadow-lg leading-tight">
                    {report.title}
                  </h2>
                </div>
              </div>
            </div>

            {/* 2. AI Analysis Card */}
            {report.aiAnalysis && (
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Bot className="w-24 h-24" />
                 </div>
                 <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                       <Bot className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-2">AI Assessment</h3>
                       <p className="text-indigo-100/80 text-sm leading-relaxed">
                          {report.aiAnalysis}
                       </p>
                       <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 font-mono bg-indigo-950/30 w-fit px-2 py-1 rounded">
                          Confidence Score: {(report.confidence * 100).toFixed(0)}%
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* 3. Location & Meta Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
                 <div className="p-2.5 bg-zinc-800 rounded-lg text-zinc-400">
                    <MapPin className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase mb-1">Location</p>
                    <p className="text-sm text-zinc-200 line-clamp-2 mb-2">{report.address}</p>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${report.location?.lat},${report.location?.lng}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Open in Maps &rarr;
                    </a>
                 </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
                 <div className="p-2.5 bg-zinc-800 rounded-lg text-zinc-400">
                    <Calendar className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase mb-1">Submitted On</p>
                    <p className="text-sm text-zinc-200">{formatDate(report.createdAt)}</p>
                    {report.updatedAt && (
                       <p className="text-xs text-zinc-500 mt-1">Last update: {new Date(report.updatedAt._seconds * 1000).toLocaleDateString()}</p>
                    )}
                 </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Timeline (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm sticky top-24">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" /> 
                Timeline
              </h3>
              
              <div className="relative pl-2 space-y-8">
                {/* Vertical Line Connector */}
                <div className="absolute top-3 left-[19px] h-[calc(100%-30px)] w-0.5 bg-white/10" />

                {STEPS.map((step, index) => {
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;
                  const Icon = step.icon;

                  return (
                    <div key={step.status} className="relative flex gap-4 group">
                      {/* Step Indicator */}
                      <div className={`
                        relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 transition-all duration-500
                        ${isCompleted 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                          : 'bg-slate-900 border-white/10 text-zinc-600'}
                      `}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Step Text */}
                      <div className={`pt-1 transition-opacity duration-500 ${isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                        <p className={`text-sm font-bold ${isCurrent ? 'text-blue-400' : 'text-zinc-200'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {step.description}
                        </p>
                        {step.status === 'ASSIGNED' && isCompleted && report.assignedTaskId && (
                           <div className="mt-2 text-[10px] font-mono bg-blue-500/10 text-blue-300 px-2 py-1 rounded w-fit border border-blue-500/20">
                              Task ID: {report.assignedTaskId.slice(0,6)}...
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${report.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <p className="text-xs text-zinc-400">
                        {report.status === 'RESOLVED' 
                            ? "This case is closed. Thank you for making the city cleaner!"
                            : "Updates are refreshed in real-time."}
                    </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}