import { useState, useEffect, use } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Map as MapIcon, List } from "lucide-react";
import { WATER_FEATURE } from "./config";
import LocationGuard from "./LocationGuard";
import WaterMap from "./WaterMap"; // Assumed wrapper around Google Maps
import ReportSidebar from "./ components/ReportSidebar";
import FloatingLines from "../../../ui/FloatingLines"; // Your existing component
import { Button } from "../../../ui/button"; // Your existing component
import {useReverseGeocoding} from "../../../hooks/useReverseGeocoding";
export default function WaterComplaintsPage() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [mobileTab, setMobileTab] = useState("map");
  const [activeReport, setActiveReport] = useState(null); 
  const {userAddress:detectedAddress,loading}=useReverseGeocoding(
    userLocation?.lat,
    userLocation?.lng
  )
  const [userAddress,setAddress]=useState(null);

  useEffect(()=>{
    if(detectedAddress){
      setAddress(detectedAddress);
      console.log("New Address Found:", detectedAddress);
    }
  },[detectedAddress])



  const handleLocationGranted = (coords) => {
    setUserLocation(coords);
  };
  return (
    <div className="relative h-screen w-full bg-slate-950 text-white flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* 1. Global Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950" />
        <FloatingLines className="opacity-20" /> 
      </div>

      {/* 2. Header (Glass) */}
      <header className="relative z-50 h-16 px-4 md:px-6 flex items-center justify-between bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${WATER_FEATURE.theme.bgAccent}`}>
                <WATER_FEATURE.icons.main className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                {WATER_FEATURE.title}
              </h1>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
                {WATER_FEATURE.subtitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Content Content */}
      <div className="flex-1 flex relative z-10 overflow-hidden">
        
        {/* If no location, show Guard Overlay */}
        {!userLocation ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <LocationGuard onLocationGranted={handleLocationGranted} />
          </div>
        ) : (
          <>
            {/* Sidebar (Report Form & Analysis) */}
            <div 
              className={`
                absolute inset-0 lg:static lg:w-[450px] flex flex-col border-r border-white/10 
                bg-slate-950/90 lg:bg-black/40 backdrop-blur-3xl z-30 lg:z-20 
                transition-transform duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                ${mobileTab === 'report' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              `}
            >
              <ReportSidebar userLocation={userLocation} userAddress={userAddress} />
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-slate-900">
               <WaterMap 
                 userLocation={userLocation} 
                 activeReport={activeReport}
               />
            </div>
          </>
        )}

        {/* Mobile Toggle Pill */}
        {userLocation && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 lg:hidden">
             <div className="flex p-1 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl">
                <button 
                  onClick={() => setMobileTab('map')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all ${mobileTab === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-zinc-400'}`}
                >
                  <MapIcon className="w-4 h-4" /> Map
                </button>
                <button 
                  onClick={() => setMobileTab('report')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all ${mobileTab === 'report' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-zinc-400'}`}
                >
                  <List className="w-4 h-4" /> Report
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}