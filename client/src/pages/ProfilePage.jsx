import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Send, Clock, CheckCircle, AlertCircle, X, MessageSquare, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api';

export default function ProfilePage() {
  const location = useLocation();
  const { user } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setAnimateIn(false);
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return; // Only fetch if user is authenticated
    fetchAdmins();
    fetchRequests();
  }, [user]);

  const fetchAdmins = async () => {
    try {
      const { data } = await authApi.getAdmins();
      console.log('Admins fetched:', data);
      setAdmins(data.admins || []);
      if (!data.admins || data.admins.length === 0) {
        console.warn('No admins returned from API');
      }
    } catch (error) {
      console.error('Failed to load admins:', error);
      // Set fallback admins so they're always available
      setAdmins([
        { email: 'adminV11@gmail.com', created_at: new Date().toISOString() },
        { email: 'adminV22@gmail.com', created_at: new Date().toISOString() }
      ]);
    }
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data } = await authApi.getMessageRequests();
      console.log('Requests fetched:', data);
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
      // Don't show error toast for requests - just log and set empty
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!selectedAdmin) {
      toast.error('Please select an admin');
      return;
    }

    setSending(true);
    try {
      await authApi.contactAdmin({ admin_email: selectedAdmin, message: message.trim() || null });
      toast.success('Message request sent to admin!');
      setSelectedAdmin('');
      setMessage('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm('Cancel this message request?')) return;
    try {
      await authApi.cancelMessageRequest(requestId);
      toast.success('Request cancelled');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const formatDateSimple = (isoStr) => {
    if (!isoStr) return 'Unknown';
    try {
      // Handle both snake_case and camelCase
      const dateStr = isoStr;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      console.error('Date parsing error:', e);
      return 'Unknown';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium"><Clock size={12} /> Pending</span>;
      case 'accepted':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium"><CheckCircle size={12} /> Accepted</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium"><AlertCircle size={12} /> Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-all duration-500 ${animateIn ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="animate-in fade-in slide-in-from-top-4">
          <h1 className="text-3xl md:text-4xl font-bold text-current flex items-center gap-3" style={{ fontFamily: 'Syne' }}>
            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <User size={20} className="text-accent" />
            </div>
            My Profile
          </h1>
          <p className="text-current text-opacity-60 mt-2">Manage your profile and communicate with admins</p>
        </div>

        {/* User Info Card */}
        <div className="card p-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center text-white font-bold text-xl">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-current">{user?.email}</h2>
              <p className="text-sm text-current text-opacity-60">Role: <span className="font-medium capitalize">{user?.role}</span></p>
              <p className="text-xs text-current text-opacity-50 mt-1">Member since {formatDateSimple(user?.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Send Message to Admin - Only for regular users */}
        {user?.role !== 'admin' && (
        <div className="card p-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
          <h2 className="text-lg font-semibold text-current mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne' }}>
            <MessageSquare size={18} className="text-accent" />
            Contact an Admin
          </h2>
          <p className="text-sm text-current text-opacity-60 mb-4">Send a message request to an admin. They will receive your request and can respond to engage in conversation.</p>

          {admins.length > 0 ? (
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-current mb-2">Select Admin</label>
                <select
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Choose an admin...</option>
                  {admins.map((admin) => (
                    <option key={admin.email} value={admin.email}>
                      {admin.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-current mb-2">Message (Optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message for the admin (e.g., reason for contacting, topic of interest)..."
                  rows="4"
                  maxLength="500"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
                <p className="text-xs text-current text-opacity-50 mt-1">{message.length}/500 characters</p>
              </div>

              <button
                type="submit"
                disabled={sending || !selectedAdmin}
                className="w-full px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Request
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
              <p className="text-sm text-red-700">No admins available at the moment.</p>
            </div>
          )}
        </div>
        )}

        {/* Message Requests / Incoming Requests for Admins */}
        <div className="card p-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '300ms' }}>
          <h2 className="text-lg font-semibold text-current mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne' }}>
            <Mail size={18} className="text-accent" />
            My Message Requests
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-6">
              {/* Outgoing Requests to Admins */}
              {requests.filter(r => r.type === 'outgoing').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-current mb-3 opacity-75">Sent to Admins</h3>
                  <div className="space-y-3">
                    {requests.filter(r => r.type === 'outgoing').map((req) => (
                      <div key={req.id} className="p-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium text-gray-900">{req.other_email || req.admin_email}</p>
                              {getStatusBadge(req.status)}
                            </div>
                            {req.message && (
                              <p className="text-sm text-gray-700 mb-2 break-words">"{req.message}"</p>
                            )}
                            <p className="text-xs text-gray-500">
                              Sent {formatDate(req.created_at)}
                              {req.responded_at && ` • Responded ${formatDate(req.responded_at)}`}
                            </p>
                          </div>

                          {req.status === 'pending' && (
                            <button
                              onClick={() => handleCancelRequest(req.id)}
                              className="flex-shrink-0 p-2 hover:bg-current hover:bg-opacity-10 rounded-lg transition-colors text-red-500 hover:text-red-600"
                              title="Cancel request"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Incoming Requests from Admins */}
              {requests.filter(r => r.type === 'incoming').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-current mb-3 opacity-75 text-green-600">From Admins</h3>
                  <div className="space-y-3">
                    {requests.filter(r => r.type === 'incoming').map((req) => (
                      <div key={req.id} className="p-4 border border-green-300 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium text-gray-900">{req.other_email || req.admin_email}</p>
                              {getStatusBadge(req.status)}
                            </div>
                            {req.message && (
                              <p className="text-sm text-gray-700 mb-2 break-words">"{req.message}"</p>
                            )}
                            <p className="text-xs text-gray-500">
                              Sent {formatDate(req.created_at)}
                              {req.responded_at && ` • Responded ${formatDate(req.responded_at)}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Mail size={32} className="mx-auto text-current text-opacity-30 mb-3" />
              <p className="text-current text-opacity-60">No message requests yet</p>
              <p className="text-sm text-current text-opacity-50 mt-1">Send your first request above or wait for admin requests!</p>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="card p-6 bg-current bg-opacity-5 border border-current border-opacity-10 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '400ms' }}>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-accent" />
            How It Works
          </h3>
          <ul className="space-y-2 text-sm text-white">
            <li>✓ Select an admin and send a message request</li>
            <li>✓ Your request appears in the admin's dashboard</li>
            <li>✓ When accepted, an automatic message is sent to engage conversation</li>
            <li>✓ You can track the status of your requests here</li>
            <li>✓ Cancel pending requests anytime</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
