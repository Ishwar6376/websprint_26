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
  AlertOctagon,
  XCircle,
  ThumbsUp
} from "lucide-react";
import { Button } from "../../../ui/button"; 

const STEPS = [
  { status: "OPEN", label: "Report Submitted", description: "Report received and pending review.", icon: Circle },
  { status: "VERIFIED", label: "Verified", description: "Issue verified by authority or AI.", icon: ShieldCheck },
  { status: "ASSIGNED", label: "Team Assigned", description: "Cleanup crew has been dispatched.", icon: Truck },
  { status: "USERVERIFICATION", label: "Pending Verification", description: "Staff has uploaded proof. Please verify.", icon: ShieldCheck },
  { status: "RESOLVED", label: "Resolved", description: "The issue has been successfully cleared.", icon: CheckCircle2 },
];

export default function TrackReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        const token = await getAccessTokenSilently({
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });

        const res = await api.get(`/api/track/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
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
  const getCurrentStepIndex = (status) => {
    const statusMap = {
      "OPEN": 0,
      "VERIFIED": 1,
      "ASSIGNED": 2, 
      "IN_PROGRESS": 2, 
      "USERVERIFICATION": 3, // New step
      "RESOLVED": 4,
      "COMPLETED": 4
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'RESOLVED': 
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'ASSIGNED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'VERIFIED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'USERVERIFICATION': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  // 3. Action Handlers for Confirm/Reject
  const handleConfirmation = async (isSatisfied) => {
    try {
      setActionLoading(true);
      const token = await getAccessTokenSilently();
      
      // Determine endpoint based on action
      const endpoint = isSatisfied ? "/api/track/confirm" : "/api/track/reject";
      const payload = { 
        taskId: report.assignedTaskId, 
        reportId: report.id 
      };


      if (!isSatisfied) {
        const reason = prompt("Please provide a reason for rejection:");
        if (!reason) {
          setActionLoading(false);
          return; // Cancel if no reason
        }
        payload.reason = reason;
      }

      await api.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reload to reflect new status
      window.location.reload(); 
    } catch (err) {
      console.error("Action failed:", err);
      alert("Failed to update report status. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if(!confirm("Are you sure you want to delete this report? This cannot be undone.")) return;
    try {
        const token = await getAccessTokenSilently();
        await api.delete(`/api/reports/${report.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/dashboard');
    } catch(err) {
        alert("Failed to delete report");
    }
  }

  if (loading) return <div className="h-screen w-full bg-slate-950 flex items-center justify-center"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>;
  if (error || !report) return <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-zinc-400 gap-4"><AlertTriangle className="h-10 w-10 text-red-500" /><p>{error || "Report not found"}</p><Button onClick={() => navigate(-1)} variant="outline">Go Back</Button></div>;

  const currentStep = getCurrentStepIndex(report.status || "OPEN");

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white font-sans relative overflow-x-hidden selection:bg-blue-500/30">
      
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
          
          {/* LEFT COLUMN: Main Details */}
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

            {/* 2. PROOF & ACTION SECTION (Only for USERVERIFICATION) */}
            {report.status === "USERVERIFICATION" && report.proofImageUrl && (
               <div className="bg-purple-500/5 border border-purple-500/20 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="flex items-center gap-3 text-purple-300 mb-2 relative z-10">
                    <ShieldCheck className="w-6 h-6 animate-pulse" />
                    <h3 className="text-lg font-bold uppercase tracking-wider">Verification Required</h3>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed max-w-xl">
                    The assigned staff member has marked this issue as resolved. Please review the proof image below. 
                    If you are satisfied, confirm the resolution to close this report.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Before Image (Small Ref) */}
                    <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold text-zinc-500 uppercase">Original Issue</span>
                      <div className="aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/5 grayscale hover:grayscale-0 transition-all">
                         <img src={report.imageUrl} className="w-full h-full object-cover" />
                      </div>
                    </div>

                    {/* After Image (Main Focus) */}
                    <div className="space-y-2">
                       <span className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3" /> Resolution Proof
                       </span>
                       <div className="aspect-video rounded-xl overflow-hidden bg-black/40 border-2 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] group cursor-zoom-in" onClick={() => window.open(report.proofImageUrl, '_blank')}>
                          <img src={report.proofImageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4 relative z-10">
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-900/20"
                      onClick={() => handleConfirmation(true)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                      Yes, Issue is Resolved
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-12 rounded-xl"
                      onClick={() => handleConfirmation(false)}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      No, It's Still There
                    </Button>
                  </div>
               </div>
            )}

            {/* 3. AI Analysis Card */}
            {report.aiAnalysis && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                 <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                       <Bot className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-2">AI Assessment</h3>
                       <p className="text-zinc-300 text-sm leading-relaxed">
                          {report.aiAnalysis}
                       </p>
                       <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 font-mono bg-indigo-950/30 w-fit px-2 py-1 rounded">
                          Confidence Score: {(report.confidence * 100).toFixed(0)}%
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* 4. Meta Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
                 <div className="p-2.5 bg-zinc-800 rounded-lg text-zinc-400">
                    <MapPin className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase mb-1">Location</p>
                    <p className="text-sm text-zinc-200 line-clamp-2 mb-2">{report.address}</p>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=$${report.location?.lat},${report.location?.lng}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Open in Maps →
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
                 </div>
              </div>
            </div>

            {/* DELETE BUTTON (Only if still OPEN) */}
            {report.status === "OPEN" && (
                <div className="pt-6 border-t border-white/5 flex justify-end">
                    <Button 
                        variant="ghost" 
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                        Delete Report
                    </Button>
                </div>
            )}

          </div>

          {/* RIGHT COLUMN: Timeline */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm sticky top-24">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" /> 
                Timeline
              </h3>
              
              <div className="relative pl-2 space-y-8">
                <div className="absolute top-3 left-[19px] h-[calc(100%-30px)] w-0.5 bg-white/10" />

                {STEPS.map((step, index) => {
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;
                  const Icon = step.icon;

                  return (
                    <div key={step.status} className="relative flex gap-4 group">
                      <div className={`
                        relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 transition-all duration-500
                        ${isCompleted 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                          : 'bg-slate-900 border-white/10 text-zinc-600'}
                        ${step.status === 'USERVERIFICATION' && isCurrent ? 'animate-pulse ring-2 ring-purple-500/50' : ''}
                      `}>
                        <Icon className="h-4 w-4" />
                      </div>

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
                    <div className={`w-2 h-2 rounded-full animate-pulse ${report.status === 'RESOLVED' || report.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <p className="text-xs text-zinc-400">
                        {report.status === 'RESOLVED' || report.status === 'COMPLETED'
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