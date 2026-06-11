import React, { useState } from 'react';
import TicketForm from './TicketForm';
import AdminDashboard from './AdminDashboard';

// Define our staff access groups clearly
const STAFF_EMAILS = ['staff1@company.com', 'staff2@company.com', 'staff3@company.com'];

export default function App() {
  const [user, setUser] = useState(null);
  const [emailInput, setEmailInput] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    // Force lowercase and strip any accidental trailing spaces
    const cleanedEmail = emailInput.trim().toLowerCase();
    let role = 'customer'; 

    // Explicit structural match checks
    if (cleanedEmail === 'nafyadtilahun4@gmail.com' || cleanedEmail === 'admin@company.com') {
      role = 'admin';
    } else if (STAFF_EMAILS.includes(cleanedEmail)) {
      role = 'staff';
    }
    
    setUser({
      email: cleanedEmail,
      role: role
    });
  };

  const handleLogout = () => {
    setUser(null);
    setEmailInput('');
  };

  // 1. Unauthenticated Gate Layout View
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md backdrop-blur-md">
          <h2 className="text-2xl font-black text-center tracking-tight text-slate-100 mb-2">Service Gate Portal</h2>
          <p className="text-xs text-slate-400 text-center mb-6">Enter your email to establish a secure workspace session</p>
          
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Network Email Address</label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-3 text-slate-100 placeholder-slate-600 outline-none transition-all text-sm"
            />
          </div>
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg text-sm tracking-wide shadow-lg transition-all">
            Establish Session Access
          </button>
        </form>
      </div>
    );
  }

  /* ==========================================================================
     ROLE ROUTING WORKSPACE MATRIX
     ========================================================================== */

  if (user.role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }
  
  if (user.role === 'staff') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-purple-400">IT Staff Workspace Connected</h1>
        <p className="text-slate-400 text-sm mt-2">Active Session: {user.email}</p>
        <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm hover:text-red-400 transition-colors">
          Log Out
        </button>
      </div>
    );
  }

  // Default Fallback: Standard Customer View
  return <TicketForm userEmail={user.email} onLogout={handleLogout} />;
}