"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { RiMoreFill } from "@remixicon/react";
import { useState } from "react";

import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { cx } from "@/utils/cx";

/** Chat header overflow menu (delete current thread). */
export interface AgentChatActionsProps {
  onDelete: () => void;
  /** No chat open yet, so there is nothing to act on. */
  disabled?: boolean;
  className?: string;
}

export function AgentChatActions({
  onDelete,
  disabled = false,
  className,
}: AgentChatActionsProps) {
  const localize = useTemplateCopy();
  const [menuOpen, setMenuOpen] = useState(false);

  const choose = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return localize((
    <div className={cx("flex shrink-0 items-center gap-0.5", className)}>
      <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownTrigger
          aria-label="More actions for this chat"
          isDisabled={disabled}
          className={cx(ACTION_BUTTON, menuOpen && "bg-background-primary-hover text-text-primary")}
        >
          <RiMoreFill className="size-[18px] shrink-0" aria-hidden />
        </DropdownTrigger>

        <DropdownPopover
          aria-label="More actions for this chat"
          placement="bottom end"
          className="w-[190px] p-2"
        >
          <DropdownGroup>
            <DropdownItem onSelect={choose(onDelete)} className="px-2 py-1.5">
              <span className="truncate text-body-medium whitespace-nowrap text-text-error-primary">
                Delete chat
              </span>
            </DropdownItem>
          </DropdownGroup>
        </DropdownPopover>
      </Dropdown>
    </div>
  ));
}

/** DropdownTrigger is itself a button, so both controls share plain classes
 *  rather than wrapping an IconButton (which would nest one button in another). */
const ACTION_BUTTON = cx(
  "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md",
  "text-foreground-icon-secondary transition-colors duration-150 ease",
  "hover:bg-background-primary-hover hover:text-foreground-icon-primary",
  "disabled:cursor-not-allowed disabled:opacity-40",
);
