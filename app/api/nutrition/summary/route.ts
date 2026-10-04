import { auth } from "@/lib/auth";
import {
  getMealsBetween,
  getUserTimezone,
} from "@/lib/db/nutrition-queries";
import {
  compareToGoals,
  endOfDayInTimeZone,
  getProgressForDate,
  getProgressSnapshot,
  getRangeDailyTotals,
  localDateKey,
  parseDateKey,
  startOfDayInTimeZone,
} from "@/lib/nutrition/day";
import { ChatbotError } from "@/lib/errors";
import { isSessionUserInDatabase } from "@/lib/session-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (!(await isSessionUserInDatabase(session.user.id))) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const userId = session.user.id;
  const timeZone = await getUserTimezone(userId);
  const { searchParams } = new URL(request.url);
  const dateKey = searchParams.get("date");
  const now = new Date();

  if (dateKey) {
    const date = parseDateKey(dateKey);
    const progress = await getProgressForDate(userId, date, timeZone);
    const meals = await getMealsBetween(
      userId,
      startOfDayInTimeZone(date, timeZone),
      endOfDayInTimeZone(date, timeZone)
    );
    const series = await getRangeDailyTotals(userId, 7, timeZone);

    return Response.json({
      date: progress.dateKey,
      delta: compareToGoals(progress.totals, progress.goals),
      goals: progress.goals,
      meals,
      series,
      totals: progress.totals,
    });
  }

  const progress = await getProgressSnapshot(userId, "today", timeZone);
  const series = await getRangeDailyTotals(userId, 7, timeZone);
  const meals = await getMealsBetween(
    userId,
    startOfDayInTimeZone(now, timeZone),
    endOfDayInTimeZone(now, timeZone)
  );

  return Response.json({
    date: localDateKey(now, timeZone),
    delta: compareToGoals(progress.totals, progress.goals),
    goals: progress.goals,
    meals,
    series,
    totals: progress.totals,
  });
}
