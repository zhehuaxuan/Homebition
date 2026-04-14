const express = require('express');
const router = express.Router();

// 查询任务列表
router.get('/tasks', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM task ORDER BY create_time DESC');
    res.json({ list: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 新增任务
router.post('/task/add', async (req, res) => {
  const { title, target, create_time, close_time, status, tagIds } = req.body;
  if (!title) return res.status(400).json({ message: '任务名称不能为空' });

  try {
    const sql = `INSERT INTO task (title, target, create_time, close_time, tags, status) VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await req.db.query(sql, [
      title,
      target || '',
      create_time,
      close_time,
      JSON.stringify(tagIds),
      status || 0
    ]);

    res.json({ message: '新增成功', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 修改任务
router.put('/task/update/:id', async (req, res) => {
  const { id } = req.params;
  const { title, target, status } = req.body;

  try {
    const sql = `UPDATE task SET title=?, target=?, status=? WHERE id=?`;
    await req.db.query(sql, [title, target, status, id]);
    res.json({ message: '更新成功' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 删除任务
router.delete('/task/delete/:id', async (req, res) => {
  try {
    await req.db.query('DELETE FROM task WHERE id=?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;