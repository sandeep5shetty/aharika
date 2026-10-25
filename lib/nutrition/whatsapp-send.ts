import {
  isWhatsappSandboxConfigured,
  reminderBody,
  sandboxJoinPhrase,
  twilioMessageFields,
} from "./whatsapp";

export function sandboxConfig(request: Request) {
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim() ?? "";
  const joinCode = sandboxJoinPhrase(process.env.TWILIO_SANDBOX_JOIN_CODE ?? "");
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const appUrl = fromEnv || new URL(request.url).origin;
  return {
    accountSid,
    appUrl,
    authToken,
    configured: isWhatsappSandboxConfigured({ accountSid, authToken, from, joinCode }),
    from,
    joinCode,
  };
}

export async function sendSandboxWhatsapp(
  request: Request,
  to: string,
  message: { name: string; meal: "breakfast" | "lunch" | "dinner" },
) {
  const config = sandboxConfig(request);
  if (!config.configured) {
    return {
      ok: false as const,
      status: 503,
      message: "WhatsApp sandbox is not configured on the server.",
    };
  }

  const fields = twilioMessageFields({
    body: reminderBody({
      appUrl: config.appUrl,
      name: message.name,
      meal: message.meal,
    }),
    from: config.from,
    to,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(fields),
    },
  );

  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { message?: string } | null;
    return {
      ok: false as const,
      status: 502,
      message:
        failure?.message ??
        "Twilio could not send the reminder. Join the sandbox from WhatsApp, then try again.",
    };
  }

  return { ok: true as const };
}
