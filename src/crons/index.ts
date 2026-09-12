import { syncWeather } from "./weather";

export type CronJob = (
  env: CloudflareBindings,
  ctx: ExecutionContext,
) => Promise<void>;

export const cronJobs: Record<string, CronJob[]> = {
  "*/10 * * * *": [syncWeather],
};

export async function runScheduled(
  controller: ScheduledController,
  env: CloudflareBindings,
  ctx: ExecutionContext,
): Promise<void> {
  const jobs = cronJobs[controller.cron];

  if (!jobs || jobs.length === 0) {
    console.warn(`No cron job registered for schedule "${controller.cron}"`);
    return;
  }

  const results = await Promise.allSettled(jobs.map((job) => job(env, ctx)));

  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  for (const failure of failures) {
    console.error(failure.reason);
  }

  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      `${failures.length} cron job(s) failed for schedule "${controller.cron}"`,
    );
  }
}
