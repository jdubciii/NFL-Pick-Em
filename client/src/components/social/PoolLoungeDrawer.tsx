import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PoolLoungeMessage,
  CanonicalContextCardAttachment,
  ReactionCode,
  ReactionEntry,
  MAX_LOUNGE_MESSAGE_LENGTH,
  REACTION_CATALOG,
  processPoolLoungeMessageSend,
  executeExplicitReactionOperation,
  summarizeReactionsForTarget,
  validateCanonicalReactionTarget,
  sanitizeChatDisplayHandle,
} from '../../services/poolSocialService';

interface PoolLoungeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  poolId?: string;
  season?: number;
  week?: number;
  currentUserId: string;
  currentUserName: string;
  membershipStatus?: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'REJECTED';
  initialContextCard?: CanonicalContextCardAttachment | null;
}

const INITIAL_DEMO_MESSAGES: PoolLoungeMessage[] = [
  {
    id: 'msg-seed-1',
    poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
    authorUserId: 'u2',
    authorDisplayName: 'jcone2',
    clientRequestId: 'req-seed-001',
    body: 'TNF kickoff is locked for SEA @ DEN. Big duel deciding matchup right out of the gate.',
    parentMessageId: null,
    contextCard: {
      targetKind: 'CANONICAL_GAME',
      season: 2026,
      week: 6,
      entityId: 'g-w6-sea-den',
      settlementRevision: 0,
      title: 'SEA @ DEN',
      subtitle: 'Week 6 Matchup Discussion',
      deepLinkTab: 'matrix',
    },
    createdAtIso: '2026-10-15T18:30:00.000Z',
    deliveryState: 'SENT',
  },
  {
    id: 'msg-seed-2',
    poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
    authorUserId: 'u1',
    authorDisplayName: 'jack.w.cone',
    clientRequestId: 'req-seed-002',
    body: 'Locked and loaded with Seattle. Winner claims the early Safe Haven driver seat.',
    parentMessageId: 'msg-seed-1',
    contextCard: null,
    createdAtIso: '2026-10-15T18:45:00.000Z',
    deliveryState: 'SENT',
  },
];

export const PoolLoungeDrawer: React.FC<PoolLoungeDrawerProps> = ({
  isOpen,
  onClose,
  poolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
  season = 2026,
  week = 6,
  currentUserId,
  currentUserName,
  membershipStatus = 'ACTIVE',
  initialContextCard = null,
}) => {
  const [messages, setMessages] = useState<PoolLoungeMessage[]>(() => {
    try {
      const stored = localStorage.getItem(`pickem_lounge_messages_${poolId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [messageReactions, setMessageReactions] = useState<ReactionEntry[]>([]);
  const [activeContextCard, setActiveContextCard] = useState<CanonicalContextCardAttachment | null>(initialContextCard);
  const [replyingToMessage, setReplyingToMessage] = useState<PoolLoungeMessage | null>(null);

  // Draft input persistence
  const [draftText, setDraftText] = useState<string>(() => {
    try {
      return localStorage.getItem(`pickem_lounge_draft_${poolId}`) || '';
    } catch {
      return '';
    }
  });

  // Simulator toggle for network failure
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<{
    clientRequestId: string;
    body: string;
    parentMessageId: string | null;
    contextCard: CanonicalContextCardAttachment | null;
  } | null>(null);

  // Scroll & Unread guard
  const [showScrollBottomPill, setShowScrollBottomPill] = useState<boolean>(false);
  const streamEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Update initialContextCard if prop changes
  useEffect(() => {
    if (initialContextCard) {
      setActiveContextCard(initialContextCard);
    }
  }, [initialContextCard]);

  // Persist messages in session
  useEffect(() => {
    try {
      localStorage.setItem(`pickem_lounge_messages_${poolId}`, JSON.stringify(messages));
    } catch {}
  }, [messages, poolId]);

  // Authenticated polling from Express endpoint while drawer is open
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    let pollInterval = 4000;
    let timerId: any = null;

    const fetchLatestMessages = async () => {
      try {
        const token = localStorage.getItem('supabase.auth.token') || '';
        const res = await fetch(`/api/pools/${poolId}/lounge/messages?limit=50`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.items && Array.isArray(data.items)) {
            setMessages((prev) => {
              const serverIds = new Set(data.items.map((m: any) => m.id));
              const serverReqIds = new Set(data.items.map((m: any) => m.clientRequestId));
              const localPendingOrFailed = prev.filter(
                (m) =>
                  (m.deliveryState === 'PENDING' || m.deliveryState === 'FAILED') &&
                  !serverIds.has(m.id) &&
                  !serverReqIds.has(m.clientRequestId)
              );
              return [...data.items, ...localPendingOrFailed];
            });
          }
          pollInterval = 4000;
        } else {
          pollInterval = Math.min(30000, pollInterval * 1.5);
        }
      } catch {
        pollInterval = Math.min(30000, pollInterval * 1.5);
      } finally {
        if (!isCancelled) {
          timerId = setTimeout(fetchLatestMessages, pollInterval);
        }
      }
    };

    fetchLatestMessages();

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [isOpen, poolId]);

  // Persist draft
  const handleDraftChange = (text: string) => {
    setDraftText(text);
    try {
      localStorage.setItem(`pickem_lounge_draft_${poolId}`, text);
    } catch {}
  };

  // Keyboard navigation / Back button listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll detection for floating pill
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBottomPill(!isNearBottom);
  };

  const scrollToBottom = (smooth = true) => {
    streamEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setShowScrollBottomPill(false);
  };

  const handleSendMessage = async () => {
    const cleanBody = draftText.trim();
    if (!cleanBody) return;

    const clientRequestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const targetKind = activeContextCard?.targetKind || 'POOL_LOUNGE';
    const targetEntityId = activeContextCard?.entityId || 'LOUNGE_ROOT';
    const msgSeason = activeContextCard?.season || season;
    const msgWeek = activeContextCard?.week || 0;
    const msgRevision = activeContextCard?.settlementRevision || 0;
    const parentId = replyingToMessage?.id || null;
    const contextCardSnapshot = activeContextCard;

    if (simulateFailure) {
      const failedMsg: PoolLoungeMessage = {
        id: `local-${clientRequestId}`,
        poolId,
        authorUserId: currentUserId,
        authorDisplayName: sanitizeChatDisplayHandle(currentUserName),
        clientRequestId,
        body: cleanBody,
        parentMessageId: parentId,
        contextCard: contextCardSnapshot,
        createdAtIso: new Date().toISOString(),
        deliveryState: 'FAILED',
      };
      setMessages((prev) => [...prev, failedMsg]);
      setLastFailedMessage({
        clientRequestId,
        body: cleanBody,
        parentMessageId: parentId,
        contextCard: contextCardSnapshot,
      });
      return;
    }

    // 1. Show immediate PENDING state before server acknowledgement
    const pendingMsg: PoolLoungeMessage = {
      id: `local-${clientRequestId}`,
      poolId,
      authorUserId: currentUserId,
      authorDisplayName: sanitizeChatDisplayHandle(currentUserName),
      clientRequestId,
      body: cleanBody,
      parentMessageId: parentId,
      contextCard: contextCardSnapshot,
      createdAtIso: new Date().toISOString(),
      deliveryState: 'PENDING',
    };

    setMessages((prev) => [...prev, pendingMsg]);
    setDraftText('');
    try {
      localStorage.removeItem(`pickem_lounge_draft_${poolId}`);
    } catch {}
    setReplyingToMessage(null);
    setActiveContextCard(null);
    setLastFailedMessage(null);
    setTimeout(() => scrollToBottom(true), 50);

    // 2. Authoritative Express POST
    try {
      const token = localStorage.getItem('supabase.auth.token') || '';
      const res = await fetch(`/api/pools/${poolId}/lounge/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clientRequestId,
          body: cleanBody,
          parentMessageId: parentId,
          targetKind,
          targetEntityId,
          season: msgSeason,
          week: msgWeek,
          settlementRevision: msgRevision,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Server acknowledgement governs send success: display SENT only after successful authoritative response
        setMessages((prev) =>
          prev.map((m) =>
            m.clientRequestId === clientRequestId
              ? {
                  ...m,
                  id: data.message?.id || m.id,
                  createdAtIso: data.message?.createdAtIso || m.createdAtIso,
                  deliveryState: 'SENT',
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientRequestId === clientRequestId ? { ...m, deliveryState: 'FAILED' } : m
          )
        );
        setLastFailedMessage({
          clientRequestId,
          body: cleanBody,
          parentMessageId: parentId,
          contextCard: contextCardSnapshot,
        });
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientRequestId === clientRequestId ? { ...m, deliveryState: 'FAILED' } : m
        )
      );
      setLastFailedMessage({
        clientRequestId,
        body: cleanBody,
        parentMessageId: parentId,
        contextCard: contextCardSnapshot,
      });
    }
  };

  const handleRetryFailed = async () => {
    if (!lastFailedMessage) return;
    const { clientRequestId, body: retryBody, parentMessageId: retryParentId, contextCard: retryCtx } = lastFailedMessage;

    // Transition back to PENDING with the exact same request ID
    setMessages((prev) =>
      prev.map((m) =>
        m.clientRequestId === clientRequestId ? { ...m, deliveryState: 'PENDING' } : m
      )
    );

    try {
      const token = localStorage.getItem('supabase.auth.token') || '';
      const res = await fetch(`/api/pools/${poolId}/lounge/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clientRequestId,
          body: retryBody,
          parentMessageId: retryParentId,
          targetKind: retryCtx?.targetKind || 'POOL_LOUNGE',
          targetEntityId: retryCtx?.entityId || 'LOUNGE_ROOT',
          season: retryCtx?.season || season,
          week: retryCtx?.week || 0,
          settlementRevision: retryCtx?.settlementRevision || 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.clientRequestId === clientRequestId
              ? {
                  ...m,
                  id: data.message?.id || m.id,
                  createdAtIso: data.message?.createdAtIso || m.createdAtIso,
                  deliveryState: 'SENT',
                }
              : m
          )
        );
        setLastFailedMessage(null);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientRequestId === clientRequestId ? { ...m, deliveryState: 'FAILED' } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientRequestId === clientRequestId ? { ...m, deliveryState: 'FAILED' } : m
        )
      );
    }
  };

  const handleToggleMessageReaction = async (messageId: string, code: ReactionCode) => {
    const target = {
      poolId,
      season,
      week: 0,
      targetKind: 'POOL_CHAT_MESSAGE' as const,
      entityId: messageId,
      settlementRevision: 0,
    };
    const validation = validateCanonicalReactionTarget(target);
    if (!validation.canonicalKey) return;

    const existing = messageReactions.find(
      (r) => r.canonicalKey === validation.canonicalKey && r.actorUserId === currentUserId
    );
    const operation: 'SET' | 'REMOVE' = existing && existing.reactionCode === code ? 'REMOVE' : 'SET';

    const localRes = executeExplicitReactionOperation({
      existingEntries: messageReactions,
      target,
      operation,
      reactionCode: code,
      authenticatedActorId: currentUserId,
      authenticatedActorName: currentUserName,
      authorizedPoolId: poolId,
      actorMembershipStatus: membershipStatus,
    });

    if (localRes.ok) {
      setMessageReactions(localRes.entries);
    }

    try {
      const token = localStorage.getItem('supabase.auth.token') || '';
      await fetch(`/api/pools/${poolId}/reactions`, {
        method: operation === 'REMOVE' ? 'DELETE' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetKind: 'POOL_CHAT_MESSAGE',
          targetEntityId: messageId,
          season,
          week: 0,
          settlementRevision: 0,
          reactionCode: code,
          operation,
        }),
      });
    } catch (err) {
      console.error('Failed to sync reaction with Express:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-mono animate-fadeIn">
      {/* Header */}
      <header className="p-3.5 sm:p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            aria-label="Back to App"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-cyan-400 uppercase tracking-wider">
                💬 MAIN LEAGUE · POOL LOUNGE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                WEEK {week}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              EXPRESS PERSISTENCE · LIVE DATABASE VERIFIED
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Network Failure Simulator Toggle */}
          <button
            onClick={() => setSimulateFailure(!simulateFailure)}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
              simulateFailure
                ? 'bg-rose-950 border-rose-500 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Simulate network failure to test retry idempotency"
          >
            Simulate Drop: {simulateFailure ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Message Stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
            <span className="text-3xl">💬</span>
            <p className="text-sm font-semibold text-slate-400">The Lounge is quiet</p>
            <p className="text-xs max-w-xs">No messages in this pool yet. Break the ice with your pool rivals!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isViewer = msg.authorUserId === currentUserId;
          const parentMsg = msg.parentMessageId
            ? messages.find((m) => m.id === msg.parentMessageId)
            : null;

          const target = {
            poolId,
            season,
            week: 0,
            targetKind: 'POOL_CHAT_MESSAGE',
            entityId: msg.id,
            settlementRevision: 0,
          };
          const val = validateCanonicalReactionTarget(target);
          const reactionChips = val.canonicalKey
            ? summarizeReactionsForTarget(messageReactions, val.canonicalKey, currentUserId)
            : [];

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isViewer ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
                <span className={`font-bold ${isViewer ? 'text-cyan-400' : 'text-amber-400'}`}>
                  {msg.authorDisplayName}
                </span>
                <span>•</span>
                <span>{new Date(msg.createdAtIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                {msg.deliveryState === 'SENT' && <span className="text-emerald-400 font-bold" title="Server Acknowledged">✓</span>}
                {msg.deliveryState === 'PENDING' && <span className="text-cyan-400 font-mono text-[9px] animate-pulse" title="Sending...">⏱ sending...</span>}
                {msg.deliveryState === 'FAILED' && <span className="text-rose-400 font-bold text-[9px]" title="Send Failed">⚠️ failed</span>}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md space-y-2 border ${
                  isViewer
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-slate-100 rounded-tr-none'
                    : 'bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Parent Reply Quote Box */}
                {parentMsg && (
                  <div className="p-2 rounded-lg bg-slate-950/80 border-l-2 border-cyan-400 text-[11px] text-slate-400 space-y-0.5">
                    <span className="font-bold text-cyan-300">@{parentMsg.authorDisplayName}</span>
                    <p className="truncate line-clamp-1 italic">{parentMsg.body}</p>
                  </div>
                )}

                {/* Canonical Context Card Attachment */}
                {msg.contextCard && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span>{msg.contextCard.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/30 text-amber-400">
                        {msg.contextCard.targetKind.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{msg.contextCard.subtitle}</div>
                    <a
                      href={`#/${msg.contextCard.deepLinkTab}`}
                      onClick={onClose}
                      className="text-[10px] text-cyan-400 hover:underline inline-block mt-0.5"
                    >
                      Jump to Source →
                    </a>
                  </div>
                )}

                {/* Message Body */}
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
                  {msg.body}
                </p>

                {/* Bottom Bar: Action buttons & Reaction Chips */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <button
                    onClick={() => setReplyingToMessage(msg)}
                    className="text-[10px] text-slate-400 hover:text-white transition flex items-center gap-1"
                  >
                    <span>↩ Reply</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {REACTION_CATALOG.map((cat) => {
                      const chip = reactionChips.find((c) => c.code === cat.code);
                      const isSelected = Boolean(chip?.viewerSelected);
                      const count = chip?.count || 0;
                      return (
                        <button
                          key={cat.code}
                          onClick={() => handleToggleMessageReaction(msg.id, cat.code)}
                          className={`px-1.5 py-0.5 rounded text-[10px] border transition flex items-center gap-0.5 ${
                            isSelected
                              ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{cat.emoji}</span>
                          {count > 0 && <span className="font-bold text-[9px]">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={streamEndRef} />
      </div>

      {/* Floating Unread Guard Pill */}
      {showScrollBottomPill && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-4 z-20 px-3 py-1.5 rounded-full bg-cyan-500 text-slate-950 font-black text-xs shadow-xl animate-bounce flex items-center gap-1"
        >
          <span>↓ New messages below</span>
        </button>
      )}

      {/* Recoverable Delivery Failure Alert */}
      {lastFailedMessage && (
        <div className="mx-3 sm:mx-4 p-2.5 rounded-xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>Send failed (network simulated). Retrying with stored request ID prevents duplicates.</span>
          </div>
          <button
            onClick={handleRetryFailed}
            className="px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shrink-0"
          >
            Retry with same Request ID
          </button>
        </div>
      )}

      {/* Composer Container */}
      <footer className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 shrink-0 space-y-2">
        {/* Pinned Reply / Context Card Banner */}
        {(replyingToMessage || activeContextCard) && (
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="truncate">
              {replyingToMessage && (
                <span className="text-cyan-400 font-bold mr-2">
                  Replying to @{replyingToMessage.authorDisplayName}: &quot;{replyingToMessage.body}&quot;
                </span>
              )}
              {activeContextCard && (
                <span className="text-amber-400 font-bold">
                  Attached Context: {activeContextCard.title} ({activeContextCard.subtitle})
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setReplyingToMessage(null);
                setActiveContextCard(null);
              }}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <textarea
            value={draftText}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              replyingToMessage
                ? `Reply to @${replyingToMessage.authorDisplayName}...`
                : activeContextCard
                ? `Discuss ${activeContextCard.title}...`
                : 'Share game banter in Main League Lounge...'
            }
            maxLength={MAX_LOUNGE_MESSAGE_LENGTH}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 resize-none h-12 focus:outline-none transition"
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!draftText.trim()}
            className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md ${
              draftText.trim()
                ? 'bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Send
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span>Enter to send · Shift+Enter for newline</span>
          <span>{draftText.length}/{MAX_LOUNGE_MESSAGE_LENGTH}</span>
        </div>
      </footer>
    </div>
  );
};
export default PoolLoungeDrawer;
