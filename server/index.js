const express = require('express');
const app = express();

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
app.use('/api', tagRouter);
app.use('/api', taskRouter);

// 启动服务
app.listen(3000, () => {
  console.log('✅ 服务启动成功：http://localhost:3000');
});