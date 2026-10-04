import { streamClubChat } from './chat.service.js';
import { pool } from '../../config/database.js';

/**
 * Handles streaming chatbot messages via Server-Sent Events (SSE).
 */
export async function chatStreamController(req, res, next) {
  const { message, history } = req.body;
  const userId = req.user?.id;
  const clubId = req.clubId;
  const userRole = (req.user?.role || 'owner').toLowerCase();

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'A prompt message is required.' });
  }

  if (!clubId) {
    return res.status(400).json({ message: 'Active club ID could not be identified for this session.' });
  }

  // Security check: Only owners, managers, and admins are authorized to query executive club telemetry
  const allowedRoles = ['owner', 'manager', 'admin'];
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: 'Access denied. The executive AI assistant is reserved for club owners and management.' });
  }

  // Get active club name
  let clubName = 'Sports Facility';
  try {
    const clubRes = await pool.query('SELECT name FROM app.clubs WHERE id = $1', [clubId]);
    if (clubRes.rows[0]?.name) {
      clubName = clubRes.rows[0].name;
    }
  } catch (err) {
    console.warn('Could not lookup club name:', err.message);
  }

  // Configure Server-Sent Events (SSE) headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const sendEvent = (eventData) => {
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    if (typeof res.flush === 'function') {
      res.flush();
    }
  };

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  try {
    await streamClubChat({
      userId,
      clubId,
      clubName,
      userRole,
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      onEvent: sendEvent
    });
  } catch (err) {
    console.error('Chatbot streaming error:', err);
    sendEvent({
      type: 'error',
      message: err.message || 'An error occurred during AI processing.'
    });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}

/**
 * Non-streaming fallback endpoint returning consolidated response.
 */
export async function chatMessageController(req, res, next) {
  const { message, history } = req.body;
  const userId = req.user?.id;
  const clubId = req.clubId;
  const userRole = (req.user?.role || 'owner').toLowerCase();

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'A prompt message is required.' });
  }

  if (!clubId) {
    return res.status(400).json({ message: 'Active club ID could not be identified.' });
  }

  let clubName = 'Sports Facility';
  try {
    const club = await clubsRepo.findClubById(clubId);
    if (club?.name) clubName = club.name;
  } catch (_) {}

  const toolsExecuted = [];
  let fullAnswer = '';

  try {
    await streamClubChat({
      userId,
      clubId,
      clubName,
      userRole,
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      onEvent: (event) => {
        if (event.type === 'tool_start') {
          toolsExecuted.push({ name: event.name, label: event.label });
        } else if (event.type === 'token') {
          fullAnswer += event.content;
        }
      }
    });

    return res.status(200).json({
      answer: fullAnswer,
      toolsUsed: toolsExecuted,
      clubId,
      clubName
    });
  } catch (err) {
    next(err);
  }
}
