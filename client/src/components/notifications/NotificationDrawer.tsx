import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  CheckCheck,
  Check,
  Bell,
  Settings,
  RefreshCw,
  Mail,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { scopedExpressFetch } from '../../lib/apiClient';

export interface InboxMessageItem {
  id: string;
  userId: string;
  poolId?: string | null;
  type: string;
  payload?: any;
  dedupeKey: string;
  readAt: string | null;
  createdAt: string;
  subject?: string;
  body?: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const { token, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [prefsOpen, setPrefsOpen] = useState<boolean>(false);
  const [filterUnread, setFilterUnread] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const url = filterUnread
        ? '/api/notifications?unreadOnly=true&limit=50'
        : '/api/notifications?limit=50';
      const res = await scopedExpressFetch(url);
      if (!res.ok) throw new Error('Failed to load notifications');
      const data = await res.json();
      setMessages(data.messages || []);
      setUnreadCount(data.unreadCount || 0);
      setTotalCount(data.totalCount || 0);
      if (onUnreadCountChange) {
        onUnreadCountChange(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, filterUnread, onUnreadCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, readAt: new Date().toISOString() } : msg))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    if (onUnreadCountChange) {
      onUnreadCountChange(Math.max(0, unreadCount - 1));
    }

    try {
      const res = await scopedExpressFetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        await fetchNotifications();
      }
    } catch {
      await fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token || unreadCount === 0) return;
    setMarkingAll(true);
    // Optimistic update
    const nowIso = new Date().toISOString();
    setMessages((prev) => prev.map((msg) => ({ ...msg, readAt: msg.readAt || nowIso })));
    setUnreadCount(0);
    if (onUnreadCountChange) {
      onUnreadCountChange(0);
    }

    try {
      const res = await scopedExpressFetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        await fetchNotifications();
      }
    } catch {
      await fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm transition-opacity">
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-white">Notifications</h2>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                        {unreadCount} NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Picks, reminders & digest updates</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setPrefsOpen(true)}
                  title="Notification Preferences"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-header Controls */}
            <div className="px-5 py-2.5 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilterUnread(false)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    !filterUnread
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setFilterUnread(true)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterUnread
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markingAll}
                    className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => fetchNotifications()}
                  disabled={loading}
                  title="Refresh notifications"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
              {loading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mb-2 text-cyan-400" />
                  <span>Loading inbox...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-slate-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-300 mb-1">All caught up!</span>
                  <p className="text-xs text-slate-500 max-w-xs">
                    {filterUnread
                      ? 'No unread notifications at this time.'
                      : 'You will receive reminders for upcoming kickoffs and weekly pool summaries here.'}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUnread = !msg.readAt;
                  const title =
                    msg.subject ||
                    (msg.payload?.windowLabel ? `${msg.payload.windowLabel} Reminder` : null) ||
                    msg.type.replace(/_/g, ' ');
                  const content =
                    msg.body ||
                    (msg.payload?.poolName
                      ? `${msg.payload.poolName}: Don't forget to submit your picks before kickoff!`
                      : null) ||
                    (msg.payload?.lockAtUtc
                      ? `Locks at: ${new Date(msg.payload.lockAtUtc).toLocaleString()}`
                      : 'You have a notification update.');

                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl transition-all ${
                        isUnread
                          ? 'bg-slate-900/90 border border-cyan-500/20 shadow-sm shadow-cyan-500/5'
                          : 'bg-slate-950 hover:bg-slate-900/40 border border-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5">
                          {isUnread && (
                            <span className="w-2 h-2 mt-1.5 rounded-full bg-cyan-400 flex-shrink-0 animate-ping" />
                          )}
                          <div>
                            <h4
                              className={`text-xs font-bold leading-tight ${
                                isUnread ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed whitespace-pre-line">
                              {content}
                            </p>
                            <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-500 font-medium">
                              <Clock className="w-3 h-3 text-slate-600" />
                              <span>{formatTimestamp(msg.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {isUnread && (
                          <button
                            onClick={() => handleMarkAsRead(msg.id)}
                            title="Mark as read"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-colors flex-shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <NotificationPreferencesModal
        isOpen={prefsOpen}
        onClose={() => setPrefsOpen(false)}
      />
    </>
  );
};
