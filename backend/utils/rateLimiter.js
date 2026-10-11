// Small in-memory fixed-window rate limiter. Good enough for a single server
// process; a multi-instance deployment would need a shared store instead.
function createRateLimiter({ max, windowMs }) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  sweep.unref();

  function entryFor(key) {
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    return entry;
  }

  return {
    // Records a hit and returns true if the caller is still within the limit.
    hit(key) {
      const entry = entryFor(key);
      entry.count += 1;
      return entry.count <= max;
    },
    // True when the key has used up its allowance, without recording a hit.
    isBlocked(key) {
      const entry = hits.get(key);
      return !!entry && entry.resetAt > Date.now() && entry.count >= max;
    },
  };
}

// Express middleware that limits by client IP.
function rateLimit(limiter, message = 'Too many requests. Please slow down.') {
  return (req, res, next) => {
    if (limiter.hit(req.ip)) return next();
    res.status(429).json({ success: false, message });
  };
}

module.exports = { createRateLimiter, rateLimit };
