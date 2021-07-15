'use strict';
import { Response, Request } from 'express';

/**
 * Sends back the timestamp from the request
 * @param req 
 * @param res 
 */
export const ping = async (req: Request, res: Response) => {
  res.send({
    pong: parseInt(req.query.timestamp as string),
  });
};
