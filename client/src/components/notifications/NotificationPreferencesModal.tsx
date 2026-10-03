import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Bell, Mail, Clock, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  reminderOffsetsHours: number[];
  unsubscribeToken?: string | null;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { token } = useAuth();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [thursdayReminder, setThursdayReminder] = useState(true); // 24h
  const [sundayReminder, setSundayReminder] = useState(true); // 2h
  const [customOffset, setCustomOffset] = useState<number | ''>('');
  const [otherOffsets, setOtherOffsets] = useState<number[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      fetchPreferences();
    }
  }, [isOpen, token]);

  const fetchPreferences = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/notifications/preferences', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to load notification preferences.');
      const data: NotificationPreferences = await res.json();
      
      setEmailEnabled(data.emailEnabled ?? true);
      const offsets = Array.isArray(data.reminderOffsetsHours) ? data.reminderOffsetsHours : [24, 2];
      setThursdayReminder(offsets.includes(24));
      setSundayReminder(offsets.includes(2));
      setOtherOffsets(offsets.filter((h) => h !== 24 && h !== 2));
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error fetching preferences.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    // Reconstruct reminder offsets array
    const offsets: number[] = [];
    if (thursdayReminder) offsets.push(24);
    if (sundayReminder) offsets.push(2);
    otherOffsets.forEach((o) => {
      if (!offsets.includes(o)) offsets.push(o);
    });

    if (offsets.length === 0) {
      // Default at least one offset to comply with 1..5 rule
      offsets.push(24);
    }

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailEnabled,
          reminderOffsetsHours: offsets.slice(0, 5),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update preferences.');
      }

      setFeedback({ type: 'success', message: 'Notification preferences saved successfully!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving preferences.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Notification Preferences</h3>
              <p className="text-xs text-slate-400">Manage your alerts & digest subscriptions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading preferences...</div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-6">
            {feedback && (
              <div
                className={`p-3 rounded-xl flex items-center space-x-2.5 text-xs font-medium ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Email Notifications Master Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Email Notifications</div>
                  <div className="text-xs text-slate-400">Receive reminder emails & weekly summaries</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            {/* Pick Reminder Cadence */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Scheduled Pick Reminders</span>
              </div>

              {/* Thursday 24h reminder */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-slate-200">Thursday Advance Reminder</div>
                  <div className="text-xs text-slate-400">24 hours before game kickoff window</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={thursdayReminder}
                    onChange={(e) => setThursdayReminder(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Sunday 2h reminder */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-slate-200">Sunday Final Warning</div>
                  <div className="text-xs text-slate-400">2 hours before Sunday kickoff window</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sundayReminder}
                    onChange={(e) => setSundayReminder(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
