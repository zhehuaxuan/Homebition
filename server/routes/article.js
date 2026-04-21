const express = require('express');
const router = express.Router();

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
  
      // SQL插入语句：id自增无需传，create_time、last_time用MySQL当前时间NOW()自动填充
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
      SELECT id, title, create_time, last_time
      FROM article
      ${searchSql}
      ORDER BY id DESC
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

module.exports = router;