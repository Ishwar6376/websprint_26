import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Wifi, WifiOff, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

const NotificationFeed = ({ limit }) => {
  const { notifications, connectionStatus, markAsRead } = useNotifications();
  const navigate = useNavigate();

  const displayNotifications = limit ? notifications.slice(0, limit) : notifications;

  const handleAction = (notif) => {
    // 1. Mark as read in DB/State
    if (!notif.isRead) markAsRead(notif.id);

    // 2. Navigation Logic
    if (notif.link) {
      if (notif.link.startsWith('http')) {
        window.open(notif.link, '_blank');
      } else {
        // Force absolute routing by ensuring a leading slash
        const path = notif.link.startsWith('/') ? notif.link : `/${notif.link}`;
        navigate(path);
      }
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-white/10 rounded-xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white tracking-widest uppercase">Activity</h3>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
          connectionStatus === 'Connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${connectionStatus === 'Connected' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {connectionStatus}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {displayNotifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <Bell className="w-12 h-12 mb-2" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          displayNotifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => handleAction(notif)}
              className={`p-4 border-b border-white/5 transition-colors cursor-pointer group hover:bg-white/[0.02] ${
                !notif.isRead ? 'bg-blue-500/[0.03]' : 'bg-transparent'
              }`}
            >
              <div className="flex gap-3">
                <div className="mt-1">
                  {notif.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <p className={`text-sm mb-1 ${notif.isRead ? 'text-zinc-400' : 'text-zinc-100'}`}>
                    {notif.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {notif.link && (
                      <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        GO TO LINK <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationFeed;