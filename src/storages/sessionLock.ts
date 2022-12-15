export class SessionLock {
  public readonly sessionId: string;
  public readonly released: Promise<void>;
  public readonly release: () => Promise<void>;
  private acquired: boolean = true;

  public constructor(sessionId: string, release: () => Promise<void> | void) {
    this.sessionId = sessionId;
    let resolve: any = undefined;
    this.released = new Promise((r) => resolve = r);
    this.release = async () => {
      if (!this.acquired) {
        throw new Error('Attempting to release a lock which has not been acquired');
      }

      await release();
      this.acquired = false;
      resolve();
    };
  }

  public isAcquired(): boolean {
    return this.acquired;
  }
}
