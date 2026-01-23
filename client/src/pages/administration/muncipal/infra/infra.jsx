import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { 
  ArrowLeft, 
  LogOut, 
  HardHat, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Maximize2
} from "lucide-react";

import { useAuthStore } from "../../../../store/useAuthStore";

export default function InfraAdmin() {
  const navigate = useNavigate();
  const { logout } = useAuth0();
  const { user: storedUser } = useAuthStore();
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("ALL");

  
  useEffect(() => {
    const fetchReports = async () => {
      try {
       
        const mockData = [
            {
                reportId: "INF-2026-001",
                title: "Collapsed Boundary Wall",
                severity: "CRITICAL",
                confidence: 0.92,
                aiAnalysis: "Image shows a structural failure of a brick boundary wall leaning onto the pedestrian pathway. High risk of complete collapse.",
                imageUrl: "https://images.unsplash.com/photo-1594713753578-27d928373740?q=80&w=600&auto=format&fit=crop",
                address: "Sector 4, Main Market Road, Prayagraj",
                status: "VERIFIED",
                createdAt: "2026-01-23T09:00:00",
                userId: "user_123",
                email: "citizen@example.com"
            },
            {
                reportId: "INF-2026-002",
                title: "Deep Pothole on Highway",
                severity: "HIGH",
                confidence: 0.88,
                aiAnalysis: "Detected a large pothole approximately 3ft wide on asphalt surface. Exposed gravel indicates base layer damage.",
                imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=600&auto=format&fit=crop",
                address: "NH-19, Near Flyover",
                status: "VERIFIED",
                createdAt: "2026-01-23T10:30:00",
                userId: "user_456",
                email: "driver@example.com"
            },
            {
                reportId: "INF-2026-003",
                title: "Faded Zebra Crossing",
                severity: "LOW",
                confidence: 0.75,
                aiAnalysis: "Road markings for pedestrian crossing are faded beyond 50% visibility. Cosmetic maintenance required.",
                imageUrl: "https://images.unsplash.com/photo-1568249829929-450f6120401d?q=80&w=600&auto=format&fit=crop",
                address: "Civil Lines, Intersection 4",
                status: "VERIFIED",
                createdAt: "2026-01-22T14:15:00",
                userId: "user_789",
                email: "walker@example.com"
            }
        ];
        
        setReports(mockData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching infra reports:", error);
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // --- 2. HELPERS ---
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "CRITICAL": return "bg-rose-100 text-rose-700 border-rose-200 animate-pulse";
      case "HIGH": return "bg-orange-100 text-orange-700 border-orange-200";
      case "MEDIUM": return "bg-amber-100 text-amber-700 border-amber-200";
      case "LOW": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const filteredReports = filterSeverity === "ALL" 
    ? reports 
    : reports.filter(r => r.severity === filterSeverity);

  // Stats
  const criticalCount = reports.filter(r => r.severity === "CRITICAL").length;
  const activeCount = reports.length;

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/administration")}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-orange-50 rounded-xl border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">
              Infrastructure
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Structural Health Monitoring
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
            <span>Admin Mode</span>
          </div>
           <button 
            onClick={() => logout({ returnTo: window.location.origin })}
            className="h-11 w-11 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        
        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="z-10">
                    <p className="text-slate-500 font-medium text-sm">Critical Hazards</p>
                    <h2 className="text-4xl font-black text-rose-600 mt-1">{criticalCount}</h2>
                    <p className="text-xs text-rose-400 font-bold mt-2">Requires Immediate Action</p>
                </div>
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 z-10">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-rose-50 to-transparent" />
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-slate-500 font-medium text-sm">Total Reports</p>
                    <h2 className="text-4xl font-black text-slate-900 mt-1">{activeCount}</h2>
                    <p className="text-xs text-slate-400 font-bold mt-2">Past 24 Hours</p>
                </div>
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm flex items-center justify-between text-white">
                <div>
                    <p className="text-slate-400 font-medium text-sm">AI Accuracy</p>
                    <h2 className="text-4xl font-black text-emerald-400 mt-1">94%</h2>
                    <p className="text-xs text-slate-500 font-bold mt-2">Confidence Score</p>
                </div>
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-400">
                    <Maximize2 className="w-8 h-8" />
                </div>
            </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => (
                    <button
                        key={level}
                        onClick={() => setFilterSeverity(level)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            filterSeverity === level 
                            ? "bg-slate-900 text-white shadow-md" 
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                    >
                        {level}
                    </button>
                ))}
            </div>
            
            <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search location or ID..." 
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300"
                />
            </div>
        </div>

        {/* REPORTS GRID */}
        {loading ? (
             <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin" />
                Loading Infrastructure Data...
            </div>
        ) : filteredReports.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">All Clear</h3>
                <p className="text-slate-500">No reports matching your criteria found.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredReports.map((report) => (
                    <div key={report.reportId} className="group bg-white border border-slate-200 rounded-[2rem] overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                        
                        {/* CARD IMAGE AREA */}
                        <div className="relative h-48 bg-slate-100 overflow-hidden">
                            <img 
                                src={report.imageUrl} 
                                alt={report.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                            
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
                                <div>
                                    <h3 className="font-bold text-lg leading-tight text-shadow">{report.title}</h3>
                                    <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
                                        <MapPin className="w-3 h-3" /> {report.address}
                                    </div>
                                </div>
                            </div>

                            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getSeverityStyles(report.severity)}`}>
                                {report.severity}
                            </div>
                        </div>

                        {/* CARD BODY */}
                        <div className="p-6 flex-1 flex flex-col">
                            {/* AI Analysis Section */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Maximize2 className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">AI Analysis</span>
                                    <span className="ml-auto text-xs font-mono text-slate-400">
                                        {(report.confidence * 100).toFixed(0)}% Conf.
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    "{report.aiAnalysis}"
                                </p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                        {report.userId.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700">Reporter</span>
                                        <span className="text-[10px] text-slate-400">{new Date(report.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                
                                <button className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors">
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}