import { useState } from "react";
import ReportForm from "./ReportForm";
import ComplaintList from "./ComplaintList";

export default function ReportSidebar({ userLocation, userAddress }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-64 bg-blue-900/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
        
        {/* Section: New Report */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight">Report Issue</h2>
            <p className="text-sm text-zinc-400">
              Upload evidence. AI validates severity.
            </p>
          </div>
          
          {/* This is correct. 
             It passes the location data down to the form so the final submit 
             can include the coordinates and address.
          */}
          <ReportForm 
            userLocation={userLocation} 
            userAddress={userAddress} 
            onSubmitSuccess={handleSuccess} 
          />
        </section>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Section: History */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-1">
            Recent Activity
          </h3>
          {/* The key prop forces React to remount this component when refreshKey changes */}
          <ComplaintList key={refreshKey} />
        </section>
      </div>
    </div>
  );
}