import React, { useState, useEffect } from 'react';
import CountdownTimer from './CountdownTimer';

export default function AdminDashboard({ onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, onHold: 0, resolved: 0, breached: 0 });
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 🔍 NEW SEARCH & FILTER STATES
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ticketsRes, staffRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/tickets'),
        fetch('http://localhost:5000/api/admin/staff-list')
      ]);

      if (!ticketsRes.ok || !staffRes.ok) throw new Error('Failed to synchronize admin matrix datasets.');

      const ticketsData = await ticketsRes.json();
      const staffData = await staffRes.json();

      // Deconstruct the data layout containing raw array rows and aggregate counts
      setTickets(ticketsData.tickets || []);
      setStats(ticketsData.stats || { total: 0, open: 0, onHold: 0, resolved: 0, breached: 0 });
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
  const formatDeadline = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + 
           date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getSLABadgeStyle = (status) => {
    switch (status) {
      case 'Breached':
        return 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse';
      case 'Urgent Warning':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold';
      case 'Fulfilled':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      default: // 'In Progress'
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
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
      #3b82f6 0deg ${degOpen}deg, 
      #f59e0b ${degOpen}deg ${degOnHold}deg, 
      #ef4444 ${degOnHold}deg ${degBreached}deg, 
      #10b981 ${degBreached}deg 360deg
    )`
  };
  // --- Instant Client-Side Query Filtering Engine ---
  const filteredTickets = tickets.filter((ticket) => {
    // 1. Check match against Title, Description, Assigned Email, or Ticket ID
    const matchesSearch = 
      ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(ticket.id).includes(searchTerm);

    // 2. Check match against Priority selection dropdown
    const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-slate-800/80 pb-5 mb-8">
        <div>
          <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400">
            CENTRAL ADMINISTRATIVE OPERATIONS
          </h1>
          <p className="text-[10px] font-bold tracking-[0.15em] text-blue-500 uppercase mt-1">
            Global Oversight & Service Desk Assignment Console
          </p>
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 text-slate-300 hover:text-red-400 font-bold rounded-xl text-[11px] tracking-widest uppercase transition-all shadow-md active:scale-95">
          Secure Logout
        </button>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl mb-6">⚠️ {error}</div>}

        {loading ? (
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 tracking-widest uppercase font-medium">Recompiling core matrix dashboards...</p>
          </div>
        ) : (
          <>
            {/* Visual Metrics Panel: Total, Open, On Hold, Breach, Resolved */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              
              {/* TOTAL TICKETS CARD */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-slate-700 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets</p>
                  <h3 className="text-2xl font-black text-slate-100 mt-1 font-mono">{stats.total}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-400 font-bold text-sm shadow-[0_0_10px_rgba(255,255,255,0.02)]">∑</div>
              </div>

              {/* OPEN CARD */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-blue-500/20 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Open Status</p>
                  <h3 className="text-2xl font-black text-slate-100 mt-1 font-mono">{stats.open}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-sm shadow-[0_0_10px_rgba(59,130,246,0.1)]">●</div>
              </div>

              {/* ON HOLD CARD */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-amber-500/20 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">On Hold Status</p>
                  <h3 className="text-2xl font-black text-amber-400 mt-1 font-mono">{stats.onHold}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-400 text-xs shadow-[0_0_10px_rgba(245,158,11,0.1)]">●</div>
              </div>

              {/* SLA BREACHES CARD */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-red-500/40 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">SLA Breaches</p>
                  <h3 className="text-2xl font-black text-rose-500 mt-1 font-mono">{stats.breached}</h3>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${stats.breached > 0 ? 'bg-red-500/10 text-red-400 animate-pulse border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-slate-950 text-slate-600 border border-slate-900'}`}>🛑</div>
              </div>

              {/* RESOLVED CARD */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Resolved Closed</p>
                  <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">{stats.resolved}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-[0_0_10px_rgba(16,185,129,0.1)]">✓</div>
              </div>

            </div>

            {/* SLA PERFORMANCE PIE/DONUT CHART MATRIX */}
            <div className="bg-slate-900/20 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-around gap-8">
              <div className="space-y-3 max-w-sm">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">SLA Performance Summary</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Real-time distributional overview of open infrastructure incidents, queue holdbacks, active target deadlocks, and fulfilled workloads.
                </p>
                
                {/* Chart Color Legends */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> Open ({stats.open})
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> On Hold ({stats.onHold})
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded bg-red-500"></span> Breached ({stats.breached})
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Resolved ({stats.resolved})
                  </div>
                </div>
              </div>

              {/* Native Donut Graphic Render Frame */}
              <div className="relative flex items-center justify-center">
                <div 
                  className="w-40 h-40 rounded-full shadow-2xl transition-all duration-500" 
                  style={pieChartStyle}
                ></div>
                <div className="absolute w-[110px] h-[110px] bg-slate-950 rounded-full flex flex-col items-center justify-center border border-slate-900 shadow-inner">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
                  <span className="text-xl font-black text-slate-200 mt-0.5">{stats.total}</span>
                </div>
              </div>
            </div>
            {/* 🔍 SEARCH & FILTER BAR COMPONENT */}
            <div className="bg-slate-900/20 border border-slate-800/60 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-4 justify-between">
              
              {/* Keyword Search Input Box */}
              <div className="relative w-full sm:w-96">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search by ID, title, summary, or assigned personnel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-all shadow-inner"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 text-[10px] uppercase font-bold tracking-wider"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Priority State Dropdown Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Priority Filter:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="p-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-medium outline-none cursor-pointer hover:border-slate-700 min-w-[120px] transition-all shadow-md"
                >
                  <option value="All">All Priorities</option>
                  <option value="Low">Low Only</option>
                  <option value="Medium">Medium Only</option>
                  <option value="High">High Only</option>
                </select>
              </div>

            </div>

            {/* Main Operational Table Window */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl"></div>

            {/* Main Operational Table Window */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold tracking-wider uppercase">
                      <th className="p-4 w-12 text-center">ID</th>
                      <th className="p-4">Issue Details</th>
                      <th className="p-4">SLA Status</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Assigned Personnel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {/* 🔥 SWAPPED FROM tickets.map TO filteredTickets.map */}
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-slate-600 font-mono text-center">#{ticket.id}</td>
                        
                        <td className="p-4">
                          <div className="font-bold text-slate-200 text-sm tracking-wide">{ticket.title}</div>
                          <div className="text-slate-500 mt-1 max-w-xs truncate">{ticket.description}</div>
                        </td>

                        {/* 📍 DYNAMIC SLA STATUS COLUMN */}
<td className="p-4">
  <div className="flex flex-col items-start gap-1">
    {/* 1. Show the historical target timestamp format option */}
    <div className="font-medium text-slate-400 font-mono text-[10px]">
      Target: {ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleString() : 'No Deadline'}
    </div>
    
    {/* 2. 🔥 THE LIVE DRIFT TICKER INJECTION */}
    <div className="mt-1">
      <CountdownTimer deadline={ticket.sla_deadline} status={ticket.status} />
    </div>
    
    {/* 3. Keep the overall server-side calculated tag label below if desired, or let the timer handle the visuals */}
    <span className={`px-1.5 py-0.5 mt-1 text-[8px] font-black uppercase tracking-widest rounded border ${
      ticket.status === 'Resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
      ticket.calculated_sla_status === 'Breached' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-950 text-slate-500 border-slate-900'
    }`}>
      {ticket.status === 'Resolved' ? 'Archived' : ticket.calculated_sla_status}
    </span>
  </div>
</td>

                        {/* 1. PRIORITY SELECT DROPDOWN */}
<td className="p-4">
  <select
    value={ticket.priority}
    disabled={ticket.status === 'Resolved'} // 🔒 LOCK FIELD IF RESOLVED
    onChange={(e) => handleUpdateTicket(ticket.id, { priority: e.target.value })}
    className={`p-1.5 rounded-lg border bg-slate-950 outline-none font-black text-[10px] uppercase tracking-wider transition-all ${
      ticket.status === 'Resolved' 
        ? 'border-slate-800 text-slate-600 cursor-not-allowed opacity-50' // Muted locked style
        : ticket.priority === 'High' ? 'border-red-500/30 text-red-400 cursor-pointer' : 'border-blue-500/30 text-blue-400 cursor-pointer'
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
    // Leave this open OR disable it based on whether you want admins to ever reopen tickets.
    // If you want it completely locked down, add: disabled={ticket.status === 'Resolved'}
    onChange={(e) => handleUpdateTicket(ticket.id, { status: e.target.value })}
    className={`p-1.5 rounded-lg border bg-slate-950 outline-none font-bold cursor-pointer text-[11px] ${
      ticket.status === 'Resolved' ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-800 text-slate-300'
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
    className={`p-2 rounded-xl bg-slate-950 border outline-none w-48 font-medium shadow-inner text-xs transition-all ${
      ticket.status === 'Resolved'
        ? 'border-slate-900 text-slate-600 cursor-not-allowed opacity-50' // Muted locked style
        : 'border-slate-800 text-slate-300 cursor-pointer'
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
                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-600 font-medium tracking-wide uppercase text-[10px]">
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