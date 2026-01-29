import React, { useRef,useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "../store/useAuthStore.js"; 
import FloatingLines from "../ui/FloatingLines.jsx";      
import PixelCard from "../ui/PixelCard.jsx";
import logo from "../ui/logo.png";
import { api } from "../lib/api.js"; 
import { 
  LogOut, 
  Shield, 
  Briefcase, 
  Megaphone, 
  Heart,
  Siren, 
  MapPin,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  CheckCircle2
} from "lucide-react";
import { FireSOSButton } from "./fireAlert.jsx"

import { ref, onValue, off, update, get } from "firebase/database";
import { db } from "../firebase/firebase"; 

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; 
};

const FEATURES = [
  {
    id: "women-safety",
    title: "SisterHood",
    description: "Navigate with confidence using AI-driven safe routes, real-time tracking, and instant SOS alerts.",
    route: "/sisterhood",
    icon: Shield,
    color: "pink"
  },
  {
    id: "reports",
    title: "CivicConnect",
    description: "Submit grievances related to infrastructure, electricity, water, and waste management",
    route: "/reports",
    icon: Megaphone,
    color: "blue"
  },
  {
    id: "jobs",
    title: "StreetGig",
    description: "Empower your livelihood by finding verified local job opportunities matched to your skills.",
    route: "/streetgigs",
    icon: Briefcase,
    color: "blue"
  },
  {
    id: "ngo",
    title: "KindShare",
    description: "Bridge the gap between communities and NGOs for faster, more effective social impact.",
    route: "/kindshare",
    icon: Heart,
    color: "yellow"
  }
];

export default function App() {
  const navigate = useNavigate();
  const { user: auth0User, logout } = useAuth0();
  const { setUser, user: storedUser } = useAuthStore();

  const [arrivalNotification, setArrivalNotification] = useState(null);
  const [resolvedNotification, setResolvedNotification] = useState(null);
  const [weather, setWeather] = useState(null);
  const resolvedSessionIds=useRef(new Set());

  useEffect(() => {
    if (auth0User && !storedUser) {
      setUser(auth0User);
    }
  }, [auth0User, storedUser, setUser]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          );
          const data = await response.json();
          setWeather(data.current);
        } catch (error) {
          console.error("Weather fetch failed:", error);
        }
      });
    }
  }, []);

  const getWeatherIcon = (code) => {
    if (code <= 3) return <Sun className="w-5 h-5 text-yellow-400" />;
    if (code <= 48) return <Cloud className="w-5 h-5 text-gray-400" />;
    if (code <= 82) return <CloudRain className="w-5 h-5 text-blue-400" />;
    if (code <= 99) return <Snowflake className="w-5 h-5 text-cyan-200" />;
    return <Sun className="w-5 h-5 text-yellow-400" />;
  };

  const handleAcknowledgeArrival = () => {
    if (arrivalNotification?.id) {
      localStorage.setItem(`ack_report_${arrivalNotification.id}`, "true");
      setArrivalNotification(null);
    }
  };

  const handleResolutionConfirm = async () => {
    if (!resolvedNotification) return;

    const { id, geohash, assignedTo, userId } = resolvedNotification;

    try {
      const reportRef = ref(db, `fireAlerts/${geohash}/${id}`);
      const snapshot = await get(reportRef);
      resolvedSessionIds.current.add(id);
      if (snapshot.exists()) {
        const reportDataToArchive = snapshot.val();
        try {
          await api.post('/api/reports/saveFireReport', reportDataToArchive, {});
          console.log("Report archived to backend");
        } catch (apiError) {
          console.error("Backend sync failed, ABORTING CLEANUP:", apiError);
          alert("Failed to archive report. Please try again.");
          return; 
        }
      }

      const updates = {};
      updates[`fireAlerts/${geohash}/${id}`] = null;

      if (assignedTo) {
        const sanitizedStaffId = assignedTo.replace(/[^a-zA-Z0-9]/g, '_');
        updates[`staff/fire/${geohash}/${sanitizedStaffId}`] = null;
      }

      updates[`userActiveAlerts/${userId}`] = null;

      await update(ref(db), updates);

      setResolvedNotification(null);
      setArrivalNotification(null);
      setTimeout(() => {
        localStorage.removeItem(`ack_report_${id}`);
        console.log(`Cleared acknowledgement flag for ${id}`);
      }, 5000); 

      console.log("Mission data cleared successfully");

    } catch (error) {
      console.error("Resolution process failed:", error);
    }
  };

  useEffect(() => {
    if (!storedUser) return;

    const userEmail = storedUser.email; 
    const alertsRef = ref(db, 'fireAlerts');

    const unsubscribeReport = onValue(alertsRef, (snapshot) => {
      const allGeohashes = snapshot.val();
      if (!allGeohashes) return;

      let foundReport = null;
      let reportGeohash = null;

      Object.keys(allGeohashes).forEach((ghKey) => {
        const reportsInGeohash = allGeohashes[ghKey];
        Object.keys(reportsInGeohash).forEach((reportId) => {
          const r = reportsInGeohash[reportId];
          if (r.userEmail === userEmail) {
             foundReport = r;
             foundReport.id = reportId; 
             reportGeohash = ghKey;
          }
        });
      });

      if (foundReport && foundReport.status === "RESOLVED") {
        setResolvedNotification({
          id: foundReport.id,
          geohash: reportGeohash,
          assignedTo: foundReport.assignedTo,
          userId: foundReport.userId, 
          fullReportData: foundReport 
        });
        setArrivalNotification(null);
        return; 
      }
      if (foundReport && (foundReport.status === "ASSIGNED" || foundReport.status === "EN_ROUTE") && foundReport.assignedTo) {
        const truckId = foundReport.assignedTo.replace(/[^a-zA-Z0-9]/g, '_');
        const truckRef = ref(db, `staff/fire/${reportGeohash}/${truckId}/coords`);

        const unsubscribeTruck = onValue(truckRef, (truckSnap) => {
          const truckCoords = truckSnap.val();

          if (truckCoords && foundReport.coords) {
             const dist = getDistanceInMeters(
               parseFloat(truckCoords.lat), parseFloat(truckCoords.lng),
               parseFloat(foundReport.coords.lat), parseFloat(foundReport.coords.lng)
             );

             const isAcknowledged = localStorage.getItem(`ack_report_${foundReport.id}`);
             
             if (dist <= 50 && !isAcknowledged) {
               setArrivalNotification({
                 id: foundReport.id,
                 unitName: foundReport.assignedToName || "Rescue Unit",
                 distance: Math.round(dist)
               });
             } else {
               if (dist > 100 || isAcknowledged) setArrivalNotification(null);
             }
          }
        });

        return () => off(truckRef);
      }
    });

    return () => unsubscribeReport();
  }, [storedUser]);

  return (
    <div className="relative h-screen w-full bg-slate-950 text-white font-sans flex flex-col overflow-hidden selection:bg-purple-500/30">
      
      {/* Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <FloatingLines pixelSize={4} patternScale={5} color="#4c1d95" backgroundColor="#020617" />
      </div>

      {/* --- NOTIFICATION: ARRIVAL (RED) --- */}
      {arrivalNotification && !resolvedNotification && (
        <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-right-8 fade-in duration-500">
          <div className="relative w-72 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-black/95 backdrop-blur-xl border border-red-500/40 shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)]">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-red-500/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
              <span className="text-red-400 text-[10px] font-bold tracking-widest uppercase">Action Required</span>
            </div>
            <div className="p-3 flex gap-3 items-center">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-red-500/20 blur-lg rounded-full"></div>
                <div className="relative bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                  <Siren className="w-5 h-5 text-red-500 animate-bounce" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight">Unit Has Arrived</h3>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5 truncate">
                  <span className="text-red-100 font-medium">{arrivalNotification.unitName}</span> is here.
                </p>
                <div className="mt-1 flex items-center gap-1 text-red-400 text-[10px] font-semibold">
                  <MapPin className="w-3 h-3" />
                  <span>{arrivalNotification.distance}m away</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleAcknowledgeArrival}
              className="w-full py-2 bg-red-600/90 hover:bg-red-500 text-white text-[11px] font-bold uppercase tracking-wide transition-colors"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* --- NOTIFICATION: RESOLVED (GREEN) --- */}
      {resolvedNotification && (
        <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-right-8 fade-in duration-500">
          <div className="relative w-72 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-black/95 backdrop-blur-xl border border-emerald-500/40 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Mission Update</span>
            </div>
            <div className="p-3 flex gap-3 items-center">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-emerald-500/20 blur-lg rounded-full"></div>
                <div className="relative bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight">Incident Resolved?</h3>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  Confirm to close this report.
                </p>
              </div>
            </div>
            <button
              onClick={handleResolutionConfirm}
              className="w-full py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wide transition-colors"
            >
              Confirm & Close
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="relative z-50 w-full h-20 px-6 md:px-10 flex items-center justify-between bg-black/10 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4 select-none">
          <img src={logo} alt="CityBeat Logo" className="h-12 w-auto object-contain"/>
          <h1 className="text-2xl font-black tracking-tighter text-white">
            City<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Beat</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          
          {/* WEATHER WIDGET */}
          {weather && (
            <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md mr-1 hover:bg-white/10 transition-colors cursor-default">
              {getWeatherIcon(weather.weather_code)}
              <span className="text-sm font-bold text-gray-200">
                {Math.round(weather.temperature_2m)}°C
              </span>
            </div>
          )}

          <FireSOSButton />
          
          {storedUser && (
            <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
              <img src={storedUser.picture} alt="Profile" className="w-7 h-7 rounded-full border border-white/20" />
              <span className="text-sm font-bold text-gray-200">{storedUser.name}</span>
            </div>
          )}
          <button 
            onClick={() => logout({ returnTo: window.location.origin })}
            className="group p-2.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all active:scale-95"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative z-10 p-6 md:p-10 flex flex-col items-center overflow-y-auto">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
             Explore Features
           </h2>
           <p className="text-zinc-400 max-w-xl mx-auto">
             Access AI-powered tools designed to improve urban living, safety, and community connection.
           </p>
        </div>

        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">
           {FEATURES.map((feature) => (
             <PixelCard 
                key={feature.id} 
                variant={feature.color}
                className="w-full aspect-[4/5] cursor-pointer hover:scale-[1.02] transition-transform duration-300 bg-zinc-900/40"
                onClick={() => navigate(feature.route)}
             >
                <div className="relative z-10 flex flex-col items-center text-center p-8 h-full justify-center gap-6 pointer-events-none">
                    <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-xl`}>
                        <feature.icon className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                            {feature.description}
                        </p>
                    </div>
                </div>
             </PixelCard>
           ))}
        </div>
      </main>
    </div>
  );
}