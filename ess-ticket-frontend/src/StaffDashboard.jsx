import React, { useState, useEffect } from 'react';
import CountdownTimer from './CountdownTimer';

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

  /* ==========================================================================
     NATIVE HTML5 KANBAN DRAG & DROP ENGINE WITH STATUS-LOCK GUARDRAIL
     ========================================================================== */
  
  // 1. Triggers when the staff member begins physical mouse click drag movement
  const handleOnDragStart = (e, ticket) => {
    e.dataTransfer.setData('ticketId', ticket.id);
    e.dataTransfer.setData('currentStatus', ticket.status || 'Open');
  };

  // 2. Prevents default system behavior to permit drops inside lanes
  const handleOnDragOver = (e) => {
    e.preventDefault();
  };

  // 3. Processes layout column releases and coordinates database validation handshakes
  const handleOnDrop = async (e, targetStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('ticketId');
    const currentStatus = e.dataTransfer.getData('currentStatus');

    // If dropped onto the exact same column, discard operational pipeline execution
    if (currentStatus === targetStatus) return;

    // 🛑 FRONTEND GUARDRAIL: Instantly reject backward traction if origin state is locked
    if (currentStatus === 'Resolved' && targetStatus !== 'Resolved') {
      alert('🔒 Operational Guardrail: Resolved tickets are archived and cannot be moved backward.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/staff/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete lane movement transmission.');
      }

      const updatedTicket = await response.json();
      
      // Update local state arrays cleanly so cards change lanes instantly
      setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
    } catch (err) {
      alert(`⚠️ Movement Rejected: ${err.message}`);
    }
  };

  const formatDeadline = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' @ ' + 
           date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Group flat data arrays dynamically into structural lane categories
  const lanes = {
    'Open': tickets.filter(t => t.status === 'Open' || !t.status),
    'On Hold': tickets.filter(t => t.status === 'On Hold'),
    'Resolved': tickets.filter(t => t.status === 'Resolved')
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-hidden">
      {/* Background Ambient Blur */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-slate-800/80 pb-5 mb-8">
        <div>
          <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400">
            ESS IT SUPPORT WORKSPACE
          </h1>
          <p className="text-[10px] font-bold tracking-[0.15em] text-blue-500 uppercase mt-1">
            Kanban Board Queue: <span className="text-slate-300 font-mono font-normal normal-case">{userEmail}</span>
          </p>
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 text-slate-300 hover:text-red-400 font-bold rounded-xl text-[11px] tracking-widest uppercase transition-all shadow-md">
          Secure Logout
        </button>
      </header>

      <main className="max-w-7xl mx-auto">
        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl mb-6">⚠️ {error}</div>}

        {loading ? (
          <p className="text-xs tracking-widest text-slate-500 uppercase font-medium animate-pulse">Synchronizing active canvas data...</p>
        ) : (
          /* KANBAN DRIFT GRID WRAPPER */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {Object.entries(lanes).map(([laneTitle, laneTickets]) => (
              <div 
                key={laneTitle}
                onDragOver={handleOnDragOver}
                onDrop={(e) => handleOnDrop(e, laneTitle)}
                className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex flex-col min-h-[650px] transition-all duration-200 hover:bg-slate-900/30"
              >
                {/* Column Headers */}
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-xs font-black tracking-widest uppercase text-slate-400 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      laneTitle === 'Open' ? 'bg-blue-500' :
                      laneTitle === 'On Hold' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}></span>
                    {laneTitle}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-950 text-slate-500 rounded-full font-mono">
                    {laneTickets.length}
                  </span>
                </div>

                {/* Column Cards Lane Container */}
                <div className="space-y-4 flex-1">
                  {laneTickets.length === 0 ? (
                    <div className="h-full border border-dashed border-slate-900/80 rounded-xl p-6 text-center flex items-center justify-center min-h-[120px]">
                      <p className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Drop tickets here</p>
                    </div>
                  ) : (
                    laneTickets.map((ticket) => (
                      <div 
                        key={ticket.id} 
                        draggable="true"
                        onDragStart={(e) => handleOnDragStart(e, ticket)}
                        className={`bg-slate-900/50 border rounded-xl p-4 flex flex-col justify-between transition-all relative group cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md ${
                          ticket.status === 'Resolved' 
                            ? 'border-emerald-500/10 opacity-70 bg-emerald-950/5' :
                          ticket.calculated_sla_status === 'Breached' 
                            ? 'border-red-500/30 bg-red-950/5 shadow-red-950/10' : 
                          'border-slate-800/80 hover:border-slate-700/80 bg-slate-900/40'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <span className="text-[9px] font-mono text-slate-600 font-bold uppercase tracking-wider">#{ticket.id} / {ticket.category}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${
                              ticket.priority === 'High' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                              ticket.priority === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                              'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            }`}>
                              {ticket.priority}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-200 tracking-wide mb-1.5 group-hover:text-white transition-colors">{ticket.title}</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed mb-4 line-clamp-3 bg-slate-950/30 p-2.5 rounded-lg border border-slate-950">{ticket.description}</p>
                        </div>

                        {/* Card SLA Footnote Meta Grid */}
{/* Card SLA Footnote Meta Grid */}
<div className={`flex flex-col gap-2 p-2.5 rounded-lg border transition-all ${
  ticket.status === 'Resolved' ? 'bg-slate-950/20 border-slate-950' :
  ticket.calculated_sla_status === 'Breached' ? 'bg-red-950/20 border-red-900/20' : 'bg-slate-950/40 border-slate-950'
}`}>
  <div className="flex justify-between items-center w-full">
    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Remaining Frame</p>
    <p className="text-[9px] font-mono text-slate-500">{new Date(ticket.sla_deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
  </div>
  
  {/* 🔥 THE LIVE DRIFT KANBAN CARD TICKER */}
  <div className="w-full text-left">
    <CountdownTimer deadline={ticket.sla_deadline} status={ticket.status} />
  </div>
</div>

                      </div>
                    ))
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