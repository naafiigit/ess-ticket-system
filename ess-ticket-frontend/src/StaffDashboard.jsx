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
    <div className="min-h-screen bg-transparent text-[#224986] p-6 relative overflow-hidden">
      {/* Background Ambient Blur */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#224986]/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-[#224986]/20 pb-5 mb-8">
        <div>
          <h1 className="text-xl font-black tracking-wider text-[#224986]">
            ESS IT SUPPORT WORKSPACE
          </h1>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#224986]/80 uppercase mt-1">
            Kanban Board Queue: <span className="text-[#224986] font-mono font-normal normal-case">{userEmail}</span>
          </p>
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-[#224986] hover:bg-[#224986]/90 border border-[#224986] text-[#FBFBE2] font-bold rounded-xl text-[11px] tracking-widest uppercase transition-all shadow-md cursor-pointer">
          Logout
        </button>
      </header>

      <main className="max-w-7xl mx-auto">
        {error && <div className="p-4 bg-[#224986]/10 border border-[#224986]/20 text-[#224986] text-xs rounded-xl mb-6">⚠️ {error}</div>}

        {loading ? (
          <p className="text-xs tracking-widest text-[#224986]/60 uppercase font-medium animate-pulse">Synchronizing active canvas data...</p>
        ) : (
          /* KANBAN DRIFT GRID WRAPPER */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {Object.entries(lanes).map(([laneTitle, laneTickets]) => (
              <div 
                key={laneTitle}
                onDragOver={handleOnDragOver}
                onDrop={(e) => handleOnDrop(e, laneTitle)}
                className="bg-[#FBFBE2]/70 border border-[#224986]/10 rounded-2xl p-4 flex flex-col min-h-[650px] transition-all duration-200 hover:bg-[#FBFBE2]/90 shadow-sm"
              >
                {/* Column Headers */}
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-xs font-black tracking-widest uppercase text-[#224986]/80 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      laneTitle === 'Open' ? 'border-2 border-[#224986] bg-[#224986]' :
                      laneTitle === 'On Hold' ? 'border-2 border-[#224986] bg-transparent' : 'border-2 border-dashed border-[#224986] bg-transparent'
                    }`}></span>
                    {laneTitle}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FBFBE2] text-[#224986]/60 border border-[#224986]/10 rounded-full font-mono">
                    {laneTickets.length}
                  </span>
                </div>

                {/* Column Cards Lane Container */}
                <div className="space-y-4 flex-1">
                  {laneTickets.length === 0 ? (
                    <div className="h-full border border-dashed border-[#224986]/20 bg-[#FBFBE2]/30 rounded-xl p-6 text-center flex items-center justify-center min-h-[120px]">
                      <p className="text-[11px] font-bold text-[#224986]/40 uppercase tracking-wider">Drop tickets here</p>
                    </div>
                  ) : (
                    laneTickets.map((ticket) => (
                      <div 
                        key={ticket.id} 
                        draggable="true"
                        onDragStart={(e) => handleOnDragStart(e, ticket)}
                        className={`bg-[#FBFBE2] border rounded-xl p-4 flex flex-col justify-between transition-all relative group cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md ${
                          ticket.status === 'Resolved' 
                            ? 'border-[#224986]/10 opacity-70 bg-[#FBFBE2]/50' :
                          'border-[#224986]/20 hover:border-[#224986]/50 bg-[#FBFBE2]'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <span className="text-[9px] font-mono text-[#224986]/50 font-bold uppercase tracking-wider">#{ticket.id} / {ticket.category}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${
                              ticket.priority === 'High' ? 'bg-[#224986] text-[#FBFBE2] border-[#224986]' : 
                              ticket.priority === 'Medium' ? 'bg-[#224986]/20 text-[#224986] border-[#224986]/30' :
                              'bg-[#224986]/5 text-[#224986]/60 border-[#224986]/10'
                            }`}>
                              {ticket.priority}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-[#224986] tracking-wide mb-1.5 transition-colors">{ticket.title}</h4>
                          <p className="text-[11px] text-[#224986]/80 leading-relaxed mb-4 line-clamp-3 bg-[#FBFBE2]/60 p-2.5 rounded-lg border border-[#224986]/10">{ticket.description}</p>
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