/**
 * Lost & Found Enhanced Messaging Features API
 * Handles read receipts, message editing, typing indicators, pinning, etc.
 */

import api from './index';

// ── READ RECEIPTS ──────────────────────────────────────────────────────────
export const readReceiptsApi = {
  // Mark conversation as read up to specific message
  markAsRead: async (conversationId: number, lastReadMessageId: number) => {
    const { data } = await api.put(
      `/lostfound/conversations/${conversationId}/read`,
      { lastReadMessageId }
    );
    return data;
  },

  // Get read status for all users in conversation
  getReadStatus: async (conversationId: number) => {
    const { data } = await api.get(`/lostfound/conversations/${conversationId}/read-status`);
    return data;
  },
};

// ── MESSAGE EDITING ────────────────────────────────────────────────────────
export const messageEditApi = {
  // Edit a previously sent message
  editMessage: async (messageId: number, text: string) => {
    const { data } = await api.put(
      `/lostfound/messages/${messageId}/edit`,
      { text }
    );
    return data;
  },
};

// ── TYPING INDICATORS ──────────────────────────────────────────────────────
export const typingApi = {
  // Notify that user is typing
  setTyping: async (conversationId: number) => {
    const { data } = await api.post(
      `/lostfound/conversations/${conversationId}/typing`,
      {}
    );
    return data;
  },

  // Get list of users currently typing
  getTypingUsers: async (conversationId: number) => {
    const { data } = await api.get(`/lostfound/conversations/${conversationId}/typing`);
    return data;
  },
};

// ── MESSAGE SEARCH ────────────────────────────────────────────────────────
export const searchApi = {
  // Search within a conversation (limited due to encryption)
  searchConversation: async (conversationId: number, query: string) => {
    const { data } = await api.get(
      `/lostfound/conversations/${conversationId}/search`,
      { params: { q: query } }
    );
    return data;
  },
};

// ── PINNED MESSAGES ────────────────────────────────────────────────────────
export const pinApi = {
  // Pin a message
  pinMessage: async (messageId: number) => {
    const { data } = await api.post(`/lostfound/messages/${messageId}/pin`, {});
    return data;
  },

  // Unpin a message
  unpinMessage: async (messageId: number) => {
    const { data } = await api.delete(`/lostfound/messages/${messageId}/pin`);
    return data;
  },

  // Get all pinned messages in conversation
  getPinnedMessages: async (conversationId: number) => {
    const { data } = await api.get(`/lostfound/conversations/${conversationId}/pinned`);
    return data;
  },
};

// ── CONVERSATION ARCHIVING ────────────────────────────────────────────────
export const archiveApi = {
  // Archive or restore a conversation
  toggleArchive: async (conversationId: number, isArchived: boolean) => {
    const { data } = await api.put(
      `/lostfound/conversations/${conversationId}/archive`,
      { isArchived }
    );
    return data;
  },
};

// ── USER BLOCKING ──────────────────────────────────────────────────────────
export const blockApi = {
  // Block a user
  blockUser: async (blockedEmail: string, reason?: string) => {
    const { data } = await api.post('/lostfound/users/block', {
      blockedEmail,
      reason,
    });
    return data;
  },

  // Unblock a user
  unblockUser: async (email: string) => {
    const { data } = await api.delete(`/lostfound/users/unblock/${email}`);
    return data;
  },

  // Get list of blocked users
  getBlockedUsers: async () => {
    const { data } = await api.get('/lostfound/users/blocked');
    return data;
  },
};

// ── CONVERSATION MUTING ────────────────────────────────────────────────────
export const muteApi = {
  // Mute a conversation
  muteConversation: async (conversationId: number) => {
    const { data } = await api.post(`/lostfound/conversations/${conversationId}/mute`, {});
    return data;
  },

  // Unmute a conversation
  unmuteConversation: async (conversationId: number) => {
    const { data } = await api.delete(`/lostfound/conversations/${conversationId}/mute`);
    return data;
  },

  // Check if conversation is muted
  isMuted: async (conversationId: number) => {
    const { data } = await api.get(`/lostfound/conversations/${conversationId}/is-muted`);
    return data;
  },
};

// ── UTILITY HELPERS ────────────────────────────────────────────────────────

/**
 * Format timestamp with relative time
 * e.g., "2 min ago", "1 hour ago", "Yesterday", "Mar 2, 2:30 PM"
 */
export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '—';
  
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  // Format as "Mar 2, 2:30 PM"
  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Debounce typing indicator updates
 * Call this when user types to update "is typing" status
 */
export function createTypingDebounce(conversationId: number, delayMs = 1000) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    
    // Immediately send typing indicator
    typingApi.setTyping(conversationId).catch(err => console.error('Typing error:', err));
    
    // Stop typing after delay
    timeoutId = setTimeout(() => {
      // Could send a "stopped typing" event if API supported it
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Check if user is blocked
 * Used to filter conversations or prevent messaging
 */
export async function isUserBlocked(userEmail: string): Promise<boolean> {
  try {
    const { blocked } = await blockApi.getBlockedUsers();
    return blocked.some((b: any) => b.blocked_email === userEmail);
  } catch {
    return false;
  }
}

/**
 * Deduplicate reactions and format for display
 */
export function formatReactions(reactions: any[] = []) {
  const grouped = reactions.reduce((acc: Record<string, string[]>, r: any) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r.sender_email);
    return acc;
  }, {});
  
  return Object.entries(grouped).map(([emoji, senders]) => ({
    emoji,
    count: senders.length,
    senders: senders.filter((s, i) => i < 2), // Show first 2
  }));
}
