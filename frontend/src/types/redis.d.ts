declare module 'ioredis' {
  import { EventEmitter } from 'events';

  interface RedisOptions {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    db?: number;
    keyPrefix?: string;
    retryStrategy?: (times: number) => number | void | null;
    enableReadyCheck?: boolean;
    maxRetriesPerRequest?: number;
    connectTimeout?: number;
    lazyConnect?: boolean;
    tls?: Record<string, unknown>;
  }

  class Redis extends EventEmitter {
    status: string;

    constructor(url?: string, options?: RedisOptions);
    constructor(options?: RedisOptions);
    static Cluster: new (nodes: { host: string; port: number }[], options?: Record<string, unknown>) => Redis;

    on(event: 'connect' | 'ready' | 'error' | 'close' | 'reconnecting' | 'end', listener: (...args: any[]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;

    quit(): Promise<'OK'>;
    disconnect(): void;
    duplicate(options?: RedisOptions): Redis;

    // Sorted Set operations
    zadd(key: string, score: number, member: string): Promise<number>;
    zrange(key: string, start: number, stop: number): Promise<string[]>;
    zcard(key: string): Promise<number>;
    zrem(key: string, ...members: string[]): Promise<number>;

    // String operations
    get(key: string): Promise<string | null>;
    set(key: string, value: string | Buffer | number, ...args: any[]): Promise<'OK'>;
    setex(key: string, seconds: number, value: string | Buffer | number): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    incrby(key: string, increment: number): Promise<number>;
    append(key: string, value: string | Buffer): Promise<number>;
    strlen(key: string): Promise<number>;
    getrange(key: string, start: number, end: number): Promise<string>;
    setrange(key: string, offset: number, value: string | Buffer): Promise<number>;
    exists(...keys: string[]): Promise<number>;

    // Hash operations
    hget(key: string, field: string): Promise<string | null>;
    hset(key: string, field: string, value: string | Buffer | number): Promise<number>;
    hset(key: string, object: Record<string, string | number | Buffer>): Promise<number>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    hgetall(key: string): Promise<Record<string, string>>;
    hlen(key: string): Promise<number>;
    hincrby(key: string, field: string, increment: number): Promise<number>;
    hmset(key: string, ...args: (string | Buffer | number | Record<string, string | Buffer | number>)[]): Promise<'OK'>;

    // List operations
    lpush(key: string, ...values: (string | Buffer | number)[]): Promise<number>;
    rpush(key: string, ...values: (string | Buffer | number)[]): Promise<number>;
    llen(key: string): Promise<number>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    ltrim(key: string, start: number, stop: number): Promise<'OK'>;

    // Set operations
    sadd(key: string, ...members: (string | Buffer | number)[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    srem(key: string, ...members: (string | Buffer | number)[]): Promise<number>;
    scard(key: string): Promise<number>;

    // Pipeline / Multi
    multi(): Pipeline;
    pipeline(): Pipeline;

    // Server
    ping(): Promise<string>;
    flushall(): Promise<'OK'>;
    flushdb(): Promise<'OK'>;
    info(section?: string): Promise<string>;
  }

  interface Pipeline {
    get(key: string): Pipeline;
    set(key: string, value: string | Buffer | number): Pipeline;
    hincrby(key: string, field: string, increment: number): Pipeline;
    del(...keys: string[]): Pipeline;
    expire(key: string, seconds: number): Pipeline;
    hset(key: string, field: string, value: string | Buffer | number): Pipeline;
    hset(key: string, object: Record<string, string | number | Buffer>): Pipeline;
    hget(key: string, field: string): Pipeline;
    sadd(key: string, ...members: (string | Buffer | number)[]): Pipeline;
    exec(): Promise<[Error | null, any][]>;
  }

  export default Redis;
}