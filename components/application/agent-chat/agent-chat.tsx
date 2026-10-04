"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { useChat } from "@ai-sdk/react";
import { RiCloseLine, RiMenuLine } from "@remixicon/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { Button } from "@/components/base/buttons/button";
import { DemoTransport, SwitchingTransport } from "@/components/application/agent-chat/demo-transport";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGuestUpgrade } from "@/components/application/auth/guest-upgrade-provider";

import { AgentChatActions } from "@/components/application/agent-chat/agent-chat-actions";
import { AgentChatHeaderTitle } from "@/components/application/agent-chat/agent-chat-header-title";
import {
  AgentChatHistory,
  type ChatThreadSummary,
} from "@/components/application/agent-chat/agent-chat-history";
import {
  AgentBlobAvatar,
  AgentChatTurn,
} from "@/components/application/agent-chat/agent-chat-message";
import { AgentComposer } from "@/components/application/agent-chat/agent-composer";
import { AgentThinking } from "@/components/application/agent-thinking/agent-thinking";
import { useStarterBase, useStarterNav } from "@/components/application/app-shell/app-shell";
import { NotificationBell } from "@/components/application/app-shell/notification-bell";
import { NutritionNotificationsProvider } from "@/components/application/app-shell/nutrition-notifications-provider";
import { ProOfferCard } from "@/components/application/app-shell/pro-offer-card";
import { FeedbackModal } from "@/components/application/feedback/feedback-modal";
import { DashboardSidebar } from "@/components/application/dashboard/dashboard-sidebar";
import {
  SettingsModal,
  type SettingsPage,
} from "@/components/application/settings/settings-modal";
import { DailyGoalsModal } from "@/components/application/settings/daily-goals-modal";
import { IconButton } from "@/components/base/buttons/icon-button";
import { FeralJellyWithSpeech } from "@/components/foundations/feral-blob/feral-jelly-blob";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { TodayStrip } from "@/components/application/nutrition/today-strip";
import { refreshNutritionProgress } from "@/lib/nutrition/refresh-progress";
import { OPEN_SETTINGS_EVENT } from "@/lib/settings/open-settings";
import {
  GUEST_MAX_USER_MESSAGES,
  parseGuestLimitReason,
} from "@/lib/guest-limits";
import { suggestions as nutritionSuggestions, withBasePath } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import { cx } from "@/utils/cx";
import { generateUUID } from "@/lib/utils";

/**
 * A working chat app, wired to the `/api/chat` runtime.
 *
 * Built only from free components — the free `sidebar`, AgentThinking,
 * ComposerLoader, IconButton — so the whole screen can ship in a public
 * starter repo without giving away anything sold as Pro. It follows the Pro AI
 * chat template's geometry (12px page frame, 16px gap, the 260px sidebar card,
 * a rounded-3xl chat surface) so a starter and a purchased template read as
 * the same product.
 *
 * Any later chat screen that streams from a model should read the same
 * message shape from the same endpoint, so it can replace this one without
 * touching the backend.
 */

const ENDPOINT = "/api/chat";
const HISTORY_ENDPOINT = "/api/history";
/** Remembered so a reload of a keyless deploy lands back in the demo, not on the notice. */
const DEMO_KEY = "boardui:agent-chat-demo";
/** Enough history to be useful without over-fetching. */
const MAX_THREADS = 30;

const SUGGESTIONS = nutritionSuggestions;

type Probe = {
  status: "checking" | "ready" | "unconfigured";
  provider: string | null;
  /** Display name from the runtime ("Anthropic"), so the UI needs no list of its own. */
  label: string | null;
  model: string | null;
};

const MEAL_TOOL_NAMES = new Set(["logMeal", "updateMeal", "deleteMeal"]);

function mealToolProgressFingerprint(messages: ChatMessage[]) {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return "";
  return last.parts
    .map((part) => {
      if (!part.type.startsWith("tool-")) return "";
      const name = part.type.slice("tool-".length);
      if (!MEAL_TOOL_NAMES.has(name)) return "";
      const toolPart = part as { toolCallId?: string; state?: string };
      if (toolPart.state !== "output-available") return "";
      return `${name}:${toolPart.toolCallId ?? ""}`;
    })
    .filter(Boolean)
    .join("|");
}

export function AgentChat({
  className,
  contained = false,
}: {
  className?: string;
  /** Docs preview mode: fill the preview frame's height instead of the
   *  viewport, and keep the phone nav drawer inside the frame. */
  contained?: boolean;
}) {
  const localize = useTemplateCopy();
  const { data: session } = useSession();
  const isGuest = session?.user?.type === "guest";
  const { showGuestUpgrade } = useGuestUpgrade();
  const hasMounted = useHasMounted();
  const guestHistoryBootstrappedRef = useRef(false);
  const [probe, setProbe] = useState<Probe>({ status: "checking", provider: null, label: null, model: null });
  const [input, setInput] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("general");
  const [dailyGoalsOpen, setDailyGoalsOpen] = useState(false);

  const openSettings = useCallback((page: SettingsPage) => {
    setSettingsPage(page);
    setSettingsOpen(true);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ page?: SettingsPage }>).detail;
      openSettings(detail?.page ?? "general");
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, handler);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, handler);
  }, [openSettings]);

  // The sidebar links only to pages the starter has; see app-shell.
  const navItems = useStarterNav();
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  // Empty until the mount effect assigns one: an id generated during render
  // would differ between server and client and break hydration.
  const [activeId, setActiveId] = useState(() => newThreadId());
  /** API chat id for Postgres — not passed to `useChat` `id` (that resets the transcript on change). */
  const activeChatIdRef = useRef(activeId);
  useEffect(() => {
    activeChatIdRef.current = activeId;
  }, [activeId]);
  /** Stamped on send, so render never calls Date.now(). */
  const [activeUpdatedAt, setActiveUpdatedAt] = useState(0);
  /** Set when the open thread is renamed. Without it the derived title
   *  (built from the first message) would immediately overwrite the name. */
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  /** When each message arrived, for the hover timestamp. */
  const [messageAt, setMessageAt] = useState<Record<string, number>>({});
  /** True once the transcript is scrolled at all. */
  const [scrolledUnder, setScrolledUnder] = useState(false);
  /** Whether the title and the message column actually overlap horizontally.
   *  On a wide screen the column is centred well clear of a short title, so
   *  text passing behind the header never touches it and a rule would be
   *  drawing a line under nothing. */
  const [canClash, setCanClash] = useState(false);
  const wasBusyRef = useRef(false);

  // Demo mode: the visitor skipped the key notice. Only meaningful while the
  // runtime reports no key; the moment a key exists, the real route answers.
  const [demo, setDemo] = useState(false);
  const demoActive = demo && probe.status === "unconfigured";
  const chatModelRef = useRef(DEFAULT_CHAT_MODEL);
  const [transport] = useState(
    () =>
      new SwitchingTransport(
        new DefaultChatTransport({
          api: ENDPOINT,
          prepareSendMessagesRequest(request) {
            const lastMessage = request.messages.at(-1);
            const isToolApprovalContinuation =
              lastMessage?.role !== "user" ||
              request.messages.some((msg) =>
                msg.parts?.some((part) => {
                  const { state } = part as { state?: string };
                  return state === "approval-responded" || state === "output-denied";
                }),
              );

            const { demo: _demo, ...restBody } =
              (request.body as { demo?: boolean } | undefined) ?? {};

            return {
              body: {
                id: activeChatIdRef.current,
                ...(isToolApprovalContinuation
                  ? { messages: request.messages }
                  : { message: lastMessage }),
                selectedChatModel: chatModelRef.current,
                selectedVisibilityType: "private",
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                ...restBody,
              },
            };
          },
        }),
        new DemoTransport(),
      ),
  );
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage after mount; there is no render-time source for it
      setDemo(window.localStorage.getItem(DEMO_KEY) === "on");
    } catch {
      // Storage can be blocked; the notice simply shows again.
    }
  }, []);
  const enterDemo = () => {
    setDemo(true);
    try {
      window.localStorage.setItem(DEMO_KEY, "on");
    } catch {
      // Nothing to remember without storage.
    }
  };

  const { messages, sendMessage, setMessages, status, stop, error, addToolApprovalResponse } =
    useChat<ChatMessage>({
      generateId: generateUUID,
      transport,
      onError: (chatError) => {
        try {
          const parsed = JSON.parse(chatError.message) as unknown;
          const reason = parseGuestLimitReason(parsed);
          if (reason) {
            showGuestUpgrade(reason, {
              dismissible: reason !== "message_limit",
            });
          }
        } catch {
          // Not a structured guest-limit response.
        }
      },
      sendAutomaticallyWhen: ({ messages: currentMessages }) => {
        const lastMessage = currentMessages.at(-1);
        return (
          lastMessage?.parts?.some(
            (part) =>
              "state" in part &&
              part.state === "approval-responded" &&
              "approval" in part &&
              (part.approval as { approved?: boolean })?.approved === true,
          ) ?? false
        );
      },
    });

  const busy = status === "submitted" || status === "streaming";
  const mealProgressRef = useRef("");

  useEffect(() => {
    if (demoActive || isGuest) return;
    const fingerprint = mealToolProgressFingerprint(messages);
    if (!fingerprint || fingerprint === mealProgressRef.current) return;
    mealProgressRef.current = fingerprint;
    refreshNutritionProgress();
  }, [demoActive, isGuest, messages]);

  // Reasoning models stream their thinking before any text, and the SDK flips
  // status to "streaming" on that first non-text chunk. Gating the indicator on
  // "submitted" alone therefore hides it seconds before a word appears, leaving
  // an empty transcript. It stays up until real text exists.
  const streamedText = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return "";
    return last.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }, [messages]);
  const showThinking = busy && streamedText.length === 0;

  // Ask the runtime what it has before the first message, so a deployment with
  // no key renders setup steps instead of letting someone type into a dead box.
  useEffect(() => {
    fetch(withBasePath("/api/nutrition/summary")).then((response) => {
      if (response.status === 401) {
        window.location.href = withBasePath("/api/auth/guest?redirectUrl=" + encodeURIComponent(withBasePath("/chat")));
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(ENDPOINT, { method: "GET" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { configured?: boolean; provider?: string; providerLabel?: string; model?: string } | null) => {
        if (cancelled) return;
        // Only an explicit `configured: false` means "no key". A failed or
        // unreadable probe says nothing about the key, and treating it as
        // missing would hide the composer behind setup steps for a fault that
        // has nothing to do with configuration.
        setProbe({
          status: data && data.configured === false ? "unconfigured" : "ready",
          provider: data?.provider ?? null,
          label: data?.providerLabel ?? null,
          model: data?.model ?? null,
        });
      })
      .catch(() => {
        // A failed probe shouldn't lock the composer — let the send attempt
        // surface the real error rather than guessing the cause here.
        if (!cancelled) setProbe({ status: "ready", provider: null, label: null, model: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshHistory = useCallback(async () => {
    if (demoActive) return;
    try {
      const response = await fetch(withBasePath(HISTORY_ENDPOINT));
      if (!response.ok) return;
      const data = (await response.json()) as { chats?: ChatThreadSummary[] };
      if (!Array.isArray(data.chats)) return;
      const ordered = orderThreads(data.chats);
      setThreads(ordered);
      const activeFromServer = ordered.find(
        (chat) => chat.id === activeChatIdRef.current,
      );
      if (activeFromServer && activeTitle === null) {
        setActiveTitle(activeFromServer.title);
      }

      if (
        isGuest &&
        !guestHistoryBootstrappedRef.current &&
        ordered.length > 0 &&
        messages.length === 0
      ) {
        guestHistoryBootstrappedRef.current = true;
        const first = ordered[0];
        activeChatIdRef.current = first.id;
        setActiveId(first.id);
        setActiveUpdatedAt(first.updatedAt);
        setActiveTitle(first.title);
        void fetch(withBasePath(`/api/chat/${first.id}`))
          .then((res) => (res.ok ? res.json() : null))
          .then((payload: { messages?: ChatMessage[]; messageAt?: Record<string, number> } | null) => {
            if (!payload) return;
            setMessageAt(payload.messageAt ?? {});
            setMessages(payload.messages ?? []);
          });
      }
    } catch {
      // History is best-effort; chat still works.
    }
  }, [demoActive, activeTitle, isGuest, messages.length, setMessages]);

  // Load hosted history, then open on a fresh thread rather than reviving the
  // last one — landing mid-conversation after a reload is more surprising than
  // useful, and the rail is right there.
  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    if (wasBusyRef.current && !busy) {
      void refreshHistory();
    }
    wasBusyRef.current = busy;
  }, [busy, refreshHistory]);

  // The thread being typed into is derived rather than stored, so its title
  // appears as soon as the first message lands without a state round-trip.
  // The timestamp is stamped when a message is sent rather than read during
  // render, so rendering stays pure and the badge does not drift each frame.
  const liveThread: ChatThreadSummary | null = useMemo(
    () =>
      activeId && messages.length > 0
        ? {
            id: activeId,
            title: activeTitle ?? deriveTitle(messages),
            updatedAt: activeUpdatedAt || Date.now(),
          }
        : null,
    [activeId, messages, activeUpdatedAt, activeTitle],
  );

  // Ordered by last message, never by what is open: selecting a thread must
  // not move it, or the list reshuffles under the pointer as you browse it.
  const allThreads = useMemo(() => {
    const rest = threads.filter((thread) => thread.id !== activeId);
    return orderThreads(liveThread ? [liveThread, ...rest] : rest);
  }, [liveThread, threads, activeId]);

  // Arrival times come from outside React (they are a property of when the
  // stream delivered each message), so they are recorded rather than derived.
  useEffect(() => {
    const unseen = messages.filter((message) => messageAt[message.id] === undefined);
    if (unseen.length === 0) return;
    const now = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage after mount; there is no render-time source for it
    setMessageAt((prev) => {
      const next = { ...prev };
      for (const message of unseen) next[message.id] = now;
      return next;
    });
  }, [messages, messageAt]);

  // Geometry, not a breakpoint: the title is as wide as its text, so whether
  // it reaches the column depends on both and has to be measured.
  useEffect(() => {
    const measure = () => {
      const title = titleRef.current?.getBoundingClientRect();
      const column = columnRef.current?.getBoundingClientRect();
      if (!title || !column) return;
      // A 16px buffer so text never slides right up against the title.
      setCanClash(title.right + 16 > column.left);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [messages.length, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (isGuest) {
      const userTurns = messages.filter((message) => message.role === "user").length;
      if (userTurns >= GUEST_MAX_USER_MESSAGES) {
        promptGuestUpgrade("message_limit");
        return;
      }
    }
    setActiveUpdatedAt(Date.now());
    sendMessage({ text: trimmed }, { body: { demo: demoActive } });
    setInput("");
  };

  /** Folds the thread being left back into the stored list before switching.
   *  Its timestamp is carried over untouched, so leaving a thread never
   *  changes where it sits in the list. */
  const keepLiveThread = useCallback(() => {
    if (!liveThread) return;
    setThreads((prev) =>
      orderThreads([liveThread, ...prev.filter((thread) => thread.id !== liveThread.id)]),
    );
  }, [liveThread]);

  const guestHasChat = isGuest && (threads.length > 0 || (liveThread !== null && messages.length > 0));

  const promptGuestUpgrade = useCallback(
    (reason: "message_limit" | "new_chat" | "meal_logging" | "delete_chat") => {
      showGuestUpgrade(reason, { dismissible: reason !== "message_limit" });
    },
    [showGuestUpgrade],
  );

  const startNewChat = useCallback(() => {
    if (busy) return;
    if (guestHasChat) {
      promptGuestUpgrade("new_chat");
      return;
    }
    keepLiveThread();
    const nextId = newThreadId();
    activeChatIdRef.current = nextId;
    setActiveId(nextId);
    setActiveUpdatedAt(0);
    setActiveTitle(null);
    setMessageAt({});
    setMessages([]);
    setInput("");
  }, [busy, guestHasChat, keepLiveThread, promptGuestUpgrade, setMessages]);

  const renameThread = useCallback(
    (id: string, title: string) => {
      if (id === activeId) setActiveTitle(title);
      setThreads((prev) =>
        prev.map((thread) => (thread.id === id ? { ...thread, title } : thread)),
      );
      if (!demoActive) {
        void fetch(withBasePath(`/api/chat/${id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      }
    },
    [activeId, demoActive],
  );

  const toggleUnread = useCallback((id: string) => {
    setThreads((prev) =>
      prev.map((thread) => (thread.id === id ? { ...thread, unread: !thread.unread } : thread)),
    );
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      if (isGuest) {
        promptGuestUpgrade("delete_chat");
        return;
      }
      const remaining = threads.filter((thread) => thread.id !== id);
      setThreads(remaining);
      if (!demoActive) {
        void fetch(withBasePath(`${ENDPOINT}?id=${encodeURIComponent(id)}`), {
          method: "DELETE",
        });
      }
      // Deleting the thread you are reading leaves nothing to read, so the
      // pane opens a fresh one rather than showing a transcript with no row.
      if (id === activeId) {
        const nextId = newThreadId();
        activeChatIdRef.current = nextId;
        setActiveId(nextId);
        setActiveUpdatedAt(0);
        setActiveTitle(null);
        setMessageAt({});
        setMessages([]);
        setInput("");
      }
    },
    [threads, activeId, setMessages, demoActive, isGuest, promptGuestUpgrade],
  );

  const selectThread = useCallback(
    async (id: string) => {
      if (busy || id === activeId) return;
      const thread = threads.find((candidate) => candidate.id === id);
      if (!thread) return;
      keepLiveThread();
      if (thread.unread) toggleUnread(id);
      activeChatIdRef.current = id;
      setActiveId(id);
      setActiveUpdatedAt(thread.updatedAt);
      setActiveTitle(thread.title);
      setInput("");

      if (demoActive) {
        setMessageAt({});
        setMessages([]);
        return;
      }

      try {
        const response = await fetch(withBasePath(`/api/chat/${id}`));
        if (!response.ok) return;
        const data = (await response.json()) as {
          messages?: ChatMessage[];
          messageAt?: Record<string, number>;
        };
        setMessageAt(data.messageAt ?? {});
        setMessages(data.messages ?? []);
      } catch {
        setMessageAt({});
        setMessages([]);
      }
    },
    [busy, activeId, threads, keepLiveThread, toggleUnread, setMessages, demoActive],
  );

  return localize((
    <NutritionNotificationsProvider>
    <div
      className={cx(
        "relative flex w-full gap-4 overflow-hidden bg-background-full p-3",
        contained ? "h-[var(--template-preview-height)]" : "h-dvh",
        className,
      )}
    >
      <DashboardSidebar
        items={navItems}
        selected="chat"
        className="hidden lg:flex"
        onOpenFeedback={() => setFeedbackOpen(true)}
        onOpenSettings={openSettings}
        onOpenDailyGoals={() => setDailyGoalsOpen(true)}
      />

      {/* Below lg the sidebar rides in as an overlay drawer. The Pro template
          pushes the workspace across instead; this is the plain version. */}
      {navOpen && (
        <div className={cx(contained ? "absolute" : "fixed", "inset-0 z-50 flex lg:hidden")}>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/40"
          />
          <div className="relative flex h-full p-3">
            <DashboardSidebar
              mobile
              items={navItems}
              selected="chat"
              onClose={() => setNavOpen(false)}
              className="flex"
              onOpenFeedback={() => setFeedbackOpen(true)}
              onOpenSettings={openSettings}
              onOpenDailyGoals={() => setDailyGoalsOpen(true)}
            />
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden">
        <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-background-secondary-default">
            <header
              className={cx(
                "absolute inset-x-0 top-0 z-10 flex h-12 items-center gap-2 border-b px-4 pt-[7px] transition-colors",
                // Overlaid rather than stacked above the transcript. Stacked,
                // the scroll area began below it and text was cut off at the
                // header's edge; overlaid, it runs to the container's own
                // rounded top and is clipped by that instead.
                // A rule only earns its place when the text both passes under
                // the header AND the title is wide enough to be in its way.
                // The border is always present but transparent, so appearing
                // costs no height and nothing shifts.
                // When it does clash the band frosts over, so the text passing
                // behind it is obscured instead of running through the title.
                // Tied to the same condition as the rule: with no clash the
                // header stays fully transparent and the transcript reads all
                // the way up to the card's edge.
                scrolledUnder && canClash
                  ? "border-separator-border bg-white/20 backdrop-blur-[20px] dark:bg-black/20"
                  : "border-transparent",
              )}
            >
              <IconButton
                icon={navOpen ? RiCloseLine : RiMenuLine}
                size="small"
                aria-label="Open navigation"
                onClick={() => setNavOpen((open) => !open)}
                className="lg:hidden"
              />
              <AgentChatHeaderTitle
                titleRef={titleRef}
                title={headerTitle(allThreads, activeId)}
                onRename={(nextTitle) => renameThread(activeId, nextTitle)}
              />

              <div className="ms-auto flex shrink-0 items-center gap-1">
                <NotificationBell />
                <AgentChatActions
                  onDelete={() => deleteThread(activeId)}
                  disabled={!hasMounted || messages.length === 0}
                />
              </div>
            </header>

            {probe.status === "unconfigured" && messages.length === 0 && !demo ? (
              <SetupNotice onSkip={enterDemo} />
            ) : (
              <>
                <div
                  ref={scrollRef}
                  onScroll={(event) => setScrolledUnder(event.currentTarget.scrollTop > 0)}
                  className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
                >
                  <div
                    ref={columnRef}
                    className={cx(
                      "mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-[72px] pb-6",
                      // With nothing to read, the prompt sits in the middle of
                      // the empty space rather than pinned under the header.
                      messages.length === 0 && "min-h-full justify-center",
                    )}
                  >
                    {messages.length === 0 ? (
                      <EmptyState onPick={submit} demo={demoActive} guest={isGuest} />
                    ) : (
                      messages.map((message, index) => (
                        <AgentChatTurn
                          key={message.id}
                          message={message}
                          streaming={busy && index === messages.length - 1}
                          at={messageAt[message.id]}
                          addToolApprovalResponse={addToolApprovalResponse}
                          guestMode={isGuest}
                          onGuestMealBlocked={() => promptGuestUpgrade("meal_logging")}
                        />
                      ))
                    )}

                    {showThinking && (
                      <div className="flex items-start gap-3 px-1">
                        <AgentBlobAvatar />
                        <AgentThinking variant="wave" label="Thinking" className="min-w-0 flex-1 pt-1" />
                      </div>
                    )}

                    {error && (
                      <p role="alert" className="px-1 text-body-regular text-text-tertiary">
                        Something went wrong. Check the server logs, then try again.
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 px-3 pb-3">
                  <div className="mx-auto w-full max-w-3xl">
                    {!demoActive && isGuest && (
                      <p className="mb-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2 text-caption-1-regular text-text-secondary">
                        Guest trial — one chat, up to {GUEST_MAX_USER_MESSAGES} messages. Meals are
                        not saved until you{" "}
                        <Link
                          href={withBasePath("/signup")}
                          className={cx(
                            "text-text-primary underline decoration-border-button-default underline-offset-2",
                            "hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                          )}
                        >
                          create an account
                        </Link>
                        .
                      </p>
                    )}
                    {!demoActive && !isGuest ? (
                      <TodayStrip onEditTargets={() => setDailyGoalsOpen(true)} />
                    ) : null}
                    <AgentComposer
                      value={input}
                      onValueChange={setInput}
                      onSubmit={() => submit(input)}
                      onVoiceTranscript={submit}
                      onStop={stop}
                      busy={busy}
                      chatStatus={status}
                      voiceEnabled={!demoActive}
                    />
                  </div>
                </div>
              </>
            )}
        </div>

        {(probe.status !== "unconfigured" || messages.length > 0 || demo) && (
            <AgentChatHistory
              threads={allThreads}
              activeId={activeId}
              onSelect={selectThread}
              onNewChat={startNewChat}
              disableNewChat={guestHasChat}
              onNewChatBlocked={() => promptGuestUpgrade("new_chat")}
              onRename={renameThread}
              onToggleUnread={toggleUnread}
              onDelete={deleteThread}
              onOpenFeedback={() => setFeedbackOpen(true)}
              onOpenSettings={openSettings}
              disabled={busy}
              className="hidden xl:flex"
            />
        )}
      </div>
      {/* Fixed to the viewport, so not inside the docs preview frame. */}
      {!contained && !isGuest && <ProOfferCard />}

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        defaultPage={settingsPage}
        planArtSrc="/templates/settings-plan-art.png"
      />
      {!isGuest && (
        <DailyGoalsModal isOpen={dailyGoalsOpen} onClose={() => setDailyGoalsOpen(false)} />
      )}
    </div>
    </NutritionNotificationsProvider>
  ));
}

function EmptyState({
  onPick,
  demo = false,
  guest = false,
}: {
  onPick: (text: string) => void;
  demo?: boolean;
  guest?: boolean;
}) {
  const localize = useTemplateCopy();
  return localize((
    <div className="flex flex-col items-center gap-4 text-center">
      <FeralJellyWithSpeech speech="Hey, I'm Aharika Nutrition Agent" mood="curious" size="lg" />
      <div className="flex flex-col gap-1">
        <h2 className="text-title-2-medium text-text-primary">What can I help with?</h2>
        <p className="text-body-regular text-text-secondary">
          {demo
            ? "Demo mode: the answers are scripted. Add OPENAI_API_KEY in .env.local for a real coach."
            : guest
              ? "Try the coach in guest mode — ask about food and portions. Create a free account to log meals and open your dashboard."
              : "Log meals, check today's macros, and set goals. Chats are saved to your profile so I can remember how you eat."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="cursor-pointer rounded-full bg-background-primary-default px-3.5 py-2 text-body-regular text-text-secondary shadow-xs transition-colors hover:bg-background-primary-hover"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  ));
}

/**
 * Shown when the runtime reports no provider key. Deliberately specific about
 * where the key goes, because the person seeing this has usually just clicked
 * Deploy and has no context for where that setting lives.
 */
function SetupNotice({ onSkip }: { onSkip: () => void }) {
  const localize = useTemplateCopy();
  return localize((
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col gap-3 rounded-2xl bg-background-primary-default p-6 shadow-card">
        <h2 className="text-headline-medium text-text-primary">Add an API key to start</h2>
        <p className="text-body-regular text-text-secondary">
          The chat is wired up and ready. It needs a model provider key before it can answer.
        </p>
        <ol className="flex list-decimal flex-col gap-1.5 ps-5 text-body-regular text-text-secondary">
          <li>Open your project on Vercel, then Settings, then Environment Variables.</li>
          <li>
            Add <code className="text-text-primary">AI_API_KEY</code> with a key from OpenAI,
            Anthropic, Google, OpenRouter, or Vercel AI Gateway.
          </li>
          <li>Redeploy.</li>
        </ol>
        <p className="text-caption-1-regular text-text-tertiary">
          Running locally? Put the same variable in <code>.env.local</code> and restart the dev
          server.
        </p>
        <Button variant="primary" size="medium" className="w-full" onClick={onSkip}>
          Skip, show me the demo
        </Button>
      </div>
    </div>
  ));
}

/** Newest message first, and trimmed from the oldest end. */
function orderThreads(threads: ChatThreadSummary[]) {
  return [...threads].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_THREADS);
}

/** The text parts of a message, joined. Reasoning and tool parts ride the
 *  same array and are ignored here; a richer screen would render them. */
function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function newThreadId() {
  return globalThis.crypto?.randomUUID?.() ?? generateUUID();
}

function deriveTitle(messages: UIMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  const text = firstUser?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
  if (!text) return "New chat";
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

function headerTitle(threads: ChatThreadSummary[], activeId: string) {
  return threads.find((thread) => thread.id === activeId)?.title ?? "New chat";
}

