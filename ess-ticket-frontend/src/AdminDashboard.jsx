import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, onHold: 0, resolved: 0 });
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 🔍 NEW SEARCH & FILTER STATES
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // 👤 NEW IT SUPPORT SPECIALIST CREATION STATES
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreateSuccess('');
    setCreateError('');
    setCreating(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newStaffEmail,
          password: newStaffPassword,
          role: 'it_staff'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create IT Support account.');
      }

      setCreateSuccess('🎉 Support account created successfully!');
      setNewStaffEmail('');
      setNewStaffPassword('');
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
      setStats(ticketsData.stats || { total: 0, open: 0, onHold: 0, resolved: 0 });
      setStaffMembers(staffData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const degOpen = pOpen;
  const degOnHold = degOpen + pOnHold;

  const pieChartStyle = {
    background: `conic-gradient(
      #224986 0deg ${degOpen}deg, 
      rgba(34, 73, 134, 0.6) ${degOpen}deg ${degOnHold}deg, 
      rgba(34, 73, 134, 0.25) ${degOnHold}deg 360deg
    )`
  };


  return (
    <div className="min-h-screen text-[#224986] p-6 relative overflow-hidden bg-transparent">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[#224986]/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-[#224986]/20 pb-5 mb-8">
        <div>
          <h1 className="text-xl font-black tracking-wider text-[#224986]">
            CENTRAL ADMINISTRATIVE OPERATIONS
          </h1>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#224986]/80 uppercase mt-1">
            Global Oversight & Service Desk Assignment Console
          </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
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
                      <span className="w-2.5 h-2.5 rounded bg-[#224986]/60"></span> On Hold ({stats.onHold})
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#224986]/80 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-[#224986]/25"></span> Resolved ({stats.resolved})
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
                      <input
                        type="password"
                        required
                        value={newStaffPassword}
                        onChange={(e) => setNewStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 focus:border-[#224986]/50 rounded-lg p-2 text-xs text-[#224986] placeholder-[#224986]/40 outline-none transition-all shadow-inner"
                      />
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
                      <th className="p-4 w-12 text-center">ID</th>
                      <th className="p-4">Issue Details</th>

                      <th className="p-4">Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Assigned Personnel</th>
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



                        {/* 1. PRIORITY SELECT DROPDOWN */}
                        <td className="p-4">
                          <select
                            value={ticket.priority}
                            disabled={ticket.status === 'Resolved'} // 🔒 LOCK FIELD IF RESOLVED
                            onChange={(e) => handleUpdateTicket(ticket.id, { priority: e.target.value })}
                            className={`p-1.5 rounded-lg border bg-[#FBFBE2] outline-none font-black text-[10px] uppercase tracking-wider transition-all ${
                              ticket.status === 'Resolved' 
                                ? 'border-[#224986]/10 text-[#224986]/30 cursor-not-allowed opacity-50' // Muted locked style
                                : 'border-[#224986]/30 text-[#224986] cursor-pointer hover:border-[#224986]/50'
                            }`}
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
                            className={`p-1.5 rounded-lg border bg-[#FBFBE2] outline-none font-bold cursor-pointer text-[11px] ${
                              ticket.status === 'Resolved' ? 'border-[#224986]/35 text-[#224986]/50' : 'border-[#224986]/20 text-[#224986]'
                            }`}
                          >
                            <option value="Open">Open</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </td>

                        {/* 3. ASSIGNED PERSONNEL SELECT DROPDOWN */}
                        <td className="p-4">
                          <select
                            value={ticket.assigned_to || ''}
                            disabled={ticket.status === 'Resolved'} // 🔒 LOCK FIELD IF RESOLVED
                            onChange={(e) => handleUpdateTicket(ticket.id, { assigned_to: e.target.value || null })}
                            className={`p-2 rounded-xl bg-[#FBFBE2] border outline-none w-48 font-medium shadow-inner text-xs transition-all ${
                              ticket.status === 'Resolved'
                                ? 'border-[#224986]/10 text-[#224986]/30 cursor-not-allowed opacity-50' // Muted locked style
                                : 'border-[#224986]/25 text-[#224986] cursor-pointer hover:border-[#224986]/45'
                            }`}
                          >
                            <option value="">-- Unassigned --</option>
                            {staffMembers && staffMembers.map((staff) => (
                              <option key={staff.email} value={staff.email}>
                                {staff.email}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-[#224986]/50 font-medium tracking-wide uppercase text-[10px] border-t border-[#224986]/10">
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
    </div>
  );
}