"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { RiPencilLine } from "@remixicon/react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { cx } from "@/utils/cx";

export function AgentChatHeaderTitle({
  title,
  onRename,
  titleRef,
  className,
}: {
  title: string;
  onRename: (nextTitle: string) => void;
  titleRef: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const localize = useTemplateCopy();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(title);
    }
  }, [editing, title]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== title) {
      onRename(next);
    }
    setEditing(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(title);
      setEditing(false);
    }
  };

  const startEditing = () => {
    setDraft(title);
    setEditing(true);
  };

  if (editing) {
    return localize((
      <div ref={titleRef} className={cx("min-w-0 flex-1", className)}>
        <label className="sr-only" htmlFor="agent-chat-header-title-input">
          Rename chat
        </label>
        <input
          id="agent-chat-header-title-input"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          className="w-full min-w-0 bg-transparent text-headline-medium text-text-primary outline-none ring-2 ring-border-focus-ring ring-offset-2 rounded-md"
        />
      </div>
    ));
  }

  return localize((
    <div
      ref={titleRef}
      className={cx("group/title flex min-w-0 flex-1 items-center gap-1", className)}
    >
      <button
        type="button"
        onClick={startEditing}
        className="flex min-w-0 cursor-pointer items-center gap-1 rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2"
        title="Rename chat"
      >
        <span className="min-w-0 truncate text-headline-medium text-text-primary">
          {title}
        </span>
        <RiPencilLine
          className="size-4 shrink-0 text-foreground-icon-tertiary opacity-0 transition-opacity group-hover/title:opacity-100 group-focus-visible/title:opacity-100"
          aria-hidden
        />
      </button>
    </div>
  ));
}
