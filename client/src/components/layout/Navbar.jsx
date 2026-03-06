import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Shield, LayoutDashboard, Settings, HelpCircle, SearchCheck, Users, Mail, User, Bell, Search, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { gcApi, notifApi, searchApi } from '../../api';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso + 'Z').getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function GlobalSearchModal({ onClose, navigate, isAdmin }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ items: [], groups: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) { setResults({ items: [], groups: [], users: [] }); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchApi.search(query.trim());
        setResults(data);
        setCursor(0);
      } catch { /* silent */ } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const allResults = [
    ...results.items.map(r => ({ ...r, _kind: 'item' })),
    ...results.groups.map(r => ({ ...r, _kind: 'group' })),
    ...(isAdmin ? results.users.map(r => ({ ...r, _kind: 'user' })) : []),
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && allResults[cursor]) { handleSelect(allResults[cursor]); }
  };

  const handleSelect = (r) => {
    if (r._kind === 'item') navigate('/lost-found', { state: { highlightItem: r.id } });
    else if (r._kind === 'group') navigate('/group-chat', { state: { openGroup: r.id } });
    else if (r._kind === 'user') navigate('/admin', { state: { searchUser: r.email } });
    onClose();
  };

  const sections = [
    { label: 'Lost & Found Items', key: 'item', icon: SearchCheck },
    { label: 'Groups', key: 'group', icon: Users },
    ...(isAdmin ? [{ label: 'Users', key: 'user', icon: User }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-800">
          <Search size={16} className="text-ink-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search items, groups, users…"
            className="flex-1 bg-transparent text-ink-100 placeholder-ink-500 text-sm outline-none"
          />
          {loading && <span className="text-[10px] text-ink-500 flex-shrink-0">searching…</span>}
          <button onClick={onClose} className="text-ink-500 hover:text-ink-300 flex-shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-2">
          {query.trim().length < 2 ? (
            <p className="text-center text-ink-500 text-xs py-6">Type at least 2 characters to search</p>
          ) : allResults.length === 0 && !loading ? (
            <p className="text-center text-ink-500 text-xs py-6">No results found</p>
          ) : (
            sections.map(({ label, key, icon: SectionIcon }) => {
              const sectionItems = allResults.filter(r => r._kind === key);
              if (sectionItems.length === 0) return null;
              return (
                <div key={key}>
                  <p className="text-[10px] text-ink-600 font-semibold uppercase tracking-wider px-4 pt-3 pb-1">{label}</p>
                  {sectionItems.map((r) => {
                    const idx = allResults.indexOf(r);
                    const isActive = cursor === idx;
                    return (
                      <button
                        key={`${key}-${r.id || r.email}`}
                        onClick={() => handleSelect(r)}
                        onMouseEnter={() => setCursor(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-ink-800' : 'hover:bg-ink-800/50'}`}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: r.avatar_color || '#1e3a6e' }}>
                          <SectionIcon size={12} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink-100 truncate">
                            {key === 'item' ? r.title : key === 'group' ? r.name : (r.first_name ? `${r.first_name} ${r.last_name}`.trim() : r.email)}
                          </p>
                          <p className="text-[11px] text-ink-500 truncate">
                            {key === 'item' ? `${r.type} · ${r.category}` :
                             key === 'group' ? `${r.member_count} members` :
                             r.email}
                          </p>
                        </div>
                        {key === 'item' && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${r.type === 'lost' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {r.type}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-ink-800 px-4 py-2 flex gap-4 text-[10px] text-ink-600">
          <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [groupUnread, setGroupUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const notifRef = useRef(null);

  const isAdmin = user?.role === 'admin';
  const canSeeLostFound = !!user;
  const isOnGroupChat = location.pathname === '/group-chat';

  // Poll for unread group messages
  const pollGroupUnread = useCallback(async () => {
    if (!user || isOnGroupChat) return;
    try {
      const { data } = await gcApi.getGroups();
      const total = (data.groups || [])
        .filter(g => !g.muted)
        .reduce((sum, g) => sum + (g.unread_count || 0), 0);
      setGroupUnread(total);
    } catch { /* silent */ }
  }, [user, isOnGroupChat]);

  // Poll for notifications
  const pollNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notifApi.getAll();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (isOnGroupChat) { setGroupUnread(0); }
    else {
      pollGroupUnread();
      const id = setInterval(pollGroupUnread, 8000);
      return () => clearInterval(id);
    }
  }, [user, isOnGroupChat, pollGroupUnread]);

  useEffect(() => {
    if (!user) return;
    pollNotifications();
    const id = setInterval(pollNotifications, 10000);
    return () => clearInterval(id);
  }, [user, pollNotifications]);

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cmd+K / Ctrl+K opens search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notifApi.readAll();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await notifApi.readOne(notif.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowNotifs(false);
    if (notif.link) navigate(notif.link);
  };

  const handleDismiss = async (e, id) => {
    e.stopPropagation();
    await notifApi.dismiss(id).catch(() => {});
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => {
      const removed = notifications.find(n => n.id === id);
      return removed && !removed.is_read ? Math.max(0, prev - 1) : prev;
    });
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(isAdmin ? [] : [{ to: '/profile', label: 'Profile', icon: User }]),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
    ...(canSeeLostFound ? [{ to: '/lost-found', label: 'Lost & Found', icon: SearchCheck }] : []),
    ...(canSeeLostFound ? [{ to: '/group-chat', label: 'Groups', icon: Users, unread: groupUnread }] : []),
    ...(canSeeLostFound ? [{ to: '/messages', label: 'Messages', icon: Mail }] : []),
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/help', label: 'Help', icon: HelpCircle },
  ];

  const notifTypeColor = (type) => {
    if (type === 'request_accepted' || type === 'join_approved') return 'bg-green-500/20 text-green-400';
    if (type === 'request_rejected' || type === 'join_rejected') return 'bg-red-500/20 text-red-400';
    return 'bg-accent/20 text-accent';
  };

  return (
    <header className="sticky top-0 h-14 border-b border-white/5 bg-ink-950/30 backdrop-blur-2xl backdrop-saturate-150 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 flex-shrink-0 z-40 shadow-[0_1px_20px_rgba(0,0,0,0.15)]">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
          <span className="text-ink-950 font-bold text-xs" style={{ fontFamily: 'Syne' }}>PP</span>
        </div>
        <span className="text-ink-100 font-semibold text-sm hidden sm:block" style={{ fontFamily: 'Syne' }}>
          Pattern Pilots
        </span>
      </Link>

      {/* Nav links — scrollable on mobile */}
      <nav className="flex-1 min-w-0 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {navLinks.map(({ to, label, icon: Icon, unread }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium transition-all duration-300 ${
                  active ? 'mirror-nav-active text-ink-900' : 'mirror-nav text-ink-500 hover:text-ink-300'
                }`}
                style={active ? { color: '#000000' } : {}}>
                <span className="relative flex-shrink-0">
                  <Icon size={14} />
                  {unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[7px] font-bold flex items-center justify-center leading-none">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                <span className="hidden sm:block">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Right side: search + bell + sign out */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Search button */}
        {user && (
          <button
            onClick={() => setShowSearch(true)}
            title="Search (⌘K)"
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-200 hover:bg-ink-800 transition-all"
          >
            <Search size={15} />
          </button>
        )}

        {/* Notification bell */}
        {user && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(v => !v)}
              title="Notifications"
              className="relative p-1.5 rounded-lg text-ink-400 hover:text-ink-200 hover:bg-ink-800 transition-all"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-ink-900 border border-ink-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-ink-800">
                  <span className="text-sm font-semibold text-ink-100">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[11px] text-accent hover:underline flex items-center gap-1">
                        <Check size={11} /> Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-ink-500 text-sm">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-ink-800 transition-colors border-b border-ink-800/50 ${!n.is_read ? 'bg-ink-850' : ''}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-accent' : 'bg-ink-700'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${!n.is_read ? 'text-ink-100' : 'text-ink-400'}`}>{n.title}</p>
                          <p className="text-[11px] text-ink-500 mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-ink-600 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${notifTypeColor(n.type)}`}>
                          {n.type === 'new_message' ? 'msg' : n.type === 'join_approved' || n.type === 'request_accepted' ? '✓' : '✗'}
                        </span>
                        <button
                          onClick={(e) => handleDismiss(e, n.id)}
                          className="text-ink-600 hover:text-ink-300 flex-shrink-0 p-0.5"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <button onClick={handleLogout}
          className="mirror-btn flex items-center gap-2 text-ink-400 hover:text-danger text-sm py-1.5 px-3 transition-all duration-200">
          <LogOut size={14} />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>

      {/* Global Search Modal */}
      {showSearch && (
        <GlobalSearchModal onClose={() => setShowSearch(false)} navigate={navigate} isAdmin={isAdmin} />
      )}
    </header>
  );
}
