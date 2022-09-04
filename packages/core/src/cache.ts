import NodeCache from "node-cache";
import { max } from "./tools";
import logger from "./logger";

export interface CacheOptions extends NodeCache.Options {
  size?: number;
}

export class Cache<K extends NodeCache.Key, V> extends NodeCache {
  private timeOutId?: NodeJS.Timeout;
  private readonly maxSize: number;

  public constructor(options: CacheOptions = {}) {
    super(options);
    this.maxSize = options.size || 100;
    this._checkPeriodicSize();
  }

  public isFull(): boolean {
    return this.keys().length >= this.maxSize;
  }

  public set(key: K, value: V, ttl: number): boolean;
  public set(key: K, value: V): boolean;

  public set(key: K, value: V, ttl?: number): boolean {
    // @ts-expect-error
    const b = super.set(key, value, ttl);
    this._trimSize();
    return b;
  }

  public get(key: K, cb: () => V): V;
  public get(key: K): V | undefined;

  /**
   * Get value for key.
   * Refreshes ttl if value exists.
   * Sets value from callback if it did not exist prior
   *
   * @param key cache key
   * @param cb value generator
   * @returns value or undefined if not found and no value generator given
   */
  public get(key: K, cb?: () => V): V | undefined {
    let value = super.get<V>(key);

    if (!value && cb) {
      value = cb();
      this.set(key, value);
    } else {
      this.ttl(key);
    }
    return value;
  }

  public flushAll(): void {
    super.flushAll();

    if (this.timeOutId) {
      clearTimeout(this.timeOutId);
    }
  }

  public close(): void {
    super.close();

    if (this.timeOutId) {
      clearTimeout(this.timeOutId);
    }
  }

  private _checkPeriodicSize() {
    this._trimSize();
    // FIXME: should this not be setInterval instead of setTimeout for an periodic check?
    this.timeOutId = setTimeout(() => this._trimSize(), (this.options.stdTTL || 10) * 1000);
  }

  private _trimSize() {
    const keys = this.keys();

    const overLimit = keys.length - this.maxSize;

    if (overLimit === 1) {
      const maxValue = max(keys, (previous, current) => (this.getTtl(previous) || 0) - (this.getTtl(current) || 0));

      if (!maxValue) {
        logger.warn(`could not find max value: '${keys + ""}'`);
      } else {
        this.del(maxValue);
      }
    } else if (overLimit > 0) {
      keys.sort((a, b) => (this.getTtl(a) || 0) - (this.getTtl(b) || 0));
      this.del(keys.slice(0, overLimit));
    }
  }
}
