"use client";

import { motion } from "motion/react";
import { RiRestaurantLine } from "@remixicon/react";

import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

const MOCK_ITEMS = [
  { name: "Chapati", quantity: "2 medium" },
  { name: "Dal (arhar)", quantity: "1 katori" },
  { name: "Curd rice", quantity: "1 bowl" },
];

function UserBubble({ children }: { children: string }) {
  return (
    <p
      className={cx(
        "ms-auto w-fit max-w-[95%] rounded-2xl rounded-br-md border border-border-button-default",
        "bg-background-primary-default px-3 py-2 text-body-2-regular text-text-primary shadow-sm",
      )}
    >
      {children}
    </p>
  );
}

export function LandingFeatureMealChat() {
  return (
    <motion.div
      className={cx(
        "flex flex-col gap-3 rounded-2xl border border-border-button-default",
        "bg-background-secondary-default p-3 sm:p-4",
      )}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "tween", duration: 0.45, ease: "easeOut" }}
    >
      <UserBubble>Log 2 chapati and curd rice for lunch</UserBubble>

      <div
        className={cx(
          "w-full rounded-2xl border border-border-button-default",
          "bg-background-primary-default p-3 shadow-card ring-1 ring-accent-500/15 sm:p-4",
        )}
      >
        <div className="flex items-start gap-2">
          <RiRestaurantLine
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-foreground-icon-primary"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-body-2-medium text-text-primary">Log this meal?</p>
            <p className="text-body-2-regular text-text-secondary">
              Confirm the details below before they are saved.
            </p>
            <div className="space-y-1 text-body-2-regular text-text-primary">
              <p>
                <span className="text-text-secondary">Meal: </span>
                Lunch
              </p>
              <p className="text-text-secondary">2 chapati and curd rice</p>
              
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" size="small" tabIndex={-1}>
            Cancel
          </Button>
          <Button type="button" size="small" tabIndex={-1}>
            Log meal
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
