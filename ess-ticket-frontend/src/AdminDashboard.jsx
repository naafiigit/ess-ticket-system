import React, { useState, useEffect } from 'react';


function SLACountdown({ deadline, status }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isBreached, setIsBreached] = useState(false);

  useEffect(() => {
    if (status === 'Resolved') {
      setTimeLeft('Resolved');
      setIsBreached(false);
      return;
    }
    if (!deadline) {
      setTimeLeft('--');
      setIsBreached(false);
      return;
    }

    const calculateTime = () => {
      const now = new Date();
      const target = new Date(deadline);
      const diff = target - now;

      if (diff <= 0) {
        setIsBreached(true);
        const absDiff = Math.abs(diff);
        const h = Math.floor(absDiff / 3600000);
        const m = Math.floor((absDiff % 3600000) / 60000);
        const s = Math.floor((absDiff % 60000) / 1000);
        setTimeLeft(`Breached: ${h}h ${m}m ${s}s ago`);
      } else {
        setIsBreached(false);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s left`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline, status]);

  if (status === 'Resolved') {
    return (
      <span className="inline-block px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider rounded bg-[#224986]/10 text-[#224986]/70 border border-[#224986]/20">
        Resolved
      </span>
    );
  }

  if (isBreached) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-block px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded bg-red-100 text-red-700 border border-red-200 animate-pulse">
          ⚠️ BREACHED
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-[11px] font-mono font-medium text-[#224986]">{timeLeft}</span>
      <span className="inline-block px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider rounded bg-blue-100 text-[#224986] border border-blue-200">
        On Time
      </span>
    </div>
  );
}

export default function AdminDashboard({ userEmail, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, onHold: 0, resolved: 0, breached: 0, openOnTime: 0, onHoldOnTime: 0 });
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 🔍 NEW SEARCH & FILTER STATES
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // 👤 NEW IT SUPPORT SPECIALIST CREATION STATES
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [newStaffCategory, setNewStaffCategory] = useState('IT Support (Software Fault)');
  const [createSuccess, setCreateSuccess] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const validatePasswordStrength = (pass) => {
    if (!pass || pass.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter (A-Z).';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter (a-z).';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number (0-9).';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) return 'Password must contain at least one special character (!@#$%^&* etc.).';
    return null;
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreateSuccess('');
    setCreateError('');

    const passError = validatePasswordStrength(newStaffPassword);
    if (passError) {
      setCreateError(passError);
      return;
    }

    setCreating(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newStaffEmail,
          password: newStaffPassword,
          role: 'it_staff',
          category: newStaffCategory
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create IT Support account.');
      }

      setCreateSuccess('🎉 Support account created successfully!');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffCategory('IT Support (Software Fault)');
      fetchDashboardData();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDashboardData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, priorityFilter]);

  const fetchDashboardData = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (priorityFilter && priorityFilter !== 'All') params.append('priority', priorityFilter);

      const [ticketsRes, staffRes] = await Promise.all([
        fetch(`http://localhost:5000/api/admin/tickets?${params.toString()}`),
        fetch('http://localhost:5000/api/admin/staff-list')
      ]);

      if (!ticketsRes.ok || !staffRes.ok) throw new Error('Failed to synchronize admin matrix datasets.');

      const ticketsData = await ticketsRes.json();
      const staffData = await staffRes.json();

      // Deconstruct the data layout containing raw array rows and aggregate counts
      setTickets(ticketsData.tickets || []);
      setStats(ticketsData.stats || { total: 0, open: 0, onHold: 0, resolved: 0, breached: 0, openOnTime: 0, onHoldOnTime: 0 });
      setStaffMembers(staffData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [editingTicket, setEditingTicket] = useState(null);

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm(`Are you sure you want to permanently delete ticket #${ticketId}?`)) return;
    try {
      const response = await fetch(`http://localhost:5000/api/admin/tickets/${ticketId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchDashboardData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete ticket.');
      }
    } catch (err) {
      console.error("Delete ticket error:", err);
      alert("Failed to delete ticket.");
    }
  };

  const handleSaveModalEdit = async (e) => {
    e.preventDefault();
    if (!editingTicket) return;
    try {
      const response = await fetch(`http://localhost:5000/api/admin/tickets/${editingTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTicket.title,
          description: editingTicket.description,
          category: editingTicket.category,
          priority: editingTicket.priority,
          status: editingTicket.status,
          assigned_to: editingTicket.assigned_to
        })
      });

      if (response.ok) {
        setEditingTicket(null);
        fetchDashboardData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update ticket.');
      }
    } catch (err) {
      console.error("Save edit error:", err);
      alert("Failed to update ticket.");
    }
  };

  const handleUpdateTicket = async (ticketId, updatedFields) => {
  try {
    const response = await fetch(`http://localhost:5000/api/admin/tickets/${ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields)
    });
    
    if (response.ok) {
      const updatedTicket = await response.json();
      
      // FORCE STATE UPDATE: Using functional updater with spread
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, ...updatedTicket } : t
      ));
    }
  } catch (err) {
    console.error("Sync error:", err);
  }
};
  // --- Dynamic CSS Pie Chart Percentages Engine ---
  const totalForChart = stats.total || 1;
  const pOpen = (stats.open / totalForChart) * 360;
  const pOnHold = (stats.onHold / totalForChart) * 360;
  const pBreached = (stats.breached / totalForChart) * 360;

  const degOpen = pOpen;
  const degOnHold = degOpen + pOnHold;
  const degBreached = degOnHold + pBreached;

  const pieChartStyle = {
    background: `conic-gradient(
      #224986 0deg ${degOpen}deg, 
      #d97706 ${degOpen}deg ${degOnHold}deg, 
      #ef4444 ${degOnHold}deg ${degBreached}deg, 
      #16a34a ${degBreached}deg 360deg
    )`
  };


  return (
    <div className="min-h-screen text-[#224986] p-6 relative overflow-hidden bg-transparent">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[#224986]/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-[#224986]/20 pb-5 mb-8">
        <div className="flex items-center gap-4">
          <img src="/Picture1.png" alt="ESS Logo" className="w-10 h-10 rounded-2xl object-contain bg-white shadow-md border border-[#224986]/10 p-0.5" />
          <div>
            <h1 className="text-xl font-black tracking-wider text-[#224986]">
              CENTRAL ADMINISTRATIVE OPERATIONS
            </h1>
            <p className="text-[10px] font-bold tracking-[0.15em] text-[#224986]/80 uppercase mt-1">
              Global Oversight & Service Desk Assignment Console
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-[#224986] hover:bg-[#224986]/90 border border-[#224986] text-[#FBFBE2] font-bold rounded-xl text-[11px] tracking-widest uppercase transition-all shadow-md active:scale-95 cursor-pointer">
          Logout
        </button>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {error && <div className="p-4 bg-[#224986]/10 border border-[#224986]/20 text-[#224986] text-sm rounded-xl mb-6">⚠️ {error}</div>}

        {loading ? (
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 border-2 border-[#224986] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#224986]/60 tracking-widest uppercase font-medium">Recompiling core matrix dashboards...</p>
          </div>
        ) : (
          <>
            {/* Visual Metrics Panel: Total, Open, On Hold, Breach, Resolved */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* TOTAL TICKETS CARD */}
              <div className="bg-[#FBFBE2]/70 border border-[#224986]/15 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-[#224986]/40 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-[#224986]/60 uppercase tracking-wider">Total Tickets</p>
                  <h3 className="text-2xl font-black text-[#224986] mt-1 font-mono">{stats.total}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#FBFBE2] border border-[#224986]/10 flex items-center justify-center text-[#224986]/60 font-bold text-sm shadow-[0_0_10px_rgba(34,73,134,0.02)]">∑</div>
              </div>

              {/* OPEN CARD */}
              <div className="bg-[#FBFBE2]/70 border border-[#224986]/20 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-[#224986]/50 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-[#224986] uppercase tracking-wider">Open Status</p>
                  <h3 className="text-2xl font-black text-[#224986] mt-1 font-mono">{stats.open}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#224986]/10 border border-[#224986]/20 flex items-center justify-center text-[#224986] font-bold text-sm shadow-[0_0_10px_rgba(34,73,134,0.1)]">●</div>
              </div>

              {/* ON HOLD CARD */}
              <div className="bg-[#FBFBE2]/70 border border-[#224986]/15 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-[#224986]/40 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-[#224986]/70 uppercase tracking-wider">On Hold Status</p>
                  <h3 className="text-2xl font-black text-[#224986]/70 mt-1 font-mono">{stats.onHold}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#224986]/5 border border-[#224986]/10 flex items-center justify-center text-[#224986]/50 text-xs shadow-[0_0_10px_rgba(34,73,134,0.05)]">●</div>
              </div>

              {/* SLA BREACH CARD */}
              <div className="bg-[#FBFBE2]/70 border border-red-500/20 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-red-500/50 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">SLA Breached</p>
                  <h3 className="text-2xl font-black text-red-600 mt-1 font-mono">{stats.breached}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 font-bold text-sm shadow-[0_0_10px_rgba(239,68,68,0.1)]">⚠️</div>
              </div>

              {/* RESOLVED CARD */}
              <div className="bg-[#FBFBE2]/70 border border-[#224986]/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-[#224986]/30 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-[#224986]/50 uppercase tracking-wider">Resolved Closed</p>
                  <h3 className="text-2xl font-black text-[#224986]/50 mt-1 font-mono">{stats.resolved}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#224986]/5 border border-[#224986]/10 flex items-center justify-center text-[#224986]/40 font-bold text-sm shadow-[0_0_10px_rgba(34,73,134,0.02)]">✓</div>
              </div>

            </div>

            {/* TICKET DISTRIBUTION & STAFF PROVISIONING GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Ticket Distribution - occupies 2 columns */}
              <div className="lg:col-span-2 bg-[#FBFBE2]/60 border border-[#224986]/15 rounded-2xl p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-around gap-8">
                <div className="space-y-3 max-w-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#224986]">Ticket Distribution</h3>
                  <p className="text-xs text-[#224986]/70 leading-relaxed">
                    Real-time overview of open infrastructure incidents, queue holdbacks, and resolved workloads.
                  </p>
                  
                  {/* Chart Color Legends */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2 text-[11px] text-[#224986]/80 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-[#224986]"></span> Open ({stats.open})
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#224986]/80 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-[#d97706]"></span> On Hold ({stats.onHold})
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#224986]/80 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-[#ef4444]"></span> SLA Breached ({stats.breached})
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#224986]/80 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-[#16a34a]"></span> Resolved ({stats.resolved})
                    </div>
                  </div>
                </div>

                {/* Native Donut Graphic Render Frame */}
                <div className="relative flex items-center justify-center">
                  <div 
                    className="w-40 h-40 rounded-full shadow-2xl transition-all duration-500" 
                    style={pieChartStyle}
                  ></div>
                  <div className="absolute w-[110px] h-[110px] bg-[#FBFBE2] rounded-full flex flex-col items-center justify-center border border-[#224986]/10 shadow-inner">
                    <span className="text-[9px] font-bold text-[#224986]/50 uppercase tracking-widest">Total</span>
                    <span className="text-xl font-black text-[#224986] mt-0.5">{stats.total}</span>
                  </div>
                </div>
              </div>

              {/* Create IT Support Specialist Panel */}
              <div className="bg-[#FBFBE2]/60 border border-[#224986]/15 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#224986] mb-1">Add Support Specialist</h3>
                  <p className="text-[10px] font-bold text-[#224986]/80 tracking-[0.1em] uppercase mb-4">
                    IT Support Specialist Provisioning
                  </p>

                  {createError && (
                    <div className="p-2.5 rounded-lg mb-3 text-[10px] font-medium bg-[#224986]/10 border border-[#224986]/20 text-[#224986]">
                      ⚠️ {createError}
                    </div>
                  )}
                  {createSuccess && (
                    <div className="p-2.5 rounded-lg mb-3 text-[10px] font-medium bg-[#224986]/10 border border-[#224986]/20 text-[#224986]">
                      {createSuccess}
                    </div>
                  )}

                  <form onSubmit={handleCreateStaff} className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-[#224986]/70 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                        placeholder="specialist@statsethiopia.gov.et"
                        className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 focus:border-[#224986]/50 rounded-lg p-2 text-xs text-[#224986] placeholder-[#224986]/40 outline-none transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-[#224986]/70 uppercase tracking-wider mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showStaffPassword ? 'text' : 'password'}
                          required
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 focus:border-[#224986]/50 rounded-lg p-2 pr-9 text-xs text-[#224986] placeholder-[#224986]/40 outline-none transition-all shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStaffPassword(!showStaffPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#224986]/50 hover:text-[#224986] transition-colors p-1 cursor-pointer focus:outline-none"
                          title={showStaffPassword ? 'Hide password' : 'Show password'}
                        >
                          {showStaffPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="text-[9px] text-[#224986]/60 mt-1 font-medium">
                        Must contain 8+ chars, A-Z, a-z, 0-9, and special char (!@#$).
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-[#224986]/70 uppercase tracking-wider mb-1">
                        Specialization Category
                      </label>
                      <select
                        required
                        value={newStaffCategory}
                        onChange={(e) => setNewStaffCategory(e.target.value)}
                        className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 focus:border-[#224986]/50 rounded-lg p-2 text-xs text-[#224986] outline-none transition-all cursor-pointer shadow-inner"
                      >
                        <option value="IT Support (Software Fault)">IT Support (Software Fault)</option>
                        <option value="Hardware Fault">Hardware Fault</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={creating}
                      className="w-full py-2.5 mt-2 bg-[#224986] hover:bg-[#224986]/90 disabled:opacity-50 text-[#FBFBE2] font-bold rounded-lg text-[10px] uppercase tracking-wider shadow-md transition-all active:scale-[0.98] cursor-pointer"
                    >
                      {creating ? 'Provisioning...' : 'Create Account'}
                    </button>
                  </form>
                </div>
              </div>

            </div>
            {/* 🔍 SEARCH & FILTER BAR COMPONENT */}
            <div className="bg-[#FBFBE2]/60 border border-[#224986]/15 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-4 justify-between">
              
              {/* Keyword Search Input Box */}
              <div className="relative w-full sm:w-96">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#224986]/60 pointer-events-none text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search by ID, title, summary, or assigned personnel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#FBFBE2]/90 border border-[#224986]/30 text-[#224986] placeholder-[#224986]/40 outline-none focus:border-[#224986]/50 transition-all shadow-inner"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#224986]/60 hover:text-[#224986] text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Priority State Dropdown Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#224986]/60">Priority Filter:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="p-2 text-xs rounded-xl bg-[#FBFBE2]/90 border border-[#224986]/30 text-[#224986]/80 font-medium outline-none cursor-pointer hover:border-[#224986]/50 min-w-[120px] transition-all shadow-md"
                >
                  <option value="All">All Priorities</option>
                  <option value="Low">Low Only</option>
                  <option value="Medium">Medium Only</option>
                  <option value="High">High Only</option>
                </select>
              </div>

            </div>

            {/* Main Operational Table Window */}
            <div className="bg-[#FBFBE2]/60 border border-[#224986]/15 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#224986]/20 bg-[#FBFBE2]/80 text-[#224986]/80 font-bold tracking-wider uppercase">
                      <th className="p-4">ID</th>
                      <th className="p-4">Issue Details</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">SLA Countdown</th>
                      <th className="p-4">Assigned Personnel</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#224986]/10">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-[#224986]/5 transition-colors">
                        <td className="p-4 text-[#224986]/50 font-mono text-center">#{ticket.id}</td>
                        
                        <td className="p-4">
                          <div className="font-bold text-[#224986] text-sm tracking-wide">{ticket.title}</div>
                          <div className="text-[#224986]/70 mt-1 max-w-xs truncate">{ticket.description}</div>
                        </td>

                        {/* CATEGORY SELECT DROPDOWN */}
                        <td className="p-4">
                          <select
                            value={ticket.category || 'IT Support (Software Fault)'}
                            onChange={(e) => {
                              const newCategory = e.target.value;
                              const currentStaff = staffMembers.find(s => s.email === ticket.assigned_to);
                              const updates = { category: newCategory };
                              if (currentStaff && currentStaff.category !== newCategory) {
                                updates.assigned_to = null;
                              }
                              handleUpdateTicket(ticket.id, updates);
                            }}
                            className="p-1.5 rounded-lg border border-[#224986]/30 bg-[#FBFBE2] outline-none font-bold text-[10px] uppercase tracking-wider text-[#224986] cursor-pointer hover:border-[#224986]/50 transition-all"
                          >
                            <option value="IT Support (Software Fault)">Software Fault</option>
                            <option value="Hardware Fault">Hardware Fault</option>
                          </select>
                        </td>

                        {/* 1. PRIORITY SELECT DROPDOWN */}
                        <td className="p-4">
                          <select
                            value={ticket.priority}
                            onChange={(e) => handleUpdateTicket(ticket.id, { priority: e.target.value })}
                            className="p-1.5 rounded-lg border border-[#224986]/30 bg-[#FBFBE2] outline-none font-black text-[10px] uppercase tracking-wider text-[#224986] cursor-pointer hover:border-[#224986]/50 transition-all"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </td>

                        {/* 2. STATUS SELECT DROPDOWN */}
                        <td className="p-4">
                          <select
                            value={ticket.status || 'Open'}
                            onChange={(e) => handleUpdateTicket(ticket.id, { status: e.target.value })}
                            className="p-1.5 rounded-lg border border-[#224986]/20 bg-[#FBFBE2] outline-none font-bold text-[11px] text-[#224986] cursor-pointer hover:border-[#224986]/50 transition-all"
                          >
                            <option value="Open">Open</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </td>

                        {/* SLA COUNTDOWN */}
                        <td className="p-4">
                          <SLACountdown deadline={ticket.sla_deadline} status={ticket.status} />
                        </td>

                        {/* 3. ASSIGNED PERSONNEL SELECT DROPDOWN - FILTERED BY TICKET CATEGORY */}
                        <td className="p-4">
                          <select
                            value={ticket.assigned_to || ''}
                            onChange={(e) => handleUpdateTicket(ticket.id, { assigned_to: e.target.value || null })}
                            className="p-2 rounded-xl bg-[#FBFBE2] border border-[#224986]/25 outline-none w-44 font-medium shadow-inner text-xs text-[#224986] cursor-pointer hover:border-[#224986]/45 transition-all"
                          >
                            <option value="">-- Unassigned --</option>
                            {staffMembers && staffMembers
                              .filter((staff) => staff.category === (ticket.category || 'IT Support (Software Fault)'))
                              .map((staff) => (
                              <option key={staff.email} value={staff.email}>
                                {staff.email}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 4. ACTIONS: EDIT & DELETE */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingTicket({ ...ticket })}
                              className="px-2.5 py-1.5 bg-[#224986]/10 hover:bg-[#224986]/20 text-[#224986] font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all border border-[#224986]/20 active:scale-95 cursor-pointer"
                              title="Edit complete ticket record"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all border border-red-200 active:scale-95 cursor-pointer"
                              title="Delete ticket permanently"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-[#224986]/50 font-medium tracking-wide uppercase text-[10px] border-t border-[#224986]/10">
                          No records matched your operational matrix queries.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* 📝 EDIT TICKET MODAL */}
      {editingTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FBFBE2] border border-[#224986]/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-[#224986]/20 pb-3">
              <h3 className="text-base font-black text-[#224986] uppercase tracking-wider">
                Edit Ticket #{editingTicket.id}
              </h3>
              <button
                onClick={() => setEditingTicket(null)}
                className="text-[#224986]/60 hover:text-[#224986] font-black text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModalEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#224986]/70 uppercase tracking-wider mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  required
                  value={editingTicket.title || ''}
                  onChange={(e) => setEditingTicket({ ...editingTicket, title: e.target.value })}
                  className="w-full bg-white border border-[#224986]/30 focus:border-[#224986] rounded-xl p-2.5 text-xs text-[#224986] outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#224986]/70 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows="3"
                  value={editingTicket.description || ''}
                  onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}
                  className="w-full bg-white border border-[#224986]/30 focus:border-[#224986] rounded-xl p-2.5 text-xs text-[#224986] outline-none shadow-inner"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#224986]/70 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={editingTicket.category || 'IT Support (Software Fault)'}
                    onChange={(e) => setEditingTicket({ ...editingTicket, category: e.target.value })}
                    className="w-full bg-white border border-[#224986]/30 focus:border-[#224986] rounded-xl p-2 text-xs text-[#224986] outline-none cursor-pointer shadow-inner"
                  >
                    <option value="IT Support (Software Fault)">Software Fault</option>
                    <option value="Hardware Fault">Hardware Fault</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#224986]/70 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={editingTicket.priority || 'Medium'}
                    onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value })}
                    className="w-full bg-white border border-[#224986]/30 focus:border-[#224986] rounded-xl p-2 text-xs text-[#224986] outline-none cursor-pointer shadow-inner font-bold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#224986]/70 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={editingTicket.status || 'Open'}
                    onChange={(e) => setEditingTicket({ ...editingTicket, status: e.target.value })}
                    className="w-full bg-white border border-[#224986]/30 focus:border-[#224986] rounded-xl p-2 text-xs text-[#224986] outline-none cursor-pointer shadow-inner font-bold"
                  >
                    <option value="Open">Open</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#224986]/70 uppercase tracking-wider mb-1">
                    Assigned Specialist
                  </label>
                  <select
                    value={editingTicket.assigned_to || ''}
                    onChange={(e) => setEditingTicket({ ...editingTicket, assigned_to: e.target.value || null })}
                    className="w-full bg-white border border-[#224986]/30 focus:border-[#224986] rounded-xl p-2 text-xs text-[#224986] outline-none cursor-pointer shadow-inner"
                  >
                    <option value="">-- Unassigned --</option>
                    {staffMembers && staffMembers.map((staff) => (
                      <option key={staff.email} value={staff.email}>
                        {staff.email} ({staff.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#224986]/10">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#224986] hover:bg-[#224986]/90 text-[#FBFBE2] font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}