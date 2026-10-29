"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { ToolUIPart } from "ai";
import { RiCheckLine, RiCloseLine, RiEditLine, RiRestaurantLine } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { useDirection } from "@/components/foundations/direction/direction";
import { withBasePath } from "@/lib/constants";
import { inspectMealCompleteness } from "@/lib/nutrition/meal-completeness";
import type { ChatMessage } from "@/lib/types";
import { cx } from "@/utils/cx";

type MealItemPreview = {
  name: string;
  quantity: number;
  unit: string;
  foodId?: string;
  estimatedMacros?: unknown;
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

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

type PendingMealDraft = {
  mealType: (typeof MEAL_TYPES)[number];
  rawText: string;
  items: MealItemPreview[];
};

function draftFromInput(input: LogMealInput | UpdateMealInput | null, isUpdate: boolean): PendingMealDraft {
  const mealType = !isUpdate && input && "mealType" in input
    ? MEAL_TYPES.find((type) => type === input.mealType) ?? "lunch"
    : "lunch";
  return {
    items: (input?.items ?? []).map((item) => ({ ...item })),
    mealType,
    rawText: !isUpdate && input && "rawText" in input ? input.rawText : "",
  };
}

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
        estimatedMacros:
          "estimatedMacros" in entry ? entry.estimatedMacros : undefined,
        foodId:
          "foodId" in entry && typeof entry.foodId === "string"
            ? entry.foodId
            : undefined,
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
  onEditInput?: (input: LogMealInput | UpdateMealInput) => void;
  guestMode?: boolean;
  onGuestMealBlocked?: () => void;
};

function MealConfirmEditModal({
  draft,
  isUpdate,
  onClose,
  onSave,
}: {
  draft: PendingMealDraft;
  isUpdate: boolean;
  onClose: () => void;
  onSave: (draft: PendingMealDraft) => void;
}) {
  const direction = useDirection();
  const [mealType, setMealType] = useState(draft.mealType);
  const [rawText, setRawText] = useState(draft.rawText);
  const [items, setItems] = useState(draft.items);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const save = () => {
    const description = rawText.trim();
    const nextItems = items.map((item) => ({
      ...item,
      name: item.name.trim(),
      unit: item.unit.trim(),
    }));
    if ((!isUpdate && !description) || nextItems.length === 0) {
      setError("Add a description and at least one item.");
      return;
    }
    if (nextItems.some((item) => !item.name || !item.unit || !(item.quantity > 0))) {
      setError("Each item needs a name, a unit, and a quantity above 0.");
      return;
    }
    onSave({
      items: nextItems.map((item, index) => {
        const previous = draft.items[index];
        const unchanged =
          previous?.name === item.name &&
          previous.quantity === item.quantity &&
          previous.unit === item.unit;
        return unchanged
          ? item
          : {
              foodId: previous?.name === item.name ? item.foodId : undefined,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
            };
      }),
      mealType,
      rawText: description,
    });
  };

  return createPortal(
    <div dir={direction} className="fixed inset-0 z-100 flex items-end justify-center p-2 sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        aria-label="Close meal editor"
        className="absolute inset-0 cursor-default bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit meal"
        className="relative flex max-h-[min(614px,calc(100vh-16px))] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl bg-background-full p-4 shadow-xs sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-title-3-medium text-text-primary">Edit meal</h2>
            <p className="text-body-2-regular text-text-tertiary">
              Change the details before they are saved.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={cx(
              "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full",
              "bg-background-tertiary-default text-foreground-icon-secondary",
              "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            )}
          >
            <RiCloseLine className="size-4" aria-hidden />
          </button>
        </div>

        {isUpdate ? null : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-2-medium text-text-secondary">Description</span>
              <Input aria-label="Meal description" value={rawText} onChange={setRawText} />
            </label>
            <Select
              aria-label="Meal type"
              selectedKey={mealType}
              onSelectionChange={(key) => {
                if (MEAL_TYPES.includes(key as (typeof MEAL_TYPES)[number])) {
                  setMealType(key as (typeof MEAL_TYPES)[number]);
                }
              }}
            >
              {MEAL_TYPES.map((type) => (
                <SelectItem key={type} id={type} textValue={type}>
                  <span className="capitalize">{type}</span>
                </SelectItem>
              ))}
            </Select>
          </>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-body-2-medium text-text-secondary">Items</span>
          {items.map((item, index) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem]" key={index}>
              <Input
                aria-label={`Item ${index + 1} name`}
                value={item.name}
                onChange={(value) => {
                  setItems((current) => current.map((entry, entryIndex) => (
                    entryIndex === index ? { ...entry, name: value } : entry
                  )));
                }}
              />
              <Input
                aria-label={`Item ${index + 1} quantity`}
                type="number"
                inputMode="decimal"
                value={String(item.quantity)}
                onChange={(value) => {
                  const quantity = Number.parseFloat(value);
                  setItems((current) => current.map((entry, entryIndex) => (
                    entryIndex === index
                      ? { ...entry, quantity: Number.isFinite(quantity) ? quantity : 0 }
                      : entry
                  )));
                }}
              />
              <Input
                aria-label={`Item ${index + 1} unit`}
                value={item.unit}
                onChange={(value) => {
                  setItems((current) => current.map((entry, entryIndex) => (
                    entryIndex === index ? { ...entry, unit: value } : entry
                  )));
                }}
              />
            </div>
          ))}
        </div>

        {error ? <p className="text-body-2-regular text-text-error-primary">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="small" onClick={save}>
            Save changes
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function MealLogConfirmation({
  toolPart,
  addToolApprovalResponse,
  onEditInput,
  guestMode = false,
  onGuestMealBlocked,
}: MealLogConfirmationProps) {
  const isUpdate = toolPart.type === "tool-updateMeal";
  const logInput = isUpdate ? null : parseLogMealInput(toolPart.input);
  const updateInput = isUpdate ? parseUpdateMealInput(toolPart.input) : null;
  const source = logInput ?? updateInput;
  const [editing, setEditing] = useState(false);
  const items = source?.items ?? [];
  const completeness = logInput
    ? inspectMealCompleteness({ items: logInput.items, rawText: logInput.rawText })
    : null;

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
                  {completeness?.followUp ? (
                    <p className="text-body-2-regular text-text-secondary">
                      {completeness.followUp} You can still save this as a low-confidence estimate.
                    </p>
                  ) : null}
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
        {canRespond && source ? (
          <IconButton
            icon={RiEditLine}
            size="small"
            aria-label="Edit meal"
            onClick={() => setEditing(true)}
          />
        ) : null}
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
      {editing && source ? (
        <MealConfirmEditModal
          draft={draftFromInput(source, isUpdate)}
          isUpdate={isUpdate}
          onClose={() => setEditing(false)}
          onSave={(draft) => {
            if (updateInput) {
              onEditInput?.({ items: draft.items, mealId: updateInput.mealId });
            } else {
              onEditInput?.({
                items: draft.items,
                mealType: draft.mealType,
                rawText: draft.rawText,
              });
            }
            setEditing(false);
          }}
        />
      ) : null}
    </div>
  );
}
