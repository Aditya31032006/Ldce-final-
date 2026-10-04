import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useAuth from '../../auth/hook/useAuth.js';
import assistantApi from '../services/assistant.api.js';
import MarkdownRenderer from './MarkdownRenderer.jsx';
import '../styles/assistant.scss';
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Trash2,
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
  ChevronRight,
  Bot,
  MessageSquare
} from 'lucide-react';

const QUICK_PROMPTS = [
  {
    icon: TrendingUp,
    label: 'Revenue & Sales Split',
    prompt: 'What is our total gross revenue, and what is the breakdown across memberships, courts, bar POS, and pro shop?'
  },
  {
    icon: DollarSign,
    label: 'Staff Payroll & Salaries',
    prompt: 'Show me our total monthly payroll commitment, employee headcount, and department-wise salary distribution.'
  },
  {
    icon: Activity,
    label: 'Court Utilization & Peak Hours',
    prompt: 'Which courts are most utilized, what are our peak demand hours, and what is our overall facility occupancy rate?'
  },
  {
    icon: Coffee,
    label: 'Top Bar & Cafe Items',
    prompt: 'What are the top-selling food items and beverages at our courtside bar and cafe, and how many open kitchen tickets do we have?'
  },
  {
    icon: ShoppingBag,
    label: 'Pro Shop Stock & Orders',
    prompt: 'Check our pro shop inventory: are any items low on stock or needing reordering, and how many pending orders do we have?'
  },
  {
    icon: Users,
    label: 'Memberships & Subscribers',
    prompt: 'Give me an analysis of our registered members, active subscriber counts per membership tier, and 30-day member acquisition.'
  }
];

function AssistantWidget() {
  const { user, role, clubId, clubs } = useAuth();

  const userRole = (role || '').toLowerCase();
  const isAuthorized = ['owner', 'manager', 'admin'].includes(userRole);

  const activeClubObj = useMemo(() => {
    return clubs?.find(c => (c.club_id === clubId || c.id === clubId)) || clubs?.[0];
  }, [clubs, clubId]);

  const clubName = activeClubObj?.name || 'Club Facility';
  const effectiveClubId = clubId || activeClubObj?.id || activeClubObj?.club_id;

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages, currentTool, scrollToBottom]);

  useEffect(() => {
    if (messages.length === 0 && effectiveClubId) {
      setMessages([
        {
          id: 'welcome-msg',
          role: 'assistant',
          content: `👋 **Welcome, ${user?.name || user?.full_name || 'Executive'}!**\n\nI am your **Executive AI Strategic Advisor** for **${clubName}**.\n\nI have direct access to your club's database to provide real-time intelligence on **revenue**, **payroll & salaries**, **court bookings**, **memberships**, and **POS sales**.\n\n*Select a suggested topic below or ask any operational question.*`,
          tools: [],
          timestamp: new Date()
        }
      ]);
    }
  }, [effectiveClubId, clubName, user]);

  const handleSendMessage = useCallback(async (customPrompt) => {
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
                return { ...msg, content: (msg.content || '') + `\n\n> ⚠️ **System Alert:** ${event.message || 'Error occurred during AI processing'}` };
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
              content: msg.content || `> ⚠️ **Connection Alert:** Unable to reach assistant server. Please check your backend connection.`
            };
          }
          return msg;
        }));
      }
    } finally {
      setIsStreaming(false);
      setCurrentTool(null);
    }
  }, [inputValue, isStreaming, messages, effectiveClubId]);

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setCurrentTool(null);
    }
  }, []);

  const handleClearChat = useCallback(() => {
    if (window.confirm('Clear conversation history?')) {
      setMessages([
        {
          id: 'welcome-msg-cleared',
          role: 'assistant',
          content: `Conversation refreshed. How can I assist you with **${clubName}** metrics?`,
          tools: [],
          timestamp: new Date()
        }
      ]);
    }
  }, [clubName]);

  const handleCopyText = useCallback((id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      {/* FLOATING TRIGGER BUTTON (Minimalist Black Circle) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Open Assistant"
          aria-label="Open Assistant"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: '#121316',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.22), 0 2px 5px rgba(0, 0, 0, 0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
            e.currentTarget.style.background = '#000000';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.32)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.background = '#121316';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.22), 0 2px 5px rgba(0, 0, 0, 0.08)';
          }}
        >
          <MessageSquare size={19} color="#FFFFFF" strokeWidth={1.85} />
        </button>
      )}

      {/* FLOATING CHAT ENCLAVE (Clean Minimalist App Theme) */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isExpanded ? '20px' : '24px',
            right: isExpanded ? '20px' : '24px',
            width: isExpanded ? 'calc(100vw - 40px)' : '460px',
            maxWidth: isExpanded ? '1040px' : '92vw',
            height: isExpanded ? 'calc(100vh - 40px)' : '660px',
            maxHeight: isExpanded ? '92vh' : '86vh',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            background: '#FFFFFF',
            border: '1px solid #E7E5DF',
            borderRadius: '16px',
            boxShadow: '0 20px 48px -8px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            transition: 'width 0.2s ease, height 0.2s ease',
          }}
        >
          {/* HEADER */}
          <div
            style={{
              padding: '0.85rem 1.25rem',
              background: '#FAF9F6',
              borderBottom: '1px solid #E7E5DF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#EBF3F0',
                  color: '#1F5C46',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <h3 style={{ fontSize: '0.925rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                    Executive AI Advisor
                  </h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '9999px', background: '#EBF3F0', color: '#1F5C46' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#1F5C46' }} />
                    LIVE
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: '#6B6B66', marginTop: '0.1rem' }}>
                  <Building2 size={11} color="#1F5C46" />
                  <span>{clubName}</span>
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                onClick={handleClearChat}
                title="Clear chat"
                style={{ background: 'transparent', border: 'none', color: '#6B6B66', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B66')}
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => setIsExpanded(prev => !prev)}
                title={isExpanded ? 'Restore size' : 'Expand full window'}
                style={{ background: 'transparent', border: 'none', color: '#6B6B66', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1A1A18')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B66')}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                style={{ background: 'transparent', border: 'none', color: '#6B6B66', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1A1A18')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B66')}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* MESSAGES CONTAINER */}
          <div
            className="thin-scrollbar"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: '#FAF9F6',
            }}
          >
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isLastMessage = index === messages.length - 1;

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      maxWidth: isUser ? '85%' : '94%',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                    }}
                  >
                    {/* Minimal Avatar */}
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isUser ? '#1F5C46' : '#EBF3F0',
                        color: isUser ? '#FFFFFF' : '#1F5C46',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '0.15rem',
                      }}
                    >
                      {isUser ? (user?.name?.[0] || 'U') : <Bot size={15} />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      style={{
                        background: isUser ? '#1F5C46' : '#FFFFFF',
                        color: isUser ? '#FFFFFF' : '#1A1A18',
                        padding: '0.85rem 1.15rem',
                        borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                        border: isUser ? 'none' : '1px solid #E7E5DF',
                        boxShadow: isUser ? '0 2px 6px rgba(31, 92, 70, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                        fontSize: '0.885rem',
                        position: 'relative',
                        width: '100%',
                      }}
                    >
                      {/* Tool Execution Tags */}
                      {msg.tools && msg.tools.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.65rem', paddingBottom: '0.5rem', borderBottom: '1px solid #F1F0EC' }}>
                          {msg.tools.map((t, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                background: t.status === 'running' ? '#EBF3F0' : '#F0FDF4',
                                color: t.status === 'running' ? '#1F5C46' : '#15803D',
                                border: t.status === 'running' ? '1px solid #D1E5DE' : '1px solid #DCFCE7',
                              }}
                            >
                              {t.status === 'running' && <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                              {t.status === 'success' && <Check size={10} />}
                              {t.label || t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Content Rendering */}
                      {isUser ? (
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#FFFFFF' }}>{msg.content}</div>
                      ) : (
                        <MarkdownRenderer content={msg.content} isStreaming={isStreaming && isLastMessage} />
                      )}

                      {/* Copy Action */}
                      {!isUser && msg.content && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid #F1F0EC' }}>
                          <button
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            title="Copy response"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedId === msg.id ? '#15803D' : '#9CA3AF',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                            {copiedId === msg.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* LIVE TOOL EXECUTION PILL */}
            {isStreaming && currentTool && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start', paddingLeft: '2rem' }}>
                <div
                  className="ai-tool-pill-active"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(31, 92, 70, 0.3)',
                    color: '#1F5C46',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{currentTool.label || 'Querying database tool...'}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div
            className="no-scrollbar"
            style={{
              padding: '0.55rem 1rem',
              background: '#FAF9F6',
              borderTop: '1px solid #E7E5DF',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              display: 'flex',
              gap: '0.4rem',
            }}
          >
            {QUICK_PROMPTS.map((qp, i) => {
              const Icon = qp.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isStreaming}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#FFFFFF',
                    color: '#4B5563',
                    border: '1px solid #E7E5DF',
                    borderRadius: '9999px',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: isStreaming ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isStreaming) {
                      e.currentTarget.style.borderColor = '#1F5C46';
                      e.currentTarget.style.color = '#1F5C46';
                      e.currentTarget.style.background = '#EBF3F0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isStreaming) {
                      e.currentTarget.style.borderColor = '#E7E5DF';
                      e.currentTarget.style.color = '#4B5563';
                      e.currentTarget.style.background = '#FFFFFF';
                    }
                  }}
                >
                  <Icon size={12} color="#1F5C46" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* INPUT BAR */}
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#FFFFFF',
              borderTop: '1px solid #E7E5DF',
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isStreaming ? 'Advisor is synthesizing database records...' : `Ask anything about ${clubName}...`}
                disabled={isStreaming}
                style={{
                  flex: 1,
                  background: '#FAF9F6',
                  color: '#1A1A18',
                  border: '1px solid #E7E5DF',
                  borderRadius: '8px',
                  padding: '0.65rem 0.95rem',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#1F5C46')}
                onBlur={(e) => (e.target.style.borderColor = '#E7E5DF')}
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopStreaming}
                  title="Stop generation"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 0.95rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Square size={14} />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  title="Send inquiry"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: inputValue.trim() ? '#1F5C46' : '#E7E5DF',
                    color: inputValue.trim() ? '#FFFFFF' : '#9CA3AF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1rem',
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Send size={15} />
                </button>
              )}
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.68rem', color: '#9CA3AF' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ShieldCheck size={11} color="#1F5C46" />
                Data isolated to {clubName}
              </span>
              <span>Enter to send</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(AssistantWidget);
