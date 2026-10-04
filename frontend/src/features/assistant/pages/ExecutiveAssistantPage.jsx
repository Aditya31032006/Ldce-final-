import React, { useState, useEffect, useRef } from 'react';
import useAuth from '../../auth/hook/useAuth.js';
import assistantApi from '../services/assistant.api.js';
import MarkdownRenderer from '../components/MarkdownRenderer.jsx';
import '../styles/assistant.scss';
import {
  Sparkles,
  Send,
  RefreshCw,
  Square,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Coffee,
  ShoppingBag,
  Printer,
  Trash2,
  Bot
} from 'lucide-react';

const CATEGORIES = [
  {
    title: 'Financial & Sales Telemetry',
    icon: TrendingUp,
    color: '#1F5C46',
    queries: [
      'What is our total gross revenue and breakdown across all streams?',
      'Show me our payment methods mix and average transaction value.'
    ]
  },
  {
    title: 'Workforce, Salaries & HR',
    icon: DollarSign,
    color: '#1F5C46',
    queries: [
      'Show me our total monthly payroll and department-wise staff salaries.',
      'Are any staff members currently on leave today or have pending leave requests?'
    ]
  },
  {
    title: 'Facility Utilization & Courts',
    icon: Activity,
    color: '#1F5C46',
    queries: [
      'Which courts are most utilized and what are our peak demand hours?',
      'List all our active courts with their surface format and hourly rates.'
    ]
  },
  {
    title: 'Commercial Retail & F&B POS',
    icon: Coffee,
    color: '#1F5C46',
    queries: [
      'What are our top selling food items and drinks at the courtside bar/cafe?',
      'Check pro shop inventory for low-stock items needing reordering.'
    ]
  }
];

export default function ExecutiveAssistantPage() {
  const { user, role, clubId, clubs, changeClub } = useAuth();

  const activeClubObj = clubs?.find(c => (c.club_id === clubId || c.id === clubId)) || clubs?.[0];
  const clubName = activeClubObj?.name || 'Club Facility';
  const effectiveClubId = clubId || activeClubObj?.id || activeClubObj?.club_id;

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTool]);

  useEffect(() => {
    if (messages.length === 0 && effectiveClubId) {
      setMessages([
        {
          id: 'init-msg',
          role: 'assistant',
          content: `### Executive AI Strategic Terminal Initialized\n\nWelcome **${user?.name || user?.full_name || 'Executive'}**. I am directly connected to the live operational database for **${clubName}** with multi-tenant row-level security.\n\nAsk any question regarding:\n* **Gross Revenues & Sales:** Breakdown by courts, memberships, bar POS, and pro shop.\n* **Workforce Payroll:** Staff salaries, active contracts, and leave diagnostics.\n* **Court Utilization:** Hourly demand, peak schedules, and reservation volume.\n* **Commercial POS:** Kitchen tickets, drink orders, and inventory stock replenishment.`,
          tools: [],
          timestamp: new Date()
        }
      ]);
    }
  }, [effectiveClubId, clubName, user]);

  const handleSendMessage = async (customPrompt) => {
    const textToSend = (customPrompt || inputValue).trim();
    if (!textToSend || isStreaming) return;

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `ai-${Date.now() + 1}`;

    const newHistory = messages
      .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .map(m => ({ role: m.role, content: m.content.trim() }));
    newHistory.push({ role: 'user', content: textToSend });

    setMessages(prev => [
      ...prev,
      { id: userMessageId, role: 'user', content: textToSend, timestamp: new Date() },
      { id: assistantMessageId, role: 'assistant', content: '', tools: [], timestamp: new Date() }
    ]);

    setInputValue('');
    setIsStreaming(true);
    setCurrentTool(null);

    abortControllerRef.current = new AbortController();

    try {
      await assistantApi.streamAssistantChat({
        message: textToSend,
        history: newHistory,
        clubId: effectiveClubId,
        signal: abortControllerRef.current.signal,
        onEvent: (event) => {
          if (event.type === 'tool_start') {
            setCurrentTool({ name: event.name, label: event.label });
            setMessages(prev => prev.map(msg => {
              if (msg.id === assistantMessageId) {
                const existingTools = msg.tools || [];
                if (!existingTools.some(t => t.name === event.name)) {
                  return { ...msg, tools: [...existingTools, { name: event.name, label: event.label, status: 'running' }] };
                }
              }
              return msg;
            }));
          } else if (event.type === 'tool_end') {
            setCurrentTool(null);
            setMessages(prev => prev.map(msg => {
              if (msg.id === assistantMessageId) {
                return {
                  ...msg,
                  tools: (msg.tools || []).map(t => t.name === event.name ? { ...t, status: event.status || 'success' } : t)
                };
              }
              return msg;
            }));
          } else if (event.type === 'token') {
            setMessages(prev => prev.map(msg => {
              if (msg.id === assistantMessageId) {
                return { ...msg, content: (msg.content || '') + event.content };
              }
              return msg;
            }));
          } else if (event.type === 'done') {
            setIsStreaming(false);
            setCurrentTool(null);
          } else if (event.type === 'error') {
            setIsStreaming(false);
            setCurrentTool(null);
            setMessages(prev => prev.map(msg => {
              if (msg.id === assistantMessageId) {
                return { ...msg, content: (msg.content || '') + `\n\n> ⚠️ **System Notice:** ${event.message || 'Error executing query'}` };
              }
              return msg;
            }));
          }
        }
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(msg => {
          if (msg.id === assistantMessageId) {
            return {
              ...msg,
              content: msg.content || `> ⚠️ **Connection Notice:** Unable to reach assistant server. Please check backend connection.`
            };
          }
          return msg;
        }));
      }
    } finally {
      setIsStreaming(false);
      setCurrentTool(null);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setCurrentTool(null);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (window.confirm('Clear current strategic session?')) {
      setMessages([
        {
          id: 'welcome-msg',
          role: 'assistant',
          content: `Strategic console session reset. Ready for your operational analysis inquiries for **${clubName}**.`,
          tools: [],
          timestamp: new Date()
        }
      ]);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 76px)', background: '#FAF9F6', color: '#1A1A18', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E7E5DF', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EBF3F0', color: '#1F5C46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#1A1A18' }}>
                Executive AI Strategic Terminal
              </h1>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '9999px', background: '#EBF3F0', color: '#1F5C46', border: '1px solid #D1E5DE' }}>
                MISTRAL AI • LIVE DB TOOLS
              </span>
            </div>
            <p style={{ color: '#5D6370', fontSize: '0.8rem', margin: '0.15rem 0 0' }}>
              Autonomous multi-tenant operational intelligence for <strong style={{ color: '#1A1A18' }}>{clubName}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {clubs && clubs.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#FAF9F6', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #E7E5DF' }}>
              <Building2 size={15} color="#1F5C46" />
              <select
                value={effectiveClubId}
                onChange={(e) => changeClub && changeClub(e.target.value)}
                style={{ background: 'transparent', color: '#1A1A18', border: 'none', outline: 'none', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {clubs.map(c => (
                  <option key={c.id || c.club_id} value={c.id || c.club_id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleClearChat}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#FFFFFF', color: '#5D6370', border: '1px solid #E7E5DF', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#5D6370')}
          >
            <Trash2 size={14} />
            <span>Reset</span>
          </button>

          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#FFFFFF', color: '#1A1A18', border: '1px solid #E7E5DF', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <Printer size={14} color="#1F5C46" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Prompt Library + Right Chat Stream */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', overflow: 'hidden' }}>
        {/* Left Side: Topic Library & Security Badge */}
        <div className="thin-scrollbar" style={{ background: '#FAF9F6', borderRight: '1px solid #E7E5DF', padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#EBF3F0', border: '1px solid #D1E5DE', borderRadius: '10px', padding: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#1F5C46', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <ShieldCheck size={16} />
              <span>Multi-Tenant Enclave Active</span>
            </div>
            <p style={{ color: '#2F4F42', fontSize: '0.74rem', margin: 0, lineHeight: '1.45' }}>
              Queries strictly isolated to <strong>{clubName}</strong> via PostgreSQL RLS. Cross-tenant visibility is restricted.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5D6370', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Executive Query Library
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {CATEGORIES.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
                      <Icon size={15} color={cat.color} />
                      <strong style={{ fontSize: '0.825rem', color: '#1A1A18' }}>{cat.title}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {cat.queries.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSendMessage(q)}
                          disabled={isStreaming}
                          style={{
                            textAlign: 'left',
                            background: '#FAF9F6',
                            border: '1px solid #E7E5DF',
                            color: '#1A1A18',
                            padding: '0.45rem 0.7rem',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            cursor: isStreaming ? 'not-allowed' : 'pointer',
                            lineHeight: '1.4',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isStreaming) {
                              e.currentTarget.style.borderColor = '#1F5C46';
                              e.currentTarget.style.background = '#EBF3F0';
                              e.currentTarget.style.color = '#1F5C46';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isStreaming) {
                              e.currentTarget.style.borderColor = '#E7E5DF';
                              e.currentTarget.style.background = '#FAF9F6';
                              e.currentTarget.style.color = '#1A1A18';
                            }
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Chat Stream & Message Input */}
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 146px)', background: '#FAF9F6' }}>
          {/* Scrollable Message History with Thin Scrollbar */}
          <div className="thin-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isLastMessage = index === messages.length - 1;

              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', maxWidth: isUser ? '80%' : '90%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isUser ? '#1F5C46' : '#EBF3F0', color: isUser ? '#FFFFFF' : '#1F5C46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.775rem', fontWeight: 700, flexShrink: 0, marginTop: '0.2rem' }}>
                      {isUser ? (user?.name?.[0] || 'U') : <Bot size={16} />}
                    </div>

                    <div style={{ background: isUser ? '#1F5C46' : '#FFFFFF', color: isUser ? '#FFFFFF' : '#1A1A18', padding: '1rem 1.35rem', borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px', border: isUser ? 'none' : '1px solid #E7E5DF', boxShadow: isUser ? '0 2px 8px rgba(31, 92, 70, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.02)', fontSize: '0.885rem', width: '100%' }}>
                      {/* Tool Tags */}
                      {msg.tools && msg.tools.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem', paddingBottom: '0.55rem', borderBottom: '1px solid #F1F0EC' }}>
                          {msg.tools.map((t, idx) => (
                            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px', background: t.status === 'running' ? '#EBF3F0' : '#F0FDF4', color: t.status === 'running' ? '#1F5C46' : '#15803D', border: t.status === 'running' ? '1px solid #D1E5DE' : '1px solid #DCFCE7' }}>
                              {t.status === 'running' && <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                              {t.status === 'success' && <Check size={10} />}
                              {t.label || t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Content */}
                      {isUser ? (
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.55', color: '#FFFFFF' }}>{msg.content}</div>
                      ) : (
                        <MarkdownRenderer content={msg.content} isStreaming={isStreaming && isLastMessage} />
                      )}

                      {/* Copy Button */}
                      {!isUser && msg.content && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid #F1F0EC' }}>
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            style={{ background: 'transparent', border: 'none', color: copiedId === msg.id ? '#15803D' : '#9CA3AF', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                            {copiedId === msg.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Active tool querying indicator */}
            {isStreaming && currentTool && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', alignSelf: 'flex-start', paddingLeft: '2.5rem' }}>
                <div className="ai-tool-pill-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.9rem', borderRadius: '9999px', border: '1px solid #D1E5DE', color: '#1F5C46', fontSize: '0.76rem', fontWeight: 600 }}>
                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{currentTool.label || 'Querying database tool...'}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Prompt Input */}
          <div style={{ padding: '1rem 2rem', background: '#FFFFFF', borderTop: '1px solid #E7E5DF' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isStreaming ? 'Synthesizing database telemetry...' : `Ask anything about ${clubName} revenue, payroll, courts, bar POS...`}
                disabled={isStreaming}
                style={{
                  flex: 1,
                  background: '#FAF9F6',
                  color: '#1A1A18',
                  border: '1px solid #E7E5DF',
                  borderRadius: '10px',
                  padding: '0.85rem 1.15rem',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#1F5C46')}
                onBlur={(e) => (e.target.style.borderColor = '#E7E5DF')}
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '0.85rem 1.4rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Square size={15} />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: inputValue.trim() ? '#1F5C46' : '#E7E5DF',
                    color: inputValue.trim() ? '#FFFFFF' : '#9CA3AF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.85rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: inputValue.trim() ? '0 2px 6px rgba(31, 92, 70, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={15} />
                  <span>Send</span>
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
