"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { RiNotificationLine } from "@remixicon/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Dialog, Popover } from "react-aria-components";

import { STARTER_NOTIFICATIONS } from "@/components/application/app-shell/starter-notifications";
import {
  NotificationCenter,
  type NotificationCenterItem,
  type NotificationCenterTab,
} from "@/components/application/notification-center/notification-center";
import { IconButton } from "@/components/base/buttons/icon-button";
import { useDismissOnOutsidePress } from "@/utils/use-dismiss-on-outside-press";

type NotificationsContextValue = {
  isOpen: boolean;
  notifications: NotificationCenterItem[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  unreadCount: number;
  setTriggerRef: (node: HTMLButtonElement | null) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  return useContext(NotificationsContext);
}

/** Shared inbox + popover for the header bell and sidebar “Notifications”. */
export function NotificationsProvider({
  children,
  notifications = STARTER_NOTIFICATIONS,
  onAction,
  tabLabels,
  emptyMessage,
}: {
  children: ReactNode;
  notifications?: NotificationCenterItem[];
  onAction?: (notificationId: string, actionId: string) => void;
  tabLabels?: Partial<Record<NotificationCenterTab, string>>;
  emptyMessage?: string;
}) {
  const localize = useTemplateCopy();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const setTriggerRef = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
  }, []);

  const unreadCount = notifications.filter((item) => item.unread).length;

  const handleAction = useCallback(
    (notificationId: string, actionId: string) => {
      setIsOpen(false);
      onAction?.(notificationId, actionId);
    },
    [onAction],
  );

  const value = useMemo(
    () => ({
      isOpen,
      notifications,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((open) => !open),
      unreadCount,
      setTriggerRef,
    }),
    [isOpen, notifications, unreadCount, setTriggerRef],
  );

  useDismissOnOutsidePress(isOpen, () => setIsOpen(false), [
    triggerRef as RefObject<HTMLElement | null>,
    popoverRef,
  ]);

  return localize((
    <NotificationsContext.Provider value={value}>
      {children}
      <Popover
        ref={popoverRef}
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom end"
        offset={8}
        isNonModal
        className="z-50 w-[440px] max-w-[calc(100vw-24px)] outline-none"
      >
        <Dialog aria-label="Notifications" className="outline-none">
          <NotificationCenter
            notifications={notifications}
            onAction={handleAction}
            tabLabels={tabLabels}
            emptyMessage={emptyMessage}
          />
        </Dialog>
      </Popover>
    </NotificationsContext.Provider>
  ));
}

/** Header bell: registers as the popover anchor and toggles the shared inbox. */
export function NotificationBell() {
  const localize = useTemplateCopy();
  const ctx = useNotifications();
  const fallbackTriggerRef = useRef<HTMLButtonElement>(null);
  const fallbackPopoverRef = useRef<HTMLElement>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const notifications = ctx?.notifications ?? STARTER_NOTIFICATIONS;
  const unread = ctx?.unreadCount ?? notifications.filter((item) => item.unread).length;
  const isOpen = ctx?.isOpen ?? fallbackOpen;
  const setOpen = ctx ? (open: boolean) => (open ? ctx.open() : ctx.close()) : setFallbackOpen;
  const onToggle = ctx?.toggle ?? (() => setFallbackOpen((open) => !open));

  useDismissOnOutsidePress(!ctx && fallbackOpen, () => setFallbackOpen(false), [
    fallbackTriggerRef,
    fallbackPopoverRef,
  ]);

  const button = (
    <span className="group relative inline-flex">
      <IconButton
        ref={(node) => {
          if (ctx) ctx.setTriggerRef(node);
          else fallbackTriggerRef.current = node;
        }}
        icon={RiNotificationLine}
        size="medium"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={onToggle}
      />
      {unread > 0 && (
        <span className="pointer-events-none absolute top-0.5 start-[18px] flex size-4 items-center justify-center rounded-full border-[1.5px] border-background-primary-default bg-red-600 group-hover:border-0 group-active:border-0">
          <span className="w-4 text-center text-[10px] leading-4 font-bold text-white">{unread}</span>
        </span>
      )}
    </span>
  );

  if (ctx) {
    return localize(button);
  }

  return localize((
    <>
      {button}
      <Popover
        ref={fallbackPopoverRef}
        triggerRef={fallbackTriggerRef}
        isOpen={fallbackOpen}
        onOpenChange={setOpen}
        placement="bottom end"
        offset={8}
        isNonModal
        className="z-50 w-[440px] max-w-[calc(100vw-24px)] outline-none"
      >
        <Dialog aria-label="Notifications" className="outline-none">
          <NotificationCenter notifications={notifications} />
        </Dialog>
      </Popover>
    </>
  ));
}
