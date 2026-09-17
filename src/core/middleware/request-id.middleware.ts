import { randomUUID } from 'node:crypto';
import { RequestHandler } from 'express';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const requestId: RequestHandler = (req, res, next) => {
  const inbound = req.header('X-Request-Id');
  // Only trust an inbound id if it is a well-formed UUID - otherwise a client
  // could inject arbitrary text into every log line for this request.
  req.requestId = inbound && UUID_PATTERN.test(inbound) ? inbound : randomUUID();
  req.startTime = process.hrtime.bigint();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
