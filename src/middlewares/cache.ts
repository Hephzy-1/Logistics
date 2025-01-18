import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';

declare module 'express' {
  export interface Response {
    sendResponse?: (body?: any) => Response;
  }
}

const cache = new NodeCache({ stdTTL: 60 * 5 }); // TTL: 5 minutes

const generateCacheKey = (req: Request): string => {
  const { originalUrl, params, query } = req;
  return `${originalUrl}-${JSON.stringify(params)}-${JSON.stringify(query)}`;
};

const cacheMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const key = generateCacheKey(req);
  const cachedData = cache.get(key);

  if (cachedData) {
    res.json(cachedData); 
  }

  res.sendResponse = res.json.bind(res);

  res.json = (data) => {
    cache.set(key, data); 
    return res.sendResponse!(data); 
  }

  next();
};

export default cacheMiddleware;