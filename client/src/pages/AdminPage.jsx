import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Trash2, Shield, User, RefreshCw, MessageCircle, Lock, Unlock, AlertCircle, ClipboardList, CheckCircle, XCircle, Clock, Users, Layers, Ban, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, gcApi } from '../api';

export default function AdminPage() {
  const location = useLocation();
  const [animateIn, setAnimateIn] = useState(false);
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [requests, setRequests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [suspendingGroupId, setSuspendingGroupId] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [appeals, setAppeals] = useState([]);
  const [appealNotes, setAppealNotes] = useState({}); // appealId -> note text
  const [appealActioning, setAppealActioning] = useState(null); // appealId being actioned
  const [banningUserId, setBanningUserId] = useState(null);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    setAnimateIn(false);
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getUsers({ page, search, limit: 100 });
      setUsers(data.users);
      setTotal(data.total);
    } catch { toast.error('Failed to load users'); }
    finally { setIsLoading(false); }
  };

  const fetchActivity = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getActivity({ page, email: search });
      setLogs(data.logs);
      setTotal(data.total);
    } catch { toast.error('Failed to load activity'); }
    finally { setIsLoading(false); }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getMessages({ page, search });
      setMessages(data.messages);
      setTotal(data.total);
    } catch { toast.error('Failed to load messages'); }
    finally { setIsLoading(false); }
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getMessageRequests();
      setRequests(data.requests);
    } catch { toast.error('Failed to load requests'); }
    finally { setIsLoading(false); }
  };

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getGroups({ page, search });
      setGroups(data.groups);
      setTotal(data.total);
    } catch { toast.error('Failed to load groups'); }
    finally { setIsLoading(false); }
  };

  const fetchAppeals = async () => {
    setIsLoading(true);
    try {
      const { data } = await gcApi.getAdminAppeals();
      setAppeals(data.appeals || []);
    } catch { toast.error('Failed to load appeals'); }
    finally { setIsLoading(false); }
  };

  const handleAppealAction = async (appealId, action) => {
    setAppealActioning(appealId);
    try {
      await gcApi.reviewAppeal(appealId, action, appealNotes[appealId] || '');
      toast.success(`Appeal ${action === 'approve' ? 'approved — group unsuspended' : 'rejected'}`);
      setAppealNotes(prev => { const n = { ...prev }; delete n[appealId]; return n; });
      fetchAppeals();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update appeal');
    } finally {
      setAppealActioning(null);
    }
  };

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    else if (tab === 'activity') fetchActivity();
    else if (tab === 'messages') fetchMessages();
    else if (tab === 'requests') fetchRequests();
    else if (tab === 'groups') fetchGroups();
    else if (tab === 'appeals') fetchAppeals();
  }, [tab, page, search]);

  const handleRoleToggle = async (email, current) => {
    const newRole = current === 'admin' ? 'user' : 'admin';
    try {
      await adminApi.updateRole(email, newRole);
      toast.success(`Updated ${email} to ${newRole}`);
      fetchUsers();
    } catch { toast.error('Failed to update role'); }
  };

  const handleBanUser = async (userId, email) => {
    if (!banReason.trim()) {
      toast.error('Please enter a ban reason');
      return;
    }
    try {
      await adminApi.banUser(userId, banReason);
      toast.success(`Banned ${email}`);
      setBanningUserId(null);
      setBanReason('');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId, email) => {
    if (!window.confirm(`Unban ${email}?`)) return;
    try {
      await adminApi.unbanUser(userId);
      toast.success(`Unbanned ${email}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to unban user');
    }
  };

  const handleSuspendGroup = async (groupId) => {
    if (!suspendReason.trim()) {
      toast.error('Please enter a suspension reason');
      return;
    }
    try {
      await adminApi.suspendGroup(groupId, suspendReason);
      toast.success('Group suspended successfully');
      setSuspendingGroupId(null);
      setSuspendReason('');
      fetchGroups();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to suspend group');
    }
  };

  const handleUnsuspendGroup = async (groupId) => {
    if (!window.confirm('Unsuspend this group?')) return;
    try {
      await adminApi.unsuspendGroup(groupId);
      toast.success('Group unsuspended successfully');
      fetchGroups();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to unsuspend group');
    }
  };

  const handleClearActivity = async (email) => {
    if (!confirm(email ? `Clear all activity for ${email}?` : 'Clear ALL activity logs?')) return;
    try {
      await adminApi.clearActivity(email);
      toast.success('Activity cleared');
      fetchActivity();
    } catch { toast.error('Failed to clear activity'); }
  };

  const handleDeleteConversation = async (conversationId, itemTitle) => {
    if (!confirm(`Delete conversation "${itemTitle}"? This action cannot be undone.`)) return;
    try {
      await adminApi.deleteConversation(conversationId);
      toast.success('Conversation deleted');
      fetchMessages();
    } catch { toast.error('Failed to delete conversation'); }
  };
  const handleSendMessageRequest = async () => {
    if (!selectedUserEmail.trim()) {
      toast.error('Please enter a user email');
      return;
    }
    try {
      await adminApi.sendMessageRequest(selectedUserEmail, requestMessage);
      toast.success('Message request sent');
      setSelectedUserEmail('');
      setRequestMessage('');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request');
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Delete this message request?')) return;
    try {
      setIsLoading(true);
      await adminApi.deleteMessageRequest(id);
      toast.success('Request deleted');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId, userEmail) => {
    try {
      await adminApi.acceptUserRequest(requestId);
      // Show a prominent notification to the admin
      toast.success((t) => (
        <div className="flex items-start gap-3">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Request Accepted!</p>
            <p className="text-sm">Notification sent to {userEmail}</p>
            <p className="text-xs text-ink-400 mt-1">They will see the acceptance popup in their dashboard</p>
          </div>
        </div>
      ), { duration: 5000 });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId, userEmail) => {
    if (!confirm(`Reject request from ${userEmail}?`)) return;
    try {
      await adminApi.rejectUserRequest(requestId);
      toast.success(`Request from ${userEmail} rejected`);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const actionColor = (action) => {
    if (action === 'login') return 'text-success';
    if (action === 'logout') return 'text-ink-500';
    if (action.includes('reset') || action.includes('clear')) return 'text-danger';
    return 'text-ink-400';
  };

  return (
    <div className={`p-4 sm:p-6 w-full transition-all duration-700 ${
      animateIn ? 'opacity-100 translate-y-0 appstore-drop' : 'opacity-0 translate-y-10'
    }`} style={{transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'}}>
      <div className="mb-6 animate-in fade-in slide-in-from-top duration-700" style={{animationDelay: '100ms'}}>
        <h1 className="text-2xl font-bold text-ink-100" style={{ fontFamily: 'Syne' }}>Admin Panel</h1>
        <p className="text-ink-500 text-sm mt-1">Manage users and monitor activity</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-ink-900 rounded-lg mb-6 overflow-x-auto hide-scrollbar animate-in fade-in slide-in-from-left duration-700" style={{animationDelay: '150ms'}}>
        {[
          { id: 'users', label: 'Users', icon: User },
          { id: 'activity', label: 'Activity', icon: ClipboardList },
          { id: 'messages', label: 'Messages', icon: MessageCircle },
          { id: 'groups', label: 'Groups', icon: Layers },
          { id: 'requests', label: 'Requests', icon: AlertCircle },
          { id: 'appeals', label: 'Appeals', icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setPage(1); setSearch(''); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              tab === id
                ? 'bg-ink-800 text-ink-100 shadow-lg shadow-accent/30' 
                : 'text-ink-500 hover:text-accent hover:bg-ink-800/50 hover:scale-105'
            }`} style={{ fontFamily: 'Syne' }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Search + actions */}
      <div className={`flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom duration-700 ${tab === 'appeals' ? 'hidden' : ''}`} style={{animationDelay: '200ms'}}>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input pl-9" 
            placeholder={tab === 'users' ? 'Search email or ID...' : tab === 'activity' ? 'Filter by email...' : 'Search sender or recipient...'}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button onClick={tab === 'users' ? fetchUsers : tab === 'activity' ? fetchActivity : fetchMessages} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center gap-2 shadow-md">
          <RefreshCw size={14} />Refresh
        </button>
        {tab === 'activity' && (
          <button onClick={() => handleClearActivity()} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all hover:scale-105 flex items-center gap-2 shadow-md">
            <Trash2 size={14} />Clear All
          </button>
        )}
      </div>

      {/* Users Table */}
      {tab === 'users' && (
        <>
          <div className="card overflow-hidden animate-in fade-in slide-in-from-bottom duration-700 bg-white border border-gray-200 rounded-xl" style={{animationDelay: '300ms'}}>
            {/* Header summary */}
            <div className="px-4 py-3 border-b border-gray-300 flex items-center justify-between bg-white hover:bg-gray-50 transition-all">
              <div className="flex items-center gap-2 group">
                <User size={14} className="text-blue-600 transition-all group-hover:scale-110 group-hover:rotate-12" />
                <span className="text-xs text-gray-700 font-semibold transition-all group-hover:text-gray-900 tracking-wider" style={{ fontFamily: 'Syne', letterSpacing: '0.1em' }}>
                  ALL REGISTERED ACCOUNTS
                </span>
              </div>
              <span className="text-xs font-mono text-blue-700 font-bold px-3 py-1 rounded-full bg-blue-100 border border-blue-300">
                {total} total
              </span>
            </div>

            <table className="w-full">
              <thead className="border-b border-gray-300 bg-white">
                <tr>
                  {['#', 'ID', 'Email', 'Role', 'Status', 'Activities', 'Registered', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-700 border-r border-gray-300"
                      style={{ fontFamily: 'Syne', letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="py-12 text-center text-gray-600 text-sm">Loading...</td></tr>
                ) : users.map((user, i) => (
                  <tr key={user.email} className={`border-b border-gray-200 hover:bg-gray-50 transition-all ${user.banned_at ? 'bg-red-50' : ''}`}>
                    <td className="py-3 px-4 text-xs text-gray-600 font-mono w-10 border-r border-gray-200">
                      {(page - 1) * 100 + i + 1}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 font-mono font-bold border-r border-gray-200">
                      {user.id}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 border-r border-gray-200">{user.email}</td>
                    <td className="py-3 px-4 border-r border-gray-200">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all ${
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-r border-gray-200">
                      {user.banned_at ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                          <Ban size={10} /> BANNED
                        </span>
                      ) : user.verified ? (
                        <span className="text-xs text-green-600 font-semibold">✓ Active</span>
                      ) : (
                        <span className="text-xs text-amber-600">⏳ Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-700 font-mono font-bold border-r border-gray-200">
                      {user.activity_count || 0}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 font-mono whitespace-nowrap border-r border-gray-200">
                      {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono whitespace-nowrap border-r border-gray-200">
                      {user.last_login
                        ? <span className="text-gray-600">{new Date(user.last_login).toLocaleString()}</span>
                        : <span className="text-gray-400">Never</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => handleRoleToggle(user.email, user.role)}
                          className="text-xs text-blue-600 hover:text-blue-800 transition-all font-semibold px-2 py-1 rounded hover:bg-blue-50 border border-blue-200">
                          Toggle Role
                        </button>
                        {user.role !== 'admin' && !user.banned_at && (
                          <button onClick={() => { setBanningUserId(user.id); setBanReason(''); }}
                            className="text-xs text-red-600 hover:text-red-800 transition-all font-semibold px-2 py-1 rounded hover:bg-red-50 border border-red-200 flex items-center gap-1">
                            <Ban size={10} /> Ban
                          </button>
                        )}
                        {user.banned_at && (
                          <button onClick={() => handleUnbanUser(user.id, user.email)}
                            className="text-xs text-green-600 hover:text-green-800 transition-all font-semibold px-2 py-1 rounded hover:bg-green-50 border border-green-200 flex items-center gap-1">
                            <ShieldOff size={10} /> Unban
                          </button>
                        )}
                      </div>
                      {/* Ban reason modal inline */}
                      {banningUserId === user.id && (
                        <div className="mt-2 p-2 bg-red-50 rounded border border-red-200 space-y-2">
                          <input
                            type="text"
                            placeholder="Ban reason..."
                            value={banReason}
                            onChange={e => setBanReason(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-400 bg-white text-gray-800"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => handleBanUser(user.id, user.email)}
                              disabled={!banReason.trim()}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-semibold">
                              Confirm Ban
                            </button>
                            <button onClick={() => setBanningUserId(null)}
                              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && users.length === 0 && (
              <div className="py-12 text-center text-ink-600 text-sm">No users found</div>
            )}
          </div>
          
          {/* Pagination for Users */}
          {total > 100 && (
            <div className="flex justify-between items-center gap-4 mt-6 px-4 py-4 bg-white rounded-lg border border-gray-200">
              <div className="text-xs text-gray-700 font-semibold tracking-wide">
                Showing {Math.min((page - 1) * 100 + 1, total)} - {Math.min(page * 100, total)} of {total} users
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={page <= 1} 
                  onClick={() => setPage(p => p - 1)} 
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  ← Previous
                </button>
                <span className="px-4 py-2 text-xs text-blue-700 font-bold bg-blue-100 rounded-md border border-blue-300">
                  Page {page} of {Math.ceil(total / 100)}
                </span>
                <button 
                  disabled={page * 100 >= total} 
                  onClick={() => setPage(p => p + 1)} 
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Activity Table */}
      {tab === 'activity' && (
        <div className="card overflow-hidden animate-in fade-in slide-in-from-bottom duration-700" style={{animationDelay: '300ms'}}>
          <table className="w-full">
            <thead className="border-b border-ink-800">
              <tr>
                {['User', 'Action', 'Detail', 'Time'].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-medium text-ink-500"
                    style={{ fontFamily: 'Syne', letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="py-12 text-center text-ink-600 text-sm">Loading...</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-ink-800/50 hover:bg-accent/10 hover:shadow-lg hover:shadow-accent/20 transition-all hover:scale-y-105">
                  <td className="py-2.5 px-4 text-xs text-ink-300 font-mono transition-all hover:text-accent hover:font-bold">{log.user_email}</td>
                  <td className="py-2.5 px-4 transition-all hover:scale-110">
                    <span className={`text-xs font-medium font-mono transition-all ${actionColor(log.action)} hover:brightness-125`}>{log.action}</span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-ink-500 truncate max-w-[200px] transition-all hover:text-ink-200 hover:max-w-none">{log.detail || '—'}</td>
                  <td className="py-2.5 px-4 text-xs text-ink-600 font-mono whitespace-nowrap transition-all hover:text-ink-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && logs.length === 0 && (
            <div className="py-12 text-center text-ink-600 text-sm">No activity found</div>
          )}
        </div>
      )}

      {/* Messages Table */}
      {tab === 'messages' && (
        <div className="animate-in fade-in slide-in-from-bottom duration-700" style={{animationDelay: '300ms'}}>
          {isLoading ? (
            <div className="py-12 text-center text-ink-600 text-sm">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-ink-600 text-sm">No conversations found</div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300 bg-white rounded-t-xl">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-700 tracking-wider border-r border-gray-300">ITEM</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-700 tracking-wider border-r border-gray-300">OWNER</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-700 tracking-wider border-r border-gray-300">INQUIRER</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 tracking-wider border-r border-gray-300">OWNER MSGS</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 tracking-wider border-r border-gray-300">INQUIRER MSGS</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-700 tracking-wider border-r border-gray-300">LAST ACTIVITY</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 tracking-wider border-r border-gray-300">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((conv, i) => (
                    <tr key={conv.conversation_id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900 border-r border-gray-200">{conv.item_title}</td>
                      <td className="px-4 py-4 text-xs text-gray-700 font-mono border-r border-gray-200">{conv.item_owner_email}</td>
                      <td className="px-4 py-4 text-xs text-gray-700 font-mono border-r border-gray-200">{conv.inquirer_email}</td>
                      <td className="px-4 py-4 text-center border-r border-gray-200">
                        <div className="inline-flex gap-2">
                          <span className="px-2 py-1 rounded bg-blue-100 border border-blue-400/50 text-xs text-blue-700 font-semibold">{conv.owner_messages || 0}</span>
                          {conv.owner_deleted > 0 && (
                            <span className="px-2 py-1 rounded bg-red-100 border border-red-400/50 text-xs text-red-600 font-semibold">-{conv.owner_deleted}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-200">
                        <div className="inline-flex gap-2">
                          <span className="px-2 py-1 rounded bg-blue-100 border border-blue-400/50 text-xs text-blue-700 font-semibold">{conv.inquirer_messages || 0}</span>
                          {conv.inquirer_deleted > 0 && (
                            <span className="px-2 py-1 rounded bg-red-100 border border-red-400/50 text-xs text-red-600 font-semibold">-{conv.inquirer_deleted}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-xs text-gray-700 font-mono border-r border-gray-200">{new Date(conv.last_message_at).toLocaleString()}</td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => handleDeleteConversation(conv.conversation_id, conv.item_title)} className="btn-danger px-2 py-1 text-xs flex items-center gap-1 mx-auto">
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 50 && (
            <div className="flex justify-center gap-2 mt-6 animate-in fade-in duration-700" style={{animationDelay: '400ms'}}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-4 py-2 text-xs disabled:opacity-30">← Previous</button>
              <span className="btn-ghost px-4 py-2 text-xs text-blue-300">Page {page} of {Math.ceil(total / 50)}</span>
              <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost px-4 py-2 text-xs disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Groups Tab */}
      {tab === 'groups' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-700" style={{animationDelay: '300ms'}}>
          {isLoading ? (
            <div className="py-12 text-center text-ink-600 text-sm">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-ink-600 text-sm">No groups found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {groups.map((group) => (
                <div 
                  key={group.id} 
                  className={`card p-4 border-l-4 transition-all duration-300 hover:shadow-lg ${
                    group.is_suspended ? 'border-l-danger bg-danger/5' : 'border-l-accent bg-ink-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-bold text-ink-100 truncate">{group.name}</h3>
                        {group.is_suspended && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-danger/20 text-danger text-xs font-semibold">
                            <Lock size={12} />
                            SUSPENDED
                          </span>
                        )}
                        {group.is_public && (
                          <span className="inline-flex px-2 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold">
                            PUBLIC
                          </span>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-xs text-ink-400 mb-2 line-clamp-2">{group.description}</p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="text-ink-600">
                          <span className="font-semibold text-accent">{group.member_count}</span> members
                        </div>
                        <div className="text-ink-600">
                          <span className="font-semibold text-accent">{group.message_count}</span> messages
                        </div>
                        <div className="text-ink-600">
                          Owner: <span className="font-mono text-ink-400">{group.created_by}</span>
                        </div>
                        <div className="text-ink-600">
                          Created: {new Date(group.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {group.is_suspended && group.suspension_reason && (
                        <div className="mt-3 p-2 bg-danger/10 rounded border border-danger/20">
                          <p className="text-xs text-danger font-semibold mb-1">Suspension Reason:</p>
                          <p className="text-xs text-ink-400">{group.suspension_reason}</p>
                          <p className="text-xs text-ink-600 mt-1">Suspended by: {group.suspended_by}</p>
                          {group.suspended_at && (
                            <p className="text-xs text-ink-600">On: {new Date(group.suspended_at).toLocaleString()}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {!group.is_suspended ? (
                        <button
                          onClick={() => setSuspendingGroupId(group.id)}
                          className="px-3 py-1.5 text-xs bg-danger/10 text-danger border border-danger/30 rounded hover:bg-danger/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-danger/30"
                          title="Suspend this group"
                        >
                          <Lock size={12} className="inline mr-1" />
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnsuspendGroup(group.id)}
                          className="px-3 py-1.5 text-xs bg-green-500/10 text-green-500 border border-green-500/30 rounded hover:bg-green-500/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/30"
                          title="Unsuspend this group"
                        >
                          <Unlock size={12} className="inline mr-1" />
                          Unsuspend
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Suspend Modal/Form */}
                  {suspendingGroupId === group.id && !group.is_suspended && (
                    <div className="mt-4 p-4 bg-danger/10 rounded border border-danger/20 space-y-3 animate-in fade-in slide-in-from-bottom duration-300">
                      <div className="flex items-center gap-2 text-danger mb-2">
                        <AlertCircle size={16} />
                        <span className="text-xs font-semibold">Enter suspension reason:</span>
                      </div>
                      <textarea
                        placeholder="Reason for suspension (e.g., 'Inappropriate content', 'Spam', 'Violation of terms')..."
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        className="input w-full resize-none h-16 text-xs"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setSuspendingGroupId(null);
                            setSuspendReason('');
                          }}
                          className="px-3 py-1.5 text-xs bg-ink-800 text-ink-300 rounded hover:bg-ink-700 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSuspendGroup(group.id)}
                          disabled={!suspendReason.trim()}
                          className="px-3 py-1.5 text-xs bg-danger text-white rounded hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Confirm Suspend
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-6 animate-in fade-in duration-700" style={{animationDelay: '400ms'}}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-4 py-2 text-xs disabled:opacity-30 transition-all hover:scale-105">← Previous</button>
              <span className="btn-ghost px-4 py-2 text-xs text-ink-500">Page {page} of {Math.ceil(total / 20)}</span>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost px-4 py-2 text-xs disabled:opacity-30 transition-all hover:scale-105">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4 animate-in fade-in duration-700" style={{animationDelay: '400ms'}}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">← Prev</button>
          <span className="btn-ghost px-3 py-1.5 text-xs text-ink-500">Page {page}</span>
          <button disabled={page * (tab === 'messages' ? 50 : 20) >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">Next →</button>
        </div>
      )}

      {/* Message Requests Tab */}
      {tab === 'requests' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-700" style={{animationDelay: '300ms'}}>
          {/* Send Request Section */}
          <div className="card p-4">
            <h3 className="font-semibold text-ink-100 mb-4 flex items-center gap-2">
              <MessageCircle size={16} className="text-accent" />
              Send Message Request to User
            </h3>
            <p className="text-xs text-ink-600 mb-3">Send a request to a user to start a conversation. The user will see a notification.</p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="User email..."
                value={selectedUserEmail}
                onChange={e => setSelectedUserEmail(e.target.value)}
                className="input w-full"
              />
              <textarea
                placeholder="Message (optional)..."
                value={requestMessage}
                onChange={e => setRequestMessage(e.target.value)}
                className="input w-full resize-none h-20"
              />
              <button
                onClick={handleSendMessageRequest}
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <MessageCircle size={14} />
                Send Request
              </button>
            </div>
          </div>

          {/* Outgoing Requests (Admin → Users) */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-800 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-blue-500" />
                <span className="text-xs text-blue-500 font-semibold tracking-wider" style={{ fontFamily: 'Syne' }}>
                  OUTGOING REQUESTS (SENT TO USERS)
                </span>
              </div>
              <span className="text-xs font-mono text-blue-500 font-bold px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
                {requests.filter(r => r.type === 'outgoing').length} pending
              </span>
            </div>

            {requests.filter(r => r.type === 'outgoing').length === 0 ? (
              <div className="p-6 text-center text-ink-500 text-sm">No outgoing message requests</div>
            ) : (
              <div className="divide-y divide-ink-800">
                {requests.filter(r => r.type === 'outgoing').map(req => (
                  <div key={`outgoing-${req.id}`} className="p-4 hover:bg-ink-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-ink-100">{req.user_email}</p>
                        {req.message && (
                          <p className="text-xs text-ink-500 mt-1 italic">"{req.message}"</p>
                        )}
                        <p className="text-xs text-ink-600 mt-2">
                          Status: <span className={`font-semibold ${
                            req.status === 'pending' ? 'text-yellow-400' :
                            req.status === 'accepted' ? 'text-green-400' :
                            'text-red-400'
                          }`}>{req.status}</span>
                        </p>
                        <p className="text-xs text-ink-600 mt-1">
                          Sent: {new Date(req.created_at).toLocaleString()}
                        </p>
                        {req.responded_at && (
                          <p className="text-xs text-ink-600 mt-1">
                            Responded: {new Date(req.responded_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          disabled={isLoading || req.status !== 'pending'}
                          className="px-3 py-1.5 text-xs bg-danger/10 text-danger border border-danger/30 rounded hover:bg-danger/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={req.status !== 'pending' ? 'Can only delete pending requests' : ''}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incoming Requests from Users */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-800 flex items-center justify-between bg-gradient-to-r from-green-500/10 to-transparent">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-green-500" />
                <span className="text-xs text-green-500 font-semibold tracking-wider" style={{ fontFamily: 'Syne' }}>
                  INCOMING REQUESTS (FROM USERS)
                </span>
              </div>
              <span className="text-xs font-mono text-green-500 font-bold px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                {requests.filter(r => r.type === 'incoming').length} pending
              </span>
            </div>

            {requests.filter(r => r.type === 'incoming').length === 0 ? (
              <div className="p-6 text-center text-ink-500 text-sm">No incoming message requests</div>
            ) : (
              <div className="divide-y divide-ink-800">
                {requests.filter(r => r.type === 'incoming').map(req => (
                  <div key={`incoming-${req.id}`} className="p-4 hover:bg-ink-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-ink-100">{req.user_email}</p>
                        {req.message && (
                          <p className="text-xs text-ink-500 mt-1 italic">"{req.message}"</p>
                        )}
                        <p className="text-xs text-ink-600 mt-2">
                          Status: <span className={`font-semibold ${
                            req.status === 'pending' ? 'text-yellow-400' :
                            req.status === 'accepted' ? 'text-green-400' :
                            'text-red-400'
                          }`}>{req.status}</span>
                        </p>
                        <p className="text-xs text-ink-600 mt-1">
                          {new Date(req.created_at).toLocaleString()}
                        </p>
                        {req.responded_at && (
                          <p className="text-xs text-ink-600 mt-1">
                            Responded: {new Date(req.responded_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptRequest(req.id, req.user_email)}
                              disabled={isLoading}
                              className="px-3 py-1.5 text-xs bg-green-500/10 text-green-500 border border-green-500/30 rounded hover:bg-green-500/20 transition-colors disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id, req.user_email)}
                              disabled={isLoading}
                              className="px-3 py-1.5 text-xs bg-danger/10 text-danger border border-danger/30 rounded hover:bg-danger/20 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appeals Tab */}
      {tab === 'appeals' && (
        <div className="animate-in fade-in slide-in-from-bottom duration-700 space-y-5" style={{animationDelay: '300ms'}}>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Awaiting Review', value: appeals.length, icon: <Clock size={15} /> },
              { label: 'Approved Today',  value: '—',            icon: <CheckCircle size={15} /> },
              { label: 'Rejected Today',  value: '—',            icon: <XCircle size={15} /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#faf9f7', border: '1px solid #e8e4df' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f0ede8', border: '1px solid #ddd8d0', color: '#6b6560' }}>
                  {icon}
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ fontFamily: 'Syne', color: '#2c2a27' }}>{value}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9c9690' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main panel */}
          <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid #e8e4df', background: '#fdfcfb' }}>

            {/* Panel header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #ede9e3', background: 'linear-gradient(to right, #f5f2ee, #fdfcfb)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ede9e3', border: '1px solid #ddd8d0', color: '#6b6560' }}>
                  <ClipboardList size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ fontFamily: 'Syne', color: '#1e1c1a' }}>Unsuspension Appeals</h3>
                  <p className="text-[10px]" style={{ color: '#a09890' }}>Review and respond to group founder appeals</p>
                </div>
              </div>
              <button
                onClick={fetchAppeals}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ border: '1px solid #ddd8d0', color: '#7a7570', background: '#faf9f7' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f0ede8'; e.currentTarget.style.color = '#3a3835'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#faf9f7'; e.currentTarget.style.color = '#7a7570'; }}
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>

            {/* Column labels */}
            {!isLoading && appeals.length > 0 && (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-5 py-2.5" style={{ borderBottom: '1px solid #ede9e3', background: '#f5f2ee' }}>
                {['Group / Founder', 'Suspension & Appeal', 'Decision'].map(h => (
                  <span key={h} className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#b0a89f' }}>{h}</span>
                ))}
              </div>
            )}

            {/* Body */}
            {isLoading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <RefreshCw size={20} className="animate-spin" style={{ color: '#c0b8b0' }} />
                <p className="text-sm" style={{ color: '#a09890' }}>Loading appeals…</p>
              </div>
            ) : appeals.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#f0ede8', border: '1px solid #ddd8d0' }}>
                  <CheckCircle size={26} style={{ color: '#c0b8b0' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: '#4a4845' }}>All caught up</p>
                  <p className="text-xs mt-1" style={{ color: '#a09890' }}>No unsuspension appeals are pending review</p>
                </div>
              </div>
            ) : (
              <div>
                {appeals.map((appeal, idx) => (
                  <div key={appeal.id} className="px-5 py-5 transition-colors" style={{ borderBottom: '1px solid #ede9e3' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf9f7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Row meta */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded" style={{ color: '#9c9690', background: '#f0ede8', border: '1px solid #ddd8d0' }}>
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[10px]" style={{ color: '#b0a89f' }}>
                        Submitted {new Date(appeal.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: '#f0ede8', border: '1px solid #ddd8d0', color: '#7a7570' }}>
                        <Clock size={9} />
                        Pending
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3 mb-4">
                      {/* Left — group + suspension */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f5f2ee', border: '1px solid #e8e4df' }}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ede9e3', border: '1px solid #ddd8d0', color: '#6b6560' }}>
                            <Lock size={13} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: '#1e1c1a' }}>{appeal.group_name}</p>
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: '#9c9690' }}>
                              Founder: <span className="font-mono" style={{ color: '#7a7570' }}>{appeal.founder_email}</span>
                            </p>
                          </div>
                        </div>

                        {appeal.suspension_reason && (
                          <div className="p-3 rounded-xl" style={{ background: '#f5f2ee', border: '1px solid #e8e4df' }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#a09890' }}>Suspension Reason</p>
                            <p className="text-xs leading-relaxed" style={{ color: '#3a3835' }}>{appeal.suspension_reason}</p>
                            {appeal.suspended_at && (
                              <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: '#b0a89f' }}>
                                <Clock size={9} />
                                {new Date(appeal.suspended_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right — founder's appeal */}
                      <div className="p-3 rounded-xl flex flex-col" style={{ background: '#f5f2ee', border: '1px solid #e8e4df' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#a09890' }}>Founder's Appeal</p>
                        <p className="text-xs leading-relaxed flex-1" style={{ color: '#3a3835' }}>{appeal.appeal_text}</p>
                      </div>
                    </div>

                    {/* Admin note + actions */}
                    <div className="flex gap-3 items-end pt-1">
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: '#a09890' }}>
                          Response note <span className="normal-case font-normal" style={{ color: '#c0b8b0' }}>(visible to founder)</span>
                        </label>
                        <textarea
                          rows={2}
                          value={appealNotes[appeal.id] || ''}
                          onChange={e => setAppealNotes(prev => ({ ...prev, [appeal.id]: e.target.value }))}
                          placeholder="Add a note explaining your decision…"
                          className="w-full rounded-xl px-3 py-2.5 text-xs resize-none focus:outline-none transition-colors leading-relaxed"
                          style={{ background: '#f5f2ee', border: '1px solid #ddd8d0', color: '#3a3835' }}
                          onFocus={e => e.target.style.borderColor = '#b0a89f'}
                          onBlur={e => e.target.style.borderColor = '#ddd8d0'}
                        />
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0 pb-0.5">
                        <button
                          onClick={() => handleAppealAction(appeal.id, 'approve')}
                          disabled={appealActioning === appeal.id}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 whitespace-nowrap min-w-[148px]"
                          style={{ background: '#2c2a27', border: '1px solid #1e1c1a', color: '#f5f2ee' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#1e1c1a'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#2c2a27'; }}
                        >
                          {appealActioning === appeal.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                          Approve & Unsuspend
                        </button>
                        <button
                          onClick={() => handleAppealAction(appeal.id, 'reject')}
                          disabled={appealActioning === appeal.id}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 whitespace-nowrap min-w-[148px]"
                          style={{ background: '#faf9f7', border: '1px solid #ddd8d0', color: '#7a7570' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#ede9e3'; e.currentTarget.style.color = '#3a3835'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#faf9f7'; e.currentTarget.style.color = '#7a7570'; }}
                        >
                          {appealActioning === appeal.id ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={12} />}
                          Reject Appeal
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
