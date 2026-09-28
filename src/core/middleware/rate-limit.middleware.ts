import { Request, RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /**
   * A fixed name for this limiter's buckets.
   *
   * Without one the bucket is scoped by the request's method and path, which
   * is text the CLIENT chose - see the key builder in rateLimit() below. A
   * limiter that guards one route (or a set of routes meant to share one
   * budget) should name itself and be done with it.
   */
  name?: string;
  windowMs: number;
  max: number;
  /** Composite key builder. Defaults to the client IP. */
  keyGenerator?: (req: Request) => string;
  message?: string;
  /** Do not count requests that succeeded - used for login. */
  skipSuccessfulRequests?: boolean;
}

/**
 * IN-MEMORY, PER-PROCESS RATE LIMITER.
 *
 * ── SCALING LIMITATION - READ BEFORE DEPLOYING BEHIND A LOAD BALANCER ──
 *
 * State lives in this process's heap. With N application instances behind a
 * load balancer, a client can issue up to N x max requests per window, because
 * each instance counts only what it sees. Sticky sessions narrow but do not
 * close this gap.
 *
 * This is acceptable for a single-instance admin panel - the traffic profile is
 * a handful of internal users - and it is a genuine weakness the moment a second
 * instance exists.
 *
 * MIGRATION PATH: replace the `buckets` Map with a shared atomic counter
 * (Redis INCR + EXPIRE, or an UNLOGGED PostgreSQL table with an upsert and a
 * TTL sweep). The RateLimitOptions interface and every call site stay
 * unchanged; only the `hit()` method below is replaced.
 */
class MemoryRateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor(sweepIntervalMs = 60_000) {
    // unref() so this timer never keeps the process alive during shutdown.
    const timer = setInterval(() => this.sweep(), sweepIntervalMs);
    timer.unref();
  }

  hit(key: string, windowMs: number): Bucket {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const fresh: Bucket = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }

    existing.count += 1;
    return existing;
  }

  decrement(key: string): void {
    const bucket = this.buckets.get(key);
    if (bucket && bucket.count > 0) bucket.count -= 1;
  }

  private sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
        removed += 1;
      }
    }
    if (removed > 0) {
      logger.debug('Rate limit buckets swept', { removed, remaining: this.buckets.size });
    }
  }
}

const store = new MemoryRateLimitStore();

/**
 * The route a request reached, spelled one way.
 *
 * req.baseUrl and req.path keep the casing and the trailing slash the CLIENT
 * sent, while Express's router is case-insensitive and tolerates a trailing
 * slash. So '/public/contact-page/enquiries', '/public/Contact-Page/enquiries'
 * and '/public/contact-page/enquiries/' are one handler and used to be three
 * independent budgets - a limit anyone could walk around by varying a letter's
 * case, on the one unauthenticated write in the API. Lower-cased and stripped
 * here so those spellings count against one bucket.
 *
 * A limiter that passes `name` does not use this at all, which is the stronger
 * answer: no client-supplied text reaches the key.
 */
const routeScope = (req: Request): string =>
  `${req.method}:${`${req.baseUrl}${req.path}`.toLowerCase().replace(/\/+$/, '') || '/'}`;

export function rateLimit(options: RateLimitOptions): RequestHandler {
  const {
    name,
    windowMs,
    max,
    keyGenerator = (req: Request) => req.ip ?? 'unknown',
    message = 'Too many requests. Please try again later.',
    skipSuccessfulRequests = false,
  } = options;

  return (req, res, next) => {
    const key = `${name ?? routeScope(req)}:${keyGenerator(req)}`;
    const bucket = store.hit(key, windowMs);
    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - Date.now()) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (bucket.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      logger.warn('Rate limit exceeded', {
        requestId: req.requestId,
        route: `${req.baseUrl}${req.path}`,
        ip: req.ip,
      });
      return next(new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'));
    }

    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400) store.decrement(key);
      });
    }

    next();
  };
}

export const globalRateLimit = rateLimit({ windowMs: 60_000, max: 300 });

export const standardRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

/** Keyed on IP + email so one attacker cannot lock out every account from one IP. */
export const loginRateLimit = rateLimit({
  name: 'login',
  windowMs: 15 * 60_000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const body = req.body as { email?: unknown } | undefined;
    const email =
      typeof body?.email === 'string' ? body.email.toLowerCase().slice(0, 120) : 'unknown';
    return `${req.ip}:${email}`;
  },
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const forgotPasswordRateLimit = rateLimit({
  name: 'forgot-password',
  windowMs: 60 * 60_000,
  max: 3,
  message: 'Too many password reset requests. Please try again later.',
});

export const resetPasswordRateLimit = rateLimit({
  name: 'reset-password',
  windowMs: 60 * 60_000,
  max: 5,
});
export const refreshRateLimit = rateLimit({ name: 'refresh', windowMs: 15 * 60_000, max: 30 });
/** One budget across both upload routes - it is the uploading that is limited. */
export const uploadRateLimit = rateLimit({ name: 'upload', windowMs: 15 * 60_000, max: 30 });

/**
 * The public Contact enquiry form - one of the five unauthenticated writes in
 * the API; the others are careerApplicationRateLimit,
 * partnerApplicationRateLimit, discoveryCallRateLimit and
 * freeAuditApplicationRateLimit below.
 *
 * Much tighter than standardRateLimit (120/min), because the traffic profile
 * is nothing like a page read: a real visitor submits once, and perhaps fixes
 * a typo and submits again. Five in fifteen minutes from one address covers
 * that with room to spare, while a scripted flood gets 429s after the fifth
 * row rather than an inbox nobody can triage.
 *
 * Keyed per IP, the default, under a FIXED name rather than under the request
 * path. That is the whole guard on this route, so it must not be derived from
 * anything the caller writes: keyed by path, '/public/Contact-Page/enquiries'
 * was a second budget, '/public/contact-Page/enquiries' a third, and one
 * address had a fresh five submissions for every spelling of the URL it cared
 * to type. The name is also the budget's identity, so it cannot be split again
 * by a later router option or a mount being renamed.
 */
export const contactEnquiryRateLimit = rateLimit({
  name: 'contact-enquiry',
  windowMs: 15 * 60_000,
  max: 5,
  message: 'Too many enquiries from this network. Please try again in a few minutes.',
});

/**
 * The public Careers application form - the second unauthenticated write, and
 * the only route in the API where an anonymous caller causes a write to disk.
 *
 * TEN an hour per address, not three. An IP is not a person: a mobile carrier
 * puts thousands of subscribers behind one CGNAT address, and an office, a
 * college or a co-working space is one public address for the whole building.
 * Three was set against the traffic profile of a single applicant - who applies
 * once, twice after fixing their CV - and it is the right number for a person
 * and the wrong one for a network. A campus placement drive with four students
 * applying to the same role within an hour hit it, and because there is no mail
 * transport behind this form and the row IS the delivery, the fourth applicant
 * was simply lost. Ten still refuses a flood long before it becomes one, and
 * careerApplicationGlobalRateLimit below is what actually bounds the disk.
 *
 * Keyed per IP under a FIXED name, for the reason spelled out above the enquiry
 * limiter: the key must contain nothing the caller writes, or the budget is
 * split by re-spelling the URL.
 *
 * Rejected requests count too - the limiter runs before multer and before the
 * validator. That is deliberate: a script probing for a file type that slips
 * through is precisely what this is here to stop, and at ten it costs a real
 * applicant nothing, because a mistyped field is fixed and resubmitted once.
 */
export const careerApplicationRateLimit = rateLimit({
  name: 'career-application',
  windowMs: 60 * 60_000,
  max: 10,
  message: 'Too many applications from this network. Please try again in an hour.',
});

/**
 * The ceiling on the same route that does NOT depend on the key.
 *
 * Every per-IP limiter in this app keys on req.ip, and with `trust proxy` on -
 * the production default - req.ip is whatever the last X-Forwarded-For entry
 * says. That is sound behind exactly one proxy that overwrites the header, and
 * fully attacker-chosen if the process is reachable directly or the ingress
 * passes a client-supplied XFF through. Every other route shares that weakness
 * and loses a table row to it; THIS one loses up to 5 MB of permanent storage
 * per accepted request, with no quota on the storage path, no sweep and no
 * delete for an application. A spoofed header turns "ten an hour" into "ten an
 * hour per header value", which is no limit at all.
 *
 * So one constant key, counted across every caller at once. 300 an hour is far
 * above anything this company will ever receive - six roles advertised at a
 * time - and far below what a flood needs to fill a volume: it caps the route
 * at 1.5 GB an hour even if every request carries a full 5 MB and every key is
 * a fresh lie. It is a backstop, not a business rule, and the message says so
 * rather than blaming the applicant's network.
 */
export const careerApplicationGlobalRateLimit = rateLimit({
  name: 'career-application-global',
  windowMs: 60 * 60_000,
  max: 300,
  keyGenerator: () => 'global',
  message: 'Applications are temporarily unavailable. Please try again shortly.',
});

/**
 * The public Partner Program application form - the third unauthenticated
 * write.
 *
 * Shaped like contactEnquiryRateLimit rather than like the Careers one: five in
 * fifteen minutes per address. The traffic profile is the enquiry form's, not
 * the application form's - one JSON body of six short fields, no file, nothing
 * written to disk - so the careers limiter's hourly window would be answering a
 * problem this route does not have. Five covers a partner who submits once and
 * resubmits after fixing a typo, and a scripted flood gets 429s after the fifth
 * row rather than a list nobody can triage.
 *
 * Keyed per IP under a FIXED name, for the reason spelled out above the enquiry
 * limiter: the key must contain nothing the caller writes, or
 * '/public/Partner-Program/applications' becomes a second budget.
 */
export const partnerApplicationRateLimit = rateLimit({
  name: 'partner-application',
  windowMs: 15 * 60_000,
  max: 5,
  message: 'Too many applications from this network. Please try again in a few minutes.',
});

/**
 * The ceiling on the same route that does NOT depend on the key - the partner
 * twin of careerApplicationGlobalRateLimit, and there for the same reason.
 *
 * The per-IP limiter above keys on req.ip, and with `trust proxy` on - the
 * production default - req.ip is whatever the last X-Forwarded-For entry says.
 * That is sound behind exactly one proxy that overwrites the header and fully
 * attacker-chosen if the process is reachable directly or an ingress passes a
 * client-supplied XFF through. A spoofed header turns "five in fifteen minutes"
 * into "five per header value", which is no limit at all - and that argument is
 * about the key, not about what a request costs, so it holds for a JSON body
 * just as it does for a 5 MB upload. What this route loses to it is the inbox
 * the whole feature exists to deliver into: rows are cleared one confirmed
 * dialog at a time, so a flood is expensive to undo even though it is cheap to
 * store.
 *
 * So one constant key, counted across every caller at once. 300 an hour is far
 * above anything this company will ever receive from a page that asks for a
 * partnership, and far below what burying a real application takes. A backstop,
 * not a business rule - and the message says so rather than blaming the
 * applicant's network.
 */
export const partnerApplicationGlobalRateLimit = rateLimit({
  name: 'partner-application-global',
  windowMs: 60 * 60_000,
  max: 300,
  keyGenerator: () => 'global',
  message: 'Applications are temporarily unavailable. Please try again shortly.',
});

/**
 * The public discovery call form at the foot of /about - the fourth
 * unauthenticated write.
 *
 * Shaped like contactEnquiryRateLimit and partnerApplicationRateLimit rather
 * than like the Careers one: five in fifteen minutes per address. The traffic
 * profile is the enquiry form's - one JSON body of three short fields, no file,
 * nothing written to disk - so the careers limiter's hourly window would be
 * answering a problem this route does not have. Five covers a visitor who
 * submits once and resubmits after fixing a mistyped number, and a scripted
 * flood gets 429s after the fifth row rather than a list nobody can triage.
 *
 * Keyed per IP under a FIXED name, for the reason spelled out above the enquiry
 * limiter: the key must contain nothing the caller writes, or
 * '/public/About-Page/discovery-calls' becomes a second budget.
 */
export const discoveryCallRateLimit = rateLimit({
  name: 'about-discovery-call',
  windowMs: 15 * 60_000,
  max: 5,
  message: 'Too many requests from this network. Please try again in a few minutes.',
});

/**
 * The ceiling on the same route that does NOT depend on the key - the About twin
 * of partnerApplicationGlobalRateLimit, and there for the same reason.
 *
 * The per-IP limiter above keys on req.ip, and with `trust proxy` on - the
 * production default - req.ip is whatever the last X-Forwarded-For entry says.
 * That is sound behind exactly one proxy that overwrites the header and fully
 * attacker-chosen if the process is reachable directly or an ingress passes a
 * client-supplied XFF through. A spoofed header turns "five in fifteen minutes"
 * into "five per header value", which is no limit at all - and that argument is
 * about the key, not about what a request costs, so it holds for three short
 * fields just as it does for a 5 MB upload. What this route loses to it is the
 * inbox the whole feature exists to deliver into - and this form in particular
 * delivered nowhere at all until now, so the first thing it must not do is
 * arrive full of noise.
 *
 * KEYED ON THE PEER SOCKET, NOT ON A CONSTANT. The obvious spelling of "a budget
 * no request can choose" is one literal key for everybody - and it makes the
 * backstop a kill switch: whoever spends it first takes the form away from every
 * genuine visitor until the window turns over. req.socket.remoteAddress is set by
 * the kernel from the TCP peer, so no header can rewrite it either, and it is the
 * strictly better key of the two:
 *
 *   behind one trusted proxy   every request carries the proxy's address, so this
 *                              is one bucket for the whole route - exactly the
 *                              single-budget behaviour a constant key gives;
 *   reachable directly         which is the case these comments call the threat,
 *                              the budget becomes per-attacker instead of
 *                              per-everyone, and a spoofed X-Forwarded-For buys
 *                              nothing because it is not in the key.
 *
 * AND A SHORT WINDOW. The store's windows are fixed, not sliding (resetAt is set
 * from the first hit), so the budget is spent as fast as requests arrive and the
 * rest of the window is a closed door. An hour of that is an hour of lost bookings
 * from one five-second burst; ten minutes is the same backstop with a bounded
 * outage, and 100 in ten minutes is still far above anything a 20-minute discovery
 * call form will ever receive and far below what burying a real booking takes.
 *
 * A backstop, not a business rule - and the message says so rather than blaming
 * the visitor's network.
 *
 * The careers and partner twins above still key on a constant and still use the
 * hour. They have the same weakness and the same fix; they are left alone here
 * because they are not this feature, and changing a live limiter on two other
 * public forms is its own change with its own testing.
 */
export const discoveryCallGlobalRateLimit = rateLimit({
  name: 'about-discovery-call-global',
  windowMs: 10 * 60_000,
  max: 100,
  keyGenerator: (req) => req.socket.remoteAddress ?? 'unknown',
  message: 'Call requests are temporarily unavailable. Please try again shortly.',
});

/**
 * The public audit request form on /free-audit - the fifth unauthenticated
 * write, and the last one this API has.
 *
 * The discovery call limiter's twin, number for number: the traffic profile is
 * the same - one JSON body of a few short fields, no file, nothing written to
 * disk - so five in fifteen minutes per address covers a visitor who submits
 * once and resubmits after fixing a mistyped address, and a scripted flood gets
 * 429s after the fifth row rather than a list nobody can triage.
 *
 * Its own budget under its own FIXED name, not the discovery call's: sharing
 * one would let a visitor who just booked a call on /about be refused an audit
 * on /free-audit, and the key must contain nothing the caller writes, or
 * '/public/Free-Audit/applications' becomes a second budget.
 */
export const freeAuditApplicationRateLimit = rateLimit({
  name: 'free-audit-application',
  windowMs: 15 * 60_000,
  max: 5,
  message: 'Too many requests from this network. Please try again in a few minutes.',
});

/**
 * The ceiling on the same route that does NOT depend on the X-Forwarded-For
 * key - discoveryCallGlobalRateLimit's twin, keyed on the TCP peer address over
 * a ten-minute window for every reason given there: a spoofed header buys
 * nothing because it is not in the key, and a burst from one peer closes the
 * form to that peer for minutes rather than to every visitor for an hour.
 *
 * A backstop, not a business rule - and the message says so rather than blaming
 * the visitor's network.
 */
export const freeAuditApplicationGlobalRateLimit = rateLimit({
  name: 'free-audit-application-global',
  windowMs: 10 * 60_000,
  max: 100,
  keyGenerator: (req) => req.socket.remoteAddress ?? 'unknown',
  message: 'Audit requests are temporarily unavailable. Please try again shortly.',
});
