import React, { useState } from 'react';
import RegionSelector from '../../../components/RegionSelector.jsx';
import { Waves, AlertTriangle, ArrowRight, Calendar, Satellite, ArrowLeft } from 'lucide-react';
import { api } from "../../../lib/api.js";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from 'react-router-dom';

export default function CoastalErosion() {
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  const [historicYear, setHistoricYear] = useState(2000);
  const [currentYear, setCurrentYear] = useState(2024);

  const years = Array.from({ length: 26 }, (_, i) => 2000 + i);

  const handleRegionSelect = (coords) => {
    console.log("Region Selected:", coords);
    setSelectedCoordinates(coords);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedCoordinates) return;

    if (historicYear >= currentYear) {
      setError("Historic year must be earlier than the comparison year.");
      return;
    }

    setLoading(true);
    setError(null);

    const uniqueId = `region_${Math.random().toString(16).slice(2, 10)}`;
    const requestPayload = {
      regionGeoJson: {
        type: 'Polygon',
        coordinates: selectedCoordinates
      },
      regionId: uniqueId,
      historicYear: parseInt(historicYear),
      currentYear: parseInt(currentYear)
    };

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const response = await api.post('/api/gee/generateCoastalReport', requestPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        navigate('/coastal-erosion/result', { state: { data: response.data } });
      } else {
        setError(response.data.error || "Analysis failed.");
      }

    } catch (err) {
      console.error(err);
      setError("Failed to connect to the analysis engine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 relative overflow-hidden">
      
      {/* ANIMATION OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-300 px-4 text-center">
           <div className="relative">
             <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse rounded-full" />
             <Satellite className="w-16 h-16 text-cyan-400 animate-bounce relative z-10" />
           </div>
           
           <h2 className="mt-8 text-2xl font-black tracking-tight">Acquiring Satellite Data</h2>
           <p className="text-slate-400 mt-2 font-mono text-sm">Connecting to Landsat Archive...</p>

           <div className="w-64 h-1 bg-slate-800 rounded-full mt-8 overflow-hidden">
             <div className="h-full bg-cyan-500 w-1/2 animate-[loading_2s_ease-in-out_infinite]" />
           </div>
        </div>
      )}

      {/* HEADER */}
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4 md:gap-0 shrink-0">
        <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3 text-slate-900">
          <button 
            onClick={() => navigate('/administration/geoscope')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200"
            title="Back to Environmental Hub"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
          </button>
          <div className="p-2 bg-cyan-100 rounded-lg text-cyan-700 shrink-0">
            <Waves size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
          </div>
          <span className="truncate">Coastal Erosion Tracker</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm font-medium text-slate-500 ml-12 md:ml-0">
          <span className="whitespace-nowrap">Landsat 7/8/9 Data</span>
          <div className="hidden md:block h-4 w-px bg-slate-300" />
          <span className="whitespace-nowrap">Global Coverage</span>
        </div>
      </div>

      {/* BODY - Flex Column on Mobile, Row on Desktop */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-6 gap-4 md:gap-6 overflow-hidden max-w-[1920px] mx-auto w-full h-full">
        
        {/* MAP PANEL - Takes remaining space on mobile, 2/3 width on desktop */}
        <div className="flex-1 lg:flex-[2] bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative flex flex-col group min-h-[300px] lg:min-h-0">
           <RegionSelector onRegionSelect={handleRegionSelect} />
        </div>

        {/* CONTROLS PANEL - Fixed height or scrollable on mobile, 1/3 width on desktop */}
        <div className="w-full lg:w-auto lg:flex-1 lg:min-w-[400px] lg:max-w-[500px] bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar shrink-0 max-h-[40vh] lg:max-h-full">
           
           <div className="mb-6 md:mb-8">
             <h2 className="text-lg md:text-xl font-black mb-2">Analysis Parameters</h2>
             <p className="text-slate-500 text-sm">Select the time range to compare shoreline changes.</p>
           </div>

           <div className="space-y-6">
             {/* Year Selectors */}
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                   <Calendar size={12} /> <span className="hidden md:inline">Historic</span> Baseline
                   <span className="md:hidden">Base</span>
                 </label>
                 <div className="relative">
                   <select 
                     value={historicYear}
                     onChange={(e) => setHistoricYear(Number(e.target.value))}
                     className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-cyan-500 outline-none transition-all cursor-pointer hover:bg-slate-100 text-sm md:text-base"
                   >
                     {years.map(y => (
                       <option key={`h-${y}`} value={y}>{y}</option>
                     ))}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                   <Calendar size={12} /> <span className="hidden md:inline">Comparison</span> Year
                   <span className="md:hidden">Current</span>
                 </label>
                 <div className="relative">
                   <select 
                     value={currentYear}
                     onChange={(e) => setCurrentYear(Number(e.target.value))}
                     className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-cyan-500 outline-none transition-all cursor-pointer hover:bg-slate-100 text-sm md:text-base"
                   >
                     {years.map(y => (
                       <option key={`c-${y}`} value={y}>{y}</option>
                     ))}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                 </div>
               </div>
             </div>

             {/* Action Button */}
             <button 
               onClick={handleAnalyze}
               disabled={!selectedCoordinates || loading}
               className={`w-full py-3 md:py-4 rounded-xl font-black text-base md:text-lg tracking-wide flex items-center justify-center gap-3 transition-all transform active:scale-95 ${
                 !selectedCoordinates 
                   ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                   : loading 
                     ? 'bg-cyan-100 text-cyan-700 cursor-wait'
                     : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl shadow-cyan-200 hover:shadow-cyan-300'
               }`}
             >
               {loading ? (
                 "Processing..." 
               ) : (
                 <>
                   Analyze <span className="hidden md:inline">Erosion</span> <ArrowRight size={20} />
                 </>
               )}
             </button>

             {/* Error Message */}
             {error && (
               <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-shake">
                 <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                 <p className="text-sm font-bold">{error}</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}