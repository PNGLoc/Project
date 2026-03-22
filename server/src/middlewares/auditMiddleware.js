import AuditLog from '../models/AuditLog.js';

const resolveClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '';
};

export const auditAction = (action, buildMetadata) => (req, res, next) => {
    res.on('finish', async () => {
        try {
            const metadata = typeof buildMetadata === 'function'
                ? buildMetadata(req, res)
                : {};

            await AuditLog.create({
                action,
                userId: req.user?._id || null,
                ip: resolveClientIp(req),
                userAgent: req.headers['user-agent'] || '',
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                metadata
            });
        } catch (error) {
            console.error('[AUDIT LOG ERROR]', error?.message || error);
        }
    });

    next();
};
