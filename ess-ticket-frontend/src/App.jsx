import React, { useState } from 'react';
import TicketForm from './TicketForm';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const payload = isSignUp ? { email, password, role } : { email, password };
    const endpoint = isSignUp ? 'signup' : 'login';

    try {
      const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication routing fault.');
      }

      if (isSignUp) {
        setSuccessMsg('🎉 Account provisioned successfully! Proceeding to Sign In.');
        setIsSignUp(false); // Clean bounce back to login layout
        setEmail('');
        setPassword('');
        setRole('customer'); // Reset state selection back to default
      } else {
        setUser({
          email: data.user.email,
          role: data.user.role
        });
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setEmail('');
    setPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  // ==========================================================================
  // ETHIOPIAN STATISTICAL SERVICE GLASSMORPHIC INTERFACE
  // ==========================================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient branding light flares in background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
          
          {/* Header Branding Panel */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400">
              {isSignUp ? 'SYSTEM REGISTRATION' : 'ETHIOPIAN STATISTICAL SERVICE'}
            </h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-blue-500 uppercase mt-1">
              {isSignUp ? 'Internal Employee Onboarding' : 'IT Service Desk Portal'}
            </p>
            <div className="w-12 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl mb-5 text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 backdrop-blur-md">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl mb-5 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 backdrop-blur-md">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Network Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@statsethiopia.gov.et"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 rounded-xl p-3 text-slate-200 placeholder-slate-700 outline-none transition-all text-sm shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Security Access Token
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 rounded-xl p-3 text-slate-200 placeholder-slate-700 outline-none transition-all text-sm shadow-inner"
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  System Assignment Workgroup
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/80 rounded-xl p-3 text-slate-300 outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="customer">ESS Employee (End User)</option>
                  {/* Matches the 'it_staff' database check constraint perfectly */}
                  <option value="it_staff">IT Support Specialist (Staff)</option>
                  <option value="admin">System Operations Controller (Admin)</option>
                </select>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-950/50 hover:shadow-blue-900/20 active:scale-[0.99] transition-all"
            >
              {isSignUp ? 'Register Account' : 'Establish Secure Connection'}
            </button>
          </form>

          {/* Toggle Gateway Link Panel */}
          <div className="mt-8 pt-4 border-t border-slate-800/60 text-center">
            {isSignUp ? (
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors tracking-wide"
              >
                Already have an account? <span className="text-blue-500 font-semibold underline underline-offset-4 ml-1">Sign In</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors tracking-wide"
              >
                Don't have an account? <span className="text-blue-500 font-semibold underline underline-offset-4 ml-1">Register Here</span>
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ==========================================================================
  // ROUTING DISPATCH MATRIX
  // ==========================================================================
  if (user.role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }
  
  // Triggers smoothly upon successful lookup match against database constraint string 'it_staff'
  if (user.role === 'it_staff') {
    return <StaffDashboard userEmail={user.email} onLogout={handleLogout} />;
  }

  return <TicketForm userEmail={user.email} onLogout={handleLogout} />;
}