import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft, MessageCircle, Mail, Send, Paperclip, Smile, X, FileText as FileIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { lfApi, presenceApi } from '../api';

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return (Date.now() - new Date(lastSeen + 'Z').getTime()) < 3 * 60 * 1000;
}

function lastSeenText(lastSeen) {
  if (!lastSeen) return 'Offline';
  const diff = Math.floor((Date.now() - new Date(lastSeen + 'Z').getTime()) / 1000);
  if (diff < 180) return 'Active now';
  if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
  return `Active ${Math.floor(diff / 86400)}d ago`;
}

// ── Helper functions ──────────────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

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

// ── ChatView ────────────────────────────────────────────────────────────────────
function ChatView({ conversation, currentUser, onBack, otherUserLastSeen }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [unsending, setUnsending] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const messagesEndRef             = useRef(null);
  const pollRef                    = useRef(null);
  const emojiPickerRef             = useRef(null);
  const fileInputRef               = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await lfApi.getMessages(conversation.id);
      setMessages(data.messages);
    } catch (err) {
      if (err.response?.status !== 401) console.error('[Chat] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    loadMessages();
    // Poll every 4 seconds for new messages
    pollRef.current = setInterval(loadMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  useEffect(() => { 
    scrollToBottom(); 
  }, [messages.length, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const { data } = await lfApi.sendMessage(conversation.id, text);
      const newMsg = { ...data.message, reactions: [] };
      setMessages(prev => [...prev, newMsg]);
      toast.success('Message sent', { duration: 2000 });
      requestAnimationFrame(() => scrollToBottom());
    } catch (err) {
      toast.error('Failed to send message');
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversation.id, scrollToBottom]);

  const handleUnsend = useCallback(async (messageId) => {
    if (!confirm('Remove this message?')) return;
    setUnsending(messageId);
    try {
      await lfApi.unsendMessage(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, text: '[Message unsent]' } : m));
      toast.success('Message unsent', { duration: 2000 });
    } catch (err) {
      console.error('[Chat] Unsend error:', err);
      toast.error(err.response?.data?.error || 'Failed to unsend message');
    } finally {
      setUnsending(null);
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleEmojiClick = useCallback((emoji) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await lfApi.sendMessage(conversation.id, '', formData);
      const newMsg = { ...data.message, reactions: [] };
      setMessages(prev => [...prev, newMsg]);
      toast.success('File sent', { duration: 2000 });
      requestAnimationFrame(() => scrollToBottom());
    } catch (err) {
      toast.error('Failed to send file');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [conversation.id, scrollToBottom]);

  const handleAddReaction = useCallback(async (messageId, emoji) => {
    try {
      // Update UI immediately for instant feedback
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const reactions = m.reactions ? [...m.reactions] : [];
          const userReactionIndex = reactions.findIndex(r => r.sender_email === currentUser.email && r.emoji === emoji);
          
          if (userReactionIndex !== -1) {
            // Toggle off - remove reaction
            reactions.splice(userReactionIndex, 1);
          } else {
            // Add new reaction
            reactions.push({ emoji, sender_email: currentUser.email });
          }
          return { ...m, reactions };
        }
        return m;
      }));
      
      // Send to server asynchronously - don't block UI
      lfApi.addReaction(messageId, emoji).catch(err => {
        console.error('Reaction sync error:', err);
        toast.error('Failed to sync reaction', { duration: 1500 });
      });
      
      // Close picker after reaction
      setShowReactions(null);
    } catch (err) {
      console.error('Reaction error:', err);
      toast.error('Failed to update reaction');
    }
  }, [currentUser.email]);

  const otherEmail = currentUser.email === conversation.item_owner_email
    ? conversation.inquirer_email
    : conversation.item_owner_email;

  const handleEndConversation = async () => {
    if (!confirm('Are you sure? This will end the conversation and hide all messages from both sides.')) return;
    
    try {
      await lfApi.endConversation(conversation.id);
      toast.success('Conversation ended');
      onBack(); // Go back to conversations list
    } catch (err) {
      console.error('Error ending conversation:', err);
      toast.error('Failed to end conversation');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 border-b border-ink-800 bg-ink-950 rounded-t-xl flex-shrink-0">
        <button onClick={onBack} className="text-ink-500 hover:text-ink-300 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
            <span className="text-accent text-xs font-bold">{otherEmail?.[0]?.toUpperCase() || '?'}</span>
          </div>
          {isOnline(otherUserLastSeen) && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border border-ink-950" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-100 truncate">{otherEmail}</p>
          <p className="text-xs text-ink-500 truncate">
            {otherUserLastSeen && (
              <span className={`mr-1.5 ${isOnline(otherUserLastSeen) ? 'text-green-400' : ''}`}>
                {lastSeenText(otherUserLastSeen)} ·&nbsp;
              </span>
            )}
            {conversation.item_type === 'system' ? (
              <span className="text-accent font-semibold">💬 Developer Support</span>
            ) : (
              <>Re: <span className="text-ink-400">{conversation.item_title}</span></>
            )}
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
          Chat — 10 day history
        </span>
        {currentUser?.email === conversation.item_owner_email && (
          <button
            onClick={handleEndConversation}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 transition-all active:scale-95 flex items-center gap-1.5 border border-slate-700"
            title="End this conversation"
          >
            <X size={14} />
            End Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-visible p-4 space-y-4 bg-ink-950/50 flex flex-col items-stretch relative">
        <div className="flex-1 overflow-y-auto flex flex-col space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-ink-600 gap-3">
            <MessageCircle size={36} className="opacity-30" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex w-full ${msg.is_mine ? 'justify-end' : 'justify-start'} group items-start relative`}>
              <div className={`max-w-[65%] relative`}>
                <div className={`rounded-2xl px-4 py-2.5 ${
                  msg.is_mine
                    ? 'bg-accent text-white rounded-br-sm shadow-md'
                    : 'bg-ink-700 border border-ink-600 text-ink-200 rounded-bl-sm shadow-sm'
                } ${msg.is_deleted ? 'opacity-60 italic' : ''}`}>
                  {msg.file_path && (
                    <div className="mb-2">
                      {msg.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={msg.file_path} alt="attachment" className="max-w-[200px] rounded" />
                      ) : (
                        <a href={msg.file_path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                          <FileIcon size={16} />
                          {msg.file_name || 'File'}
                        </a>
                      )}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                </div>
                <div className={`flex items-center justify-between mt-1 px-2 gap-2 ${msg.is_mine ? 'flex-row-reverse' : ''}`}>
                  {msg.text.includes('Thank you for accepting our message request') && (
                    <p className="text-[10px] text-accent font-semibold">💬 Developer Team</p>
                  )}
                  {!msg.text.includes('Thank you for accepting our message request') && !msg.is_mine && (
                    <p className="text-[10px] text-ink-400 font-medium flex-1">{msg.sender_email}</p>
                  )}
                  <p className={`text-[10px] flex-shrink-0 ${msg.is_mine ? 'text-ink-500' : 'text-ink-600'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
              <div className="ml-2 flex gap-1 flex-col items-center justify-center">
                {/* Reactions Badge */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 text-[15px]">
                    {[...new Map(msg.reactions.map(r => [r.emoji, r])).values()].map((r) => (
                      <span key={r.emoji} className="leading-none">
                        {r.emoji}{msg.reactions.filter(x => x.emoji === r.emoji).length > 1 && msg.reactions.filter(x => x.emoji === r.emoji).length}
                      </span>
                    ))}
                  </div>
                )}
                {!msg.is_deleted && (
                  <div className="relative inline-flex items-center gap-0.5">
                    <button
                      onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                      className="p-1 text-ink-500 hover:text-accent transition-colors"
                      title="Add reaction"
                    >
                      <Smile size={14} />
                    </button>
                  </div>
                )}
                {msg.is_mine && !msg.is_deleted && (
                  <button
                    onClick={() => handleUnsend(msg.id)}
                    disabled={unsending === msg.id}
                    className="p-1 text-ink-600 hover:text-danger disabled:opacity-40 transition-colors"
                    title="Unsend message"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {/* Reaction Picker - Above message */}
              {showReactions === msg.id && !msg.is_deleted && (
                <div className={`absolute mb-2 bg-ink-900 border-2 border-accent rounded-lg p-2 shadow-2xl z-[9999] flex gap-1 items-center whitespace-nowrap ${msg.is_mine ? 'right-0 bottom-full' : 'left-0 bottom-full'}`}>
                  {['👍', '❤️', '😂', '🔥'].map((emoji) => {
                    const isSelected = msg.reactions?.some(r => r.sender_email === currentUser.email && r.emoji === emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        className={`text-lg hover:scale-125 transition-all active:scale-95 ${
                          isSelected ? 'scale-125 ring-2 ring-accent' : ''
                        }`}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setShowReactions('expanded_' + msg.id)}
                    className="text-lg hover:scale-125 transition-all px-1"
                    title="More reactions"
                  >
                    +
                  </button>
                </div>
              )}
              
              {/* Expanded Reaction Picker */}
              {showReactions === 'expanded_' + msg.id && !msg.is_deleted && (
                <div className={`absolute mb-2 bg-ink-900 border-2 border-accent rounded-lg p-3 shadow-2xl z-[9999] ${msg.is_mine ? 'right-0 bottom-full' : 'left-0 bottom-full'}`}>
                  <div className="flex gap-1 flex-wrap mb-2 max-w-xs">
                    {['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '✨', '🎉', '🤔', '😍', '😲', '💯', '🚀', '🙏', '😎', '🤲', '💪', '🤝', '😄'].map((emoji) => {
                      const isSelected = msg.reactions?.some(r => r.sender_email === currentUser.email && r.emoji === emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(msg.id, emoji)}
                          className={`text-xl hover:scale-125 transition-all active:scale-95 ${
                            isSelected ? 'scale-125 ring-2 ring-accent' : ''
                          }`}
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setShowReactions(msg.id)}
                    className="w-full text-xs px-2 py-1 rounded bg-ink-800 hover:bg-ink-700 text-ink-300 transition-colors"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>

      {/* Input */}
      <div className="p-3 border-t border-ink-800 bg-ink-950 rounded-b-xl flex-shrink-0">
        {/* Emoji Picker Popup */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-20 left-4 bg-ink-900 border border-ink-700 rounded-lg p-3 shadow-lg z-50 max-w-xs">
            <div className="grid grid-cols-8 gap-2">
              {['😀', '😂', '😍', '🤔', '😢', '😡', '🎉', '🎊', '👍', '👎', '❤️', '🔥', '✨', '🌟', '💯', '🚀', '😎', '🤩', '😴', '🤮', '😷', '🤐', '😶', '🤫', '😗', '😘', '😚', '😙', '🥰', '😇', '🤗', '😏'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-xl hover:bg-ink-800 p-1 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-lg bg-ink-800 hover:bg-ink-700 flex items-center justify-center transition-colors flex-shrink-0 relative"
            title="Add emoji"
          >
            <Smile size={15} className="text-accent" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="w-10 h-10 rounded-lg bg-ink-800 hover:bg-ink-700 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0"
            title="Upload file"
          >
            <Paperclip size={15} className="text-accent" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            disabled={sending}
          />
          <textarea
            className="input flex-1 resize-none text-sm min-h-[40px] max-h-[120px]"
            placeholder="Type a message… (Enter to send)"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
        <p className="text-[10px] text-ink-600 mt-1">Messages are encrypted and kept for 10 days</p>
      </div>
    </div>
  );
}

// ── MessagesView ──────────────────────────────────────────────────────────────
export function MessagesView({ currentUser, openConvId, onUnreadChange }) {
  const [conversations, setConversations] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const lastConvCountRef = useRef(0);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await lfApi.getConversations();
      setConversations(data.conversations);
      
      // Count conversations with new messages (those with unread flag or lastMessage newer than last visit)
      const newUnreadCount = data.conversations.filter(c => c.unread).length;
      if (newUnreadCount !== lastConvCountRef.current) {
        lastConvCountRef.current = newUnreadCount;
        onUnreadChange?.(newUnreadCount);
      }
      
      // Auto-open if requested
      if (openConvId && !activeConv) {
        const found = data.conversations.find(c => c.id === openConvId);
        if (found) setActiveConv(found);
      }
    } catch (err) {
      if (err.response?.status !== 401) console.error('[Messages] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [openConvId, activeConv, onUnreadChange]);

  const loadIncomingRequests = useCallback(async () => {
    try {
      const { data } = await lfApi.getIncomingMessageRequests();
      setIncomingRequests(data.requests || []);
      
      // Also count pending requests as notifications
      const pendingCount = (data.requests || []).filter(r => r.status === 'pending').length;
      if (pendingCount > 0 && onUnreadChange) {
        lastConvCountRef.current = pendingCount;
        onUnreadChange(pendingCount);
      }
    } catch (err) {
      // Silently fail on initial load - table might not exist yet
      if (err.response?.status !== 404) {
        console.error('[Requests] load error:', err.message);
      }
      setIncomingRequests([]);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    loadConversations();
    loadIncomingRequests();
    const conversationInterval = setInterval(loadConversations, 500);
    const requestInterval = setInterval(loadIncomingRequests, 500);
    return () => {
      clearInterval(conversationInterval);
      clearInterval(requestInterval);
    };
  }, [loadConversations, loadIncomingRequests]);

  // Poll online status for all conversation participants
  useEffect(() => {
    if (conversations.length === 0) return;
    const emails = [...new Set(conversations.map(c =>
      c.item_owner_email === currentUser.email ? c.inquirer_email : c.item_owner_email
    ))].filter(Boolean);
    if (emails.length === 0) return;
    const poll = async () => {
      try {
        const { data } = await presenceApi.getOnlineStatus(emails);
        setOnlineStatuses(data.statuses || {});
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [conversations, currentUser.email]);

  const handleRespondRequest = async (id, accepted) => {
    try {
      await lfApi.respondToMessageRequest(id, accepted);
      toast.success(accepted ? 'Request accepted! Opening conversation...' : 'Request rejected');
      
      if (accepted) {
        // Wait for database commit
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Reload conversations
        const { data: convData } = await lfApi.getConversations();
        setConversations(convData.conversations);
        
        // Find system conversation
        const systemConv = convData.conversations.find(c => 
          c.item_id === 0 || c.item_type === 'system'
        );
        
        if (systemConv) {
          setActiveConv(systemConv);
        }
      }
      
      loadIncomingRequests();
    } catch (err) {
      console.error('[MessagesView] Error responding to request:', err);
      toast.error('Failed to respond to request');
    }
  };

  if (!currentUser) {
    return (
      <div className="py-20 text-center text-ink-600">
        <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium" style={{ fontFamily: 'Syne' }}>Sign in to view messages</p>
        <p className="text-sm mt-1">Chat with item owners to inquire or claim items</p>
      </div>
    );
  }

  if (activeConv) {
    const otherEmail = activeConv.item_owner_email === currentUser.email
      ? activeConv.inquirer_email : activeConv.item_owner_email;
    return (
      <ChatView
        conversation={activeConv}
        currentUser={currentUser}
        onBack={() => { setActiveConv(null); loadConversations(); }}
        otherUserLastSeen={onlineStatuses[otherEmail] || null}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show incoming requests even if no conversations
  if (conversations.length === 0 && incomingRequests.length === 0) {
    return (
      <div className="py-20 text-center text-ink-600">
        <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-ink-400" style={{ fontFamily: 'Syne' }}>No conversations yet</p>
        <p className="text-sm mt-1">Browse items and click "Chat with Owner" to start a conversation</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Incoming Message Requests */}
      {incomingRequests.length > 0 && (
        <div className="space-y-3 p-5 rounded-xl bg-slate-50 border-2 border-slate-300 shadow-lg">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide" style={{ fontFamily: 'Syne' }}>
            <Mail size={16} />
            📬 New Message Requests ({incomingRequests.filter(r => r.status === 'pending').length})
          </p>
          {incomingRequests.map(req => (
            <div key={req.id} className="p-4 rounded-lg bg-white border-2 border-slate-200 space-y-3 shadow-md hover:shadow-lg transition-shadow">
              <div>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  💬 From: <span className="text-slate-700 font-semibold">{req.admin_email}</span>
                </p>
                {req.message && (
                  <p className="text-sm text-slate-800 mt-2 p-3 bg-slate-100 rounded italic border-l-4 border-slate-400">
                    "{req.message}"
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-2">
                  {new Date(req.created_at).toLocaleString()}
                </p>
              </div>
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondRequest(req.id, true)}
                    className="flex-1 px-4 py-2.5 text-sm font-bold rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 transition-all active:scale-95 border border-slate-700"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => handleRespondRequest(req.id, false)}
                    className="flex-1 px-4 py-2.5 text-sm font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-95 border border-gray-300"
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
              {req.status !== 'pending' && (
                <p className="text-sm font-semibold text-slate-700">
                  Status: <span className={req.status === 'accepted' ? 'text-slate-800 font-bold' : 'text-gray-600'}>
                    {req.status === 'accepted' ? '✓ Accepted' : '✕ Rejected'}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Conversations */}
      <div>
        <p className="text-xs text-ink-500 mb-2">
          <span className="text-ink-200 font-semibold">{conversations.length}</span> conversation{conversations.length !== 1 ? 's' : ''}
          — messages stored encrypted for 10 days
        </p>
        {conversations.length === 0 ? (
          <div className="py-8 text-center text-ink-600">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm text-ink-400">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(conv => {
              const isOwner = conv.item_owner_email === currentUser.email;
              const otherEmail = isOwner ? conv.inquirer_email : conv.item_owner_email;

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className="w-full flex items-center gap-3 p-4 card hover:border-accent/50 hover:bg-ink-900/60 transition-all text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <span className="text-accent text-xs font-bold">{otherEmail?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    {isOnline(onlineStatuses[otherEmail]) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-ink-950" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-ink-200 truncate">{otherEmail}</p>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-ink-600 flex-shrink-0 ml-2">{formatDate(conv.lastMessage.created_at)}</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-500 truncate">
                      {conv.item_type === 'system' ? (
                        <span className="text-accent font-semibold">💬 Developer Support</span>
                      ) : (
                        <>
                          Re: <span className="text-ink-400">{conv.item_title}</span>
                          <span className={`ml-1.5 text-[10px] ${conv.item_type === 'lost' ? 'text-danger' : 'text-emerald-400'}`}>
                            ({conv.item_type})
                          </span>
                        </>
                      )}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-xs text-ink-600 truncate mt-0.5">
                        {conv.lastMessage.sender_email === currentUser.email ? 'You: ' : ''}
                        {conv.lastMessage.text}
                      </p>
                    )}
                  </div>
                  <MessageCircle size={14} className="text-ink-600 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
