// Common utility functions and patterns for GroupChatView
import toast from 'react-hot-toast';

/**
 * Handle API errors gracefully
 * @param {Error} error - The error object
 * @param {string} context - Context for logging
 * @param {boolean} toast - Whether to show toast notification
 */
export function handleApiError(error, context = '', showToast = true) {
  const isBadRequest = error?.response?.status === 400;
  const isUnauthorized = error?.response?.status === 401;
  const serverMessage = error?.response?.data?.error;

  if (isUnauthorized && context !== 'loadGroups') {
    if (showToast) toast.error('Session expired. Please login again.');
    return false;
  }

  if (isBadRequest && showToast) {
    toast.error(serverMessage || 'Invalid request');
    return false;
  }

  if (showToast && error?.message) {
    toast.error(error.message);
  }

  if (context && error?.response?.status !== 401) {
    console.error(`[GC] ${context} error:`, error);
  }

  return false;
}

/**
 * Debounce function for API calls
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 */
export function createDebouncedFn(fn, delay = 300) {
  let timeout = null;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format timestamp to relative time
 * @param {string} iso - ISO timestamp
 */
export function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Validate group name
 * @param {string} name - Group name
 */
export function validateGroupName(name) {
  if (!name?.trim()) return 'Group name required';
  if (name.trim().length < 1) return 'Name too short';
  if (name.length > 100) return 'Name too long';
  return null;
}

/**
 * Validate message content
 * @param {string} text - Message text
 */
export function validateMessage(text) {
  if (!text?.trim()) return 'Message cannot be empty';
  if (text.length > 4000) return 'Message too long (max 4000 chars)';
  return null;
}

/**
 * Safe JSON parse with fallback
 * @param {string} json - JSON string
 * @param {*} fallback - Fallback value
 */
export function safeJsonParse(json, fallback = null) {
  try {
    return json ? JSON.parse(json) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} max - Max length
 */
export function truncate(text, max = 50) {
  if (!text) return '';
  return text.length > max ? `${text.substring(0, max)}...` : text;
}

/**
 * Check if array has changed
 * @param {any[]} prev - Previous array
 * @param {any[]} next - Next array
 */
export function arrayChanged(prev, next) {
  if (prev.length !== next.length) return true;
  return prev.some((item, i) => item.id !== next[i]?.id);
}
