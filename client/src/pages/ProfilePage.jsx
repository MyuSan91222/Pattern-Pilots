import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Send, Clock, CheckCircle, AlertCircle, X, MessageSquare, User, Phone, Camera, Save, MapPin, Link as LinkIcon, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api';

export default function ProfilePage() {
  const location = useLocation();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'contact'
  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    bio: '',
    phone: '',
    location: '',
    social_links: '',
    preferences: '',
    profile_pic_url: '',
  });

  useEffect(() => {
    setAnimateIn(false);
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    fetchAdmins();
    fetchRequests();
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data } = await authApi.getProfile();
      setProfileData({
        first_name: data.user.first_name || '',
        last_name: data.user.last_name || '',
        nickname: data.user.nickname || '',
        bio: data.user.bio || '',
        phone: data.user.phone || '',
        location: data.user.location || '',
        social_links: data.user.social_links || '',
        preferences: data.user.preferences || '',
        profile_pic_url: data.user.profile_pic_url || '',
      });
      if (data.user.profile_pic_url) {
        setPreviewUrl(data.user.profile_pic_url);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
      setProfileData(prev => ({ ...prev, profile_pic_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profileData.first_name.trim() || !profileData.last_name.trim()) {
      toast.error('First and last name are required');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.updateProfile(profileData);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      await loadProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadProfile();
    setPreviewUrl(profileData.profile_pic_url || null);
  };

  const fetchAdmins = async () => {
    try {
      const { data } = await authApi.getAdmins();
      setAdmins(data.admins || []);
    } catch (error) {
      console.error('Failed to load admins:', error);
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium transition-all border-b-2 ${
              activeTab === 'profile'
                ? 'border-b-accent text-accent'
                : 'border-b-transparent text-current text-opacity-60 hover:text-opacity-80'
            }`}
          >
            <div className="flex items-center gap-2">
              <User size={16} />
              Edit Profile
            </div>
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-4 py-2 font-medium transition-all border-b-2 ${
              activeTab === 'contact'
                ? 'border-b-accent text-accent'
                : 'border-b-transparent text-current text-opacity-60 hover:text-opacity-80'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mail size={16} />
              Contact Admin
            </div>
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Profile Picture Card */}
            <div className="card overflow-hidden">
              <div className="relative h-32 bg-gradient-to-r from-accent/20 to-accent/5">
                <div className="absolute -bottom-12 left-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-lg flex items-center justify-center">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={36} className="text-gray-400" />
                      )}
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white shadow-lg hover:bg-accent/90 transition-all"
                      >
                        <Camera size={16} />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-16 px-6 pb-6">
                {!isEditing ? (
                  // View Mode
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-current">
                        {profileData.first_name} {profileData.last_name}
                      </h2>
                      {profileData.nickname && (
                        <p className="text-accent text-sm">@{profileData.nickname}</p>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="text-xs font-semibold text-current text-opacity-60 uppercase tracking-wider">Phone</label>
                        <p className="text-current mt-1">{profileData.phone || '—'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-current text-opacity-60 uppercase tracking-wider">Location</label>
                        <p className="text-current mt-1">{profileData.location || '—'}</p>
                      </div>
                    </div>

                    {profileData.bio && (
                      <div className="mb-6 p-4 rounded-lg bg-accent/5 border border-accent/20">
                        <label className="text-xs font-semibold text-current text-opacity-60 uppercase tracking-wider">Bio</label>
                        <p className="text-current mt-2 leading-relaxed">{profileData.bio}</p>
                      </div>
                    )}

                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-primary w-full"
                    >
                      Edit Profile
                    </button>
                  </div>
                ) : (
                  // Edit Mode
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-current mb-1">First Name *</label>
                        <input
                          type="text"
                          name="first_name"
                          value={profileData.first_name}
                          onChange={handleInputChange}
                          placeholder="John"
                          className="input"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-current mb-1">Last Name *</label>
                        <input
                          type="text"
                          name="last_name"
                          value={profileData.last_name}
                          onChange={handleInputChange}
                          placeholder="Doe"
                          className="input"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-current mb-1">Nickname</label>
                        <input
                          type="text"
                          name="nickname"
                          value={profileData.nickname}
                          onChange={handleInputChange}
                          placeholder="johndoe"
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-current mb-1">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleInputChange}
                          placeholder="+1 (555) 123-4567"
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-current mb-1">Location</label>
                        <input
                          type="text"
                          name="location"
                          value={profileData.location}
                          onChange={handleInputChange}
                          placeholder="San Francisco, CA"
                          className="input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-current mb-1">Bio</label>
                      <textarea
                        name="bio"
                        value={profileData.bio}
                        onChange={handleInputChange}
                        placeholder="Tell us about yourself..."
                        rows="3"
                        className="input resize-none"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="btn-ghost flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact Admin Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* User Info Card */}
            <div className="card p-6">
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

            {/* Send Message to Admin */}
            {user?.role !== 'admin' && (
              <>
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
              </>
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
        )}
      </div>
    </div>
  );
}
