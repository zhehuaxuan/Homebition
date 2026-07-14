const logger = require('../services/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 500 ? 'error'
      : statusCode >= 400 ? 'warn'
      : 'info';

    logger.log(level, `[http] ${method} ${originalUrl} → ${statusCode} (${duration}ms)`, {
      method, url: originalUrl, status: statusCode, duration, ip
    });
  });

  next();
};

module.exports = requestLogger;
