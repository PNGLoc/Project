const buckets = new Map();

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown-ip';
};

const nowMs = () => Date.now();

const sweepExpiredBuckets = () => {
    const now = nowMs();
    for (const [key, value] of buckets.entries()) {
        if (value.resetAt <= now) {
            buckets.delete(key);
        }
    }
};

setInterval(sweepExpiredBuckets, 60 * 1000).unref();

export const createSensitiveRateLimiter = ({
    keyPrefix,
    windowMs = 60 * 1000,
    max = 30,
    message = 'Too many requests. Please try again later.',
    keyGenerator
}) => {
    return (req, res, next) => {
        const identity = typeof keyGenerator === 'function'
            ? keyGenerator(req)
            : (req.user?._id?.toString() || getClientIp(req));

        const key = `${keyPrefix}:${identity}`;
        const now = nowMs();

        const current = buckets.get(key);
        if (!current || current.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (current.count >= max) {
            const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
            res.set('Retry-After', String(Math.max(retryAfterSec, 1)));
            return res.status(429).json({
                message,
                retryAfter: Math.max(retryAfterSec, 1)
            });
        }

        current.count += 1;
        buckets.set(key, current);
        return next();
    };
};
