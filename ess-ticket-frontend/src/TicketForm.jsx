import React, { useState, useEffect, useCallback } from 'react';


export default function TicketForm({ userEmail, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'IT Support (Software Fault)',
    priority: 'Medium',
  });

  // Fetch only the tickets owned by this specific logged-in user
  const fetchUserTickets = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/tickets?email=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Failed to update historical activity indices.', err);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchUserTickets();
  }, [fetchUserTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userEmail) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    // Include the user's email into the payload so Postgres knows who made it
    const ticketPayload = { ...formData, created_by: userEmail };

    try {
      const response = await fetch('http://localhost:5000/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayload),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: '🎉 Ticket submitted successfully!' });
        setFormData({ title: '', description: '', category: 'IT Support (Software Fault)', priority: 'Medium' });
        fetchUserTickets(); // Refresh the list view immediately
      } else {
        setMessage({ type: 'error', text: `System fault: ${data.error}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Server communication infrastructure failure.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#224986] flex flex-col md:flex-row bg-transparent">
      {/* Left Column: Ticket Submission Form */}
      <div className="w-full md:w-1/2 p-8 flex flex-col justify-center border-r border-[#224986]/10 bg-[#FBFBE2]/60 backdrop-blur-md">
        <div className="max-w-md w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <img src="/Picture1.png" alt="ESS Logo" className="w-10 h-10 rounded-2xl object-contain bg-white shadow-md border border-[#224986]/10 p-0.5" />
              <span className="text-xs font-mono text-[#224986]/85 font-black">
                {userEmail}
              </span>
            </div>
            <button onClick={onLogout} className="text-xs font-bold uppercase tracking-wider text-[#224986]/70 hover:text-[#224986] transition-colors cursor-pointer">
              Logout
            </button>
          </div>
          
          <h2 className="text-3xl font-black mb-1 tracking-tight text-[#224986]">Submit a Support Ticket</h2>
          <p className="text-sm text-[#224986]/70 mb-6">Describe your issue and our team will resolve it.</p>

          {message.text && (
            <div className={`p-4 rounded-xl mb-6 text-sm border font-medium bg-[#224986]/10 border-[#224986]/20 text-[#224986] backdrop-blur-md`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#224986]/80 uppercase tracking-wider mb-2">Ticket Title</label>
              <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 rounded-xl p-3 text-sm outline-none text-[#224986] focus:border-[#224986] transition-all shadow-inner" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#224986]/80 uppercase tracking-wider mb-2">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 rounded-xl p-3 text-sm outline-none text-[#224986] focus:border-[#224986] transition-all cursor-pointer shadow-inner">
                <option value="IT Support (Software Fault)">IT Support (Software Fault)</option>
                <option value="Hardware Fault">Hardware Fault</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#224986]/80 uppercase tracking-wider mb-2">Priority Level</label>
              <div className="grid grid-cols-3 gap-3">
                {['Low', 'Medium', 'High'].map((p) => (
                  <button type="button" key={p} onClick={() => setFormData({ ...formData, priority: p })} className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${formData.priority === p ? 'bg-[#224986] text-[#FBFBE2] border-[#224986] shadow-md' : 'bg-[#FBFBE2]/90 border-[#224986]/20 text-[#224986]/60 hover:border-[#224986]/40 hover:text-[#224986]'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#224986]/80 uppercase tracking-wider mb-2">Detailed Description</label>
              <textarea rows="4" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#FBFBE2]/90 border border-[#224986]/30 rounded-xl p-3 text-sm outline-none text-[#224986] focus:border-[#224986] transition-all resize-none shadow-inner" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#224986] border border-[#224986] hover:bg-[#224986]/90 text-[#FBFBE2] font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md">{loading ? 'Processing System Delivery...' : 'Submit Ticket'}</button>
          </form>
        </div>
      </div>

      {/* Right Column: User's Personal Ticket History */}
      <div className="w-full md:w-1/2 p-8 bg-[#FBFBE2]/40 backdrop-blur-md">
        <div className="max-w-md w-full mx-auto">
          <h3 className="text-xl font-bold mb-1 tracking-tight text-[#224986]">Your Filed Tickets</h3>
          <p className="text-xs text-[#224986]/70 mb-6">Track historical activity logs and support statuses live.</p>
          <div className="space-y-4 overflow-y-auto max-h-[75vh] pr-2">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="p-4 bg-[#FBFBE2]/90 border border-[#224986]/10 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[#224986] text-sm">{ticket.title}</h4>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${ticket.status === 'Open' ? 'bg-[#224986]/10 border-[#224986]/20 text-[#224986]' : 'bg-[#224986]/5 border-[#224986]/10 text-[#224986]/60 line-through'}`}>{ticket.status}</span>
                </div>
                <p className="text-xs text-[#224986]/80 line-clamp-2">{ticket.description}</p>
                {ticket.assigned_to && (
                  <div className="mt-2 text-[11px] font-semibold text-[#224986]/90 bg-[#224986]/5 border border-[#224986]/10 px-2 py-1 rounded-md inline-block">
                    Assigned to: {ticket.assigned_to}
                  </div>
                )}
              </div>
            ))}
            {tickets.length === 0 && <div className="border border-dashed border-[#224986]/20 bg-[#FBFBE2]/30 rounded-xl p-8 text-center text-xs text-[#224986]/50">No tickets submitted yet. Your active status queue will appear here.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}