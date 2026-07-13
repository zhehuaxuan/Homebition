const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');

// 初始化 article 表
const initArticleTable = async (db) => {
    try {
        const [tables] = await db.execute("SHOW TABLES LIKE 'article'");
        if (tables.length === 0) {
            await db.execute(`
                CREATE TABLE article (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL COMMENT '文章标题',
                    url VARCHAR(500) COMMENT '原文链接',
                    content LONGTEXT COMMENT '文章内容',
                    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    last_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后修改时间'
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ article 表已创建');
        } else {
            // 检查是否有 url 字段
            const [cols] = await db.execute("SHOW COLUMNS FROM article LIKE 'url'");
            if (cols.length === 0) {
                await db.execute("ALTER TABLE article ADD COLUMN url VARCHAR(500) COMMENT '原文链接' AFTER title");
                console.log('✅ article 表已添加 url 字段');
            }
        }
    } catch (err) {
        console.error('❌ 初始化 article 表失败:', err);
    }
};

// 文章提交保存入库接口
router.post('/article/save', async (req, res) => {
    try {
      // 前端传过来的标题、富文本内容
      const { title, content } = req.body;

      // 前端参数校验
      if (!title || !content) {
        return res.json({
          code: 1,
          msg: '文章标题和内容不能为空'
        });
      }

      // SQL插入语句：id自增无需传，create_time、last_time用MySQL当前时间自动填充
      const insertSql = `
        INSERT INTO article (title, content, create_time, last_time)
        VALUES (?, ?, NOW(), NOW())
      `;

      // 执行数据库插入
      const [result] = await req.db.execute(insertSql, [title, content]);

      // 返回WangEditor/前端统一格式
      res.json({
        code: 0,
        msg: '文章提交保存成功',
        data: {
          articleId: result.insertId // 返回新增文章的ID
        }
      });

    } catch (error) {
      console.error('数据库插入失败：', error);
      res.json({
        code: 1,
        msg: '服务器保存失败，请重试',
        error: error.message
      });
    }
  });

// 获取文章列表（全量 + 搜索）
router.get('/article/list', async (req, res) => {
  try {
    const { title = '' } = req.query;

    // 搜索条件
    let searchSql = '';
    let params = [];
    if (title) {
      searchSql = ' WHERE title LIKE ?';
      params.push(`%${title}%`);
    }

    // 查询所有数据（无分页）
    const listSql = `
      SELECT id, title, create_time, last_time, url
      FROM article
      ${searchSql}
      ORDER BY create_time DESC
    `;
    const [rows] = await req.db.execute(listSql, params);

    res.json({
      code: 0,
      msg: 'success',
      rows: rows,
      total: rows.length  // 自动计算总数
    });
  } catch (error) {
    res.json({ code: 1, msg: '获取失败', error: error.message });
  }
});

// 从 GitHub 同步文章到数据库
router.post('/article/sync', async (req, res) => {
  try {
    // 获取 GitHub 页面 HTML，带重试机制
    let html = '';
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch('https://zhehuaxuan.github.io/archives/', {
          signal: AbortSignal.timeout(30000)
        });
        html = await response.text();
        break;
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const $ = cheerio.load(html);
    const skipTexts = ['GitHub', 'E-Mail', 'RSS', '标签', '分类', '日志', '文章', '首页', '订阅', '关于'];

    // 收集所有文章链接
    const articleLinks = [];
    $('a[href]').each((_, link) => {
      const href = $(link).attr('href');
      const text = $(link).text().trim();

      if (!href || !text || text.length < 3) return;
      if (skipTexts.some(t => text.includes(t))) return;
      if (href.startsWith('#') || href.startsWith('mailto:')) return;
      if (href.startsWith('http') && !href.includes('zhehuaxuan.github.io')) return;

      let fullUrl = href.startsWith('http') ? href : 'https://zhehuaxuan.github.io' + (href.startsWith('/') ? href : '/' + href);
      if (href === '/' || href === '' || href === '#') return;

      // 提取日期
      let date = '';
      const dateMatch = href.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
      if (dateMatch) {
        date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }

      articleLinks.push({
        title: decodeURIComponent(text),
        url: fullUrl,
        date: date || null
      });
    });

    // 去重
    const uniqueLinks = articleLinks.filter((item, index, self) =>
      index === self.findIndex(t => t.url === item.url)
    );

    // 逐个处理，插入数据库
    let syncCount = 0;
    let skipCount = 0;

    for (const article of uniqueLinks) {
      const [existing] = await req.db.execute('SELECT id FROM article WHERE url = ?', [article.url]);
      if (existing.length > 0) {
        skipCount++;
        continue;
      }
      await req.db.execute(
        'INSERT INTO article (title, content, url, create_time, last_time) VALUES (?, ?, ?, ?, NOW())',
        [article.title, '', article.url, article.date]
      );
      syncCount++;
    }

    res.json({
      code: 0,
      msg: '同步成功',
      data: {
        synced: syncCount,
        skipped: skipCount
      }
    });
  } catch (error) {
    console.error('同步失败：', error);
    res.json({ code: 1, msg: '同步失败', error: error.message });
  }
});

// 1. 获取文章详情
router.get('/article/detail/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await req.db.execute('SELECT * FROM article WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.json({ code: 1, msg: '文章不存在' });
    }
    res.json({ code: 0, data: rows[0] });
  } catch (error) {
    res.json({ code: 1, msg: '获取失败', error: error.message });
  }
});

// 2. 更新文章
router.post('/article/update', async (req, res) => {
  try {
    const { id, title, content } = req.body;
    await req.db.execute(
      'UPDATE article SET title = ?, content = ?, last_time = NOW() WHERE id = ?',
      [title, content, id]
    );
    res.json({ code: 0, msg: '更新成功' });
  } catch (error) {
    res.json({ code: 1, msg: '更新失败', error: error.message });
  }
});

// 导出初始化函数
router.initArticleTable = initArticleTable;

module.exports = router;