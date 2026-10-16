import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell } from 'lucide-react';
import { NotificationDrawer } from './NotificationDrawer';
import { scopedExpressFetch } from '../../lib/apiClient';

export const NotificationBell: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await scopedExpressFetch('/api/notifications?unreadOnly=true&limit=1');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignore polling errors
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition-all group"
      >
        <Bell className="w-4 h-4 group-hover:scale-105 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-extrabold text-slate-950 ring-2 ring-slate-950 shadow-sm shadow-cyan-500/50 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onUnreadCountChange={(count) => setUnreadCount(count)}
      />
    </>
  );
};
