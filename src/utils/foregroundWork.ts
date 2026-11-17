/**
 * Counts scans and queues the user started, so the silent monitor never adds
 * its own requests on top of them.
 */
let activeJobs = 0;

export function beginForegroundWork(): () => void {
  activeJobs += 1;
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    activeJobs = Math.max(0, activeJobs - 1);
  };
}

export function isForegroundWorkActive(): boolean {
  return activeJobs > 0;
}
