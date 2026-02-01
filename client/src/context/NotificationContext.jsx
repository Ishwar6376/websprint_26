import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setStatus] = useState("Connecting...");
  const { user, isLoading } = useAuth0();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const markAsRead = async (notificationId) => {
    try {
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      
    
      await axios.patch(`${API_URL}/api/notifications/${notificationId}/read`);
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  useEffect(() => {
    if (isLoading || !user?.sub) return;

    const safeUserId = encodeURIComponent(user.sub);

    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/notifications/${safeUserId}`);
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.isRead).length);
      } catch (err) {
        console.error("[SSE] Failed to fetch history:", err);
      }
    };

    fetchHistory();

    const eventSource = new EventSource(`${API_URL}/notifications/${safeUserId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (["heartbeat", "connection_ack"].includes(data.type)) return;

        setNotifications((prev) => {
          if (prev.find((n) => n.id === data.id)) return prev;
          return [data, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      } catch (err) {
        console.error("[SSE] Parse Error:", err);
      }
    };

    eventSource.onopen = () => setStatus("Connected");
    eventSource.onerror = () => setStatus("Reconnecting...");

    return () => eventSource.close();
  }, [user?.sub, isLoading, API_URL]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      connectionStatus, 
      markAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);