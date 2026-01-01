import Redis from 'ioredis';

export interface IRedisClient {
  // Basic operations
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;

  // List operations
  lpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  ltrim(key: string, start: number, stop: number): Promise<void>;

  // Set operations
  sismember(key: string, member: string): Promise<number>;
  sadd(key: string, member: string): Promise<number>;

  // Sorted set operations
  zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]>;
  zrange(key: string, start: number, stop: number, ...args: string[]): Promise<string[]>;
  zadd(key: string, score: number, member: string): Promise<number>;

  // Connection
  quit(): Promise<void>;
}

// Redis 구현
export class RedisClient implements IRedisClient {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop);
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  async sadd(key: string, member: string): Promise<number> {
    return this.client.sadd(key, member);
  }

  async zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]> {
    return this.client.zrangebyscore(key, min, max);
  }

  async zrange(key: string, start: number, stop: number, ...args: string[]): Promise<string[]> {
    if (args.length === 0) {
      return this.client.zrange(key, start, stop);
    }
    // WITHSCORES 옵션이 있는 경우
    if (args.includes('WITHSCORES')) {
      return this.client.zrange(key, start, stop, 'WITHSCORES');
    }
    return this.client.zrange(key, start, stop);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async quit(): Promise<void> {
    await this.client.quit();
  }
}

// 메모리 폴백 구현
export class MemoryClient implements IRedisClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private lists = new Map<string, string[]>();
  private sets = new Map<string, Set<string>>();
  private sortedSets = new Map<string, Map<string, number>>(); // member -> score

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0', 10) + 1).toString();
    this.store.set(key, { value: newValue });
    return parseInt(newValue, 10);
  }

  async expire(key: string, seconds: number): Promise<void> {
    const item = this.store.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.lists.delete(key);
    this.sets.delete(key);
    this.sortedSets.delete(key);
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item || !item.expiresAt) return -1;
    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async keys(pattern: string): Promise<string[]> {
    // 간단한 glob 패턴 지원 (* -> .*)
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);

    const allKeys = [
      ...Array.from(this.store.keys()),
      ...Array.from(this.lists.keys()),
      ...Array.from(this.sets.keys()),
      ...Array.from(this.sortedSets.keys()),
    ];

    return Array.from(new Set(allKeys)).filter(key => regex.test(key));
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    const list = this.lists.get(key) || [];
    list.unshift(...values);
    this.lists.set(key, list);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) || [];
    return list.slice(start, stop === -1 ? undefined : stop + 1);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const list = this.lists.get(key);
    if (!list) return;

    const trimmed = list.slice(start, stop === -1 ? undefined : stop + 1);
    this.lists.set(key, trimmed);
  }

  async sismember(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    return set && set.has(member) ? 1 : 0;
  }

  async sadd(key: string, member: string): Promise<number> {
    let set = this.sets.get(key);
    if (!set) {
      set = new Set<string>();
      this.sets.set(key, set);
    }

    const sizeBefore = set.size;
    set.add(member);
    return set.size > sizeBefore ? 1 : 0;
  }

  async zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]> {
    const sortedSet = this.sortedSets.get(key);
    if (!sortedSet) return [];

    const minScore = min === '-inf' ? -Infinity : typeof min === 'string' ? parseFloat(min) : min;
    const maxScore = max === '+inf' ? Infinity : typeof max === 'string' ? parseFloat(max) : max;

    return Array.from(sortedSet.entries())
      .filter(([, score]) => score >= minScore && score <= maxScore)
      .sort(([, a], [, b]) => a - b)
      .map(([member]) => member);
  }

  async zrange(key: string, start: number, stop: number, ...args: string[]): Promise<string[]> {
    const sortedSet = this.sortedSets.get(key);
    if (!sortedSet) return [];

    const withScores = args.includes('WITHSCORES');
    const sorted = Array.from(sortedSet.entries()).sort(([, a], [, b]) => a - b);

    const sliced = sorted.slice(start, stop === -1 ? undefined : stop + 1);

    if (withScores) {
      return sliced.flatMap(([member, score]) => [member, score.toString()]);
    }

    return sliced.map(([member]) => member);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    let sortedSet = this.sortedSets.get(key);
    if (!sortedSet) {
      sortedSet = new Map<string, number>();
      this.sortedSets.set(key, sortedSet);
    }

    const existed = sortedSet.has(member);
    sortedSet.set(member, score);
    return existed ? 0 : 1;
  }

  async quit(): Promise<void> {
    this.store.clear();
    this.lists.clear();
    this.sets.clear();
    this.sortedSets.clear();
  }
}

// 팩토리 함수
export function createRedisClient(url?: string): IRedisClient {
  if (url) {
    console.log('🔴 Using Redis client');
    return new RedisClient(url);
  }
  console.log('📦 Using in-memory fallback (no Redis URL)');
  return new MemoryClient();
}
