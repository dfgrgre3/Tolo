/**
 * Dummy Redis Client for Go-Backend Migration
 */

import { logger } from './logger';

const redisProxy = {
  get: async (key: string) => {
    logger.warn(`[LEGACY_REDIS] get(${key}) called.`);
    return null;
  },
  set: async (key: string, value: any) => {
    logger.warn(`[LEGACY_REDIS] set(${key}) called.`);
    return 'OK';
  },
  del: async (key: string) => {
    logger.warn(`[LEGACY_REDIS] del(${key}) called.`);
    return 1;
  },
  getOrSet: async (key: string, fetchFn: () => Promise<any>) => {
    return fetchFn();
  }
};

export const redis = new Proxy(redisProxy, {
  get(target: any, prop: string) {
    if (prop in target) return target[prop];
    return async (...args: any[]) => {
      logger.warn(`[LEGACY_REDIS] ${prop}(${args.join(', ')}) called.`);
      return null;
    };
  }
});

export default redis;
