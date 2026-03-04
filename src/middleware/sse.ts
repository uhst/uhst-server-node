'use strict';
import { Request, Response, Handler } from 'express';

export interface ISseFunctions {
  data(data: any, id?: string): void;
  event(event: string, data: any, id?: string): void;
  comment(comment: string): void;
}

export interface ISseResponse extends Response {
  sse: ISseFunctions;
}

export interface ISseMiddlewareOptions {
  flushHeaders?: boolean;
  keepAliveInterval?: false | number;
}

export function sse(options: ISseMiddlewareOptions = {}): Handler {
  const { flushHeaders = true, keepAliveInterval = 5000 } = options;

  return (req: Request, res: Response, next: Function) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    });

    if (flushHeaders) {
      res.flushHeaders();
    }

    if (keepAliveInterval !== false && typeof keepAliveInterval === 'number') {
      const keepAliveTimer = setInterval(() => res.write(': sse-keep-alive\n'), keepAliveInterval);
      res.once('close', () => clearInterval(keepAliveTimer));
      res.once('finish', () => clearInterval(keepAliveTimer));
    }

    const sseRes = res as ISseResponse;
    sseRes.sse = {
      data(data: any, id?: string) {
        let msg = '';
        if (id != null) msg += `id: ${id}\n`;
        msg += `data: ${JSON.stringify(data)}\n\n`;
        res.write(msg);
      },
      event(event: string, data: any, id?: string) {
        let msg = '';
        if (id != null) msg += `id: ${id}\n`;
        msg += `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        res.write(msg);
      },
      comment(comment: string) {
        res.write(`: ${comment}\n`);
      }
    };

    next();
  };
}
