import { Clock, CheckCircle2, AlertOctagon, ChevronRight } from "lucide-react";

const fetchlastThreeReports=async(req,res)=>{
  //create a function for fetching last three reports from the user
}

export default function ComplaintList() {
  const getStatusColor = (status) => {
    switch(status) {
      case "In Progress": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "Resolved": return "text-green-400 bg-green-500/10 border-green-500/20";
      default: return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-3">
      {MOCK_REPORTS.map((report) => (
        <div 
          key={report.id}
          className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
              report.severity === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {report.status === 'Resolved' ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-zinc-200">{report.type}</h4>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
                <span>{report.location}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span>{report.date}</span>
              </div>
            </div>
          </div>

          <div className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(report.status)}`}>
            {report.status}
          </div>
        </div>
      ))}
      
      <button className="w-full py-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors border-t border-white/5 mt-2">
        View All History
      </button>
    </div>
  );
}