const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 数据库
const db = new sqlite3.Database('./mydb.db');
// 把 db 挂载到 req，所有路由都能用
app.use((req, res, next) => {
  req.db = db;
  next();
});

// ======================
// 路由分组 🔥 核心代码
// ======================
const tagRoutes = require('./routes/tag');
const taskRoutes = require('./routes/task');
app.use('/api', tagRoutes);   // 标签分组
app.use('/api', taskRoutes);  // 任务分组

// 启动
app.listen(3000, () => {
  console.log('✅ 服务已启动：http://localhost:3000');
});