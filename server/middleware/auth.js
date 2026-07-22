const jwtConfig = require('../config/jwt');
const jwt = require('jsonwebtoken');

// Token 校验中间件
// 公开路由白名单 — 无需 token 即可访问
const PUBLIC_ROUTES = [
    { path: '/api/auth/login', method: 'POST' },
    { path: '/api/auth/mini/login', method: 'POST' },
    { path: '/api/auth/profile', method: 'GET' },
    { path: '/api/auth/logout', method: 'POST' },
    { path: '/api/auth/send-mail', method: 'POST' },
    { path: '/api/auth/test-mail-template', method: 'GET' },
    { path: '/api/article/list', method: 'GET' },
    { path: '/api/article/detail', method: 'GET' },
];

const authMiddleware = (req, res, next) => {
    // 检查是否公开路由
    const isPublic = PUBLIC_ROUTES.some(
        r => req.path.startsWith(r.path) && req.method === r.method
    );
    if (isPublic) {
        return next();
    }

    // 从 header 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ code: 401, message: '未登录，请先登录' });
    }

    const token = authHeader.slice(7);
    if (!token) {
        return res.status(401).json({ code: 401, message: 'token 无效' });
    }

    // 解码 token 提取用户名
    try {
        // 判断 token 格式：JWT 是 xxx.xxx.xxx 三段，base64 无点分隔
        if (token.split('.').length === 3) {
            // JWT 格式（小程序登录）
            const decoded = jwt.verify(token, jwtConfig.secret);
            req.user = { username: decoded.username };
        } else {
            // 旧版 base64 格式（Web 端兼容）
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const [username] = decoded.split(':');
            if (!username) {
                return res.status(401).json({ code: 401, message: 'token 无效' });
            }
            req.user = { username };
        }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ code: 401, message: 'token 已过期' });
        }
        return res.status(401).json({ code: 401, message: 'token 无效' });
    }
};

module.exports = authMiddleware;
