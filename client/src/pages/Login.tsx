import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TargetLockLogo } from '../components/TargetLockLogo';
import { autoRepairPoolMembership } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const cleanInvite = inviteCode.trim().toUpperCase();
        if (cleanInvite !== 'MAIN26') {
          throw new Error('Invalid League Invite Code. Contact commissioner for entry.');
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // If session is immediately active (auto-confirm enabled)
        if (signUpData.session) {
          const token = signUpData.session.access_token;

          // Dispatch POST /api/pools/:pool_id/join with { inviteCode: 'MAIN26' }
          const joinRes = await fetch(`/api/pools/${activePoolId}/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-user-email': email,
            },
            body: JSON.stringify({ inviteCode: cleanInvite }),
          });

          if (!joinRes.ok) {
            const errData = await joinRes.json().catch(() => ({}));
            if (joinRes.status === 403) {
              throw new Error(errData.error || 'Registration rejected: Invalid invite code or access denied.');
            }
            throw new Error(errData.error || `Server registration failed with HTTP ${joinRes.status}.`);
          }

          // Guarantee database membership record via Supabase client as well
          if (signUpData.user) {
            const { error: memberError } = await supabase.from('pool_memberships').upsert({
              pool_id: activePoolId,
              user_id: signUpData.user.id,
              status: 'PENDING',
            });
            if (memberError && !memberError.message.includes('duplicate')) {
              console.warn('[SignUp] Supabase membership registration note:', memberError.message);
            }
          }
        } else {
          // If Supabase requires email confirmation first
          setInfoMessage('Application registered. Please confirm your email before the commissioner can admit you.');
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // Auto-repair missing pool_memberships row on login (Step 2)
        if (signInData.user) {
          await autoRepairPoolMembership(
            signInData.user.id,
            email,
            signInData.session?.access_token
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <TargetLockLogo className="w-16 h-16" />
        </div>
        <h1 className="text-2xl font-black text-center text-white uppercase tracking-wider mb-2">
          NFL Pick 'Em
        </h1>
        <p className="text-slate-400 text-xs text-center mb-6 uppercase tracking-wider">
          {isSignUp ? 'Apply for Pilot League Entry' : 'Authenticate to Access Slate'}
        </p>

        <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); setInfoMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isSignUp ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); setInfoMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isSignUp ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {infoMessage && (
          <div 
            data-testid="signup-info-banner"
            className="mb-4 p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-amber-300 text-xs text-center font-medium shadow-md leading-relaxed"
          >
            {infoMessage}
          </div>
        )}

        {error && (
          <div 
            data-testid="auth-error-banner"
            className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs text-center font-medium shadow-md"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              placeholder="member@example.com"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              placeholder="••••••••••••"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                League Invite Code
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 uppercase tracking-widest font-mono text-center"
                placeholder="MAIN26"
                maxLength={8}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Submit Application' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Login;
