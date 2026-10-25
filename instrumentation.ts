export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // Vercel runs the same check from a cron request. An in-process timer would
  // die with the serverless isolate, so it only starts on a long-running server.
  if (process.env.VERCEL === "1") return;

  const { startWhatsappReminderJob } = await import("@/lib/nutrition/whatsapp-job");
  startWhatsappReminderJob();
}
