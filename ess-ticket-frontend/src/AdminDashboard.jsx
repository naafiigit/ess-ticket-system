import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Sample array representing available operational staff addresses
  const staffList = ['staff1@company.com', 'staff2@company.com', 'staff3@company.com'];

  const fetchAllTickets = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/tickets');
      if (!response.ok) throw new Error('Failed to capture administration dataset.');
      const data = await response.json();
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTickets();
  }, []);

  const handleUpdateTicket = async (id, updatedFields) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`http://localhost:5000/api/admin/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      if (response.ok) {
        fetchAllTickets(); // Re-sync frontend screen components
      } else {
        alert('Failed to update ticket control parameters.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      High: 'bg-red-500/20 text-red-400 border-red-500/30',
      Medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      Low: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return `px-2.5 py-1 text-xs font-semibold rounded-full border ${colors[priority] || colors.Medium}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Central Administrative Operations
          </h1>
          <p className="text-sm text-slate-400 mt-1">Global oversight and service desk assignment console</p>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:text-red-400 text-slate-300 rounded-lg transition-all text-sm font-medium"
        >
          Secure Logout
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-slate-400 animate-pulse text-sm">Retrieving system diagnostics grid...</div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl overflow-hidden backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <th className="p-4">ID</th>
                <th className="p-4">Issue Details</th>
                <th className="p-4">Scope</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Assigned Personnel</th>
                <th className="p-4">Submitted By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-mono text-slate-500 text-xs">#{ticket.id}</td>
                  <td className="p-4 max-w-xs">
                    <div className="font-semibold text-slate-200">{ticket.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{ticket.description}</div>
                  </td>
                  <td className="p-4 text-slate-300 font-medium text-xs">{ticket.category}</td>
                  <td className="p-4"><span className={getPriorityBadge(ticket.priority)}>{ticket.priority}</span></td>
                  <td className="p-4">
                    <select
                      value={ticket.status}
                      disabled={updatingId === ticket.id}
                      onChange={(e) => handleUpdateTicket(ticket.id, { status: e.target.value })}
                      className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      value={ticket.assigned_to || ''}
                      disabled={updatingId === ticket.id}
                      onChange={(e) => handleUpdateTicket(ticket.id, { assigned_to: e.target.value || null })}
                      className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 font-medium w-44"
                    >
                      <option value="">-- Unassigned --</option>
                      {staffList.map((staff) => (
                        <option key={staff} value={staff}>{staff}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-xs text-slate-400 font-mono">{ticket.created_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}