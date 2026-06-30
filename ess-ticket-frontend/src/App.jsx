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

    const payload = isSignUp ? { email, password, role: 'customer' } : { email, password };
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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient branding light flares in background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#224986]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#224986]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#FBFBE2]/70 border border-[#224986]/20 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
          
          {/* Header Branding Panel */}
          <div className="text-center mb-6">
            <img 
              src="/Picture1.png" 
              alt="Ethiopian Statistical Service Logo" 
              className="w-full h-auto rounded-xl border border-[#224986]/20 shadow-lg mb-4" 
            />
            <h2 className="text-sm font-bold tracking-widest text-[#224986] uppercase">
              {isSignUp ? 'System Registration' : 'IT Service Desk Portal'}
            </h2>
            <p className="text-[9px] font-bold tracking-[0.15em] text-[#224986]/80 uppercase mt-1">
              {isSignUp ? 'Internal Employee Onboarding' : 'Secure Authorization'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl mb-5 text-xs font-semibold bg-[#224986]/10 border border-[#224986]/20 text-[#224986] backdrop-blur-md">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl mb-5 text-xs font-semibold bg-[#224986]/10 border border-[#224986]/20 text-[#224986] backdrop-blur-md">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-[#224986]/80 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@statsethiopia.gov.et"
                className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 focus:border-[#224986] focus:ring-1 focus:ring-[#224986]/30 rounded-xl p-3 text-[#224986] placeholder-[#224986]/40 outline-none transition-all text-sm shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#224986]/80 uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 focus:border-[#224986] focus:ring-1 focus:ring-[#224986]/30 rounded-xl p-3 text-[#224986] placeholder-[#224986]/40 outline-none transition-all text-sm shadow-inner"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3.5 mt-2 bg-[#224986] hover:bg-[#224986]/90 text-[#FBFBE2] font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-[0.99] transition-all cursor-pointer"
            >
              {isSignUp ? 'Register Account' : 'Login'}
            </button>
          </form>

          {/* Toggle Gateway Link Panel */}
          <div className="mt-8 pt-4 border-t border-[#224986]/10 text-center">
            {isSignUp ? (
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-[#224986]/60 hover:text-[#224986] transition-colors tracking-wide cursor-pointer"
              >
                Already have an account? <span className="text-[#224986] font-semibold underline underline-offset-4 ml-1">Sign In</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-[#224986]/60 hover:text-[#224986] transition-colors tracking-wide cursor-pointer"
              >
                Don't have an account? <span className="text-[#224986] font-semibold underline underline-offset-4 ml-1">Register Here</span>
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