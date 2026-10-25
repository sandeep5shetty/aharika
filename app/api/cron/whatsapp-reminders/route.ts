import { isCronAuthorized, runWhatsappReminderJob } from "@/lib/nutrition/whatsapp-job";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWhatsappReminderJob();
  return Response.json(result);
}
