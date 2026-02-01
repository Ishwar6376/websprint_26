import React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { 
  ArrowLeft, 
  LogOut, 
  Building2, 
  Droplets, 
  Trash2, 
  Zap, 
  Flame,
  HardHat,
  FileText,
  AlertOctagon,
  Activity
} from "lucide-react"
import { useAuthStore } from "../../../store/useAuthStore.js"

export default function MunicipalDeptHub() {
  const navigate = useNavigate()
  const { logout } = useAuth0()
  const { user: storedUser } = useAuthStore()

  const CIVIL_DEPARTMENTS = [
    {
      id: "infrastructure",
      title: "Infrastructure",
      description: "Road damage, bridge safety, and public property maintenance reports.",
      icon: HardHat,
      route: "/administration/municipal/infrastructure",
      theme: "orange",
      stats: "Active Reports"
    },
    {
      id: "water",
      title: "Water Supply",
      description: "Pipe leakage, contamination checks, and supply distribution.",
      icon: Droplets,
      route: "/administration/municipal/water",
      theme: "blue",
      stats: "Zone Alerts"
    },
    {
      id: "waste",
      title: "Waste Mgmt",
      description: "Garbage collection status, overflow reporting, and sanitization.",
      icon: Trash2,
      route: "/administration/municipal/waste", // Linking to your existing route if needed
      theme: "emerald",
      stats: "Pending Pickup"
    },
  ]

  
  const UTILITY_DEPARTMENTS = [
    {
      id: "electricity",
      title: "Electricity Board",
      description: "Power grid failure, street light outages, and hazard reporting.",
      icon: Zap,
      route: "/administration/municipal/electricity",
      theme: "violet"
    },
    {
      id: "fire",
      title: "Fire & Safety",
      description: "Fire hazards, hydrant inspection, and emergency protocols.",
      icon: Flame,
      route: "/administration/municipal/fire",
      theme: "rose"
    }
  ]

  // Helper to generate dynamic tailwind classes based on theme
  const getThemeClasses = (theme) => {
    const themes = {
      orange: {
        bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", 
        hoverBorder: "hover:border-orange-300", hoverShadow: "hover:shadow-orange-100/50",
        iconBg: "bg-orange-100"
      },
      blue: {
        bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", 
        hoverBorder: "hover:border-blue-300", hoverShadow: "hover:shadow-blue-100/50",
        iconBg: "bg-blue-100"
      },
      emerald: {
        bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", 
        hoverBorder: "hover:border-emerald-300", hoverShadow: "hover:shadow-emerald-100/50",
        iconBg: "bg-emerald-100"
      },
      violet: {
        bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100", 
        hoverBorder: "hover:border-violet-300", hoverShadow: "hover:shadow-violet-100/50",
        iconBg: "bg-violet-100"
      },
      rose: {
        bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", 
        hoverBorder: "hover:border-rose-300", hoverShadow: "hover:shadow-rose-100/50",
        iconBg: "bg-rose-100"
      }
    }
    return themes[theme] || themes.blue
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col animate-in fade-in duration-500">
    
      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
        
        {/* SECTION 1: CIVIL WORKS */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Civil Services Division
            </h2>
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Primary Infrastructure
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CIVIL_DEPARTMENTS.map((dept) => {
              const styles = getThemeClasses(dept.theme)
              const Icon = dept.icon

              return (
                <button 
                  key={dept.id}
                  onClick={() => navigate(dept.route)}
                  className={`group relative text-left bg-white border border-slate-200 rounded-[2rem] p-6 transition-all duration-300 ${styles.hoverBorder} ${styles.hoverShadow} hover:-translate-y-1 hover:shadow-xl`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${styles.bg} ${styles.text}`}>
                      <Icon strokeWidth={1.5} className="w-8 h-8" />
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-white`}>
                      Live Feed
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    {dept.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                    {dept.description}
                  </p>

                  <div className="flex items-center gap-2 pt-6 border-t border-slate-50">
                    <Activity className={`w-4 h-4 ${styles.text}`} />
                    <span className="text-xs font-bold text-slate-600">
                      View Report Analytics
                    </span>
                  </div>

                  {/* Gradient Hover Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-${dept.theme}-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem] pointer-events-none`} />
                </button>
              )
            })}
          </div>
        </div>

        {/* SECTION 2: UTILITIES */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Utilities & Emergency
            </h2>
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Critical Operations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {UTILITY_DEPARTMENTS.map((dept) => {
              const styles = getThemeClasses(dept.theme)
              const Icon = dept.icon

              return (
                <button 
                  key={dept.id}
                  onClick={() => navigate(dept.route)}
                  className={`group relative flex items-center gap-6 bg-white border border-slate-200 rounded-[2rem] p-6 transition-all duration-300 ${styles.hoverBorder} ${styles.hoverShadow} hover:shadow-lg`}
                >
                  <div className={`w-20 h-20 shrink-0 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-3 ${styles.bg} ${styles.text}`}>
                    <Icon strokeWidth={1.5} className="w-9 h-9" />
                  </div>

                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900 mb-1">
                      {dept.title}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mb-3">
                      {dept.description}
                    </p>
                    <div className="flex items-center gap-2">
                       <span className={`text-xs font-bold ${styles.text} flex items-center gap-1`}>
                         Access Dashboard <ArrowLeft className="w-3 h-3 rotate-180" />
                       </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                    <FileText className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800">Pending Validations</h4>
                    <p className="text-xs text-slate-500 font-medium">Reports awaiting admin review</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                 <div className="text-right">
                    <h4 className="font-black text-2xl text-slate-800">24</h4>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Pending</p>
                 </div>
                 <div className="w-px h-10 bg-slate-300 mx-2" />
                 <div className="text-right">
                    <h4 className="font-black text-2xl text-emerald-600">89%</h4>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Resolution Rate</p>
                 </div>
            </div>
        </div>

      </main>
    </div>
  )
}