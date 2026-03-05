import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Shield, LayoutDashboard, Settings, HelpCircle, SearchCheck, Users, Mail, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { gcApi } from '../../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [groupUnread, setGroupUnread] = useState(0);

  const isAdmin = user?.role === 'admin';
  const canSeeLostFound = !!user;
  const isOnGroupChat = location.pathname === '/group-chat';

  // Poll for unread group messages when logged in and not on the group chat page
  const pollGroupUnread = useCallback(async () => {
    if (!user || isOnGroupChat) return;
    try {
      const { data } = await gcApi.getGroups();
      const total = (data.groups || [])
        .filter(g => !g.muted)
        .reduce((sum, g) => sum + (g.unread_count || 0), 0);
      setGroupUnread(total);
    } catch {
      // Silently fail
    }
  }, [user, isOnGroupChat]);

  useEffect(() => {
    if (!user) return;
    if (isOnGroupChat) { setGroupUnread(0); return; }
    pollGroupUnread();
    const id = setInterval(pollGroupUnread, 8000);
    return () => clearInterval(id);
  }, [user, isOnGroupChat, pollGroupUnread]);

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

  return (
    <header className="h-14 border-b border-ink-800 bg-ink-950 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 flex-shrink-0 z-10">
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
                  active
                    ? 'mirror-nav-active text-ink-900'
                    : 'mirror-nav text-ink-500 hover:text-ink-300'
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

      {/* Sign out */}
      <div className="flex-shrink-0">
        <button onClick={handleLogout}
          className="mirror-btn flex items-center gap-2 text-ink-400 hover:text-danger text-sm py-1.5 px-3 transition-all duration-200">
          <LogOut size={14} />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>
    </header>
  );
}
