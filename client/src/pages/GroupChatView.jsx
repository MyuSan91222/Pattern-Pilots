import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Plus, Search, Send, Paperclip, Smile, MoreVertical,
  Pin, Reply, Edit2, Trash2, BellOff, Bell, UserPlus, Crown,
  Shield, LogOut, Copy, Link, X, Check, ChevronDown, ChevronLeft,
  ImageIcon, FileText as FileIcon, Settings, Hash,
  Globe, Lock, Compass, UserCheck, UserX, Video, VideoOff, PhoneOff,
  AlertTriangle, Download, RefreshCw, ArrowRightLeft, FileDown,
  ClipboardList, CheckCircle, Clock, XCircle, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { gcApi } from '../api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api$/, '');

const EMOJI_LIST = ['👍','❤️','😂','😮','😢','😡','🔥','✅','👏','🎉','🙏','💯'];
const AVATAR_COLORS = ['#1e3a6e','#145a45','#7c1d38','#1a3a8f','#5b1f78','#7c3d00','#0e4d4d','#8b2500'];

function getInitial(email) { return (email?.[0] ?? '?').toUpperCase(); }
function getAvatarColor(email) {
  let hash = 0;
  for (const c of (email || '')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function shortEmail(email) {
  if (!email) return '?';
  return email.split('@')[0];
}
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ email, size = 32, ring = false }) {
  const color = getAvatarColor(email);
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white flex-shrink-0 ${ring ? 'ring-2 ring-offset-1 ring-offset-ink-950' : ''}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.4, ringColor: color }}
    >
      {getInitial(email)}
    </div>
  );
}

// ── RoleBadge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  if (role === 'owner') return <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold"><Crown size={8} />Owner</span>;
  if (role === 'admin') return <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold"><Shield size={8} />Admin</span>;
  return null;
}

// ── Create Group Modal ─────────────────────────────────────────────────────────
function CreateGroupModal({ currentUser, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      gcApi.getAllUsers().then(r => setAllUsers(r.data.users || [])).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && searchQ.trim().length < 2) { setSearchResults([]); return; }
    if (isAdmin) return;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await gcApi.searchUsers(searchQ);
        setSearchResults(data.users || []);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, isAdmin]);

  const toggle = (email) => {
    setSelectedEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Group name required'); return; }
    setLoading(true);
    try {
      const { data } = await gcApi.createGroup({ name, description, members: selectedEmails, avatar_color: avatarColor, is_public: isPublic ? 1 : 0 });
      toast.success(`Group "${name}" created!`);
      onCreated(data.group);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const displayList = isAdmin ? allUsers : searchResults;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ink-800">
          <h2 className="text-lg font-bold text-ink-50">Create Group Chat</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-800 text-ink-400"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Avatar color picker */}
          <div>
            <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 block">Group Color</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${avatarColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Name & description */}
          <div>
            <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5 block">Group Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Lost Keys Squad"
              className="w-full bg-ink-800 border border-ink-700 rounded-xl px-4 py-2.5 text-ink-100 placeholder-ink-500 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5 block">Description (optional)</label>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What's this group about?"
              className="w-full bg-ink-800 border border-ink-700 rounded-xl px-4 py-2.5 text-ink-100 placeholder-ink-500 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {/* Visibility toggle */}
          <div>
            <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 block">Visibility</label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${isPublic ? 'border-accent bg-accent/15' : 'border-ink-700 hover:border-ink-600'}`}
              >
                <Globe size={15} className={isPublic ? 'text-accent' : 'text-ink-500'} />
                <div>
                  <p className={`text-xs font-semibold ${isPublic ? 'text-accent' : 'text-ink-300'}`}>Public</p>
                  <p className="text-[10px] text-ink-500">Searchable · anyone can join</p>
                </div>
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${!isPublic ? 'border-accent bg-accent/15' : 'border-ink-700 hover:border-ink-600'}`}
              >
                <Lock size={15} className={!isPublic ? 'text-accent' : 'text-ink-500'} />
                <div>
                  <p className={`text-xs font-semibold ${!isPublic ? 'text-accent' : 'text-ink-300'}`}>Private</p>
                  <p className="text-[10px] text-ink-500">Hidden · requires approval</p>
                </div>
              </button>
            </div>
          </div>

          {/* Member selection */}
          <div>
            <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5 block">
              {isAdmin ? 'Select Members (Admin View)' : 'Search Members'}
            </label>
            {!isAdmin && (
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Type email to search users..."
                  className="w-full bg-ink-800 border border-ink-700 rounded-xl pl-9 pr-4 py-2.5 text-ink-100 placeholder-ink-500 text-sm focus:outline-none focus:border-accent"
                />
              </div>
            )}

            {/* Selected badges */}
            {selectedEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedEmails.map(e => (
                  <span key={e} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/20 text-accent text-xs font-medium">
                    {shortEmail(e)}
                    <button onClick={() => toggle(e)}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}

            {/* User list */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {searching && <p className="text-xs text-ink-500 text-center py-2">Searching...</p>}
              {!searching && displayList.length === 0 && (
                <p className="text-xs text-ink-500 text-center py-3">
                  {isAdmin ? 'No other users registered' : (searchQ.length >= 2 ? 'No users found' : 'Type at least 2 characters to search')}
                </p>
              )}
              {displayList.map(u => (
                <button
                  key={u.email}
                  onClick={() => toggle(u.email)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    selectedEmails.includes(u.email)
                      ? 'bg-accent/15 border border-accent/30'
                      : 'hover:bg-ink-800 border border-transparent'
                  }`}
                >
                  <Avatar email={u.email} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-100 truncate">{u.email}</p>
                    {u.role === 'admin' && <p className="text-[10px] text-amber-400">Admin</p>}
                  </div>
                  {selectedEmails.includes(u.email) && <Check size={14} className="text-accent flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-ink-800 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-ink-700 text-ink-300 text-sm hover:bg-ink-800 transition-all">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating…' : `Create Group${selectedEmails.length ? ` (${selectedEmails.length + 1})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Join by Link Modal ─────────────────────────────────────────────────────────
function JoinLinkModal({ onClose, onJoined }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const t = token.trim();
    if (!t) return;
    // Accept full URL or just token
    const extracted = t.includes('/') ? t.split('/').pop() : t;
    setLoading(true);
    try {
      const { data } = await gcApi.joinByToken(extracted);
      if (data.pending) {
        toast(`Request sent to "${data.group_name}" — waiting for approval`, { icon: '🔒' });
        onClose();
      } else if (data.already_member) {
        toast('You are already in this group!');
        onJoined(data.group_id);
        onClose();
      } else {
        toast.success(`Joined "${data.group_name}"!`);
        onJoined(data.group_id);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid invite link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-ink-800">
          <h2 className="text-base font-bold text-ink-50">Join via Invite Link</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-800 text-ink-400"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5 block">Invite Token or URL</label>
            <input
              value={token} onChange={e => setToken(e.target.value)}
              placeholder="Paste invite link or token..."
              className="w-full bg-ink-800 border border-ink-700 rounded-xl px-4 py-2.5 text-ink-100 placeholder-ink-500 text-sm focus:outline-none focus:border-accent"
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-ink-700 text-ink-300 text-sm hover:bg-ink-800 transition-all">Cancel</button>
            <button onClick={handleJoin} disabled={loading || !token.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? 'Joining…' : 'Join Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Member Panel ───────────────────────────────────────────────────────────────
function MemberPanel({ group, currentUser, onAddMember, onRemoveMember, onChangeRole, onClose }) {
  const [addEmail, setAddEmail] = useState('');
  const [addResults, setAddResults] = useState([]);
  const myRole = group?.my_role;
  const canManage = myRole === 'owner' || myRole === 'admin';

  useEffect(() => {
    if (addEmail.trim().length < 2) { setAddResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await gcApi.searchUsers(addEmail);
        const memberEmails = new Set((group?.members || []).map(m => m.user_email));
        setAddResults((data.users || []).filter(u => !memberEmails.has(u.email)));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [addEmail, group?.members]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-ink-800">
        <h3 className="font-semibold text-ink-100 text-sm">Members ({group?.members?.length ?? 0})</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-ink-800 text-ink-400"><X size={14} /></button>
      </div>

      {/* Add member search (admin/owner) */}
      {canManage && (
        <div className="p-3 border-b border-ink-800">
          <div className="relative">
            <UserPlus size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={addEmail} onChange={e => setAddEmail(e.target.value)}
              placeholder="Add member by email..."
              className="w-full bg-ink-800 border border-ink-700 rounded-lg pl-8 pr-3 py-2 text-ink-100 placeholder-ink-500 text-xs focus:outline-none focus:border-accent"
            />
          </div>
          {addResults.length > 0 && (
            <div className="mt-1 space-y-1">
              {addResults.slice(0, 5).map(u => (
                <button
                  key={u.email}
                  onClick={() => { onAddMember(u.email); setAddEmail(''); setAddResults([]); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink-800 text-left"
                >
                  <Avatar email={u.email} size={24} />
                  <span className="text-xs text-ink-200 truncate">{u.email}</span>
                  <Plus size={11} className="text-accent flex-shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Member list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {(group?.members || []).map(m => (
          <div key={m.user_email} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-ink-800/50 group">
            <Avatar email={m.user_email} size={30} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-200 truncate">{shortEmail(m.user_email)}</p>
              <p className="text-[10px] text-ink-500 truncate">{m.user_email}</p>
            </div>
            <div className="flex items-center gap-1">
              <RoleBadge role={m.role} />
              {canManage && m.user_email !== currentUser?.email && m.role !== 'owner' && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {myRole === 'owner' && (
                    <button
                      onClick={() => onChangeRole(m.user_email, m.role === 'admin' ? 'member' : 'admin')}
                      className="p-1 rounded hover:bg-ink-700 text-ink-400 hover:text-accent"
                      title={m.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                    >
                      <Shield size={11} />
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveMember(m.user_email)}
                    className="p-1 rounded hover:bg-red-500/20 text-ink-400 hover:text-red-400"
                    title="Remove member"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pins Panel ─────────────────────────────────────────────────────────────────
function PinsPanel({ pins, onClose, canUnpin, onUnpin, groupId }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-ink-800">
        <h3 className="font-semibold text-ink-100 text-sm flex items-center gap-2"><Pin size={14} className="text-accent" />Pinned Messages ({pins.length})</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-ink-800 text-ink-400"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pins.length === 0 && <p className="text-xs text-ink-500 text-center py-4">No pinned messages</p>}
        {pins.map(pin => (
          <div key={pin.id} className="bg-ink-800/60 rounded-xl p-3 border border-ink-700/50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar email={pin.msg_sender} size={22} />
                <span className="text-[11px] font-semibold text-ink-300">{shortEmail(pin.msg_sender)}</span>
                <span className="text-[10px] text-ink-600">{formatTime(pin.msg_created_at)}</span>
              </div>
              {canUnpin && (
                <button onClick={() => onUnpin(groupId, pin.message_id)} className="p-1 rounded hover:bg-ink-700 text-ink-500 hover:text-red-400 flex-shrink-0">
                  <X size={12} />
                </button>
              )}
            </div>
            <p className="text-sm text-ink-200 line-clamp-3">{pin.message_text || '[File attachment]'}</p>
            <p className="text-[10px] text-ink-600 mt-1.5">Pinned by {shortEmail(pin.pinned_by)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Join Requests Panel ────────────────────────────────────────────────────────
function JoinRequestsPanel({ groupId, onClose, onApprove, onReject, requests, loading }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-ink-800">
        <h3 className="font-semibold text-ink-100 text-sm flex items-center gap-2">
          <UserCheck size={14} className="text-accent" />
          Pending Requests ({requests.length})
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-ink-800 text-ink-400"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && <p className="text-xs text-ink-500 text-center py-4">Loading…</p>}
        {!loading && requests.length === 0 && (
          <p className="text-xs text-ink-500 text-center py-6">No pending requests</p>
        )}
        {requests.map(r => (
          <div key={r.id} className="bg-ink-800/60 rounded-xl p-3 border border-ink-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Avatar email={r.requester_email} size={28} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink-200 truncate">{shortEmail(r.requester_email)}</p>
                <p className="text-[10px] text-ink-500 truncate">{r.requester_email}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onApprove(r.id)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-semibold transition-all"
              >
                <UserCheck size={11} />Approve
              </button>
              <button
                onClick={() => onReject(r.id)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all"
              >
                <UserX size={11} />Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Discover Panel (left sidebar overlay) ─────────────────────────────────────
function DiscoverPanel({ currentUser, onClose, onJoined }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await gcApi.discoverGroups(q);
        setResults(data.groups || []);
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const handleJoin = async (group) => {
    setJoiningId(group.id);
    try {
      await gcApi.joinPublicGroup(group.id);
      toast.success(`Joined "${group.name}"!`);
      onJoined(group.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-ink-800/60">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink-100 flex items-center gap-2">
            <Compass size={14} className="text-accent" />Discover Groups
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-ink-800 text-ink-400"><X size={14} /></button>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search public groups…"
            className="w-full bg-ink-800 border border-ink-700 rounded-xl pl-8 pr-3 py-2 text-ink-100 placeholder-ink-500 text-xs focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {loading && <div className="text-center py-6 text-xs text-ink-500">Loading…</div>}
        {!loading && results.length === 0 && (
          <div className="text-center px-4 py-6">
            <Globe size={24} className="mx-auto text-ink-700 mb-2" />
            <p className="text-xs text-ink-500">{q ? 'No public groups found' : 'No public groups to discover'}</p>
          </div>
        )}
        {results.map(g => (
          <div key={g.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-ink-800/50 transition-all">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ background: g.avatar_color || '#1e3a6e' }}
            >
              {g.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink-100 truncate">{g.name}</p>
              <p className="text-[10px] text-ink-500">{g.member_count} member{g.member_count !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => handleJoin(g)}
              disabled={joiningId === g.id}
              className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-[10px] font-bold hover:opacity-90 transition-all disabled:opacity-50 flex-shrink-0"
            >
              {joiningId === g.id ? '…' : 'Join'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Video Call Modal ───────────────────────────────────────────────────────────
function VideoCallModal({ group, currentUser, onClose }) {
  // Build a stable, group-unique room name from ID + first 8 chars of invite token
  const slug = `pp-${group.id}-${(group.invite_token || String(group.id)).slice(0, 10)}`;
  // Jitsi room names must be URL-safe alphanumeric + hyphens
  const roomName = slug.replace(/[^a-z0-9-]/gi, '-');
  const displayName = encodeURIComponent((currentUser?.email || '').split('@')[0]);

  const jitsiSrc = `https://meet.jit.si/${roomName}#userInfo.displayName="${displayName}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-ink-950 border-b border-ink-800 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
          style={{ background: group.avatar_color || '#1e3a6e' }}
        >
          {group.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-100 truncate">{group.name}</p>
          <p className="text-[10px] text-ink-500">Video meeting via Jitsi Meet · open to group members</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(`https://meet.jit.si/${roomName}`); toast.success('Room link copied!'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-800 border border-ink-700 text-ink-300 hover:bg-ink-700 text-xs transition-all"
            title="Copy room link"
          >
            <Copy size={12} />Copy link
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-xs font-semibold transition-all"
          >
            <PhoneOff size={12} />End Call
          </button>
        </div>
      </div>

      {/* Jitsi iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={jitsiSrc}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Video Call"
        />
      </div>
    </div>
  );
}

// ── Emoji Picker ───────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-full mb-1 right-0 z-20 bg-ink-800 border border-ink-700 rounded-xl p-2 shadow-xl flex flex-wrap gap-1 w-44">
      {EMOJI_LIST.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }} className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-ink-700">
          {e}
        </button>
      ))}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, currentUser, myRole, groupId, readReceipts, onReply, onEdit, onDelete, onPin, onReact, allMessages }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text);
  const menuRef = useRef(null);

  const isMine = msg.is_mine;
  const canManage = myRole === 'owner' || myRole === 'admin';

  // Group reactions by emoji
  const reactionMap = {};
  (msg.reactions || []).forEach(r => {
    if (!reactionMap[r.emoji]) reactionMap[r.emoji] = [];
    reactionMap[r.emoji].push(r.user_email);
  });

  // Who has read up to this message
  const readers = Object.entries(readReceipts)
    .filter(([email, msgId]) => msgId >= msg.id && email !== currentUser?.email)
    .map(([email]) => email);

  const isImage = msg.file_type?.startsWith('image/');

  const handleEditSave = async () => {
    if (!editText.trim()) return;
    try {
      await onEdit(msg.id, editText);
      setEditing(false);
    } catch {}
  };

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const replyTarget = msg.reply_to ? allMessages?.find(m => m.id === msg.reply_to.id) : null;

  return (
    <div className={`flex gap-2.5 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && <Avatar email={msg.sender_email} size={28} />}

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {/* Sender name (others only) */}
        {!isMine && (
          <span className="text-[10px] font-semibold mb-1 ml-1" style={{ color: getAvatarColor(msg.sender_email) }}>
            {shortEmail(msg.sender_email)}
          </span>
        )}

        {/* Reply preview */}
        {msg.reply_to && (
          <div className={`flex items-center gap-2 mb-1 px-3 py-1.5 rounded-lg bg-ink-800/60 border-l-2 border-accent/60 text-[11px] text-ink-400 max-w-full ${isMine ? 'mr-0' : ''}`}>
            <Reply size={10} className="text-accent flex-shrink-0" />
            <span className="font-semibold text-accent/80">{shortEmail(msg.reply_to.sender_email)}</span>
            <span className="truncate">{msg.reply_to.text}</span>
          </div>
        )}

        {/* Bubble */}
        <div className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          msg.is_deleted
            ? 'bg-ink-800/40 text-ink-500 italic border border-ink-700/30'
            : isMine
              ? 'bg-accent text-white'
              : 'bg-ink-800 text-ink-100'
        } ${isMine ? 'rounded-tr-md' : 'rounded-tl-md'}`}>

          {/* File attachment */}
          {!msg.is_deleted && msg.file_path && (
            <div className="mb-2">
              {isImage ? (
                <a href={`${API_BASE}/api/lostfound${msg.file_path}`} target="_blank" rel="noreferrer">
                  <img src={`${API_BASE}/api/lostfound${msg.file_path}`} alt={msg.file_name} className="max-w-[200px] rounded-lg object-cover" />
                </a>
              ) : (
                <a href={`${API_BASE}/api/lostfound${msg.file_path}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all">
                  <FileIcon size={14} />
                  <span className="text-xs truncate max-w-[150px]">{msg.file_name}</span>
                </a>
              )}
            </div>
          )}

          {/* Editing input */}
          {editing ? (
            <div className="flex gap-2 items-center">
              <input
                value={editText} onChange={e => setEditText(e.target.value)}
                className="bg-transparent border-b border-white/40 focus:outline-none text-sm flex-1 min-w-0"
                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
              />
              <button onClick={handleEditSave} className="text-xs underline opacity-70 hover:opacity-100">Save</button>
              <button onClick={() => setEditing(false)} className="text-xs opacity-70 hover:opacity-100">×</button>
            </div>
          ) : (
            <span className={msg.is_deleted ? '' : ''}>{msg.text}</span>
          )}

          {/* Edited tag */}
          {msg.is_edited && !msg.is_deleted && (
            <span className="text-[9px] opacity-50 ml-1">(edited)</span>
          )}

          {/* Hover actions */}
          {!msg.is_deleted && (
            <div className={`absolute top-1 ${isMine ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <div className="relative">
                <button onClick={() => setShowEmoji(v => !v)} className="p-1 rounded-lg bg-ink-800 border border-ink-700 text-ink-400 hover:text-ink-100">
                  <Smile size={12} />
                </button>
                {showEmoji && <EmojiPicker onSelect={e => onReact(msg.id, e)} onClose={() => setShowEmoji(false)} />}
              </div>
              <button onClick={() => onReply(msg)} className="p-1 rounded-lg bg-ink-800 border border-ink-700 text-ink-400 hover:text-ink-100">
                <Reply size={12} />
              </button>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(v => !v)} className="p-1 rounded-lg bg-ink-800 border border-ink-700 text-ink-400 hover:text-ink-100">
                  <MoreVertical size={12} />
                </button>
                {showMenu && (
                  <div className={`absolute ${isMine ? 'right-0' : 'left-0'} top-full mt-1 z-30 bg-ink-900 border border-ink-700 rounded-xl shadow-xl py-1 w-36`}>
                    {isMine && (
                      <button onClick={() => { setEditing(true); setEditText(msg.text); setShowMenu(false); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100">
                        <Edit2 size={11} />Edit
                      </button>
                    )}
                    {canManage && (
                      <button onClick={() => { onPin(groupId, msg.id); setShowMenu(false); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100">
                        <Pin size={11} />Pin Message
                      </button>
                    )}
                    {(isMine || canManage) && (
                      <button onClick={() => { onDelete(msg.id); setShowMenu(false); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                        <Trash2 size={11} />Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactionMap).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                title={users.map(shortEmail).join(', ')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition-all ${
                  users.includes(currentUser?.email)
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'bg-ink-800/60 border-ink-700/50 text-ink-300 hover:border-ink-600'
                }`}
              >
                {emoji} <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp + read receipts */}
        <div className={`flex items-center gap-1.5 mt-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-[9px] text-ink-600">{formatTime(msg.created_at)}</span>
          {isMine && readers.length > 0 && (
            <div className="flex -space-x-1">
              {readers.slice(0, 3).map(email => (
                <div key={email} className="w-3 h-3 rounded-full border border-ink-900" style={{ background: getAvatarColor(email) }} title={email} />
              ))}
              {readers.length > 3 && <span className="text-[8px] text-ink-600">+{readers.length - 3}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Suspension Warning Modal ───────────────────────────────────────────────────
function SuspensionWarningModal({ group, isOwner, onNotice, onLearnMore }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-ink-900 border border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Red header banner */}
        <div className="bg-red-500/15 border-b border-red-500/30 px-6 py-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-red-400 leading-tight">Group Suspended</h2>
            <p className="text-xs text-ink-400 mt-1">This group has been suspended by a platform administrator.</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Group info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/60 border border-ink-700/50">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ background: group.avatar_color || '#1e3a6e' }}>
              {(group.name?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-100 truncate">{group.name}</p>
              <p className="text-[11px] text-ink-500">{isOwner ? 'You are the founder of this group' : 'You are a member of this group'}</p>
            </div>
          </div>

          {/* Reason */}
          {group.suspension_reason && (
            <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20">
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">Reason given</p>
              <p className="text-xs text-ink-300 leading-relaxed">{group.suspension_reason}</p>
            </div>
          )}

          <p className="text-xs text-ink-400 leading-relaxed">
            {isOwner
              ? 'As the founder, you can submit an unsuspension appeal, review suspension details, export your group data, or transfer ownership before leaving.'
              : 'You can review suspension details, export your group data, or leave the group.'}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onNotice}
            className="flex-1 px-4 py-2.5 rounded-xl border border-ink-600 text-ink-400 text-sm font-medium hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-all"
          >
            Notice
          </button>
          <button
            onClick={onLearnMore}
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all"
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Learn More / Suspension Action Center ─────────────────────────────────────
function SuspensionLearnMoreModal({ group, currentUser, isOwner, onClose, onLeft }) {
  const [activeTab, setActiveTab] = useState('details');
  const [appealText, setAppealText] = useState('');
  const [existingAppeal, setExistingAppeal] = useState(null);
  const [appealLoading, setAppealLoading] = useState(false);
  const [appealFetching, setAppealFetching] = useState(true);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferSearch, setTransferSearch] = useState([]);
  const [transferSearchQ, setTransferSearchQ] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  // Load existing appeal on mount
  useEffect(() => {
    setAppealFetching(true);
    gcApi.getAppeal(group.id)
      .then(r => setExistingAppeal(r.data.appeal))
      .catch(() => {})
      .finally(() => setAppealFetching(false));
  }, [group.id]);

  // Search members for transfer
  useEffect(() => {
    if (transferSearchQ.trim().length < 2) { setTransferSearch([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await gcApi.getGroup(group.id);
        const filtered = (data.group?.members || []).filter(
          m => m.user_email !== currentUser?.email &&
               m.user_email.toLowerCase().includes(transferSearchQ.toLowerCase())
        );
        setTransferSearch(filtered);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [transferSearchQ, group.id, currentUser?.email]);

  const handleSubmitAppeal = async () => {
    if (!appealText.trim()) { toast.error('Please write your appeal message'); return; }
    setAppealLoading(true);
    try {
      await gcApi.submitAppeal(group.id, appealText.trim());
      const { data } = await gcApi.getAppeal(group.id);
      setExistingAppeal(data.appeal);
      setAppealText('');
      toast.success('Appeal submitted — admins will review it');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit appeal');
    } finally {
      setAppealLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferEmail) { toast.error('Select a member to transfer ownership to'); return; }
    setTransferLoading(true);
    try {
      await gcApi.transferOwner(group.id, transferEmail);
      toast.success(`Ownership transferred to ${transferEmail.split('@')[0]}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to transfer ownership');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const { data } = await gcApi.exportGroup(group.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `group_${group.id}_${group.name?.replace(/\s+/g, '_')}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Group data exported');
    } catch {
      toast.error('Failed to export group data');
    } finally {
      setExportLoading(false);
    }
  };

  const handleLeaveAndAbandon = async () => {
    if (!window.confirm(`Leave and abandon "${group.name}"? This cannot be undone.`)) return;
    setLeaveLoading(true);
    try {
      await gcApi.leaveGroup(group.id);
      toast.success('You have left the group');
      onLeft();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave group');
    } finally {
      setLeaveLoading(false);
    }
  };

  const appealStatusIcon = {
    pending:  <Clock size={13} className="text-amber-400" />,
    approved: <CheckCircle size={13} className="text-green-400" />,
    rejected: <XCircle size={13} className="text-red-400" />,
  };
  const appealStatusColor = {
    pending:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
    approved: 'text-green-400 bg-green-400/10 border-green-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  const TABS = [
    { id: 'details',  label: 'Details',  icon: <ClipboardList size={13} /> },
    ...(isOwner ? [{ id: 'appeal', label: 'Appeal', icon: <MessageSquare size={13} /> }] : []),
    { id: 'export',   label: 'Export',   icon: <FileDown size={13} /> },
    ...(isOwner ? [{ id: 'transfer', label: 'Transfer', icon: <ArrowRightLeft size={13} /> }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
              <AlertTriangle size={15} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-100">Suspension Center</h2>
              <p className="text-[10px] text-ink-500 truncate max-w-[240px]">{group.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-800 text-ink-400"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-ink-800/60">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-ink-500 hover:text-ink-300'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Details Tab ── */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-500/8 border border-red-500/20 space-y-3">
                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Suspension Details</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Status</span>
                    <span className="font-semibold text-red-400 flex items-center gap-1"><AlertTriangle size={11} />Suspended</span>
                  </div>
                  {group.suspension_reason && (
                    <div className="flex justify-between gap-4">
                      <span className="text-ink-500 flex-shrink-0">Reason</span>
                      <span className="text-ink-300 text-right">{group.suspension_reason}</span>
                    </div>
                  )}
                  {group.suspended_by && (
                    <div className="flex justify-between">
                      <span className="text-ink-500">Suspended by</span>
                      <span className="text-ink-300">{group.suspended_by.split('@')[0]}</span>
                    </div>
                  )}
                  {group.suspended_at && (
                    <div className="flex justify-between">
                      <span className="text-ink-500">Suspended on</span>
                      <span className="text-ink-300">{new Date(group.suspended_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-ink-800/50 border border-ink-700/50 space-y-2">
                <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">What can you do?</p>
                <ul className="space-y-2 text-xs text-ink-400">
                  {isOwner && <li className="flex items-start gap-2"><MessageSquare size={12} className="text-accent mt-0.5 flex-shrink-0" /><span><strong className="text-ink-300">Appeal</strong> — Submit a formal unsuspension request to administrators</span></li>}
                  <li className="flex items-start gap-2"><FileDown size={12} className="text-accent mt-0.5 flex-shrink-0" /><span><strong className="text-ink-300">Export</strong> — Download all messages and member data as JSON</span></li>
                  {isOwner && <li className="flex items-start gap-2"><ArrowRightLeft size={12} className="text-accent mt-0.5 flex-shrink-0" /><span><strong className="text-ink-300">Transfer</strong> — Hand off ownership to another member</span></li>}
                  <li className="flex items-start gap-2"><LogOut size={12} className="text-red-400 mt-0.5 flex-shrink-0" /><span><strong className="text-ink-300">Leave</strong> — {isOwner ? 'Abandon the group as founder' : 'Leave this group'}</span></li>
                </ul>
              </div>

              {/* Leave button */}
              <div className="pt-1">
                <button
                  onClick={handleLeaveAndAbandon}
                  disabled={leaveLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-all disabled:opacity-50"
                >
                  {leaveLoading ? <RefreshCw size={14} className="animate-spin" /> : <LogOut size={14} />}
                  {isOwner ? 'Leave & Abandon Group' : 'Leave Group'}
                </button>
              </div>
            </div>
          )}

          {/* ── Appeal Tab ── */}
          {activeTab === 'appeal' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-ink-800/60 border border-ink-700/50 text-xs text-ink-400 leading-relaxed">
                Write a clear and professional appeal explaining why this group should be unsuspended. Admins will review it and respond.
              </div>

              {appealFetching ? (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw size={16} className="animate-spin text-ink-500" />
                </div>
              ) : existingAppeal ? (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${appealStatusColor[existingAppeal.status] || 'text-ink-400 bg-ink-800 border-ink-700'}`}>
                    {appealStatusIcon[existingAppeal.status]}
                    Appeal {existingAppeal.status.charAt(0).toUpperCase() + existingAppeal.status.slice(1)}
                    <span className="ml-auto font-normal text-ink-500">
                      {new Date(existingAppeal.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-ink-800/50 border border-ink-700/50">
                    <p className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">Your appeal</p>
                    <p className="text-xs text-ink-300 leading-relaxed">{existingAppeal.appeal_text}</p>
                  </div>
                  {existingAppeal.admin_note && (
                    <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/20">
                      <p className="text-[10px] text-blue-400 mb-1 uppercase tracking-wider">Admin response</p>
                      <p className="text-xs text-ink-300 leading-relaxed">{existingAppeal.admin_note}</p>
                      {existingAppeal.reviewed_by && (
                        <p className="text-[10px] text-ink-500 mt-1">Reviewed by {existingAppeal.reviewed_by.split('@')[0]}</p>
                      )}
                    </div>
                  )}
                  {existingAppeal.status === 'rejected' && (
                    <button
                      onClick={() => setExistingAppeal(null)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-ink-300 text-sm hover:bg-ink-700 transition-all"
                    >
                      <RefreshCw size={13} />Submit New Appeal
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={appealText}
                    onChange={e => setAppealText(e.target.value)}
                    rows={5}
                    maxLength={1000}
                    placeholder="Explain why this group should be unsuspended. Be specific and professional — mention how you'll address the issue that led to the suspension."
                    className="w-full bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 text-ink-100 placeholder-ink-500 text-sm resize-none focus:outline-none focus:border-accent leading-relaxed"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-ink-500">{appealText.length}/1000</span>
                    <button
                      onClick={handleSubmitAppeal}
                      disabled={appealLoading || !appealText.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
                    >
                      {appealLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                      Submit Appeal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Export Tab ── */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-ink-800/60 border border-ink-700/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-accent" />
                  <p className="text-sm font-semibold text-ink-200">Export Group Data</p>
                </div>
                <p className="text-xs text-ink-400 leading-relaxed">
                  Download a complete JSON archive of your group including all messages, member list, suspension details, and group metadata.
                </p>
                <ul className="space-y-1.5 text-xs text-ink-500">
                  {['All chat messages (with timestamps)', 'Full member roster and roles', 'Group metadata and settings', 'Suspension details and reason'].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <Check size={11} className="text-green-400 flex-shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all disabled:opacity-50"
              >
                {exportLoading ? <RefreshCw size={15} className="animate-spin" /> : <FileDown size={15} />}
                {exportLoading ? 'Preparing export…' : 'Download Group Archive (.json)'}
              </button>
              <p className="text-[10px] text-ink-600 text-center">Your data is exported as a JSON file you can keep locally.</p>
            </div>
          )}

          {/* ── Transfer Ownership Tab ── */}
          {activeTab === 'transfer' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
                Transfer the founder role to another member. You will become a regular member. This is useful if you want to step back while keeping the group alive.
              </div>

              <div>
                <label className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider mb-1.5 block">Search members</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input
                    value={transferSearchQ}
                    onChange={e => { setTransferSearchQ(e.target.value); setTransferEmail(''); }}
                    placeholder="Type member email…"
                    className="w-full bg-ink-800 border border-ink-700 rounded-xl pl-9 pr-4 py-2.5 text-ink-100 placeholder-ink-500 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {transferEmail && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent/10 border border-accent/30">
                  <Avatar email={transferEmail} size={28} />
                  <p className="text-sm text-accent font-medium flex-1 truncate">{transferEmail}</p>
                  <button onClick={() => setTransferEmail('')}><X size={14} className="text-ink-500" /></button>
                </div>
              )}

              {transferSearch.length > 0 && !transferEmail && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {transferSearch.map(m => (
                    <button
                      key={m.user_email}
                      onClick={() => { setTransferEmail(m.user_email); setTransferSearch([]); setTransferSearchQ(m.user_email); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink-800 border border-transparent transition-all text-left"
                    >
                      <Avatar email={m.user_email} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink-200 truncate">{m.user_email}</p>
                        <RoleBadge role={m.role} />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleTransfer}
                disabled={transferLoading || !transferEmail}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-500/90 transition-all disabled:opacity-50"
              >
                {transferLoading ? <RefreshCw size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
                Transfer Ownership
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Main GroupChatView ─────────────────────────────────────────────────────────
export default function GroupChatView({ currentUser }) {
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null); // includes members, my_role
  const [messages, setMessages] = useState([]);
  const [pins, setPins] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [readReceipts, setReadReceipts] = useState({}); // email -> last_read_msg_id
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Input
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  // Search
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Panels
  const [showMembers, setShowMembers] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Join requests state (for private group owners)
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinLink, setShowJoinLink] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);

  // Suspension modals (for group founder)
  const [suspendedGroupData, setSuspendedGroupData] = useState(null); // group object when suspended warning fires
  const [showSuspensionWarning, setShowSuspensionWarning] = useState(false);
  const [showSuspensionLearnMore, setShowSuspensionLearnMore] = useState(false);

  const handleEndVideoCall = useCallback(async () => {
    setShowVideoCall(false);
    if (!activeGroupId) return;
    try {
      const { data } = await gcApi.sendMessage(activeGroupId, { text: '📹 Video call ended' });
      setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]);
    } catch {}
  }, [activeGroupId]);

  // Typing debounce
  const typingTimerRef = useRef(null);
  const pollingRef = useRef({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  const myRole = activeGroup?.my_role;
  const canManage = myRole === 'owner' || myRole === 'admin';

  // ── Load groups ──────────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    try {
      const { data } = await gcApi.getGroups();
      setGroups(data.groups || []);
    } catch (err) {
      if (err.response?.status !== 401) console.error('[GC] loadGroups error:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // Poll group list every 5 seconds
  useEffect(() => {
    const id = setInterval(loadGroups, 5000);
    pollingRef.current.groups = id;
    return () => clearInterval(id);
  }, [loadGroups]);

  // ── Select group ─────────────────────────────────────────────────────────────
  const selectGroup = useCallback(async (groupId) => {
    if (groupId === activeGroupId) return;
    setActiveGroupId(groupId);
    setMessages([]);
    setPins([]);
    setTypingUsers([]);
    setReadReceipts({});
    setShowMembers(false);
    setShowPins(false);
    setShowSearch(false);
    setSearchQ('');
    setReplyingTo(null);
    setShowMoreMenu(false);
    setLoadingMsgs(true);

    try {
      const [groupRes, msgsRes, pinsRes] = await Promise.all([
        gcApi.getGroup(groupId),
        gcApi.getMessages(groupId),
        gcApi.getPins(groupId),
      ]);
      const grp = groupRes.data.group;

      // If group is suspended → show warning modal for all members
      if (grp.is_suspended) {
        setSuspendedGroupData(grp);
        setShowSuspensionWarning(true);
        setActiveGroupId(null);
        setLoadingMsgs(false);
        return;
      }

      setActiveGroup(grp);
      setMessages(msgsRes.data.messages || []);
      setPins(pinsRes.data.pins || []);
    } catch (err) {
      toast.error('Failed to load group');
    } finally {
      setLoadingMsgs(false);
    }
  }, [activeGroupId]);

  // ── Auto-scroll to bottom ────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Mark messages as read ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeGroupId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    gcApi.markRead(activeGroupId, lastMsg.id).catch(() => {});
  }, [activeGroupId, messages]);

  // ── Poll messages, typing, read receipts ─────────────────────────────────────
  useEffect(() => {
    if (!activeGroupId) return;

    const pollMsgs = async () => {
      try {
        const { data } = await gcApi.getMessages(activeGroupId);
        setMessages(data.messages || []);
      } catch {}
    };

    const pollTyping = async () => {
      try {
        const { data } = await gcApi.getTyping(activeGroupId);
        setTypingUsers(data.typing || []);
      } catch {}
    };

    const pollReadReceipts = async () => {
      try {
        const { data } = await gcApi.getReadReceipts(activeGroupId);
        const map = {};
        (data.receipts || []).forEach(r => { map[r.user_email] = r.last_read_message_id; });
        setReadReceipts(map);
      } catch {}
    };

    const msgId = setInterval(pollMsgs, 2000);
    const typId = setInterval(pollTyping, 2000);
    const readId = setInterval(pollReadReceipts, 5000);

    pollReadReceipts();

    return () => { clearInterval(msgId); clearInterval(typId); clearInterval(readId); };
  }, [activeGroupId]);

  // ── Typing indicator ─────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!activeGroupId) return;
    gcApi.setTyping(activeGroupId, true).catch(() => {});
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      gcApi.setTyping(activeGroupId, false).catch(() => {});
    }, 3000);
  };

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !activeGroupId || sending) return;
    setSending(true);
    clearTimeout(typingTimerRef.current);
    gcApi.setTyping(activeGroupId, false).catch(() => {});

    const payload = { text };
    if (replyingTo) payload.reply_to_id = replyingTo.id;

    try {
      const { data } = await gcApi.sendMessage(activeGroupId, payload);
      setMessages(prev => {
        const exists = prev.find(m => m.id === data.message.id);
        return exists ? prev : [...prev, data.message];
      });
      setInputText('');
      setReplyingTo(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  // ── Send file ─────────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroupId) return;
    const fd = new FormData();
    fd.append('file', file);
    if (inputText.trim()) fd.append('text', inputText.trim());
    if (replyingTo) fd.append('reply_to_id', replyingTo.id);

    setSending(true);
    try {
      const { data } = await gcApi.sendMessage(activeGroupId, fd);
      setMessages(prev => {
        const exists = prev.find(m => m.id === data.message.id);
        return exists ? prev : [...prev, data.message];
      });
      setInputText('');
      setReplyingTo(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload');
    } finally {
      setSending(false);
      e.target.value = '';
    }
  };

  // ── Edit message ─────────────────────────────────────────────────────────────
  const handleEdit = async (msgId, text) => {
    try {
      const { data } = await gcApi.editMessage(msgId, text);
      setMessages(prev => prev.map(m => m.id === msgId ? data.message : m));
    } catch (err) {
      toast.error('Failed to edit message');
      throw err;
    }
  };

  // ── Delete message ────────────────────────────────────────────────────────────
  const handleDelete = async (msgId) => {
    try {
      await gcApi.deleteMessage(msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true, text: '[Message deleted]' } : m));
    } catch {
      toast.error('Failed to delete message');
    }
  };

  // ── React to message ──────────────────────────────────────────────────────────
  const handleReact = async (msgId, emoji) => {
    try {
      const { data } = await gcApi.toggleReaction(msgId, emoji);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: data.reactions } : m));
    } catch {
      toast.error('Failed to add reaction');
    }
  };

  // ── Pin/Unpin message ─────────────────────────────────────────────────────────
  const handlePin = async (groupId, msgId) => {
    try {
      await gcApi.pinMessage(groupId, msgId);
      const { data } = await gcApi.getPins(groupId);
      setPins(data.pins || []);
      toast.success('Message pinned');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to pin');
    }
  };

  const handleUnpin = async (groupId, msgId) => {
    try {
      await gcApi.unpinMessage(groupId, msgId);
      setPins(prev => prev.filter(p => p.message_id !== msgId));
    } catch {
      toast.error('Failed to unpin');
    }
  };

  // ── Member management ─────────────────────────────────────────────────────────
  const handleAddMember = async (email) => {
    try {
      await gcApi.addMember(activeGroupId, email);
      const { data } = await gcApi.getGroup(activeGroupId);
      setActiveGroup(data.group);
      toast.success(`${shortEmail(email)} added`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (email) => {
    try {
      await gcApi.removeMember(activeGroupId, email);
      const { data } = await gcApi.getGroup(activeGroupId);
      setActiveGroup(data.group);
      toast.success(`${shortEmail(email)} removed`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleChangeRole = async (email, role) => {
    try {
      await gcApi.updateMemberRole(activeGroupId, email, role);
      const { data } = await gcApi.getGroup(activeGroupId);
      setActiveGroup(data.group);
      toast.success(`${shortEmail(email)} is now ${role}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  // ── Toggle mute ───────────────────────────────────────────────────────────────
  const handleToggleMute = async () => {
    try {
      const { data } = await gcApi.toggleMute(activeGroupId);
      setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, muted: data.muted ? 1 : 0 } : g));
      setActiveGroup(prev => prev ? { ...prev, muted: data.muted ? 1 : 0 } : prev);
      toast(data.muted ? 'Group muted' : 'Group unmuted');
    } catch {
      toast.error('Failed to toggle mute');
    }
  };

  // ── Leave group ───────────────────────────────────────────────────────────────
  const handleLeave = async () => {
    if (!window.confirm('Leave this group?')) return;
    try {
      await gcApi.leaveGroup(activeGroupId);
      setGroups(prev => prev.filter(g => g.id !== activeGroupId));
      setActiveGroupId(null);
      setActiveGroup(null);
      setMessages([]);
      toast.success('Left group');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave group');
    }
  };

  // ── Delete group ──────────────────────────────────────────────────────────────
  const handleDeleteGroup = async () => {
    if (!window.confirm('Delete this group permanently?')) return;
    try {
      await gcApi.deleteGroup(activeGroupId);
      setGroups(prev => prev.filter(g => g.id !== activeGroupId));
      setActiveGroupId(null);
      setActiveGroup(null);
      setMessages([]);
      toast.success('Group deleted');
    } catch {
      toast.error('Failed to delete group');
    }
  };

  // ── Invite link ───────────────────────────────────────────────────────────────
  const handleCopyInvite = async () => {
    try {
      const { data } = await gcApi.getInviteLink(activeGroupId);
      if (data.invite_token) {
        await navigator.clipboard.writeText(data.invite_token);
        toast.success('Invite token copied!');
      }
    } catch {
      toast.error('Failed to get invite link');
    }
  };

  const handleRegenerateInvite = async () => {
    try {
      const { data } = await gcApi.regenerateInviteLink(activeGroupId);
      await navigator.clipboard.writeText(data.invite_token);
      toast.success('New invite token generated and copied!');
    } catch {
      toast.error('Failed to regenerate invite link');
    }
  };

  // ── Search messages ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showSearch || !searchQ.trim() || !activeGroupId) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await gcApi.getMessages(activeGroupId, { search: searchQ });
        setSearchResults(data.messages || []);
      } catch {}
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ, showSearch, activeGroupId]);

  // ── Group creation / join callbacks ──────────────────────────────────────────
  const handleGroupCreated = (group) => {
    setGroups(prev => [{ ...group, last_message: null, unread_count: 0 }, ...prev]);
    selectGroup(group.id);
  };

  const handleJoined = (groupId) => {
    loadGroups();
    setShowDiscover(false);
    selectGroup(groupId);
  };

  // ── Join requests (private group owners) ─────────────────────────────────────
  const loadJoinRequests = useCallback(async (groupId) => {
    if (!groupId) return;
    setLoadingRequests(true);
    try {
      const { data } = await gcApi.getJoinRequests(groupId);
      setJoinRequests(data.requests || []);
    } catch {
      setJoinRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    const activeGroup = groups.find(g => g.id === activeGroupId);
    const isPrivate = activeGroup && !activeGroup.is_public;
    const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';
    if (!activeGroupId || !isPrivate || !isOwnerOrAdmin) return;
    loadJoinRequests(activeGroupId);
    const id = setInterval(() => loadJoinRequests(activeGroupId), 10000);
    return () => clearInterval(id);
  }, [activeGroupId, myRole, loadJoinRequests, groups]);

  const handleApproveRequest = async (requestId) => {
    try {
      await gcApi.approveJoinRequest(activeGroupId, requestId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      const { data } = await gcApi.getGroup(activeGroupId);
      setActiveGroup(data.group);
      toast.success('Request approved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await gcApi.rejectJoinRequest(activeGroupId, requestId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      toast('Request rejected');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    }
  };

  const isMuted = groups.find(g => g.id === activeGroupId)?.muted;

  return (
    <div className="flex h-[calc(100vh-240px)] min-h-[500px] bg-ink-950 rounded-2xl border border-ink-800/80 overflow-hidden">
      {/* ── Left Sidebar: Group List or Discover Panel ── */}
      {/* On mobile: full-width when no group selected; hidden when group is active */}
      <div className={`flex-shrink-0 bg-ink-900/80 border-r border-ink-800/60 flex flex-col
        ${activeGroupId ? 'hidden md:flex md:w-64' : 'flex w-full md:w-64'}
      `}>
        {showDiscover ? (
          <DiscoverPanel
            currentUser={currentUser}
            onClose={() => setShowDiscover(false)}
            onJoined={handleJoined}
          />
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-ink-800/60">
              <h2 className="text-sm font-bold text-ink-100 flex items-center gap-2 mb-3">
                <Hash size={14} className="text-accent" />Group Chats
              </h2>
              <div className="flex gap-1.5">
                <button onClick={() => setShowCreate(true)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:opacity-90 transition-all">
                  <Plus size={12} />Create
                </button>
                <button onClick={() => setShowDiscover(true)} title="Discover public groups" className="flex items-center justify-center px-2.5 py-2 rounded-xl bg-ink-800 border border-ink-700 text-ink-300 hover:bg-ink-700 transition-all">
                  <Compass size={12} />
                </button>
                <button onClick={() => setShowJoinLink(true)} title="Join via invite link" className="flex items-center justify-center px-2.5 py-2 rounded-xl bg-ink-800 border border-ink-700 text-ink-300 hover:bg-ink-700 transition-all">
                  <Link size={12} />
                </button>
              </div>
            </div>

            {/* Group list */}
            <div className="flex-1 overflow-y-auto py-2">
              {loadingGroups && (
                <div className="flex items-center justify-center py-8 text-ink-500 text-xs">Loading…</div>
              )}
              {!loadingGroups && groups.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <Hash size={28} className="mx-auto text-ink-700 mb-2" />
                  <p className="text-xs text-ink-500">No groups yet.</p>
                  <p className="text-xs text-ink-600 mt-1">Create or join one!</p>
                </div>
              )}
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => selectGroup(g.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all ${
                    activeGroupId === g.id ? 'bg-accent/15 border-r-2 border-accent' : 'hover:bg-ink-800/50'
                  }`}
                >
                  {/* Group avatar */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ background: g.avatar_color || '#1e3a6e' }}>
                    {g.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold truncate ${activeGroupId === g.id ? 'text-accent' : 'text-ink-100'}`}>
                        {g.name}
                      </span>
                      {g.is_public === 0 ? <Lock size={9} className="text-ink-600 flex-shrink-0" /> : null}
                      {g.muted === 1 && <BellOff size={9} className="text-ink-600 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-ink-500 truncate">
                      {g.last_message ? `${shortEmail(g.last_message.sender_email)}: ${g.last_message.text || '[file]'}` : `${g.member_count} members`}
                    </p>
                  </div>
                  {g.unread_count > 0 && g.muted !== 1 && (
                    <span className="w-5 h-5 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                      {g.unread_count > 9 ? '9+' : g.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Right Panel ── */}
      {/* On mobile: hidden when no group selected; full-width when group is active */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!activeGroupId ? 'hidden md:flex' : 'flex'}`}>
        {!activeGroupId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-ink-800 flex items-center justify-center mb-4 border border-ink-700">
              <Hash size={28} className="text-ink-600" />
            </div>
            <h3 className="text-lg font-bold text-ink-200 mb-2">Select a Group</h3>
            <p className="text-sm text-ink-500 max-w-xs mb-6">Choose a group chat from the left, or create a new one to get started.</p>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-all">
              <Plus size={14} />Create Group
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* ── Chat Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-800/60 bg-ink-900/60 flex-shrink-0">
              {/* Mobile back button */}
              <button
                onClick={() => setActiveGroupId(null)}
                className="md:hidden p-1.5 rounded-lg hover:bg-ink-800 text-ink-400 hover:text-ink-200 transition-all flex-shrink-0">
                <ChevronLeft size={16} />
              </button>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ background: activeGroup?.avatar_color || '#1e3a6e' }}>
                {activeGroup?.name?.[0]?.toUpperCase() ?? '#'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-ink-100 text-sm truncate">{activeGroup?.name}</h3>
                  {activeGroup?.is_public === 0
                    ? <Lock size={11} className="text-ink-500 flex-shrink-0" title="Private group" />
                    : <Globe size={11} className="text-ink-600 flex-shrink-0" title="Public group" />
                  }
                </div>
                <p className="text-[10px] text-ink-500">{activeGroup?.members?.length ?? '…'} members · <RoleBadge role={myRole} /></p>
              </div>
              <div className="flex items-center gap-1">
                {/* Video Call */}
                <button
                  onClick={() => setShowVideoCall(true)}
                  title="Start video call"
                  className="p-2 rounded-lg hover:bg-green-500/20 text-ink-400 hover:text-green-400 transition-all"
                >
                  <Video size={15} />
                </button>
                {/* Search */}
                <button onClick={() => setShowSearch(v => !v)} title="Search messages"
                  className={`p-2 rounded-lg transition-all ${showSearch ? 'bg-accent/20 text-accent' : 'hover:bg-ink-800 text-ink-400'}`}>
                  <Search size={15} />
                </button>
                {/* Pins */}
                <button onClick={() => { setShowPins(v => !v); setShowMembers(false); setShowRequests(false); }} title="Pinned messages"
                  className={`p-2 rounded-lg transition-all ${showPins ? 'bg-accent/20 text-accent' : 'hover:bg-ink-800 text-ink-400'}`}>
                  <Pin size={15} />
                  {pins.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent text-white text-[7px] flex items-center justify-center">{pins.length}</span>}
                </button>
                {/* Join Requests — only for private group admins/owners */}
                {activeGroup?.is_public === 0 && canManage && (
                  <button
                    onClick={() => { setShowRequests(v => !v); setShowMembers(false); setShowPins(false); }}
                    title="Join requests"
                    className={`relative p-2 rounded-lg transition-all ${showRequests ? 'bg-accent/20 text-accent' : 'hover:bg-ink-800 text-ink-400'}`}
                  >
                    <UserCheck size={15} />
                    {joinRequests.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[7px] flex items-center justify-center font-bold">
                        {joinRequests.length > 9 ? '9+' : joinRequests.length}
                      </span>
                    )}
                  </button>
                )}
                {/* Members */}
                <button onClick={() => { setShowMembers(v => !v); setShowPins(false); setShowRequests(false); }} title="Members"
                  className={`p-2 rounded-lg transition-all ${showMembers ? 'bg-accent/20 text-accent' : 'hover:bg-ink-800 text-ink-400'}`}>
                  <Users size={15} />
                </button>
                {/* Mute */}
                <button onClick={handleToggleMute} title={isMuted ? 'Unmute' : 'Mute'}
                  className={`p-2 rounded-lg hover:bg-ink-800 transition-all ${isMuted ? 'text-ink-500' : 'text-ink-400'}`}>
                  {isMuted ? <BellOff size={15} /> : <Bell size={15} />}
                </button>
                {/* More options */}
                <div className="relative">
                  <button 
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-2 rounded-lg hover:bg-ink-800 text-ink-400 transition-all">
                    <MoreVertical size={15} />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-ink-900 border border-ink-700 rounded-xl shadow-xl py-1 w-44">
                      {canManage && (
                        <button onClick={handleCopyInvite} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-800">
                          <Copy size={11} />Copy Invite Token
                        </button>
                      )}
                      {canManage && (
                        <button onClick={handleRegenerateInvite} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-800">
                          <Link size={11} />Regenerate Link
                        </button>
                      )}
                      {myRole !== 'owner' && (
                        <button onClick={() => { handleLeave(); setShowMoreMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                          <LogOut size={11} />Leave Group
                        </button>
                      )}
                      {myRole === 'owner' && (
                        <button onClick={() => { handleDeleteGroup(); setShowMoreMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                          <Trash2 size={11} />Delete Group
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Search bar ── */}
            {showSearch && (
              <div className="px-4 py-2 border-b border-ink-800/60 bg-ink-900/40 flex-shrink-0">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input
                    value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search messages in this group..."
                    className="w-full bg-ink-800 border border-ink-700 rounded-xl pl-9 pr-4 py-2 text-ink-100 placeholder-ink-500 text-sm focus:outline-none focus:border-accent"
                    autoFocus
                  />
                  {searchQ && <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"><X size={13} /></button>}
                </div>
                {searching && <p className="text-xs text-ink-500 mt-1">Searching…</p>}
                {!searching && searchQ && (
                  <p className="text-xs text-ink-500 mt-1">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            )}

            {/* ── Main flex row: messages + side panel ── */}
            <div className="flex-1 flex overflow-hidden">
              {/* Messages */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Pinned banner */}
                {pins.length > 0 && !showPins && (
                  <div
                    onClick={() => { setShowPins(true); setShowMembers(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-accent/10 border-b border-accent/20 cursor-pointer hover:bg-accent/15 transition-all flex-shrink-0"
                  >
                    <Pin size={11} className="text-accent flex-shrink-0" />
                    <span className="text-xs text-accent font-medium truncate">
                      {pins[0].message_text?.slice(0, 60) || '[file attachment]'}
                    </span>
                    <span className="text-[10px] text-accent/60 ml-auto flex-shrink-0">{pins.length} pinned</span>
                  </div>
                )}

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {loadingMsgs && (
                    <div className="flex items-center justify-center py-12 text-ink-500 text-xs">Loading messages…</div>
                  )}
                  {!loadingMsgs && messages.length === 0 && !showSearch && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-ink-800 flex items-center justify-center mb-3 border border-ink-700">
                        <Hash size={20} className="text-ink-600" />
                      </div>
                      <p className="text-sm text-ink-400 font-medium">No messages yet</p>
                      <p className="text-xs text-ink-600 mt-1">Be the first to say something!</p>
                    </div>
                  )}

                  {/* Search results */}
                  {showSearch && searchQ ? (
                    searchResults.map(msg => (
                      <MessageBubble
                        key={msg.id} msg={msg}
                        currentUser={currentUser} myRole={myRole} groupId={activeGroupId}
                        readReceipts={readReceipts} allMessages={messages}
                        onReply={setReplyingTo} onEdit={handleEdit} onDelete={handleDelete}
                        onPin={handlePin} onReact={handleReact}
                      />
                    ))
                  ) : (
                    messages.map(msg => (
                      <MessageBubble
                        key={msg.id} msg={msg}
                        currentUser={currentUser} myRole={myRole} groupId={activeGroupId}
                        readReceipts={readReceipts} allMessages={messages}
                        onReply={setReplyingTo} onEdit={handleEdit} onDelete={handleDelete}
                        onPin={handlePin} onReact={handleReact}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="px-4 pb-1 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {typingUsers.slice(0, 3).map(e => <Avatar key={e} email={e} size={16} />)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-ink-500">
                          {typingUsers.length === 1 ? shortEmail(typingUsers[0]) : `${typingUsers.length} people`} typing
                        </span>
                        <span className="flex gap-0.5">
                          {[0, 1, 2].map(i => (
                            <span key={i} className="w-1 h-1 rounded-full bg-ink-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reply banner */}
                {replyingTo && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-ink-800/60 border-t border-ink-700/50 flex-shrink-0">
                    <Reply size={12} className="text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-accent font-semibold">{shortEmail(replyingTo.sender_email)}</span>
                      <p className="text-xs text-ink-400 truncate">{replyingTo.text}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-ink-500 hover:text-ink-300"><X size={13} /></button>
                  </div>
                )}

                {/* Input */}
                <div className="px-4 py-3 border-t border-ink-800/60 flex-shrink-0">
                  <div className="flex items-end gap-2 bg-ink-800/60 rounded-2xl border border-ink-700/60 px-3 py-2">
                    <input
                      ref={inputRef}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={`Message #${activeGroup?.name ?? ''}…`}
                      className="flex-1 bg-transparent text-ink-100 placeholder-ink-600 text-sm focus:outline-none resize-none min-w-0"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                      <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg text-ink-500 hover:text-ink-300 hover:bg-ink-700 transition-all">
                        <Paperclip size={15} />
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || sending}
                        className="p-1.5 rounded-lg text-white bg-accent hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-ink-700 text-center mt-1.5">
                    Enter to send · Shift+Enter for newline · Group messages are not encrypted
                  </p>
                </div>
              </div>

              {/* ── Side panel: Members, Pins, or Requests ── */}
              {(showMembers || showPins || showRequests) && (
                <div className="w-56 flex-shrink-0 border-l border-ink-800/60 bg-ink-900/40 flex flex-col">
                  {showMembers && (
                    <MemberPanel
                      group={activeGroup}
                      currentUser={currentUser}
                      onAddMember={handleAddMember}
                      onRemoveMember={handleRemoveMember}
                      onChangeRole={handleChangeRole}
                      onClose={() => setShowMembers(false)}
                    />
                  )}
                  {showPins && (
                    <PinsPanel
                      pins={pins}
                      onClose={() => setShowPins(false)}
                      canUnpin={canManage}
                      onUnpin={handleUnpin}
                      groupId={activeGroupId}
                    />
                  )}
                  {showRequests && (
                    <JoinRequestsPanel
                      groupId={activeGroupId}
                      requests={joinRequests}
                      loading={loadingRequests}
                      onClose={() => setShowRequests(false)}
                      onApprove={handleApproveRequest}
                      onReject={handleRejectRequest}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateGroupModal
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onCreated={handleGroupCreated}
        />
      )}
      {showJoinLink && (
        <JoinLinkModal
          onClose={() => setShowJoinLink(false)}
          onJoined={handleJoined}
        />
      )}
      {showVideoCall && activeGroup && (
        <VideoCallModal
          group={activeGroup}
          currentUser={currentUser}
          onClose={handleEndVideoCall}
        />
      )}

      {/* ── Suspension warning (all members entering suspended group) ── */}
      {showSuspensionWarning && suspendedGroupData && (
        <SuspensionWarningModal
          group={suspendedGroupData}
          isOwner={suspendedGroupData.my_role === 'owner'}
          onNotice={async () => {
            // "Notice" = acknowledge and leave the suspended group immediately
            try {
              await gcApi.leaveGroup(suspendedGroupData.id);
              setGroups(prev => prev.filter(g => g.id !== suspendedGroupData.id));
              toast('You have left the suspended group');
            } catch {
              toast.error('Failed to leave group');
            }
            setShowSuspensionWarning(false);
            setSuspendedGroupData(null);
          }}
          onLearnMore={() => {
            setShowSuspensionWarning(false);
            setShowSuspensionLearnMore(true);
          }}
        />
      )}

      {/* ── Suspension learn-more / action center ── */}
      {showSuspensionLearnMore && suspendedGroupData && (
        <SuspensionLearnMoreModal
          group={suspendedGroupData}
          currentUser={currentUser}
          isOwner={suspendedGroupData.my_role === 'owner'}
          onClose={() => {
            setShowSuspensionLearnMore(false);
            setSuspendedGroupData(null);
          }}
          onLeft={() => {
            setGroups(prev => prev.filter(g => g.id !== suspendedGroupData.id));
            setShowSuspensionLearnMore(false);
            setSuspendedGroupData(null);
          }}
        />
      )}
    </div>
  );
}
