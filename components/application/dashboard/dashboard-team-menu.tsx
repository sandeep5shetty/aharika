"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { useDirection } from "@/components/foundations/direction/direction";
import { useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { RiLogoutBoxRLine, RiShieldUserLine } from "@remixicon/react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";
import { useSession } from "next-auth/react";
import {
  UserProfileBlob,
  userBlobSeedFromSession,
} from "@/components/application/user/user-profile-blob";
import { ChevronDownSmall } from "@/components/foundations/icons/chevrons";
import { useLogOutConfirm } from "@/components/application/auth/log-out-confirm-provider";
import { guestRegex } from "@/lib/constants";
import { cx } from "@/utils/cx";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type MenuRow = {
  id: "profile" | "sign-out";
  icon: IconComponent;
  label: string;
};

const MENU_ITEMS: MenuRow[] = [
  { id: "profile", icon: RiShieldUserLine, label: "Profile" },
  { id: "sign-out", icon: RiLogoutBoxRLine, label: "Sign out" },
];

export function accountDisplayFromSession(
  session: ReturnType<typeof useSession>["data"],
) {
  const user = session?.user;
  const isGuest = user?.type === "guest";
  const email = user?.email ?? "";
  const guestEmail = guestRegex.test(email);

  if (isGuest || guestEmail) {
    return {
      displayName: "Guest",
      displayEmail: "Trial visitor — create an account to save meals",
      blobSeed: userBlobSeedFromSession(user),
      avatarSrc: undefined as string | undefined,
    };
  }

  const displayName =
    user?.name?.trim() ||
    (email.includes("@") ? email.split("@")[0] : "Account");

  return {
    displayName,
    displayEmail: email,
    blobSeed: userBlobSeedFromSession(user),
    avatarSrc: user?.image ?? undefined,
  };
}

/** Label/chevron slot on the trigger: blurs + fades away as the rail collapses. */
function Collapsible({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  const localize = useTemplateCopy();
  return localize((
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-40 opacity-100 blur-0",
      )}
    >
      {children}
    </span>
  ));
}

function TeamMenuItem({
  icon: Icon,
  label,
  onSelect,
}: MenuRow & { onSelect: () => void }) {
  const localize = useTemplateCopy();
  return localize((
    <AriaButton
      type="button"
      onPress={onSelect}
      className={cx(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-2lg p-2 text-start outline-none transition-colors",
        "hover:bg-background-primary-hover focus-visible:bg-background-primary-hover",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Icon className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
        <span className="truncate text-body-medium text-text-primary">{label}</span>
      </span>
    </AriaButton>
  ));
}

const mobileSnapshot = () => window.matchMedia("(max-width: 639px)").matches;
const subscribeMobile = (listener: () => void) => {
  const query = window.matchMedia("(max-width: 639px)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};

export function DashboardTeamMenu({
  collapsed = false,
  className,
  onOpenProfile,
}: {
  collapsed?: boolean;
  className?: string;
  /** Opens settings on the Profile pane (same as Settings → Profile). */
  onOpenProfile?: () => void;
}) {
  const localize = useTemplateCopy();
  const direction = useDirection();
  const { data: session } = useSession();
  const account = accountDisplayFromSession(session);
  const [isOpen, setIsOpen] = useState(false);
  const { openLogOutConfirm } = useLogOutConfirm();
  const isMobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, () => false);

  const handleItem = (id: MenuRow["id"]) => {
    setIsOpen(false);
    if (id === "profile") {
      onOpenProfile?.();
      return;
    }
    if (id === "sign-out") {
      openLogOutConfirm();
    }
  };

  return localize((
    <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        aria-label="Account menu"
        className={cx(
          "flex cursor-pointer items-center overflow-hidden outline-none",
          "border-2 border-transparent hover:border-border-button-hover",
          "transition-[width,background-color,border-color,padding] duration-300 ease-in-out",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
          collapsed
            ? "size-9 justify-start rounded-full bg-transparent p-0"
            : "w-full justify-between rounded-xl bg-background-tertiary-default py-2 pe-4 ps-2.5",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <UserProfileBlob
            size="md"
            seed={account.blobSeed}
            src={account.avatarSrc}
            alt={account.displayName}
          />
          <Collapsible collapsed={collapsed}>
            <span className="flex min-w-0 flex-col items-start justify-center">
              <span className="max-w-[9.5rem] truncate text-body-medium text-text-primary">
                {account.displayName}
              </span>
              <span className="max-w-[9.5rem] truncate text-body-regular text-text-secondary">
                {account.displayEmail}
              </span>
            </span>
          </Collapsible>
        </span>
        <Collapsible collapsed={collapsed}>
          <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-background-tertiary-hover">
            <ChevronDownSmall
              className={cx("size-4 text-text-secondary transition-transform duration-200 ease", isOpen && "rotate-180")}
            />
          </span>
        </Collapsible>
      </AriaButton>

      <AriaPopover
        placement={isMobile ? "bottom start" : direction === "rtl" ? "left bottom" : "right bottom"}
        offset={8}
        className={cx(
          "w-[265px] max-w-[calc(100vw-32px)] origin-bottom-left overflow-y-auto",
          "rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-dropdown",
          "transition duration-150 ease-out",
          "data-[entering]:opacity-0 data-[entering]:scale-95 data-[entering]:blur-[2px]",
          "data-[exiting]:opacity-0 data-[exiting]:scale-95 data-[exiting]:blur-[2px]",
        )}
      >
        <AriaDialog aria-label="Account menu" className="flex flex-col gap-[7px] outline-none">
          <div className="flex w-full items-center gap-2 px-2 pt-1">
            <UserProfileBlob
              size="md"
              seed={account.blobSeed}
              src={account.avatarSrc}
              alt={account.displayName}
            />
            <div className="flex min-w-0 flex-col items-start justify-center">
              <span className="max-w-[12rem] truncate text-body-medium text-text-primary">
                {account.displayName}
              </span>
              <span className="max-w-[12rem] truncate text-body-regular text-text-secondary">
                {account.displayEmail}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-1 pt-1">
            {MENU_ITEMS.map((item) => (
              <TeamMenuItem key={item.id} {...item} onSelect={() => handleItem(item.id)} />
            ))}
          </div>
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  ));
}
