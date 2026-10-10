import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class SystemErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    // Sanitize any potential tokens/keys from the error message
    const rawMsg = error?.message || 'Unknown runtime anomaly';
    const sanitized = rawMsg
      .replace(/eyJ[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT]')
      .replace(/key=[a-zA-Z0-9_-]{8,}/gi, 'key=[REDACTED]')
      .replace(/password=[^&\s]+/gi, 'password=[REDACTED]');

    return {
      hasError: true,
      errorMessage: sanitized
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Standard error boundary logging without exposing secret credentials
    if (import.meta.env.DEV) {
      console.error('SystemErrorBoundary caught an unhandled exception:', error, errorInfo);
    }
  }

  private handleReinitialize = () => {
    try {
      // Purge volatile session storage caches
      sessionStorage.clear();
      localStorage.removeItem('supabase.auth.token');
    } catch {
      // Ignore storage access issues
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 shadow-[0_0_30px_rgba(244,63,94,0.3)] space-y-5">
            {/* Fault Header */}
            <div className="flex items-center gap-2 border-b border-rose-500/40 pb-3">
              <span className="text-2xl animate-bounce">⚠️</span>
              <div>
                <h1 className="text-sm font-black tracking-wider text-rose-400 uppercase">
                  [ ⚠️ SYSTEM FAULT — REBOOTING HUD ]
                </h1>
                <p className="text-[10px] text-slate-400">
                  Telemetry Interrupted // Fail-Safe Engaged
                </p>
              </div>
            </div>

            {/* Sanitized Error Dump */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest">
                DIAGNOSTIC REPORT:
              </p>
              <p className="text-slate-300 text-[11px] font-mono break-words">
                {this.state.errorMessage || 'UNHANDLED_REACT_EXCEPTION'}
              </p>
            </div>

            {/* Recovery Action */}
            <button
              type="button"
              onClick={this.handleReinitialize}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-98 flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              <span>REINITIALIZE TELEMETRY &amp; CLEAR CACHE</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SystemErrorBoundary;
