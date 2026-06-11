import React, { useState, useEffect, useCallback } from 'react';

export default function TicketForm({ userEmail, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'IT Support',
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
        setFormData({ title: '', description: '', category: 'IT Support', priority: 'Medium' });
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Left Column: Ticket Submission Form */}
      <div className="w-full md:w-1/2 p-8 flex flex-col justify-center border-r border-slate-900">
        <div className="max-w-md w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-mono text-slate-500 bg-slate-900 border border-slate-800/80 rounded-md px-2 py-1">
              Active User: {userEmail}
            </span>
            <button onClick={onLogout} className="text-xs font-medium text-slate-400 hover:text-red-400 transition-colors">
              Sign Out
            </button>
          </div>
          
          <h2 className="text-3xl font-black mb-1 tracking-tight">Submit a Support Ticket</h2>
          <p className="text-sm text-slate-400 mb-6">Describe your issue and our team will resolve it.</p>

          {message.text && (
            <div className={`p-4 rounded-xl mb-6 text-sm border font-medium ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ticket Title</label>
              <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm outline-none text-slate-100 focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm outline-none text-slate-100 focus:border-blue-500 transition-all">
                <option value="IT Support">IT Support</option>
                <option value="Access Management">Access Management</option>
                <option value="Hardware">Hardware Fault</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Priority Level</label>
              <div className="grid grid-cols-3 gap-3">
                {['Low', 'Medium', 'High'].map((p) => (
                  <button type="button" key={p} onClick={() => setFormData({ ...formData, priority: p })} className={`py-2 text-xs font-bold rounded-xl border transition-all ${formData.priority === p ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Description</label>
              <textarea rows="4" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm outline-none text-slate-100 focus:border-blue-500 transition-all resize-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-slate-900 border border-slate-800 hover:border-blue-500 text-slate-200 font-bold rounded-xl text-sm transition-all">{loading ? 'Processing System Delivery...' : 'Submit Ticket'}</button>
          </form>
        </div>
      </div>

      {/* Right Column: User's Personal Ticket History */}
      <div className="w-full md:w-1/2 p-8 bg-slate-950">
        <div className="max-w-md w-full mx-auto">
          <h3 className="text-xl font-bold mb-1 tracking-tight text-slate-300">Your Filed Tickets</h3>
          <p className="text-xs text-slate-500 mb-6">Track historical activity logs and support statuses live.</p>
          <div className="space-y-4 overflow-y-auto max-h-[75vh] pr-2">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-slate-200 text-sm">{ticket.title}</h4>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${ticket.status === 'Open' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>{ticket.status}</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{ticket.description}</p>
                {ticket.assigned_to && (
                  <div className="mt-2 text-[11px] font-medium text-indigo-400/90 bg-indigo-500/5 border border-indigo-500/10 px-2 py-1 rounded-md inline-block">
                    Assigned to: {ticket.assigned_to}
                  </div>
                )}
              </div>
            ))}
            {tickets.length === 0 && <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">No tickets submitted yet. Your active status queue will appear here.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}