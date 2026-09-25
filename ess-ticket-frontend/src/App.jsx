import React, { useState } from 'react';
import TicketForm from './TicketForm';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';
import HardwareDashboard from './HardwareDashboard';
import NotificationPopup from './NotificationPopup';

export default function App() {
  const [user, setUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validatePasswordStrength = (pass) => {
    if (!pass || pass.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter (A-Z).';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter (a-z).';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number (0-9).';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) return 'Password must contain at least one special character (!@#$%^&* etc.).';
    return null;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isSignUp) {
      const passError = validatePasswordStrength(password);
      if (passError) {
        setErrorMsg(passError);
        return;
      }
    }

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
          role: data.user.role,
          category: data.user.category
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
                User ID
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="User ID (e.g. name@statsethiopia.gov.et)"
                className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 focus:border-[#224986] focus:ring-1 focus:ring-[#224986]/30 rounded-xl p-3 text-[#224986] placeholder-[#224986]/40 outline-none transition-all text-sm shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#224986]/80 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 focus:border-[#224986] focus:ring-1 focus:ring-[#224986]/30 rounded-xl p-3 pr-10 text-[#224986] placeholder-[#224986]/40 outline-none transition-all text-sm shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#224986]/50 hover:text-[#224986] transition-colors p-1 cursor-pointer focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {isSignUp && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#224986]/5 border border-[#224986]/10 text-[10px] text-[#224986]/80 space-y-1">
                  <p className="font-bold uppercase tracking-wider text-[#224986]">Strong Password Requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5 font-medium">
                    <li className={password.length >= 8 ? 'text-green-600 font-bold' : ''}>At least 8 characters</li>
                    <li className={/[A-Z]/.test(password) ? 'text-green-600 font-bold' : ''}>At least 1 uppercase letter (A-Z)</li>
                    <li className={/[a-z]/.test(password) ? 'text-green-600 font-bold' : ''}>At least 1 lowercase letter (a-z)</li>
                    <li className={/[0-9]/.test(password) ? 'text-green-600 font-bold' : ''}>At least 1 number (0-9)</li>
                    <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600 font-bold' : ''}>At least 1 special character (!@#$%^&*)</li>
                  </ul>
                </div>
              )}
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
  // ROUTING DISPATCH MATRIX WITH POP-UP NOTIFICATIONS
  // ==========================================================================
  const renderDashboard = () => {
    if (user.role === 'admin') {
      return <AdminDashboard userEmail={user.email} onLogout={handleLogout} />;
    }
    
    if (user.role === 'it_staff') {
      if (user.category === 'Hardware Fault') {
        return <HardwareDashboard userEmail={user.email} onLogout={handleLogout} />;
      }
      return <StaffDashboard userEmail={user.email} onLogout={handleLogout} />;
    }

    return <TicketForm userEmail={user.email} onLogout={handleLogout} />;
  };

  return (
    <>
      <NotificationPopup userEmail={user.email} />
      {renderDashboard()}
    </>
  );
}