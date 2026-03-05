import { useAuth } from '../hooks/useAuth';
import { MessagesView } from '../components/LostFoundMessages';

export default function MessagesPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="w-full h-[calc(100vh-240px)] min-h-[500px] bg-ink-950 rounded-2xl border border-ink-800/80 overflow-hidden">
      <MessagesView 
        currentUser={user} 
        openConvId={null} 
        onUnreadChange={() => {}}
      />
    </div>
  );
}
