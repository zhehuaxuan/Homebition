const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// 跨域 + 解析 JSON
app.use(cors());
app.use(express.json());

// // 1. 连接 SQLite 数据库（自动创建 db 文件）
// const db = new sqlite3.Database('./database.db', (err) => {
//   if (err) console.log('数据库连接失败', err.message);
//   else console.log('✅ SQLite 数据库连接成功');
// });

// // 2. 创建文章表（首次运行自动创建）
// db.run(`CREATE TABLE IF NOT EXISTS articles (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   title TEXT NOT NULL,
//   content TEXT,
//   createTime TEXT DEFAULT CURRENT_TIMESTAMP
// )`);

// // 3. 接口：获取所有文章
// app.get('/api/articles', (req, res) => {
//   db.all('SELECT * FROM articles ORDER BY id DESC', (err, rows) => {
//     if (err) res.status(500).json({ error: err.message });
//     else res.json(rows);
//   });
// });

// // 4. 接口：新增文章
// app.post('/api/articles', (req, res) => {
//   const { title, content } = req.body;
//   db.run(
//     'INSERT INTO articles (title, content) VALUES (?, ?)',
//     [title, content],
//     function (err) {
//       if (err) res.status(500).json({ error: err.message });
//       else res.json({ id: this.lastID, title, content });
//     }
//   );
// });

// 定义 index 函数，返回 JSON
function index(req, res) {
    // 返回 JSON 格式数据
    res.json({
      code: 200,
      message: "请求成功",
      data: "这是个人站点首页接口",
      author: "你的名字"
    });
  }
  
  // 把 index 函数绑定到路由
  app.get('/', index);

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
});