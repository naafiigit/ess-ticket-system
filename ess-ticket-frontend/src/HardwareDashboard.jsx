import React, { useState, useEffect } from 'react';


function SLACardCountdown({ deadline, status }) {
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
      <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Resolved
      </div>
    );
  }

  if (isBreached) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-rose-700 font-black bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/60 shadow-sm animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        ⚠️ BREACHED
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-[10px] text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
      ⏱️ {timeLeft}
    </div>
  );
}

export default function HardwareDashboard({ userEmail, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggedOverLane, setDraggedOverLane] = useState(null);

  useEffect(() => {
    fetchAssignedTickets();
  }, []);

  const fetchAssignedTickets = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/staff/tickets?email=${userEmail}`);
      if (!response.ok) throw new Error('Failed to retrieve hardware workgroup queues.');
      const data = await response.json();
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOnDragStart = (e, ticket) => {
    e.dataTransfer.setData('ticketId', ticket.id);
    e.dataTransfer.setData('currentStatus', ticket.status || 'Open');
  };

  const handleOnDragOver = (e, laneTitle) => {
    e.preventDefault();
    if (draggedOverLane !== laneTitle) {
      setDraggedOverLane(laneTitle);
    }
  };

  const handleOnDragLeave = () => {
    setDraggedOverLane(null);
  };

  const handleOnDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDraggedOverLane(null);
    const ticketId = e.dataTransfer.getData('ticketId');
    const currentStatus = e.dataTransfer.getData('currentStatus');

    if (currentStatus === targetStatus) return;

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
      setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
    } catch (err) {
      alert(`⚠️ Movement Rejected: ${err.message}`);
    }
  };

  const lanes = {
    'Open': tickets.filter(t => t.status === 'Open' || !t.status),
    'On Hold': tickets.filter(t => t.status === 'On Hold'),
    'Resolved': tickets.filter(t => t.status === 'Resolved')
  };

  // Simple statistics calculations
  const totalAssigned = tickets.length;
  const activeCount = lanes['Open'].length + lanes['On Hold'].length;
  const resolvedCount = lanes['Resolved'].length;
  const now = new Date();
  const breachedCount = tickets.filter(t => t.status !== 'Resolved' && t.sla_deadline && new Date(t.sla_deadline) < now).length;

  return (
    <div className="min-h-screen text-[#224986] p-6 relative overflow-hidden bg-gradient-to-tr from-[#FBFBE2]/20 via-transparent to-[#224986]/5">
      {/* Background Graphic Accents */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-tr from-[#224986]/10 to-[#224986]/0 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-[#FBFBE2]/10 to-[#FBFBE2]/0 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* Dynamic Glassmorphic Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FBFBE2]/80 border border-[#224986]/10 p-6 rounded-3xl backdrop-blur-xl shadow-xl transition-all">
          <div className="flex items-center gap-4">
            <img src="/Picture1.png" alt="ESS Logo" className="w-10 h-10 rounded-2xl object-contain bg-white shadow-md border border-[#224986]/10 p-0.5" />
            <div>
              <h1 className="text-xl font-black tracking-wider text-[#224986] flex items-center gap-2">
                ESS HARDWARE FAULT DESK
              </h1>
              <p className="text-[10px] font-bold tracking-[0.12em] text-[#224986]/70 uppercase mt-0.5">
                ACTIVE OPERATIONAL MATRIX • <span className="font-mono text-[#224986]/90 lowercase font-normal">{userEmail}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={onLogout} 
              className="px-5 py-2.5 bg-[#224986] hover:bg-[#224986]/95 border border-[#224986]/15 hover:border-[#224986]/30 text-[#FBFBE2] font-bold rounded-2xl text-[11px] tracking-widest uppercase transition-all shadow-lg active:scale-95 cursor-pointer hover:shadow-[#224986]/20"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Small Metrics Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#FBFBE2]/80 border border-[#224986]/10 p-4 rounded-2xl backdrop-blur-md shadow-sm hover:shadow-md transition-all">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#224986]/50">Total Assigned</span>
            <h3 className="text-2xl font-black text-[#224986] mt-1 font-mono">{totalAssigned}</h3>
          </div>
          <div className="bg-[#FBFBE2]/80 border border-[#224986]/10 p-4 rounded-2xl backdrop-blur-md shadow-sm hover:shadow-md transition-all">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-600">Active Workload</span>
            <h3 className="text-2xl font-black text-blue-700 mt-1 font-mono">{activeCount}</h3>
          </div>
          <div className="bg-[#FBFBE2]/80 border border-[#224986]/10 p-4 rounded-2xl backdrop-blur-md shadow-sm hover:shadow-md transition-all">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600">Total Resolved</span>
            <h3 className="text-2xl font-black text-emerald-700 mt-1 font-mono">{resolvedCount}</h3>
          </div>
          <div className="bg-[#FBFBE2]/80 border border-rose-500/10 p-4 rounded-2xl backdrop-blur-md shadow-sm hover:shadow-md transition-all">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-500">SLA Breached</span>
            <h3 className="text-2xl font-black text-rose-600 mt-1 font-mono">{breachedCount}</h3>
          </div>
        </section>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl shadow-sm animate-pulse">
            ⚠️ Operation Fault: {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <div className="w-10 h-10 border-4 border-[#224986] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs tracking-widest text-[#224986]/60 uppercase font-bold">Synchronizing Active Canvas Grid...</p>
          </div>
        ) : (
          /* KANBAN KINETIC GRID */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {Object.entries(lanes).map(([laneTitle, laneTickets]) => {
              const isOver = draggedOverLane === laneTitle;
              return (
                <div 
                  key={laneTitle}
                  onDragOver={(e) => handleOnDragOver(e, laneTitle)}
                  onDragLeave={handleOnDragLeave}
                  onDrop={(e) => handleOnDrop(e, laneTitle)}
                  className={`border rounded-3xl p-5 flex flex-col min-h-[600px] transition-all duration-300 backdrop-blur-lg ${
                    isOver 
                      ? 'bg-[#224986]/5 border-[#224986]/40 shadow-inner scale-[1.01]' 
                      : 'bg-[#FBFBE2]/50 border-[#224986]/10 shadow-sm hover:bg-[#FBFBE2]/60'
                  }`}
                >
                  {/* Lane Title & Counters */}
                  <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#224986]/10 px-1">
                    <h3 className="text-xs font-black tracking-widest uppercase text-[#224986]/80 flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        laneTitle === 'Open' ? 'bg-[#224986]' :
                        laneTitle === 'On Hold' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}></span>
                      {laneTitle}
                    </h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[#FBFBE2] text-[#224986] border border-[#224986]/20 rounded-full font-mono shadow-sm">
                      {laneTickets.length}
                    </span>
                  </div>

                  {/* Kanban Cards Scrollable Area */}
                  <div className="space-y-4 flex-1 overflow-y-auto max-h-[600px] pr-1.5">
                    {laneTickets.length === 0 ? (
                      <div className="h-full border-2 border-dashed border-[#224986]/10 bg-[#FBFBE2]/20 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[150px] gap-2">
                        <span className="text-lg opacity-40">📥</span>
                        <p className="text-[10px] font-bold text-[#224986]/40 uppercase tracking-widest">Drop Incidents Here</p>
                      </div>
                    ) : (
                      laneTickets.map((ticket) => (
                        <div 
                          key={ticket.id} 
                          draggable={ticket.status !== 'Resolved'}
                          onDragStart={(e) => handleOnDragStart(e, ticket)}
                          className={`bg-[#FBFBE2] border rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-300 relative group shadow-sm hover:shadow-lg ${
                            ticket.status === 'Resolved' 
                              ? 'border-[#224986]/10 opacity-70 bg-[#FBFBE2]/40 cursor-default' 
                              : 'border-[#224986]/15 hover:border-[#224986]/40 bg-[#FBFBE2] cursor-grab active:cursor-grabbing hover:-translate-y-0.5'
                          }`}
                        >
                          <div>
                            {/* Card Meta Row */}
                            <div className="flex justify-between items-start gap-3 mb-3">
                              <span className="text-[9px] font-mono text-[#224986]/55 font-bold tracking-wider">
                                #{ticket.id}
                              </span>
                              <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${
                                ticket.priority === 'High' 
                                  ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' 
                                  : ticket.priority === 'Medium' 
                                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' 
                                    : 'bg-slate-500/10 text-slate-700 border-slate-500/20'
                              }`}>
                                {ticket.priority}
                              </span>
                            </div>

                            {/* Card Title & Content */}
                            <h4 className="text-xs font-black text-[#224986] tracking-wide mb-1.5 line-clamp-2">
                              {ticket.title}
                            </h4>
                            <p className="text-[11px] text-[#224986]/70 leading-relaxed mb-4 line-clamp-3 bg-white/40 p-2.5 rounded-xl border border-[#224986]/5">
                              {ticket.description}
                            </p>

                            {/* SLA Status Footer */}
                            <div className="flex justify-between items-center mt-2 pt-2.5 border-t border-[#224986]/10">
                              <span className="text-[9px] text-[#224986]/50 uppercase font-bold tracking-wider">SLA Status</span>
                              <SLACardCountdown deadline={ticket.sla_deadline} status={ticket.status} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
