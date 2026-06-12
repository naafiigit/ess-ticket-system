import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      setTickets(ticketsData);
      setStaffMembers(staffData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async (ticketId, fieldsToUpdate) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldsToUpdate)
      });

      if (!response.ok) throw new Error('Failed to commit field state change.');
      
      // Re-fetch dataset on modification to catch runtime SLA status flips instantly
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDeadline = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + 
           date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const totalTickets = tickets.length;
  const activeBacklog = tickets.filter(t => t.status === 'Open').length;
  const highPriority = tickets.filter(t => t.priority === 'High').length;
  const breachedCount = tickets.filter(t => t.custom_sla_status === 'SLA Breached').length;

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
            {/* Visual Metrics Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tickets</p>
                  <h3 className="text-2xl font-black text-slate-100 mt-1 font-mono">{totalTickets}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800/60 flex items-center justify-center text-slate-400 font-bold">∑</div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-amber-500/20 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">Active Backlog</p>
                  <h3 className="text-2xl font-black text-amber-400 mt-1 font-mono">{activeBacklog}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-400 text-xs">●</div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-red-500/20 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-red-500/80 uppercase tracking-wider">High Priority</p>
                  <h3 className="text-2xl font-black text-red-400 mt-1 font-mono">{highPriority}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm">⚠</div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex items-center justify-between group hover:border-red-500/40 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">SLA Breaches</p>
                  <h3 className="text-2xl font-black text-rose-500 mt-1 font-mono">{breachedCount}</h3>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${breachedCount > 0 ? 'bg-red-500/10 text-red-400 animate-pulse border border-red-500/20' : 'bg-slate-950 text-slate-600'}`}>🛑</div>
              </div>
            </div>

            {/* Main Operational Table Window */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold tracking-wider uppercase">
                      <th className="p-4 w-12 text-center">ID</th>
                      <th className="p-4">Issue Details</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Current Status</th>
                      <th className="p-4">SLA Deadline / Monitor</th>
                      <th className="p-4">Assigned Personnel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-slate-600 font-mono text-center">#{ticket.id}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-200 text-sm tracking-wide">{ticket.title}</div>
                          <div className="text-slate-500 mt-1 max-w-xs truncate">{ticket.description}</div>
                        </td>
                        <td className="p-4">
                          <select
                            value={ticket.priority}
                            onChange={(e) => handleUpdateTicket(ticket.id, { priority: e.target.value })}
                            className={`p-1.5 rounded-lg border bg-slate-950 outline-none font-black cursor-pointer text-[10px] uppercase tracking-wider transition-all ${
                              ticket.priority === 'High' ? 'border-red-500/30 text-red-400' : 'border-blue-500/30 text-blue-400'
                            }`}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <select
                            value={ticket.status || 'Open'}
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
                        {/* SLA Metrics Exposing Column */}
                        <td className="p-4">
                          <div className="font-medium text-slate-300 font-mono text-[11px]">{formatDeadline(ticket.sla_deadline)}</div>
                          <span className={`inline-block px-2 py-0.5 mt-1 text-[9px] font-black uppercase tracking-widest rounded-md border ${
                            ticket.custom_sla_status === 'SLA Breached' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                            ticket.custom_sla_status === 'SLA Fulfilled' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          }`}>
                            {ticket.custom_sla_status || 'In Progress'}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            value={ticket.assigned_to || ''}
                            onChange={(e) => handleUpdateTicket(ticket.id, { assigned_to: e.target.value || null })}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 outline-none cursor-pointer w-48 font-medium shadow-inner text-xs"
                          >
                            <option value="">-- Unassigned --</option>
                            {staffMembers.map((staff) => (
                              <option key={staff.email} value={staff.email}>
                                {staff.email}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
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