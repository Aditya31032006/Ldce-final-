import apiClient from '../../../shared/services/api.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const assistantApi = {
  /**
   * Streams chat messages token-by-token using SSE over HTTP POST fetch.
   *
   * @param {Object} options
   * @param {string} options.message - The latest user prompt
   * @param {Array<Object>} options.history - Array of { role: 'user' | 'assistant', content: string }
   * @param {string} options.clubId - The active club ID
   * @param {Function} options.onEvent - Callback for SSE events: (event: { type, [key]: any }) => void
   * @param {AbortSignal} [options.signal] - Optional abort signal
   */
  async streamAssistantChat({ message, history = [], clubId, onEvent, signal }) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (clubId) {
      headers['x-club-id'] = clubId;
    }

    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, history }),
      credentials: 'include',
      signal,
    });

    if (!response.ok) {
      let errMessage = 'Failed to connect to AI Assistant';
      try {
        const errJson = await response.json();
        if (errJson.message) errMessage = errJson.message;
      } catch (_) {}
      throw new Error(errMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // Retain incomplete trailing line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const eventData = JSON.parse(jsonStr);
            onEvent(eventData);
          } catch (e) {
            console.warn('Could not parse SSE JSON line:', jsonStr);
          }
        }
      }
    }
  },

  /**
   * Standard JSON fallback endpoint.
   */
  async sendAssistantMessage({ message, history = [], clubId }) {
    const res = await apiClient.post('/chat/message', { message, history }, {
      headers: clubId ? { 'x-club-id': clubId } : {}
    });
    return res.data;
  }
};

export default assistantApi;
