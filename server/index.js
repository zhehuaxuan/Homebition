// 0. 加载环境变量（必须最前面）
require('dotenv').config();

const express = require('express');
const app = express();

const requestLogger = require('./middleware/requestLogger');
const logger = require('./services/logger');

// 设置 Express 超时为 5 分钟
app.use((req, res, next) => {
  res.setTimeout(300000, () => {
    logger.warn('[http] 请求超时');
  });
  next();
});

// 1. 加载 MySQL 连接池（必须放在最前面）
const mysql = require('mysql2/promise');

// 2. 创建 MySQL 连接（从环境变量读取）
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'homebition',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 3. 全局挂载 db 到 req（核心！必须放在路由之前）
app.use((req, res, next) => {
  req.db = pool;  // 这里把 db 挂载给每一个请求
  next();
});

// 4. 解析 JSON（必须写在挂载 db 之后、路由之前）
app.use(express.json());

// 4.5 请求日志（记录所有 HTTP 请求，必须在 auth 之前以记录被拒绝的请求）
app.use(requestLogger);

// 4.6 Token 校验中间件（必须在路由之前）
const authMiddleware = require('./middleware/auth');
app.use(authMiddleware);

// 5. 加载路由（最后加载路由！）
const tagRouter = require('./routes/tag');
const taskRouter = require('./routes/task');
const uploadRouter = require('./routes/upload');
const articleRouter = require('./routes/article');
const authRouter = require('./routes/auth');
const subscriptionRouter = require('./routes/subscription');
const mailAddressRouter = require('./routes/mailAddress');
const templateRouter = require('./routes/template');
const apiManagerRouter = require('./routes/apiManager');
const investRouter = require('./routes/invest');
app.use('/api', tagRouter);
app.use('/api', taskRouter);
app.use('/api', uploadRouter);
app.use('/api', articleRouter);
app.use('/api', authRouter);
app.use('/api', subscriptionRouter);
app.use('/api', mailAddressRouter);
app.use('/api', templateRouter);
app.use('/api', apiManagerRouter);
app.use('/api', investRouter);

// 5.5 全局错误处理中间件（必须在路由之后）
app.use((err, req, res, next) => {
  logger.error('[http] 未捕获错误', {
    url: req.originalUrl, method: req.method, error: err.message, stack: err.stack
  });
  res.status(500).json({ code: 500, msg: '服务器内部错误' });
});

// 6. 初始化数据库（启动时执行一次）
authRouter.initAdmin(pool);
authRouter.initApiManagerTable(pool);
articleRouter.initArticleTable(pool);

// 7. 初始化邮件服务
const mailConfig = require('./config/mail');
const { initTransporter } = require('./services/mail');
if (mailConfig.enabled) {
    initTransporter(mailConfig);
    logger.info('[mail] 邮件服务已初始化');
}

// 启动服务
app.listen(3000, () => {
  logger.info('[server] 服务启动成功：http://localhost:3000');
});