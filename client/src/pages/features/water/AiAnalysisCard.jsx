import { Sparkles, ShieldCheck, Clock } from "lucide-react";

export default function AiAnalysisCard({ data }) {
  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4 relative overflow-hidden">
      {/* Decor */}
      <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/20 blur-2xl rounded-full" />
      
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">AI Expert Analysis</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            {data.severity.toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-zinc-300 leading-snug mb-3">
        {data.summary}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/30 rounded-lg p-2 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-green-400" />
            <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500">Confidence</span>
                <span className="text-xs font-mono text-green-300">{data.confidence}</span>
            </div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 flex items-center gap-2">
            <Clock className="w-3 h-3 text-blue-400" />
            <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500">Est. Fix</span>
                <span className="text-xs font-mono text-blue-300">~4 Hours</span>
            </div>
        </div>
      </div>
    </div>
  );
}