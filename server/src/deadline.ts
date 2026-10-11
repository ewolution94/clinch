/**
 * Work that settles within `timeoutMs`, one way or the other — on our clock.
 *
 * The signal handed to `work` is the polite half: it asks `fetch` to drop the
 * request. It is not the guarantee. On 2026-10-09, after two days of the NAS
 * losing DNS on and off, one poll never settled at all: no result, no error, no
 * timeout. Everything that waited on it waited with it, so the live store sat
 * on Friday's table through a whole Sunday of games, and the refresh button,
 * which only joins a poll already running, did nothing. The race below rejects
 * at the deadline whatever `fetch` does, and if `work` turns up afterwards its
 * answer goes nowhere.
 */
export function withDeadline<T>(timeoutMs: number, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`no answer within ${timeoutMs}ms`);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([work(controller.signal), deadline]).finally(() => clearTimeout(timer));
}
