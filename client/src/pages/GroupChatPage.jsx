import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import GroupChatView from './GroupChatView';

export default function GroupChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div className={`flex-1 overflow-y-auto transition-all duration-700 ${
      animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
      <div className="w-full p-6">
        <div className="relative mb-6 pb-5">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <h1 className="text-2xl font-black text-ink-50 tracking-tight">Group Chats</h1>
          <p className="text-sm text-ink-500 mt-1">Collaborate with others in real-time group conversations</p>
        </div>
        <GroupChatView currentUser={user} />
      </div>
    </div>
  );
}
