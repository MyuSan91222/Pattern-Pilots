import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Use environment variable for API base URL, fallback to /api for same-origin
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue = [];

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// These endpoints handle their own 401s — don't trigger token refresh on them
const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/login', '/auth/signup', '/auth/refresh',
  '/auth/forgot', '/auth/reset', '/auth/verify-email',
];

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const isPublicEndpoint = PUBLIC_AUTH_ENDPOINTS.some(ep => original.url?.includes(ep));
    if (error.response?.status === 401 && !original._retry && !isPublicEndpoint) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${apiBaseURL}/auth/refresh`, {}, { withCredentials: true });
        useAuthStore.getState().setAuth(data.user, data.accessToken);
        refreshQueue.forEach(cb => cb(data.accessToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  forgot: (email) => api.post('/auth/forgot', { email }),
  reset: (data) => api.post('/auth/reset', data),
  // User message requests to admins
  getAdmins: () => api.get('/auth/admins'),
  contactAdmin: (data) => api.post('/auth/contact-admin', data),
  getMessageRequests: () => api.get('/auth/message-requests'),
  cancelMessageRequest: (id) => api.delete(`/auth/message-requests/${id}`),
};

// Admin
export const adminApi = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getActivity: (params) => api.get('/admin/activity', { params }),
  getMessages: (params) => api.get('/admin/messages', { params }),
  getGroups: (params) => api.get('/admin/groups', { params }),
  clearActivity: (email) => api.delete('/admin/activity', { params: email ? { email } : {} }),
  updateRole: (email, role) => api.put(`/admin/users/${encodeURIComponent(email)}/role`, { role }),
  deleteConversation: (conversationId) => api.delete(`/admin/conversations/${conversationId}`),
  sendMessageRequest: (user_email, message) => 
    api.post('/admin/message-requests', { user_email, message }),
  getMessageRequests: () => api.get('/admin/message-requests'),
  deleteMessageRequest: (id) => api.delete(`/admin/message-requests/${id}`),
  acceptUserRequest: (id) => api.put(`/admin/message-requests/${id}/accept`),
  rejectUserRequest: (id) => api.put(`/admin/message-requests/${id}/reject`),
  suspendGroup: (groupId, reason) => api.put(`/groupchat/groups/${groupId}/suspend`, { reason }),
  unsuspendGroup: (groupId) => api.put(`/groupchat/groups/${groupId}/unsuspend`),
};

// Lost & Found
export const lfApi = {
  // Items (public read, auth required to create/modify)
  getItems: (params) => api.get('/lostfound/items', { params }),
  getItem: (id) => api.get(`/lostfound/items/${id}`),
  createItem: (formData) =>
    api.post('/lostfound/items', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  resolveItem: (id) => api.put(`/lostfound/items/${id}/resolve`),
  deleteItem: (id) => api.delete(`/lostfound/items/${id}`),
  getMyItems: () => api.get('/lostfound/my-items'),
  // Conversations & encrypted messages
  startConversation: (item_id) => api.post('/lostfound/conversations', { item_id }),
  getConversations: () => api.get('/lostfound/conversations'),
  getMessages: (convId) => api.get(`/lostfound/conversations/${convId}/messages`),
  sendMessage: (convId, text, formData) => {
    if (formData) {
      formData.append('text', text || '');
      return api.post(`/lostfound/conversations/${convId}/messages`, formData, 
        { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post(`/lostfound/conversations/${convId}/messages`, { text });
  },
  unsendMessage: (msgId) => api.delete(`/lostfound/messages/${msgId}/unsend`),
  addReaction: (messageId, emoji) =>
    api.post(`/lostfound/messages/${messageId}/reactions`, { emoji }),
  // Message requests
  getIncomingMessageRequests: () => api.get('/lostfound/message-requests/incoming'),
  respondToMessageRequest: (id, accepted) => 
    api.post(`/lostfound/message-requests/${id}/respond`, { accepted }),
  endConversation: (conversationId) =>
    api.post(`/lostfound/conversations/${conversationId}/end`),
};

// Group Chat
export const gcApi = {
  // Groups
  getGroups: ()                          => api.get('/groupchat/groups'),
  createGroup: (data)                    => api.post('/groupchat/groups', data),
  getGroup: (id)                         => api.get(`/groupchat/groups/${id}`),
  updateGroup: (id, data)               => api.put(`/groupchat/groups/${id}`, data),
  deleteGroup: (id)                      => api.delete(`/groupchat/groups/${id}`),
  suspendGroup: (id, reason)             => api.put(`/groupchat/groups/${id}/suspend`, { reason }),
  unsuspendGroup: (id)                   => api.put(`/groupchat/groups/${id}/unsuspend`),
  leaveGroup: (id)                       => api.post(`/groupchat/groups/${id}/leave`),
  // Members
  addMember: (groupId, email)            => api.post(`/groupchat/groups/${groupId}/members`, { email }),
  removeMember: (groupId, email)         => api.delete(`/groupchat/groups/${groupId}/members/${encodeURIComponent(email)}`),
  updateMemberRole: (groupId, email, role) => api.put(`/groupchat/groups/${groupId}/members/${encodeURIComponent(email)}/role`, { role }),
  toggleMute: (groupId)                  => api.put(`/groupchat/groups/${groupId}/mute`),
  // Messages
  getMessages: (groupId, params)         => api.get(`/groupchat/groups/${groupId}/messages`, { params }),
  sendMessage: (groupId, data)           => {
    if (data instanceof FormData) {
      return api.post(`/groupchat/groups/${groupId}/messages`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post(`/groupchat/groups/${groupId}/messages`, data);
  },
  editMessage: (msgId, text)             => api.put(`/groupchat/messages/${msgId}`, { text }),
  deleteMessage: (msgId)                 => api.delete(`/groupchat/messages/${msgId}`),
  // Reactions
  toggleReaction: (msgId, emoji)         => api.post(`/groupchat/messages/${msgId}/reactions`, { emoji }),
  // Pins
  getPins: (groupId)                     => api.get(`/groupchat/groups/${groupId}/pins`),
  pinMessage: (groupId, msgId)           => api.post(`/groupchat/groups/${groupId}/pin/${msgId}`),
  unpinMessage: (groupId, msgId)         => api.delete(`/groupchat/groups/${groupId}/pin/${msgId}`),
  // Read receipts
  markRead: (groupId, messageId)         => api.post(`/groupchat/groups/${groupId}/read`, { message_id: messageId }),
  getReadReceipts: (groupId)             => api.get(`/groupchat/groups/${groupId}/read`),
  // Typing
  setTyping: (groupId, is_typing)        => api.post(`/groupchat/groups/${groupId}/typing`, { is_typing }),
  getTyping: (groupId)                   => api.get(`/groupchat/groups/${groupId}/typing`),
  // Invite links
  getInviteLink: (groupId)              => api.get(`/groupchat/groups/${groupId}/invite-link`),
  regenerateInviteLink: (groupId)        => api.post(`/groupchat/groups/${groupId}/invite-link`),
  joinByToken: (token)                   => api.post(`/groupchat/join/${token}`),
  // User search
  searchUsers: (q)                       => api.get('/groupchat/users/search', { params: { q } }),
  getAllUsers: ()                         => api.get('/groupchat/users/all'),
  // Discovery & public join
  discoverGroups: (q)                    => api.get('/groupchat/groups/discover', { params: { q } }),
  joinPublicGroup: (groupId)             => api.post(`/groupchat/groups/${groupId}/join`),
  // Join requests (for private groups)
  getJoinRequests: (groupId)             => api.get(`/groupchat/groups/${groupId}/join-requests`),
  approveJoinRequest: (groupId, reqId)   => api.post(`/groupchat/groups/${groupId}/join-requests/${reqId}/approve`),
  rejectJoinRequest: (groupId, reqId)    => api.post(`/groupchat/groups/${groupId}/join-requests/${reqId}/reject`),
  // Suspension appeals
  submitAppeal: (groupId, appeal_text)   => api.post(`/groupchat/groups/${groupId}/appeal`, { appeal_text }),
  getAppeal: (groupId)                   => api.get(`/groupchat/groups/${groupId}/appeal`),
  // Ownership transfer
  transferOwner: (groupId, new_owner_email) => api.put(`/groupchat/groups/${groupId}/transfer-owner`, { new_owner_email }),
  // Export group data (returns JSON blob)
  exportGroup: (groupId)                 => api.get(`/groupchat/groups/${groupId}/export`),
  // Admin: list pending appeals + review
  getAdminAppeals: ()                    => api.get('/groupchat/groups/appeals'),
  reviewAppeal: (appealId, action, admin_note) => api.put(`/groupchat/groups/appeals/${appealId}`, { action, admin_note }),
};

export default api;
