import React, { useState, useEffect } from 'react';

export default function NotificationPopup({ userEmail }) {
  const [notifications, setNotifications] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => {
    if (!userEmail) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/notifications?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Failed to poll notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [userEmail]);

  useEffect(() => {
    if (notifications.length > 0 && !activeNotification) {
      setActiveNotification(notifications[0]);
    }
  }, [notifications, activeNotification]);

  const handleDismiss = async () => {
    if (!activeNotification) return;

    const notifId = activeNotification.id;
    try {
      await fetch(`http://localhost:5000/api/notifications/${notifId}/read`, {
        method: 'PUT'
      });
    } catch (err) {
      console.error('Error marking notification read:', err);
    }

    const updated = notifications.filter(n => n.id !== notifId);
    setNotifications(updated);
    setActiveNotification(updated.length > 0 ? updated[0] : null);
  };

  if (!activeNotification) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#FBFBE2] border-2 border-red-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden transform animate-scaleUp">
        
        {/* Top Decorative Alert Stripe */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-600"></div>

        {/* Header Icon + Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-600 font-black text-lg shadow-sm shrink-0">
            ⚠️
          </div>
          <div>
            <h3 className="text-sm font-black text-[#224986] uppercase tracking-wider">
              {activeNotification.title || 'System Notification'}
            </h3>
            <p className="text-[10px] text-[#224986]/70 font-semibold">
              {new Date(activeNotification.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Notification Message */}
        <div className="bg-white/80 border border-[#224986]/15 rounded-xl p-4 mb-5 text-xs font-semibold text-[#224986] leading-relaxed shadow-inner">
          {activeNotification.message}
        </div>

        {/* Dismiss Action Button */}
        <div className="flex justify-end">
          <button
            onClick={handleDismiss}
            className="px-5 py-2.5 bg-[#224986] hover:bg-[#1b3a6b] text-[#FBFBE2] text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Acknowledge & Dismiss
          </button>
        </div>

      </div>
    </div>
  );
}
