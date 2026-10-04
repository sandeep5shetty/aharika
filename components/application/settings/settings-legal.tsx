"use client";

import { cx } from "@/utils/cx";

const legalProse = cx(
  "flex flex-col gap-4 text-body-regular text-text-secondary",
  "[&_h2]:pt-2 [&_h2]:text-headline-medium [&_h2]:text-text-primary",
);

export function SettingsTerms() {
  return (
    <div className={legalProse}>
      <p>
        Aharika is a nutrition coaching assistant. By using the product you agree to use it for
        personal wellness tracking and general education, not as a substitute for professional
        medical advice, diagnosis, or treatment.
      </p>
      <h2>Your account</h2>
      <p>
        You are responsible for activity under your account. Keep your sign-in credentials private.
        Guest trials are limited and may not persist all data until you create a full account.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not misuse the service, attempt to disrupt it, or submit unlawful or harmful content
        through chat or feedback channels.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms as the product evolves. Continued use after changes means you
        accept the updated terms.
      </p>
      <p className="text-body-2-regular text-text-tertiary">Last updated: October 2026</p>
    </div>
  );
}

export function SettingsPrivacy() {
  return (
    <div className={legalProse}>
      <p>
        We collect information you provide directly — such as your email, chat messages, meal logs,
        and feedback — so Aharika can coach you and improve the product.
      </p>
      <h2>How we use data</h2>
      <p>
        Meal and chat data power your diary, progress summaries, and personalized coaching. Account
        email is used for sign-in and, when you contact us, to follow up on support requests.
      </p>
      <h2>Storage & security</h2>
      <p>
        Data is stored on secure infrastructure. We do not sell your personal information. Access
        is limited to what is needed to operate and improve the service.
      </p>
      <h2>Your choices</h2>
      <p>
        You can sign out at any time. Registered users can manage profile settings in the app. For
        questions about your data, use Contact us from the Help menu in chat.
      </p>
      <p className="text-body-2-regular text-text-tertiary">Last updated: October 2026</p>
    </div>
  );
}
