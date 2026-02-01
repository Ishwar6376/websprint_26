import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { 
  Globe,        
  ShieldCheck, 
  Trash2,       
  LogOut,
  Building2,    
  Factory,            
  CheckCircle2,
  HardHat,
  Droplets,
  Zap,
  Flame,
  Activity,
  ArrowRight
} from "lucide-react"
import { useAuthStore } from "../../store/useAuthStore.js"

export default function CityAdminHub() {
  const navigate = useNavigate()
  const { user: auth0User, logout } = useAuth0()
  const { setUser, user: storedUser } = useAuthStore()
  const [transitionStage, setTransitionStage] = useState('idle')
  const [isBarActive, setIsBarActive] = useState(false)
  const [showComplaintsMap, setShowComplaintsMap] = useState(false)
  const [complaintCount, setComplaintCount] = useState(0);


  
  useEffect(() => {
    if (auth0User && !storedUser) {
      setUser(auth0User)
    }
  }, [auth0User, storedUser, setUser])
  useEffect(() => {
  const fetchComplaintCount = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/map-reports`);
      const data = await res.json();

      if (data.success) {
        setComplaintCount(data.data.length);
      }
    } catch (err) {
      console.error("Error fetching complaint count", err);
    }
  };

  fetchComplaintCount();
}, []);


  // --- SECTION 1: INTELLIGENT SYSTEMS (Original Admin Features) ---
  const COMMAND_SYSTEMS = [
    {
      id: "geoscope",
      title: "GeoScope",
      description: "Satellite-based geospatial surveillance and land-use analytics.",
      icon: Globe,
      route: "/administration/geoscope", 
      theme: "indigo",
      specialAction: true // Triggers the loading animation
    },
    {
      id: "safety",
      title: "Women Safety",
      description: "Real-time distress monitoring, SOS tracking, and safe route AI.",
      icon: ShieldCheck,
      route: "/administration/womenSafety",
      theme: "rose",
      specialAction: false
    },
    
   

   
  ]

  // --- SECTION 2: DEPARTMENTAL OPERATIONS (New Municipal Features) ---
  const MUNICIPAL_DEPARTMENTS = [
    {
      id: "infrastructure",
      title: "Infrastructure",
      count: "12 Issues",
      icon: HardHat,
      route: "/administration/municipal/infra",
      theme: "orange"
    },
    {
      id: "water",
      title: "Water Supply",
      count: "Stable",
      icon: Droplets,
      route: "/administration/municipal/water",
      theme: "blue"
    },
    {
      id: "garbage",
      title: "Smart Waste",
      count: "89% Cleared",
      icon: Trash2,
      route: "/administration/municipal/waste",
      theme: "emerald"
    },
    {
      id: "electricity",
      title: "Electricity",
      count: "Grid Online",
      icon: Zap,
      route: "/administration/municipal/electricity",
      theme: "violet"
    },
    {
      id: "fire",
      title: "Fire & Safety",
      count: "Active",
      icon: Flame,
      route: "/administration/municipal/fire",
      theme: "red"
    },
  ]

  // Helper for dynamic colors
  const getThemeStyles = (theme) => {
    const styles = {
      indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-100/50",
      rose:   "text-rose-600 bg-rose-50 border-rose-100 hover:border-rose-300 hover:shadow-rose-100/50",
      orange: "text-orange-600 bg-orange-50 border-orange-100 hover:border-orange-300 hover:shadow-orange-100/50",
      blue:   "text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300 hover:shadow-blue-100/50",
      emerald:"text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100/50",
      violet: "text-violet-600 bg-violet-50 border-violet-100 hover:border-violet-300 hover:shadow-violet-100/50",
      red:    "text-red-600 bg-red-50 border-red-100 hover:border-red-300 hover:shadow-red-100/50",
    }
    return styles[theme] || styles.indigo
  }

  const handleNavigation = (route, isSpecial) => {
    if (isSpecial) {
      runTransitionSequence(route);
    } else {
      navigate(route);
    }
  }

  const runTransitionSequence = (route) => {
    setTransitionStage('scanning');
    setTimeout(() => setIsBarActive(true), 100);
    setTimeout(() => setTransitionStage('processing'), 1500);
    setTimeout(() => setTransitionStage('completed'), 3000);
    setTimeout(() => navigate(route), 3800);
  }
  
  return (
    <div className="relative h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden animate-in fade-in duration-300">
      
      {/* --- GEOSCOPE LOADING OVERLAY --- */}
      {transitionStage !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative w-32 h-32 flex items-center justify-center mb-8">
            <div className={`absolute transition-all duration-700 transform ${transitionStage === 'scanning' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 rotate-45'}`}>
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center border border-slate-200 shadow-xl">
                <Factory className="w-12 h-12 text-slate-400 animate-pulse" />
              </div>
            </div>
            <div className={`absolute transition-all duration-1000 delay-300 transform ${transitionStage === 'processing' || transitionStage === 'completed' ? 'opacity-100 scale-100' : 'opacity-0 scale-150'}`}>
               <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-100 shadow-xl shadow-emerald-100/50">
                <Globe className="w-12 h-12 text-emerald-600 animate-bounce" />
              </div>
            </div>
          </div>
          <div className="h-16 flex flex-col items-center justify-center overflow-hidden relative w-full text-center px-4">
             <p className={`absolute w-full text-xl font-mono text-slate-500 transition-all duration-500 transform ${transitionStage === 'scanning' ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
               Connecting to Satellite Feed...
             </p>
             <p className={`absolute w-full text-2xl font-black tracking-tight text-slate-800 transition-all duration-500 transform ${transitionStage === 'processing' ? 'translate-y-0 opacity-100' : (transitionStage === 'completed' ? '-translate-y-10 opacity-0' : 'translate-y-10 opacity-0')}`}>
               Calibrating GeoScope Data
             </p>
             <p className={`absolute w-full text-2xl font-black tracking-tight text-emerald-600 flex items-center justify-center gap-2 transition-all duration-300 transform ${transitionStage === 'completed' ? 'translate-y-0 opacity-100 scale-110' : 'translate-y-10 opacity-0'}`}>
               <CheckCircle2 className="w-6 h-6" /> System Ready
             </p>
          </div>
          <div className="w-64 h-1.5 bg-slate-200 rounded-full mt-8 overflow-hidden relative">
            <div className={`h-full bg-emerald-500 transition-all ease-out rounded-full ${isBarActive ? 'w-full duration-[3500ms]' : 'w-0 duration-0'}`} />
          </div>
        </div>
      )}
      
      {/* --- HEADER --- */}
      <header className="relative z-50 w-full h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">CityAdmin</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Central Command Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-slate-200 shadow-sm">
            <img src={storedUser?.picture || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
            <span className="text-sm font-bold text-slate-700">{storedUser?.name || "Administrator"}</span>
          </div>
          <button onClick={() => logout({ returnTo: window.location.origin })} className="h-11 w-11 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all" title="Sign Out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* --- MAIN SCROLLABLE BODY --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 max-w-7xl mx-auto w-full pb-20">
          
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Operational Dashboard
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Monitor real-time urban analytics and manage municipal department workflows from a unified interface.
            </p>
          </div>
          <div className="flex justify-center mb-12">
              <div className="flex justify-center mb-10">
  <button
    onClick={() => navigate("/administration/complaints-map")}
    className="relative bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold shadow-xl transition-all"
  >
     View Public Complaints Map

    {/* 🔴 LIVE COUNT BADGE */}
    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full shadow-lg">
      {complaintCount}
    </span>
  </button>
</div>

            </div>
            


          {/* === 1. CENTRAL COMMAND SYSTEMS (Top Large Cards) === */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
               <div className="h-px flex-1 bg-slate-200" />
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2">Central Command Systems</span>
               <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {COMMAND_SYSTEMS.map((system) => {
                const Icon = system.icon
                const themeClass = getThemeStyles(system.theme)
                
                return (
                  <button 
                    key={system.id} 
                    onClick={() => handleNavigation(system.route, system.specialAction)} 
                    className={`group relative h-[240px] bg-white border border-slate-200 rounded-[2rem] p-8 text-left transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl ${themeClass}`}
                  >
                    <div className="flex justify-between items-start z-10 relative">
                       <div className="space-y-4 max-w-[70%]">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-500 group-hover:rotate-6
                            ${system.theme === 'indigo' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                             <Icon className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-3xl font-black text-slate-900 mb-2">{system.title}</h3>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm">
                              {system.description}
                            </p>
                          </div>
                       </div>

                       <div className="h-full flex flex-col justify-between items-end">
                          <span className="px-3 py-1 bg-white/80 backdrop-blur border border-slate-100 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                          </span>
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                             <ArrowRight className="w-5 h-5 text-slate-400" />
                          </div>
                       </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* === 2. DEPARTMENTAL OPERATIONS (Grid of Smaller Cards) === */}
          <div>
            <div className="flex items-center gap-4 mb-6">
               <div className="h-px flex-1 bg-slate-200" />
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2">Departmental Operations</span>
               <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
               {MUNICIPAL_DEPARTMENTS.map((dept) => {
                 const Icon = dept.icon
                 const themeClass = getThemeStyles(dept.theme)

                 return (
                   <button 
                     key={dept.id}
                     onClick={() => navigate(dept.route)}
                     className={`group flex flex-col items-center text-center justify-center p-6 bg-white border border-slate-200 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${themeClass}`}
                   >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 bg-white border border-slate-100 shadow-sm`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">{dept.title}</h3>
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        {dept.count}
                      </span>
                   </button>
                 )
               })}
            </div>
          </div>
          
          {/* Footer Stats Area */}
          <div className="mt-12 bg-slate-900 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between text-slate-400 relative overflow-hidden">
             <div className="relative z-10 flex items-center gap-4 mb-6 md:mb-0">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
                   <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">System Status</h4>
                  <p className="text-xs font-medium opacity-60">All modules operational</p>
                </div>
             </div>
             <div className="relative z-10 flex gap-8 text-center">
                <div>
                   <div className="text-2xl font-black text-white">24</div>
                   <div className="text-[10px] uppercase tracking-wider font-bold">Alerts</div>
                </div>
                <div>
                   <div className="text-2xl font-black text-white">12</div>
                   <div className="text-[10px] uppercase tracking-wider font-bold">Pending</div>
                </div>
                <div>
                   <div className="text-2xl font-black text-emerald-400">98%</div>
                   <div className="text-[10px] uppercase tracking-wider font-bold">Uptime</div>
                </div>
             </div>
             {/* Decorative Background */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

        </div>
      </div>
    </div>
  )
}