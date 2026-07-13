const express = require('express');
const app = express();

// 设置 Express 超时为 5 分钟
app.use((req, res, next) => {
  res.setTimeout(300000, () => {
    console.log('请求超时');
  });
  next();
});

// 1. 加载 MySQL 连接池（必须放在最前面）
const mysql = require('mysql2/promise');

// 2. 创建 MySQL 连接（改成你自己的信息）
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'admin', // 必须改
  database: 'homebition',   // 必须改
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

// 6. 初始化数据库（启动时执行一次）
authRouter.initAdmin(pool);
authRouter.initApiManagerTable(pool);
articleRouter.initArticleTable(pool);

// 7. 初始化邮件服务
const mailConfig = require('./config/mail');
const { initTransporter } = require('./services/mail');
if (mailConfig.enabled) {
    initTransporter(mailConfig);
    console.log('✅ 邮件服务已初始化');
}

// 启动服务
app.listen(3000, () => {
  console.log('✅ 服务启动成功：http://localhost:3000');
});