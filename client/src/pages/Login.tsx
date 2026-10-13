import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TargetLockLogo } from '../components/TargetLockLogo';
import { autoRepairPoolMembership } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { PendingApprovalScreen } from '../components/PendingApprovalScreen';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState('MAIN26');
  const [isPendingApproval, setIsPendingApproval] = useState(false);
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

        const user = signUpData.user;
        if (!user || !user.email) {
          throw new Error('User creation returned empty profile.');
        }

        // 1) Direct cloud database upsert for public.users:
        const userUpsertPayload: any = {
          id: user.id,
          email: user.email,
          display_name: user.email.split('@')[0],
          role: 'MEMBER'
        };
        const { error: userUpsertError } = await supabase.from('users').upsert(userUpsertPayload);
        if (userUpsertError) {
          const { error: retryErr } = await supabase.from('users').upsert({
            id: user.id,
            email: user.email,
          });
          if (retryErr) throw retryErr;
        }

        // 2) Direct cloud database upsert for public.pool_memberships:
        const memberUpsertPayload: any = {
          pool_id: activePoolId,
          user_id: user.id,
          status: 'PENDING',
          role: 'MEMBER'
        };
        const { error: memberUpsertError } = await supabase.from('pool_memberships').upsert(memberUpsertPayload);
        if (memberUpsertError) {
          const { error: retryErr } = await supabase.from('pool_memberships').upsert({
            pool_id: activePoolId,
            user_id: user.id,
            status: 'PENDING',
          });
          if (retryErr) throw retryErr;
        }

        setIsPendingApproval(true);

        // Also proxy through join route if session token exists
        let token = signUpData.session?.access_token;
        if (!token) {
          const { data: sessData } = await supabase.auth.getSession();
          token = sessData.session?.access_token;
        }
        if (token) {
          try {
            await fetch(`/api/pools/${activePoolId}/join`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-user-email': email,
              },
              body: JSON.stringify({ inviteCode: cleanInvite }),
            });
          } catch (netErr) {
            console.warn('[SignUp] Join API proxy notice:', netErr);
          }
        }

        setInfoMessage('Application registered in PENDING status. The commissioner (Jack) must approve your admission before access is granted.');
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
      if (!isSignUp) {
        setError('Invalid email/password, or account setup incomplete.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isPendingApproval) {
    return <PendingApprovalScreen />;
  }

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
              placeholder="name@email.com"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 placeholder:text-zinc-600"
                placeholder="Enter password (min 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 uppercase tracking-widest font-mono text-center placeholder:text-zinc-600 placeholder:italic"
                placeholder="Enter league invite code"
                maxLength={8}
              />
              <p className="text-xs text-amber-400/80 mt-1">
                Private Pilot Code: <span className="font-mono font-bold text-amber-300">MAIN26</span>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>SUBMITTING...</span>
              </>
            ) : isSignUp ? (
              'Submit Application'
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Login;
