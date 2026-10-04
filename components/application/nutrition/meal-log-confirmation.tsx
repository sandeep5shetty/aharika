"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { ToolUIPart } from "ai";
import { RiCheckLine, RiCloseLine, RiRestaurantLine } from "@remixicon/react";
import { useCallback } from "react";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { withBasePath } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import { cx } from "@/utils/cx";

type MealItemPreview = {
  name: string;
  quantity: number;
  unit: string;
};

type LogMealInput = {
  mealType: string;
  rawText: string;
  items: MealItemPreview[];
};

type UpdateMealInput = {
  mealId: string;
  items: MealItemPreview[];
};

function formatMealType(mealType: string) {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

function parseItems(value: unknown): MealItemPreview[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: MealItemPreview[] = [];
  for (const entry of value) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      "name" in entry &&
      typeof entry.name === "string" &&
      "quantity" in entry &&
      typeof entry.quantity === "number" &&
      "unit" in entry &&
      typeof entry.unit === "string"
    ) {
      items.push({
        name: entry.name,
        quantity: entry.quantity,
        unit: entry.unit,
      });
    }
  }
  return items;
}

function parseLogMealInput(input: unknown): LogMealInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (
    typeof record.mealType !== "string" ||
    typeof record.rawText !== "string"
  ) {
    return null;
  }
  return {
    items: parseItems(record.items),
    mealType: record.mealType,
    rawText: record.rawText,
  };
}

function parseUpdateMealInput(input: unknown): UpdateMealInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (typeof record.mealId !== "string") {
    return null;
  }
  return {
    items: parseItems(record.items),
    mealId: record.mealId,
  };
}

function ItemList({ items }: { items: MealItemPreview[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-2 space-y-1.5 border-t border-separator-border pt-2">
      {items.map((item) => (
        <li
          className="flex flex-wrap justify-between gap-2 text-body-2-regular text-text-secondary"
          key={`${item.name}-${item.quantity}-${item.unit}`}
        >
          <span>{item.name}</span>
          <span>
            {item.quantity} {item.unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

type MealLogConfirmationProps = {
  toolPart: {
    type: "tool-logMeal" | "tool-updateMeal";
    toolCallId: string;
    state: ToolUIPart["state"];
    input?: unknown;
    approval?: {
      id: string;
      approved?: boolean;
      reason?: string;
    };
  };
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  guestMode?: boolean;
  onGuestMealBlocked?: () => void;
};

export function MealLogConfirmation({
  toolPart,
  addToolApprovalResponse,
  guestMode = false,
  onGuestMealBlocked,
}: MealLogConfirmationProps) {
  const isUpdate = toolPart.type === "tool-updateMeal";
  const logInput = isUpdate ? null : parseLogMealInput(toolPart.input);
  const updateInput = isUpdate ? parseUpdateMealInput(toolPart.input) : null;
  const items = logInput?.items ?? updateInput?.items ?? [];

  const approvalId = toolPart.approval?.id;
  const canRespond =
    toolPart.state === "approval-requested" && approvalId !== undefined;

  const handleReject = useCallback(() => {
    if (approvalId === undefined) {
      return;
    }
    addToolApprovalResponse({
      approved: false,
      id: approvalId,
    });
  }, [addToolApprovalResponse, approvalId]);

  const handleApprove = useCallback(() => {
    if (approvalId === undefined) {
      return;
    }
    addToolApprovalResponse({
      approved: true,
      id: approvalId,
    });
  }, [addToolApprovalResponse, approvalId]);

  const isSavingAfterApproval =
    toolPart.approval?.approved === true &&
    (toolPart.state === "approval-responded" ||
      toolPart.state === "input-available");

  if (isSavingAfterApproval) {
    return (
      <div
        aria-busy="true"
        className="w-full max-w-md rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card"
        role="status"
      >
        <p className="text-body-medium text-text-primary">
          {isUpdate ? "Updating your meal…" : "Saving to your diary…"}
        </p>
        <p className="mt-1 text-body-2-regular text-text-secondary">
          Looking up nutrition details and refreshing today&apos;s totals.
        </p>
      </div>
    );
  }

  const rejected =
    toolPart.state === "output-denied" ||
    toolPart.approval?.approved === false;
  const accepted =
    toolPart.approval?.approved === true &&
    toolPart.state !== "approval-requested";

  return (
    <div
      className={cx(
        "w-full max-w-md rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card",
      )}
    >
      <div className="flex items-start gap-2">
        <RiRestaurantLine
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-foreground-icon-primary"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-body-medium text-text-primary">
            {isUpdate ? "Update this meal?" : "Log this meal?"}
          </p>
          {rejected ? (
            <p className="inline-flex items-center gap-1.5 text-body-regular text-text-secondary">
              <RiCloseLine className="size-4 text-text-error-primary" aria-hidden />
              {isUpdate
                ? "Update cancelled — nothing was changed"
                : "Meal log cancelled — nothing was saved"}
            </p>
          ) : accepted ? (
            <p className="inline-flex items-center gap-1.5 text-body-regular text-text-secondary">
              <RiCheckLine className="size-4 text-accent-600" aria-hidden />
              {isUpdate ? "Meal update approved" : "Meal log approved"}
            </p>
          ) : (
            <>
              <p className="text-body-2-regular text-text-secondary">
                {isUpdate
                  ? "Review the corrected items before saving to your diary."
                  : "Confirm the details below before they are saved."}
              </p>
              {logInput ? (
                <div className="space-y-1 text-body-regular text-text-primary">
                  <p>
                    <span className="text-text-secondary">Meal: </span>
                    {formatMealType(logInput.mealType)}
                  </p>
                  {logInput.rawText ? (
                    <p className="text-text-secondary">{logInput.rawText}</p>
                  ) : null}
                  <ItemList items={items} />
                </div>
              ) : null}
              {updateInput ? (
                <div className="text-body-regular text-text-primary">
                  <p className="text-caption-1-semibold text-text-secondary">
                    Meal id: {updateInput.mealId.slice(0, 8)}…
                  </p>
                  <ItemList items={items} />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      {canRespond ? (
        guestMode ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-body-2-regular text-text-secondary">
              Guest mode cannot save meals. Create a free account to log this to your diary.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" size="small" onClick={handleReject}>
                Not now
              </Button>
              <ButtonLink
                href={withBasePath("/signup")}
                size="small"
                onClick={() => onGuestMealBlocked?.()}
              >
                Create account
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="small" onClick={handleReject}>
              Cancel
            </Button>
            <Button variant="primary" size="small" onClick={handleApprove}>
              {isUpdate ? "Save changes" : "Log meal"}
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
