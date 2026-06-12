import React, { useState, useEffect } from 'react';

export default function StaffDashboard({ userEmail, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignedTickets();
  }, []);

  const fetchAssignedTickets = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/staff/tickets?email=${userEmail}`);
      if (!response.ok) throw new Error('Failed to retrieve personal workgroup queues.');
      const data = await response.json();
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved' })
      });

      if (!response.ok) throw new Error('Fulfillment transmission failure.');
      fetchAssignedTickets(); // Reload card dataset to update SLA visual metrics badges
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDeadline = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' @ ' + 
           date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="max-w-6xl mx-auto flex justify-between items-center border-b border-slate-800/80 pb-5 mb-8">
        <div>
          <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400">
            ESS IT SUPPORT WORKSPACE
          </h1>
          <p className="text-[10px] font-bold tracking-[0.15em] text-blue-500 uppercase mt-1">
            Specialist Queue: <span className="text-slate-300 font-mono font-normal normal-case">{userEmail}</span>
          </p>
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 text-slate-300 hover:text-red-400 font-bold rounded-xl text-[11px] tracking-widest uppercase transition-all shadow-md">
          Secure Logout
        </button>
      </header>

      <main className="max-w-6xl mx-auto">
        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl mb-6">⚠️ {error}</div>}

        {loading ? (
          <p className="text-xs tracking-widest text-slate-500 uppercase font-medium animate-pulse">Synchronizing active data assignments...</p>
        ) : tickets.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto mt-12 bg-slate-900/10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Queue Status: Clear</h3>
            <p className="text-xs text-slate-600 mt-2">No active data incident profiles are assigned to your corporate workstation partition.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              /* DYNAMIC CARD CONTAINER HOOKED INTO DYNAMIC SLA STATE CLASSES */
              <div 
                key={ticket.id} 
                className={`bg-slate-900/40 border rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between transition-all relative group overflow-hidden ${
                  ticket.status === 'Resolved' 
                    ? 'border-emerald-500/20 opacity-60 shadow-none bg-emerald-950/5' :
                  ticket.custom_sla_status === 'SLA Breached' 
                    ? 'border-red-500/40 shadow-lg shadow-red-950/20 bg-red-950/5' : 
                  'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                
                <div>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <span className="text-[10px] font-mono text-slate-600 font-bold uppercase tracking-wider">#{ticket.id} / {ticket.category}</span>
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${
                      ticket.priority === 'High' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                      ticket.priority === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 tracking-wide mb-2">{ticket.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6 bg-slate-950/40 border border-slate-900/50 p-3 rounded-xl min-h-[60px]">{ticket.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/60 mt-auto space-y-4">
                  {/* Dynamic SLA Countdown Monitoring Frame */}
                  <div className={`flex justify-between items-center p-2.5 rounded-xl border transition-all ${
                    ticket.status === 'Resolved' ? 'bg-slate-950/40 border-slate-900' :
                    ticket.custom_sla_status === 'SLA Breached' ? 'bg-red-950/20 border-red-900/30' : 'bg-slate-950/60 border-slate-900'
                  }`}>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Target Deadline</p>
                      <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">{formatDeadline(ticket.sla_deadline)}</p>
                    </div>
                    
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border transition-all ${
                      ticket.custom_sla_status === 'SLA Breached' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' :
                      ticket.custom_sla_status === 'SLA Fulfilled' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                      {ticket.custom_sla_status || 'In Progress'}
                    </span>
                  </div>

                  {ticket.status !== 'Resolved' && (
                    <button 
                      onClick={() => handleResolveTicket(ticket.id)}
                      className={`w-full py-2.5 text-[11px] uppercase tracking-widest font-black rounded-xl transition-all shadow-md active:scale-[0.98] ${
                        ticket.custom_sla_status === 'SLA Breached'
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-950/40'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950/40'
                      }`}
                    >
                      ✓ Mark As Resolved
                    </button>
                  )}
                </div>
                
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}