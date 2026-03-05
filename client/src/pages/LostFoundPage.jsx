import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Search, MapPin, Plus, X, CheckCircle, AlertTriangle, Clock,
  Mail, ChevronLeft, ChevronRight, Bell, Filter, Award,
  ShieldCheck, Trash2, Package, MessageCircle, Send,
  ArrowLeft, Image, User as UserIcon, Zap,
  Smartphone, Shirt, ShoppingBag, Gem, Key, FileText,
  PawPrint, BookOpen, Trophy, Glasses, Gamepad2,
  Smile, Paperclip, MoreVertical, Eye, EyeOff, Bookmark, BookmarkCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLostFoundStore, CATEGORIES } from '../store/lostFoundStore';
import { useAuth } from '../hooks/useAuth';
import { lfApi } from '../api';

// ── Constants ──────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api$/, '');

const CATEGORY_IMAGES = {
  electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80',
  clothing:    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80',
  bags:        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
  jewelry:     'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80',
  keys:        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  documents:   'https://images.unsplash.com/photo-1568667256549-094345857c50?w=600&q=80',
  pets:        'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&q=80',
  books:       'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&q=80',
  sports:      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&q=80',
  glasses:     'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600&q=80',
  toys:        'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?w=600&q=80',
  other:       'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&q=80',
};

const CATEGORY_ICON_MAP = {
  electronics: Smartphone, clothing: Shirt, bags: ShoppingBag, jewelry: Gem,
  keys: Key, documents: FileText, pets: PawPrint, books: BookOpen,
  sports: Trophy, glasses: Glasses, toys: Gamepad2, other: Package,
};

function getCategoryImage(id) { return CATEGORY_IMAGES[id]  ?? CATEGORY_IMAGES.other; }
function getCategoryIcon(id)  { return CATEGORY_ICON_MAP[id] ?? Package; }
function getCategoryLabel(id) { return CATEGORIES.find(c => c.id === id)?.label ?? 'Other'; }

function formatDate(iso) {
  if (!iso) return '—';
  const d   = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Privacy helpers ────────────────────────────────────────────────────────────
function maskEmail(email) {
  if (!email) return '—';
  const atIdx = email.indexOf('@');
  if (atIdx <= 0) return email;
  const local  = email.slice(0, atIdx);
  const domain = email.slice(atIdx);
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 4))}${domain}`;
}

function maskName(name) {
  if (!name) return '—';
  const parts = name.split(' ');
  return parts.map((p, i) => (i === 0 ? p : `${p[0]}.`)).join(' ');
}

// Normalize a server item to the same shape as a local store item
function normalizeServerItem(raw) {
  return {
    id:           `srv_${raw.id}`,
    serverId:     raw.id,
    type:         raw.type,
    title:        raw.title,
    description:  raw.description || '',
    category:     raw.category || 'other',
    location:     raw.location || '',
    date:         raw.item_date || raw.created_at?.split('T')[0] || '',
    contactName:  raw.contact_name || '',
    contactEmail: raw.contact_email || '',
    tags:         Array.isArray(raw.tags) ? raw.tags : [],
    reward:       raw.reward || 0,
    status:       raw.status || 'active',
    imageUrl:     raw.image_filename
      ? `${API_BASE}/api/lostfound/uploads/${raw.image_filename}`
      : null,
    createdAt:    raw.created_at || new Date().toISOString(),
    _source:      'server',
    userEmail:    raw.user_email,
  };
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────

function TypeBadge({ type, status, expired }) {
  if (expired)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-orange-500/90 text-white backdrop-blur-sm ring-1 ring-orange-400/40 shadow-sm">
        <Clock size={8} />Expired
      </span>
    );
  if (status === 'resolved')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-ink-800/95 text-ink-400 backdrop-blur-sm ring-1 ring-ink-600/50">
        <CheckCircle size={8} />Resolved
      </span>
    );
  if (type === 'lost')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-red-500/95 text-white shadow-md shadow-red-500/40 ring-1 ring-red-400/30">
        <AlertTriangle size={8} />Lost
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/95 text-white shadow-md shadow-emerald-500/40 ring-1 ring-emerald-400/30">
      <CheckCircle size={8} />Found
    </span>
  );
}

// ── ItemCard ──────────────────────────────────────────────────────────────────

function ItemCard({ item, onClick, isSaved, onToggleSave }) {
  const [imgErr, setImgErr] = useState(false);
  const { lfSettings } = useLostFoundStore();
  const CatIcon = getCategoryIcon(item.category);
  const imgSrc = !imgErr && item.imageUrl ? item.imageUrl : getCategoryImage(item.category);
  const isHighlighted = lfSettings?.highlightRewards && item.reward > 0 && item.reward >= (lfSettings?.minRewardHighlight ?? 0);
  const isExpired = item._expired === true;
  const cardStyle = lfSettings?.cardStyle ?? 'default';
  const cardStyleClass = cardStyle !== 'default' ? ` lf-card-${cardStyle}` : '';

  return (
    <div
      onClick={() => onClick(item)}
      className={`lostfound-card cursor-pointer group overflow-hidden flex flex-col${cardStyleClass}${isHighlighted ? ' ring-2 ring-amber-400/60 shadow-xl shadow-amber-500/20' : ''}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-900 flex-shrink-0">
        <img
          src={imgSrc}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          onError={() => setImgErr(true)}
        />
        {/* Gradient — strong at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent pointer-events-none" />

        {/* Reward badge — top left */}
        {item.reward > 0 && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 shadow-lg shadow-amber-500/50">
              <Award size={9} />${item.reward}
            </span>
          </div>
        )}

        {/* Type badge — top right */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {onToggleSave && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSave(item); }}
              className={`p-1 rounded-full backdrop-blur-sm transition-all ${isSaved ? 'bg-accent/90 text-white' : 'bg-ink-950/70 text-ink-400 hover:text-accent'}`}
              title={isSaved ? 'Remove bookmark' : 'Save item'}
            >
              {isSaved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
            </button>
          )}
          <TypeBadge type={item.type} status={item.status} expired={isExpired} />
        </div>

        {/* Category chip — bottom left */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md bg-ink-950/75 text-ink-400 backdrop-blur-sm border border-ink-700/40 font-medium">
            <CatIcon size={8} />{getCategoryLabel(item.category)}
          </span>
        </div>

        {/* Live dot — bottom right */}
        {item._source === 'server' && (
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md bg-accent/80 text-white backdrop-blur-sm font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Live
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-ink-100 text-sm mb-1.5 line-clamp-1 group-hover:text-accent transition-colors duration-300 leading-snug">
          {item.title}
        </h3>
        <p className="text-xs text-ink-500 line-clamp-2 mb-3 leading-relaxed flex-1">{item.description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-ink-600 pt-2.5 border-t border-ink-800/50">
          <span className="flex items-center gap-1.5 min-w-0">
            <div className="w-3.5 h-3.5 rounded-full bg-ink-800 flex items-center justify-center flex-shrink-0">
              <MapPin size={7} className="text-ink-500" />
            </div>
            <span className="truncate">{item.location || '—'}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 ml-2 text-ink-700">
            <Clock size={9} />{formatDate(item.date)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── ItemDetailModal ───────────────────────────────────────────────────────────

function ItemDetailModal({ item, onClose, onResolve, onDelete, currentUser }) {
  const [imgErr, setImgErr]             = useState(false);
  const [tab, setTab]                   = useState('details'); // 'details' | 'chat'
  const [privacyReveal, setPrivacyReveal] = useState(false); // Feature: Privacy Mode
  const { lfSettings }                  = useLostFoundStore();
  // chat state
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [msgInput, setMsgInput]         = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const [sending, setSending]           = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const messagesEndRef                  = useRef(null);
  const pollRef                         = useRef(null);
  const lastMessageCountRef             = useRef(0);

  const CatIcon      = getCategoryIcon(item.category);
  const isOwner      = currentUser?.email === item.contactEmail || currentUser?.email === item.userEmail;
  const isServerItem = item._source === 'server';
  // Chat is fully functional only for server items + logged-in users
  const chatFunctional = isServerItem && !!currentUser;

  // Load/start conversation when chat tab is opened
  useEffect(() => {
    if (!chatFunctional) return;
    let cancelled = false;
    if (tab === 'chat') {
      // Reset unread count when opening chat tab
      setUnreadCount(0);
      (async () => {
        setChatLoading(true);
        try {
          let convId;
          if (!isOwner) {
            // Inquirer: create or fetch conversation
            const { data } = await lfApi.startConversation(item.serverId);
            convId = data.conversation.id;
            if (!cancelled) setConversation(data.conversation);
          } else {
            // Owner: find any existing conversation for this item
            const { data } = await lfApi.getConversations();
            const found = data.conversations.find(c => c.item_id === item.serverId);
            if (found) { convId = found.id; if (!cancelled) setConversation(found); }
          }
          if (convId) {
            const msgData = await lfApi.getMessages(convId);
            if (!cancelled) {
              const messagesWithReactions = msgData.data.messages.map(m => ({
                ...m,
                reactions: m.reactions || []
              }));
              setMessages(messagesWithReactions);
              lastMessageCountRef.current = messagesWithReactions.length;
            }
          }
        } catch (err) {
          if (!cancelled) toast.error(err.response?.data?.error || 'Could not load chat');
        } finally {
          if (!cancelled) setChatLoading(false);
        }
      })();
    }
    return () => { cancelled = true; };
  }, [tab, chatFunctional, isOwner, item.serverId]);

  // Poll for messages and track unread count - Optimized
  useEffect(() => {
    if (!chatFunctional || !conversation) return;
    const convId = conversation.id;
    let isActive = true;
    
    const pollMessages = async () => {
      try {
        const { data } = await lfApi.getMessages(convId);
        if (!isActive) return;
        
        const newMessages = (data.messages || []).map(m => ({
          ...m,
          reactions: m.reactions || []
        }));
        const newCount = newMessages.length;
        const prevCount = lastMessageCountRef.current;
        
        // Only update if there are changes
        if (newCount !== prevCount) {
          const newMessagesAdded = newCount - prevCount;
          
          // If chat tab is NOT open, increment unread count
          if (tab !== 'chat' && newMessagesAdded > 0) {
            setUnreadCount(prev => prev + newMessagesAdded);
          }
          
          // Always update messages
          setMessages(newMessages);
          lastMessageCountRef.current = newCount;
        }
      } catch (err) {
        if (isActive) console.error('Poll error:', err);
      }
    };
    
    // Initial load immediately
    pollMessages();
    
    // Then poll every 1.5 seconds for faster real-time feel
    pollRef.current = setInterval(pollMessages, 1500);
    
    return () => {
      isActive = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tab, conversation, chatFunctional]);

  // Removed duplicate scroll effect - handled in ChatView with useCallback

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const otherEmail = conversation
    ? (currentUser?.email === conversation.item_owner_email
        ? conversation.inquirer_email
        : conversation.item_owner_email)
    : (isOwner ? 'inquirer' : item.contactName || item.userEmail || 'owner');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-ink-950 border border-ink-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="p-4 border-b border-ink-800 flex items-start gap-3 flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-ink-800 border border-ink-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {item.imageUrl && !imgErr
              ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
              : <CatIcon size={22} className="text-accent" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-ink-100 leading-tight" style={{ fontFamily: 'Syne' }}>{item.title}</h2>
              <TypeBadge type={item.type} status={item.status} />
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-ink-500">{getCategoryLabel(item.category)}</span>
              {item.location && (
                <span className="flex items-center gap-1 text-[11px] text-ink-600">
                  <MapPin size={9} />{item.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-ink-600">
                <Clock size={9} />{formatDate(item.date)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-600 hover:text-ink-300 transition-colors flex-shrink-0 mt-0.5">
            <X size={15} />
          </button>
        </div>

        {/* ── Tab bar — always visible ── */}
        <div className="flex border-b border-ink-800 flex-shrink-0 overflow-visible">
          {[
            { id: 'details', label: 'Details' },
            { id: 'chat',    label: 'Messages', icon: MessageCircle },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold transition-all border-b-2 -mb-px relative overflow-visible ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-500 hover:text-ink-300'
              }`}>
              {t.icon && <t.icon size={12} />}{t.label}
              {t.id === 'chat' && unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center transform translate-x-1/2 -translate-y-1/2">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
          {isOwner && isServerItem && (
            <span className="ml-auto pr-4 flex items-center text-[10px] text-ink-600 italic">
              Your listing
            </span>
          )}
        </div>

        {/* ── Details tab ── */}
        {tab === 'details' && (
          <div className="flex-1 overflow-y-auto">
            {/* Uploaded photo */}
            {item.imageUrl && !imgErr && (
              <div className="px-5 pt-4">
                <img src={item.imageUrl} alt={item.title}
                  className="w-full max-h-44 object-cover rounded-xl border border-ink-800"
                  onError={() => setImgErr(true)} />
              </div>
            )}

            <div className="p-5 space-y-4">
              {/* Description */}
              <div>
                <p className="text-[10px] text-ink-500 uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm text-ink-300 leading-relaxed">{item.description}</p>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-ink-900/60 rounded-lg p-3 border border-ink-800">
                  <p className="text-[10px] text-ink-600 uppercase tracking-wider mb-1">Location</p>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-accent flex-shrink-0" />
                    <span className="text-xs text-ink-200">{item.location || '—'}</span>
                  </div>
                </div>
                <div className="bg-ink-900/60 rounded-lg p-3 border border-ink-800">
                  <p className="text-[10px] text-ink-600 uppercase tracking-wider mb-1">Date</p>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-accent flex-shrink-0" />
                    <span className="text-xs text-ink-200">{formatDate(item.date)}</span>
                  </div>
                </div>
                <div className="bg-ink-900/60 rounded-lg p-3 border border-ink-800">
                  <p className="text-[10px] text-ink-600 uppercase tracking-wider mb-1">Reported by</p>
                  <div className="flex items-center gap-1.5">
                    <UserIcon size={12} className="text-accent flex-shrink-0" />
                    <span className="text-xs text-ink-200">
                      {lfSettings?.privacyMode && !privacyReveal
                        ? maskName(item.contactName)
                        : (item.contactName || '—')}
                    </span>
                    {lfSettings?.privacyMode && item.contactName && (
                      <button
                        onClick={() => setPrivacyReveal(v => !v)}
                        className="text-ink-600 hover:text-ink-400 transition-colors ml-1 flex-shrink-0"
                        title={privacyReveal ? 'Hide details' : 'Reveal contact details'}
                      >
                        {privacyReveal ? <EyeOff size={10} /> : <Eye size={10} />}
                      </button>
                    )}
                  </div>
                </div>
                {item.reward > 0 && (
                  <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
                    <p className="text-[10px] text-amber-500/70 uppercase tracking-wider mb-1">Reward</p>
                    <div className="flex items-center gap-1.5">
                      <Award size={12} className="text-amber-400 flex-shrink-0" />
                      <span className="text-sm font-bold text-amber-400">${item.reward}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {item.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map(t => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-ink-800 text-ink-400 border border-ink-700">#{t}</span>
                  ))}
                </div>
              )}

              {/* Safety tip */}
              <div className="bg-accent/5 rounded-lg p-3 border border-accent/20">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={13} className="text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-accent mb-1">Safety Tips</p>
                    <ul className="text-[11px] text-ink-400 space-y-0.5">
                      <li>• Meet in a public, well-lit location</li>
                      <li>• Ask for proof of ownership before handing over valuables</li>
                      <li>• Do not share your home address</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sign-in nudge for unauthenticated */}
              {!currentUser && isServerItem && (
                <div className="bg-ink-900 rounded-lg p-3 border border-ink-700 text-center">
                  <p className="text-xs text-ink-400">
                    <span className="text-accent font-medium">Sign in</span> to send a message to the owner
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Chat tab ── */}
        {tab === 'chat' && (
          <div className="flex flex-col flex-1 min-h-0">

            {/* ── State: not logged in ── */}
            {!currentUser && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <MessageCircle size={22} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-200 mb-1">Sign in to send messages</p>
                  <p className="text-xs text-ink-500">Create an account or log in to chat directly with the person who reported this item.</p>
                </div>
              </div>
            )}

            {/* ── State: logged in but local/demo item ── */}
            {currentUser && !isServerItem && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-ink-800 border border-ink-700 flex items-center justify-center">
                  <MessageCircle size={22} className="text-ink-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-300 mb-1">Demo listing</p>
                  <p className="text-xs text-ink-500 leading-relaxed">
                    This is a sample listing. Chat is only available for live listings posted by real users.
                    <br /><br />
                    Post a real item using the <span className="text-accent font-medium">Report Item</span> button to enable messaging.
                  </p>
                </div>
              </div>
            )}

            {/* ── State: fully functional chat ── */}
            {currentUser && isServerItem && (
              <>
                {/* Chat sub-header */}
                <div className="px-4 py-2.5 bg-ink-900/40 border-b border-ink-800 flex items-center gap-2 flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <UserIcon size={11} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink-200 truncate flex items-center gap-1.5">
                      <span className="truncate">
                        {lfSettings?.privacyMode && !privacyReveal ? maskEmail(otherEmail) : otherEmail}
                      </span>
                      {lfSettings?.privacyMode && (
                        <button
                          onClick={() => setPrivacyReveal(v => !v)}
                          className="text-ink-600 hover:text-ink-400 transition-colors flex-shrink-0"
                          title={privacyReveal ? 'Hide email' : 'Reveal email'}
                        >
                          {privacyReveal ? <EyeOff size={10} /> : <Eye size={10} />}
                        </button>
                      )}
                    </p>
                    <p className="text-[10px] text-ink-600">Re: {item.title}</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-ink-800 text-ink-500 border border-ink-700 flex-shrink-0">
                    Encrypted · 10 days
                  </span>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[200px] max-h-[280px]">
                  {chatLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
                    </div>
                  ) : !conversation && isOwner ? (
                    <div className="flex flex-col items-center justify-center h-full text-ink-600 gap-2">
                      <MessageCircle size={28} className="opacity-30" />
                      <p className="text-xs text-center">No messages yet.<br />Others can message you about this item.</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-ink-600 gap-2">
                      <MessageCircle size={28} className="opacity-30" />
                      <p className="text-xs text-center">No messages yet.<br />Send a message to start the conversation!</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                          msg.is_mine
                            ? 'bg-accent text-white rounded-br-sm'
                            : 'bg-ink-800 border border-ink-700 text-ink-200 rounded-bl-sm'
                        }`}>
                          <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                          <p className={`text-[9px] mt-0.5 ${msg.is_mine ? 'text-white/50' : 'text-ink-600'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input (inquirer always sees it; owner sees it only when there's a conv) */}
                {(!isOwner || conversation) && (
                  <div className="p-3 border-t border-ink-800 flex-shrink-0">
                    <div className="flex items-end gap-2">
                      <textarea
                        className="input flex-1 resize-none text-sm min-h-[36px] max-h-[100px] py-2"
                        placeholder="Type a message… (Enter to send)"
                        rows={1}
                        value={msgInput}
                        onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={sending || chatLoading || !conversation}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!msgInput.trim() || sending || !conversation}
                        className="w-9 h-9 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        <Send size={14} className="text-white" />
                      </button>
                    </div>
                    <p className="text-[10px] text-ink-600 mt-1.5">Messages are encrypted end-to-end and kept for 10 days</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Footer (details tab only) ── */}
        {tab === 'details' && (
          <div className="p-3 border-t border-ink-800 flex items-center gap-2 flex-wrap flex-shrink-0">
            {item.status !== 'resolved' && !isOwner && (
              <button
                onClick={() => setTab('chat')}
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                <MessageCircle size={13} />Message Owner
              </button>
            )}
            {item.status !== 'resolved' && isOwner && isServerItem && (
              <button
                onClick={() => setTab('chat')}
                className="flex items-center gap-1.5 text-sm border border-ink-700 rounded-lg px-3 py-1.5 text-ink-400 hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-all"
              >
                <MessageCircle size={13} />View Messages
              </button>
            )}
            {item.status !== 'resolved' && isOwner && (
              <button
                onClick={() => { onResolve(item); toast.success('Marked as resolved!'); onClose(); }}
                className="flex items-center gap-1.5 text-sm border border-ink-700 rounded-lg px-3 py-1.5 text-ink-400 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all"
              >
                <CheckCircle size={13} />Mark Resolved
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => { onDelete(item); toast.success('Listing removed'); onClose(); }}
                className="ml-auto flex items-center gap-1.5 text-xs text-ink-600 hover:text-danger transition-colors"
              >
                <Trash2 size={12} />Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AlertsModal ───────────────────────────────────────────────────────────────

function AlertsModal({ onClose }) {
  const { alertEmail, alertPrefs, setAlertPrefs } = useLostFoundStore();
  const [email, setEmail] = useState(alertEmail);
  const [prefs, setPrefs] = useState({ ...alertPrefs });

  const handleSave = () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { toast.error('Enter a valid email'); return; }
    setAlertPrefs(email, prefs);
    toast.success('Alert preferences saved!');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-ink-950 border border-ink-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-ink-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Email Alerts</h2>
          </div>
          <button onClick={onClose} className="text-ink-600 hover:text-ink-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-ink-500">Get notified when new items matching your criteria are posted.</p>
          <div>
            <label className="label">Your Email</label>
            <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Alert me for category</label>
            <select className="input" value={prefs.category} onChange={e => setPrefs(p => ({ ...p, category: e.target.value }))}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Item Type</label>
            <select className="input" value={prefs.status} onChange={e => setPrefs(p => ({ ...p, status: e.target.value }))}>
              <option value="">Both Lost & Found</option>
              <option value="lost">Lost only</option>
              <option value="found">Found only</option>
            </select>
          </div>
          <div>
            <label className="label">Location keyword (optional)</label>
            <input type="text" className="input" placeholder="e.g. Library, Cafeteria…" value={prefs.location} onChange={e => setPrefs(p => ({ ...p, location: e.target.value }))} />
          </div>
        </div>
        <div className="p-4 border-t border-ink-800 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-sm px-4">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm">
            <Bell size={13} />Save Alerts
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ReportForm ────────────────────────────────────────────────────────────────

function ReportForm({ defaultType, onBack, onSuccess, currentUser }) {
  const { addItem, lfSettings } = useLostFoundStore();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      type: defaultType, title: '', category: '', description: '',
      location: '', date: new Date().toISOString().split('T')[0],
      // Feature: Default Contact Info — fall back to lfSettings when not signed in
      contactName:  currentUser?.email?.split('@')[0] ?? lfSettings?.defaultContactName ?? '',
      contactEmail: currentUser?.email               ?? lfSettings?.defaultContactEmail ?? '',
      tags: '', reward: '',
    },
  });

  const type         = watch('type');
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const fileInputRef                    = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    const tags = data.tags
      ? data.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];

    try {
      if (currentUser) {
        // Submit to server
        const fd = new FormData();
        fd.append('type', data.type);
        fd.append('title', data.title);
        fd.append('description', data.description);
        fd.append('category', data.category);
        fd.append('location', data.location);
        fd.append('item_date', data.date);
        fd.append('contact_name', data.contactName);
        fd.append('contact_email', data.contactEmail);
        fd.append('tags', JSON.stringify(tags));
        fd.append('reward', data.reward || '0');
        if (imageFile) fd.append('image', imageFile);
        await lfApi.createItem(fd);
        toast.success(`${data.type === 'lost' ? 'Lost' : 'Found'} item posted!`);
      } else {
        // Offline: local store only
        addItem({
          type: data.type, title: data.title, description: data.description,
          category: data.category, location: data.location, date: data.date,
          contactName: data.contactName, contactEmail: data.contactEmail,
          tags, reward: data.reward ? Number(data.reward) : 0,
        });
        toast.success('Item saved locally (sign in to post publicly)');
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to post item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-ink-500 hover:text-ink-300 mb-6 transition-colors">
        <ChevronLeft size={15} />Back
      </button>
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-ink-800">
          <h2 className="text-lg font-bold text-ink-100" style={{ fontFamily: 'Syne' }}>Report an Item</h2>
          <p className="text-xs text-ink-500 mt-0.5">Fill in as much detail as possible to help with identification</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          {/* Type toggle */}
          <div>
            <label className="label">Item Status</label>
            <div className="flex rounded-lg border border-ink-700 overflow-hidden">
              {[{ value: 'lost', label: 'I Lost Something' }, { value: 'found', label: 'I Found Something' }].map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setValue('type', value)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    type === value
                      ? value === 'lost' ? 'bg-danger/10 text-danger' : 'bg-emerald-500/10 text-emerald-400'
                      : 'text-ink-500 hover:bg-ink-800/50'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Title + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Title *</label>
              <input className={`input ${errors.title ? 'border-danger' : ''}`} placeholder="e.g. Black iPhone 14"
                {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-danger text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="label">Category *</label>
              <select className={`input ${errors.category ? 'border-danger' : ''}`}
                {...register('category', { required: 'Category is required' })}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {errors.category && <p className="text-danger text-xs mt-1">{errors.category.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <textarea className={`input resize-none ${errors.description ? 'border-danger' : ''}`} rows={3}
              placeholder="Describe the item in detail — color, brand, distinctive marks…"
              {...register('description', { required: 'Description is required', minLength: { value: 20, message: 'At least 20 characters' } })} />
            {errors.description && <p className="text-danger text-xs mt-1">{errors.description.message}</p>}
          </div>

          {/* Image upload (optional) */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Image size={13} className="text-ink-500" />
              Item Photo <span className="text-ink-600 font-normal">(optional, max 5 MB)</span>
            </label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="preview" className="h-32 rounded-lg object-cover border border-ink-700" />
                <button type="button" onClick={removeImage}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-danger flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 border border-dashed border-ink-700 rounded-lg cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-ink-800 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Image size={18} className="text-ink-500 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <p className="text-sm text-ink-400 group-hover:text-ink-300 transition-colors">Click to upload a photo</p>
                  <p className="text-xs text-ink-600">JPG, PNG, WebP, GIF</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Location + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Location *</label>
              <input className={`input ${errors.location ? 'border-danger' : ''}`} placeholder="e.g. Library – 2nd Floor"
                {...register('location', { required: 'Location is required' })} />
              {errors.location && <p className="text-danger text-xs mt-1">{errors.location.message}</p>}
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className={`input ${errors.date ? 'border-danger' : ''}`}
                {...register('date', { required: 'Date is required' })} />
              {errors.date && <p className="text-danger text-xs mt-1">{errors.date.message}</p>}
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Your Name *</label>
              <input className={`input ${errors.contactName ? 'border-danger' : ''}`} placeholder="Full name"
                {...register('contactName', { required: 'Name is required' })} />
              {errors.contactName && <p className="text-danger text-xs mt-1">{errors.contactName.message}</p>}
            </div>
            <div>
              <label className="label">Your Email *</label>
              <input type="email" className={`input ${errors.contactEmail ? 'border-danger' : ''}`} placeholder="you@example.com"
                {...register('contactEmail', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} />
              {errors.contactEmail && <p className="text-danger text-xs mt-1">{errors.contactEmail.message}</p>}
            </div>
          </div>

          {/* Tags + Reward */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tags</label>
              <input className="input" placeholder="apple, phone, black" {...register('tags')} />
              <p className="text-[11px] text-ink-600 mt-1">Comma-separated</p>
            </div>
            <div>
              <label className="label">Reward Offered ($)</label>
              <input type="number" min={0} className="input" placeholder="0 for no reward" {...register('reward')} />
            </div>
          </div>

          {!currentUser && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-400">Sign in to post publicly and enable chat. Otherwise the item saves locally only.</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <Plus size={14} />{submitting ? 'Posting…' : 'Post Listing'}
            </button>
            <button type="button" onClick={onBack} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MyListingsView ────────────────────────────────────────────────────────────

function MyListingsView({ onSelectItem, currentUser, serverItems }) {
  const { items: localItems } = useLostFoundStore();

  // Server items owned by this user + local items matching email
  const myServerItems = serverItems.filter(i => i.userEmail === currentUser?.email);
  const myLocalItems  = localItems.filter(
    i => i.contactEmail?.toLowerCase() === currentUser?.email?.toLowerCase() && !i.serverId
  );
  const all = [...myServerItems, ...myLocalItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (!currentUser) {
    return (
      <div className="py-20 text-center text-ink-600">
        <UserIcon size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium" style={{ fontFamily: 'Syne' }}>Not signed in</p>
      </div>
    );
  }

  if (all.length === 0) {
    return (
      <div className="py-20 text-center text-ink-600">
        <UserIcon size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-ink-400" style={{ fontFamily: 'Syne' }}>No listings yet</p>
        <p className="text-sm mt-1">Items you report will appear here</p>
      </div>
    );
  }

  const active   = all.filter(i => i.status === 'active').length;
  const resolved = all.filter(i => i.status === 'resolved').length;

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Posted', value: all.length,  color: 'rgb(var(--accent))',  bg: 'rgba(var(--accent),0.07)',  border: 'rgba(var(--accent),0.18)', Icon: Package },
          { label: 'Active',       value: active,      color: '#34d399',              bg: 'rgba(52,211,153,0.07)',     border: 'rgba(52,211,153,0.18)', Icon: Zap },
          { label: 'Resolved',     value: resolved,    color: '#94a3b8',              bg: 'rgba(148,163,184,0.06)',    border: 'rgba(148,163,184,0.15)', Icon: ShieldCheck },
        ].map(({ label, value, color, bg, border, Icon }) => (
          <div key={label} className="relative card p-4 text-center overflow-hidden hover:scale-105 transition-all duration-300"
            style={{ background: bg, borderColor: border }}>
            <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: color, opacity: 0.6 }} />
            <div className="w-7 h-7 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${color}25` }}>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="text-2xl font-black mb-0.5" style={{ fontFamily: 'Syne', color }}>{value}</p>
            <p className="text-[10px] text-ink-600 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map(item => <ItemCard key={item.id} item={item} onClick={onSelectItem} />)}
      </div>
    </div>
  );
}

// ── BrowseView ────────────────────────────────────────────────────────────────

function BrowseView({ onSelectItem, initialCategory, initialSearch, serverItems }) {
  const { items: localItems, lfSettings } = useLostFoundStore();
  const { user } = useAuth();
  const [search, setSearch]           = useState(initialSearch  || '');
  const [category, setCategory]       = useState(initialCategory || '');
  const [typeFilter, setTypeFilter]   = useState(lfSettings?.defaultTypeFilter || 'all');
  const [location, setLocation]       = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [rewardOnly, setRewardOnly]   = useState(lfSettings?.defaultRewardOnly || false);
  const [sortBy, setSortBy]           = useState(lfSettings?.defaultSort || 'newest');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage]               = useState(1);
  const [savedIds, setSavedIds]       = useState(new Set());
  const [savedItems, setSavedItems]   = useState([]);
  const [showSaved, setShowSaved]     = useState(false);

  // Load saved item IDs
  useEffect(() => {
    if (!user) return;
    lfApi.getSaved().then(({ data }) => {
      setSavedItems(data.items || []);
      setSavedIds(new Set((data.items || []).map(i => i.id)));
    }).catch(() => {});
  }, [user]);

  const handleToggleSave = async (item) => {
    if (!user) { toast.error('Sign in to save items'); return; }
    const id = item.serverId || item.id;
    if (!id) return;
    const isSaved = savedIds.has(Number(id));
    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev);
      isSaved ? next.delete(Number(id)) : next.add(Number(id));
      return next;
    });
    try {
      if (isSaved) {
        await lfApi.unsaveItem(id);
        setSavedItems(prev => prev.filter(i => i.id !== Number(id)));
        toast.success('Removed from saved');
      } else {
        await lfApi.saveItem(id);
        setSavedItems(prev => [...prev, { ...item, id: Number(id) }]);
        toast.success('Item saved!');
      }
    } catch {
      // Revert optimistic update
      setSavedIds(prev => {
        const next = new Set(prev);
        isSaved ? next.add(Number(id)) : next.delete(Number(id));
        return next;
      });
      toast.error('Failed to update saved items');
    }
  };

  // Merge server + local items (server items take precedence; dedupe by serverId)
  const allItems = useMemo(() => {
    const serverIds = new Set(serverItems.map(i => i.serverId).filter(Boolean));
    // Filter out local items that have a server counterpart (to avoid dups after page refresh)
    const filteredLocal = localItems.filter(i => !serverIds.has(i.serverId));
    return [...serverItems, ...filteredLocal];
  }, [serverItems, localItems]);

  const filtered = useMemo(() => {
    let list = [...allItems];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.contactName.toLowerCase().includes(q) ||
        i.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    if (category) list = list.filter(i => i.category === category);
    if (typeFilter !== 'all') list = list.filter(i =>
      typeFilter === 'resolved' ? i.status === 'resolved' : i.type === typeFilter && i.status !== 'resolved'
    );
    if (location.trim()) list = list.filter(i => i.location.toLowerCase().includes(location.toLowerCase()));
    if (dateFrom) list = list.filter(i => i.date >= dateFrom);
    if (dateTo)   list = list.filter(i => i.date <= dateTo);
    if (rewardOnly) list = list.filter(i => i.reward > 0);
    // Feature: Auto-Expire — mark active items older than threshold
    if (lfSettings?.autoExpireEnabled && lfSettings?.autoExpireDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - lfSettings.autoExpireDays);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.map(item => ({
        ...item,
        _expired: item.status === 'active' && (item.createdAt?.split('T')[0] ?? item.date ?? '') < cutoffStr,
      }));
    }
    if (sortBy === 'newest') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sortBy === 'oldest') list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (sortBy === 'reward') list.sort((a, b) => (b.reward || 0) - (a.reward || 0));
    return list;
  }, [allItems, search, category, typeFilter, location, dateFrom, dateTo, rewardOnly, sortBy, lfSettings]);

  const clearFilters = () => {
    setSearch(''); setCategory(''); setTypeFilter('all');
    setLocation(''); setDateFrom(''); setDateTo('');
    setRewardOnly(false); setSortBy('newest'); setPage(1);
  };

  // Reset page when any filter changes
  useEffect(() => { setPage(1); }, [search, category, typeFilter, location, dateFrom, dateTo, rewardOnly, sortBy]);

  const hasFilters = category || typeFilter !== 'all' || location || dateFrom || dateTo || rewardOnly;

  // Feature: Pagination
  const effectivePageSize = (lfSettings?.itemsPerPage ?? 0) > 0 ? lfSettings.itemsPerPage : null;
  const displayedItems    = effectivePageSize ? filtered.slice(0, page * effectivePageSize) : filtered;
  const hasMore           = effectivePageSize ? page * effectivePageSize < filtered.length : false;

  return (
    <div>
      {/* ── Search bar ── */}
      <div className="flex items-center gap-2 mb-5 p-1.5 bg-ink-900/50 rounded-2xl border border-ink-800/80">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
          <input
            className="w-full bg-transparent text-ink-100 placeholder-ink-600 pl-11 pr-4 py-2.5 text-sm focus:outline-none"
            placeholder="Search items, locations, tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 pr-1 flex-shrink-0">
          {user && (
            <button onClick={() => setShowSaved(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all duration-200 ${
                showSaved
                  ? 'border-accent text-accent bg-accent/10 shadow-sm shadow-accent/20'
                  : 'border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-300'
              }`}>
              <Bookmark size={12} />
              Saved
              {savedIds.size > 0 && <span className="text-[10px] font-bold">{savedIds.size}</span>}
            </button>
          )}
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all duration-200 ${
              showFilters || hasFilters
                ? 'border-accent text-accent bg-accent/10 shadow-sm shadow-accent/20'
                : 'border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-300'
            }`}>
            <Filter size={12} />
            {hasFilters ? 'Filtered' : 'Filter'}
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
          </button>
          <select
            className="text-xs bg-ink-800 border border-ink-700 text-ink-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-accent cursor-pointer transition-colors"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="reward">Reward ↑</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="card p-4 mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input text-sm" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="label">Location keyword</label>
            <input className="input text-sm" placeholder="Library, Cafeteria…"
              value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label">Date From</label>
              <input type="date" className="input text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="label">Date To</label>
              <input type="date" className="input text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-accent w-4 h-4" checked={rewardOnly} onChange={e => setRewardOnly(e.target.checked)} />
              <span className="text-sm text-ink-400">Show items with reward only</span>
            </label>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-ink-500 hover:text-ink-300 flex items-center gap-1 transition-colors">
                <X size={11} />Clear all
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {showSaved ? (
            <>
              <span className="text-sm font-bold text-ink-200" style={{ fontFamily: 'Syne' }}>{savedItems.length}</span>
              <span className="text-xs text-ink-600">saved items</span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-ink-200" style={{ fontFamily: 'Syne' }}>{filtered.length}</span>
              <span className="text-xs text-ink-600">items found</span>
              {serverItems.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold">
                  <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />{serverItems.length} live
                </span>
              )}
            </>
          )}
        </div>
        {!showSaved && hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-ink-500 hover:text-accent transition-colors">
            <X size={11} />Clear filters
          </button>
        )}
      </div>

      {showSaved ? (
        savedItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={onSelectItem}
                isSaved={true}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-ink-600">
            <Bookmark size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium" style={{ fontFamily: 'Syne' }}>No saved items yet</p>
            <p className="text-sm mt-1">Tap the bookmark icon on any item to save it for later</p>
          </div>
        )
      ) : filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={onSelectItem}
                isSaved={savedIds.has(Number(item.serverId || item.id))}
                onToggleSave={user ? handleToggleSave : undefined}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="inline-flex items-center gap-2 text-sm border border-ink-700 rounded-lg px-6 py-2.5 text-ink-400 hover:border-accent hover:text-accent hover:bg-accent/5 transition-all"
              >
                Load More
                <span className="text-xs text-ink-600">({filtered.length - page * effectivePageSize} remaining)</span>
              </button>
            </div>
          )}
          {effectivePageSize && (
            <p className="text-center text-[11px] text-ink-600 mt-3">
              Showing {Math.min(displayedItems.length, filtered.length)} of {filtered.length} items
            </p>
          )}
        </>
      ) : (
        <div className="py-16 text-center text-ink-600">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium" style={{ fontFamily: 'Syne' }}>No items match your search</p>
          <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-3 text-xs text-accent hover:text-accent-hover transition-colors">
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── HomeView ──────────────────────────────────────────────────────────────────

function HomeView({ onBrowse, onReport, onSelectItem, serverItems }) {
  const { items: localItems } = useLostFoundStore();
  const [heroSearch, setHeroSearch] = useState('');

  const allItems = useMemo(() => {
    const serverIds = new Set(serverItems.map(i => i.serverId).filter(Boolean));
    return [...serverItems, ...localItems.filter(i => !serverIds.has(i.serverId))];
  }, [serverItems, localItems]);

  const stats = useMemo(() => ({
    total:    allItems.length,
    lost:     allItems.filter(i => i.type === 'lost'  && i.status !== 'resolved').length,
    found:    allItems.filter(i => i.type === 'found' && i.status !== 'resolved').length,
    resolved: allItems.filter(i => i.status === 'resolved').length,
  }), [allItems]);

  const recentItems = useMemo(() =>
    [...allItems].filter(i => i.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [allItems]
  );

  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden border border-accent/15">
        {/* Layered background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(var(--accent),0.11) 0%, rgba(var(--accent),0.04) 55%, transparent 100%)' }} />
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(var(--accent)) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        {/* Glow orb */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10 pointer-events-none blur-3xl"
          style={{ background: 'rgb(var(--accent))' }} />

        <div className="relative px-4 sm:px-8 py-8 sm:py-12 text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/25 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-accent font-bold uppercase tracking-[0.14em]">Live Campus Board</span>
          </div>

          <h1 className="text-4xl font-black text-ink-50 mb-3 leading-[1.15]" style={{ fontFamily: 'Syne' }}>
            Lost Something?<br />
            <span style={{ color: 'rgb(var(--accent))' }}>We'll Help You Find It.</span>
          </h1>
          <p className="text-sm text-ink-500 mb-8 max-w-sm mx-auto leading-relaxed">
            Browse listings, report missing or found items, and chat directly with finders.
          </p>

          {/* Search */}
          <form onSubmit={e => { e.preventDefault(); onBrowse(heroSearch); }} className="flex gap-2 max-w-lg mx-auto mb-8">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                className="w-full bg-ink-950/80 border border-ink-700 text-ink-100 placeholder-ink-600 rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 backdrop-blur-sm transition-all"
                placeholder="Search for your lost item…"
                value={heroSearch}
                onChange={e => setHeroSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary px-6 rounded-xl whitespace-nowrap">Search</button>
          </form>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => onReport('lost')}
              className="flex items-center gap-2 text-sm border border-danger/30 text-danger bg-danger/8 hover:bg-danger/15 hover:border-danger/50 rounded-xl px-5 py-2.5 transition-all duration-300 font-semibold">
              <AlertTriangle size={14} />I Lost Something
            </button>
            <button onClick={() => onReport('found')}
              className="flex items-center gap-2 text-sm border border-emerald-500/30 text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/15 hover:border-emerald-500/50 rounded-xl px-5 py-2.5 transition-all duration-300 font-semibold">
              <CheckCircle size={14} />I Found Something
            </button>
            <button onClick={() => onBrowse('')}
              className="flex items-center gap-2 text-sm border border-ink-700 text-ink-400 hover:border-accent/50 hover:text-accent hover:bg-accent/5 rounded-xl px-5 py-2.5 transition-all duration-300">
              <Search size={14} />Browse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Listings', value: stats.total,    color: 'rgb(var(--accent))',  bg: 'rgba(var(--accent),0.07)',  border: 'rgba(var(--accent),0.18)', Icon: Package },
          { label: 'Lost Items',     value: stats.lost,     color: '#f87171',              bg: 'rgba(248,113,113,0.07)',    border: 'rgba(248,113,113,0.18)', Icon: AlertTriangle },
          { label: 'Found Items',    value: stats.found,    color: '#34d399',              bg: 'rgba(52,211,153,0.07)',     border: 'rgba(52,211,153,0.18)', Icon: CheckCircle },
          { label: 'Resolved',       value: stats.resolved, color: '#94a3b8',              bg: 'rgba(148,163,184,0.06)',    border: 'rgba(148,163,184,0.15)', Icon: ShieldCheck },
        ].map(({ label, value, color, bg, border, Icon }) => (
          <div key={label} className="relative card p-4 text-center overflow-hidden group hover:scale-105 transition-all duration-300"
            style={{ background: bg, borderColor: border }}>
            <div className="absolute inset-x-0 bottom-0 h-0.5 opacity-60" style={{ background: color }} />
            <div className="w-8 h-8 rounded-xl mx-auto mb-2.5 flex items-center justify-center" style={{ background: `${color}20` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-2xl font-black mb-0.5" style={{ fontFamily: 'Syne', color }}>{value}</p>
            <p className="text-[10px] text-ink-600 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Category grid ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full bg-accent" />
            <h2 className="text-sm font-bold text-ink-200 uppercase tracking-wider" style={{ fontFamily: 'Syne' }}>Browse by Category</h2>
          </div>
          <button onClick={() => onBrowse('')}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-medium">
            View all <ChevronRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {CATEGORIES.map(cat => {
            const CatIcon = getCategoryIcon(cat.id);
            const count = allItems.filter(i => i.category === cat.id && i.status === 'active').length;
            return (
              <button key={cat.id} onClick={() => onBrowse('', cat.id)}
                className="group relative card p-3 flex flex-col items-center gap-2 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/12">
                <div className="w-10 h-10 rounded-xl bg-ink-800 flex items-center justify-center group-hover:bg-accent/15 group-hover:scale-110 transition-all duration-300">
                  <CatIcon size={18} className="text-ink-400 group-hover:text-accent transition-colors duration-300" />
                </div>
                <span className="text-[10px] text-ink-500 group-hover:text-ink-300 transition-colors text-center leading-tight">{cat.label}</span>
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center shadow-sm shadow-accent/50">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Recent listings ── */}
      {recentItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-accent" />
              <h2 className="text-sm font-bold text-ink-200 uppercase tracking-wider" style={{ fontFamily: 'Syne' }}>Recent Listings</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold">{recentItems.length} new</span>
            </div>
            <button onClick={() => onBrowse('')}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-medium">
              Browse all <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentItems.map(item => <ItemCard key={item.id} item={item} onClick={onSelectItem} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LostFoundPage() {
  const location = useLocation();
  const [animateIn, setAnimateIn] = useState(false);
  const { user } = useAuth();
  const { resolveItem, deleteItem } = useLostFoundStore();

  const [view, setView]               = useState('home');
  const [reportType, setReportType]   = useState('lost');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAlerts, setShowAlerts]   = useState(false);
  const [browseSearch, setBrowseSearch]     = useState('');
  const [browseCategory, setBrowseCategory] = useState('');

  // Server-side items
  const [serverItems, setServerItems] = useState([]);

  useEffect(() => {
    setAnimateIn(false);
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Fetch server items on mount and after certain actions
  const fetchServerItems = useCallback(async () => {
    try {
      const { data } = await lfApi.getItems();
      setServerItems(data.items.map(normalizeServerItem));
    } catch {
      // Server unavailable — local store items shown as fallback
    }
  }, []);

  useEffect(() => { fetchServerItems(); }, [fetchServerItems]);

  const navTabs = [
    { id: 'home',     label: 'Home' },
    { id: 'browse',   label: 'Browse' },
    { id: 'profile',  label: 'My Listings' },
  ];

  const handleBrowse = (search = '', category = '') => {
    setBrowseSearch(search);
    setBrowseCategory(category);
    setView('browse');
  };

  const handleReport = (type) => {
    setReportType(type);
    setView('report');
  };

  const handleResolve = async (item) => {
    if (item._source === 'server') {
      try {
        await lfApi.resolveItem(item.serverId);
        setServerItems(prev =>
          prev.map(i => i.serverId === item.serverId ? { ...i, status: 'resolved' } : i)
        );
        setSelectedItem(s => s?.id === item.id ? { ...s, status: 'resolved' } : s);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to resolve');
      }
    } else {
      resolveItem(item.id);
      setSelectedItem(s => s?.id === item.id ? { ...s, status: 'resolved' } : s);
    }
  };

  const handleDelete = async (item) => {
    if (item._source === 'server') {
      try {
        await lfApi.deleteItem(item.serverId);
        setServerItems(prev => prev.filter(i => i.serverId !== item.serverId));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to delete');
      }
    } else {
      deleteItem(item.id);
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto transition-all duration-700 ${
      animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
      <div className="w-full p-4 sm:p-6">
        {/* ── Header ── */}
        <div className="relative mb-8 pb-6">
          {/* Gradient accent line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, rgb(var(--accent)) 0%, rgba(var(--accent),0.15) 60%, transparent 100%)' }} />

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
                  <Package size={13} className="text-accent" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent/75">Campus Board</span>
              </div>
              <h1 className="text-2xl font-black text-ink-50 leading-tight" style={{ fontFamily: 'Syne' }}>Lost & Found</h1>
              <p className="text-xs text-ink-500 mt-1">Help reunite lost items with their owners</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 pt-1">
              <button onClick={() => setShowAlerts(true)}
                className="flex items-center gap-2 text-sm border border-ink-700 rounded-xl px-3.5 py-2 text-ink-400 hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-all duration-300">
                <Bell size={14} />
                <span className="hidden sm:inline">Alerts</span>
              </button>
              <button onClick={() => handleReport('lost')} className="btn-primary flex items-center gap-2 text-sm rounded-xl">
                <Plus size={14} />Report Item
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab nav ── */}
        {view !== 'report' && (
          <div className="flex items-center gap-1 mb-6 p-1 bg-ink-900/60 rounded-2xl border border-ink-800/80 overflow-x-auto hide-scrollbar w-full sm:w-fit">
            {navTabs.map(tab => (
              <button key={tab.id}
                onClick={() => {
                  setView(tab.id);
                }}
                onMouseMove={(e) => {
                  const target = e.currentTarget;
                  if (!target) return;
                  const rect = target.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  requestAnimationFrame(() => {
                    if (target) {
                      target.style.setProperty('--magnifier-x', `${x}px`);
                      target.style.setProperty('--magnifier-y', `${y}px`);
                    }
                  });
                }}
                className={`lf-tab-pill relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all ${
                  view === tab.id ? 'lf-tab-pill-active' : 'lf-tab-pill-inactive'
                } ${tab.id === 'browse' ? 'lf-tab-browse' : ''}`}>
                {tab.icon && <tab.icon size={13} />}
                {tab.label}
                {tab.unread > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {tab.unread > 9 ? '9+' : tab.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {view === 'home' && (
          <HomeView onBrowse={handleBrowse} onReport={handleReport} onSelectItem={setSelectedItem} serverItems={serverItems} />
        )}
        {view === 'browse' && (
          <BrowseView
            key={`${browseSearch}|${browseCategory}`}
            onSelectItem={setSelectedItem}
            initialCategory={browseCategory}
            initialSearch={browseSearch}
            serverItems={serverItems}
          />
        )}
        {view === 'profile' && (
          <MyListingsView onSelectItem={setSelectedItem} currentUser={user} serverItems={serverItems} />
        )}
        {view === 'report' && (
          <ReportForm
            defaultType={reportType}
            onBack={() => setView('home')}
            onSuccess={() => { fetchServerItems(); setView('profile'); }}
            currentUser={user}
          />
        )}
      </div>

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          currentUser={user}
          onClose={() => setSelectedItem(null)}
          onResolve={(item) => { handleResolve(item); toast.success('Marked as resolved!'); }}
          onDelete={(item) => { handleDelete(item); setSelectedItem(null); }}
        />
      )}

      {showAlerts && <AlertsModal onClose={() => setShowAlerts(false)} />}
    </div>
  );
}
