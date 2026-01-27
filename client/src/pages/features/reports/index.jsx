import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Map as MapIcon, List, ArrowRight } from "lucide-react"; 
import { GRIEVANCE_CONFIG } from "./config";
import LocationGuard from "./LocationGuard"; 
import ReportSidebar from "./ components/ReportSidebar"; 
import FloatingLines from "../../../ui/FloatingLines"; 
import { Button } from "../../../ui/button"; 
import { useReverseGeocoding } from "../../../hooks/useReverseGeocoding";

export default function ComplaintsPage() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [viewMode, setViewMode] = useState("form"); 
  const [mobileTab, setMobileTab] = useState("map");
  
  const [mapRefreshTrigger, setMapRefreshTrigger] = useState(0);

  const { userAddress: detectedAddress, loading: addressLoading } = useReverseGeocoding(
    userLocation?.lat,
    userLocation?.lng
  );

  const handleLocationGranted = (coords) => {
    setUserLocation(coords);
  };

  const handleReportSubmitted = () => {
    setMapRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="relative h-screen w-full bg-slate-950 text-white flex flex-col overflow-hidden font-sans selection:bg-white/20">
      
      {/* 1. Global Background */}
      {/* 1. Global Ambient Background (Gradient ONLY - No FloatingLines here) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-zinc-950 to-black" />
        <FloatingLines className="opacity-10 text-white" /> 
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950" />
      </div>

      {/* 2. Header */}
      <header className="relative z-50 h-16 px-4 md:px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl border-b border-white/10 flex-none">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-zinc-400 hover:text-white hover:bg-white/5">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${GRIEVANCE_CONFIG.theme.bgAccent} border border-white/5`}>
                <GRIEVANCE_CONFIG.icons.main className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                {GRIEVANCE_CONFIG.title}
              </h1>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                {GRIEVANCE_CONFIG.subtitle}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Content Area */}
      <div className="flex-1 relative z-10 overflow-hidden flex items-center justify-center p-0 md:p-4">
        
        {!userLocation ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <LocationGuard onLocationGranted={handleLocationGranted} />
          </div>
        ) : (
          <>
            {/* --- VIEW 1: REPORT PANEL (Centered Card) --- */}
            {/* Sidebar Container (Now includes FloatingLines) */}
            <div 
              className={`
                w-full h-full md:h-[85vh] md:max-w-lg 
                transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                ${viewMode === 'form' ? 'opacity-100 scale-100 translate-y-0 z-20 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 z-0 pointer-events-none absolute'}
              `}
            >
              {/* CARD CONTAINER */}
              <div className="w-full h-full bg-zinc-950/90 backdrop-blur-2xl border-x md:border border-white/10 md:rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
                 
                 {/* [FIX] Use flex-1 here. 
                    This ensures ReportSidebar fills the available space 
                    and activates its internal scrollbar.
                 */}
                 <div className="flex-1 min-h-0 relative">
                    <ReportSidebar 
                        userLocation={userLocation} 
                        userAddress={addressLoading ? "Locating..." : detectedAddress} 
                        onReportSubmitGlobal={handleReportSubmitted}
                    />
                 </div>
              </div>

                 {/* [FIX] Mobile Button is now 'flex-none' (Footer).
                    It sits naturally below the sidebar, not covering it.
                 */}
                 <div className="flex-none p-4 border-t border-white/5 md:hidden bg-zinc-950/50 backdrop-blur-xl z-30">
                    <Button 
                        onClick={() => setViewMode("map")}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                    >
                        View Issue Heatmap <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                 </div>
              </div>

            {/* --- VIEW 2: MAP (Full Screen) --- */}
            <div 
                className={`
                    absolute inset-0 transition-opacity duration-500
                    ${viewMode === 'map' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}
                `}
            >
                {/* MAP PLACEHOLDER - Uncomment WaterMap when ready */}
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-zinc-500 gap-4">
                     {/* <WaterMap refreshTrigger={mapRefreshTrigger} /> */}
                    <span>Map Component Loading... (Refresh Key: {mapRefreshTrigger})</span>
                </div>

                {/* Floating "Back to Report" Button for Map View */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-500">
                    <Button 
                        onClick={() => setViewMode("form")}
                        className="rounded-full px-8 py-6 shadow-2xl bg-white text-black hover:bg-zinc-200 font-bold tracking-wide transition-transform hover:scale-105"
                    >
                        <List className="w-4 h-4 mr-2" />
                        Back to Report
                    </Button>
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}