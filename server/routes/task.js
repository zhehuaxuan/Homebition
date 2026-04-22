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
  const { title, target, create_time, close_time, status, importance, tagIds } = req.body;
  if (!title) return res.status(400).json({ message: '任务名称不能为空' });

  try {
    const sql = `INSERT INTO task (title, target, create_time, close_time, tags, status,importance) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await req.db.query(sql, [
      title,
      target || '',
      create_time,
      close_time,
      JSON.stringify(tagIds),
      status || 0,
      importance
    ]);

    res.json({ message: '新增成功', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ------------------------------
// 1. 添加任务进展（前端提交用）
// ------------------------------
router.post('/task/progress/add', async (req, res) => {
  try {
    const { taskId, content } = req.body;

    if (!taskId || !content) {
      return res.json({ code: 400, msg: '参数缺失' });
    }
    // 插入 taskdetail 表
    const [result] = await req.db.query(
      'INSERT INTO taskdetail (task_id, content,create_time) VALUES (?, ?,? )',
      [taskId, content,new Date()]
    );

    res.json({
      code: 200,
      msg: '进展提交成功',
      data: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, msg: '提交失败' });
  }
});

// ------------------------------
// 2. 获取任务进展列表（详情页加载用）
// ------------------------------
router.get('/task/progress/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;

    const [rows] = await req.db.query(
      'SELECT id, content, create_time FROM taskdetail WHERE task_id = ? ORDER BY create_time DESC',
      [taskId]
    );

    res.json({
      code: 200,
      list: rows,
    });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, list: [] });
  }
});

// ===================== 修改任务（完整匹配前端参数） =====================
router.post('/task/update', async (req, res) => {
  const { id, title, importance, target, create_time, close_time, tagIds } = req.body;

  // 1. 必传参数校验
  if (!id || !title || !importance || !create_time || !close_time) {
    return res.status(400).json({ message: '缺少必填参数' });
  }

  try {
    // 2. 更新任务主表
    const updateSql = `
      UPDATE task 
      SET 
        title = ?,
        importance = ?,
        target = ?,
        create_time = ?,
        close_time = ?,
        tags=?
        WHERE id = ?
    `;
    const tagsStr = JSON.stringify(tagIds);
    const [result] = await req.db.query(updateSql, [
      title,
      importance,
      target || '',
      create_time,
      close_time,
      tagsStr,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '任务不存在' });
    }

    res.json({ message: '任务修改成功' });

  } catch (err) {
    console.error('修改任务失败：', err);
    res.status(500).json({ message: '服务器异常：' + err.message });
  }
});

// 任务延期（修改闭环时间）
router.post('/task/delay', async (req, res) => {
  try {
    const { id, close_time } = req.body

    if (!id || !close_time) {
      return res.status(400).json({ code: 400, message: '参数缺失' })
    }

    const [result] = await req.db.query(
      'UPDATE task SET close_time = ? WHERE id = ?',
      [close_time, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '任务不存在' })
    }

    return res.json({ code: 200, message: '延期成功' })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ code: 500, message: '服务器异常' })
  }
})


// 修改任务状态
router.post('/task/updateStatus', async (req, res) => {
  try {
    const { id, status } = req.body

    // 1. 校验参数
    if (!id || status === undefined) {
      return res.status(400).json({
        code: 400,
        message: '参数缺失：id 和 status 不能为空'
      })
    }

    // 2. 校验状态值（0=待启动 1=进行中 2=已完成）
    if (![0, 1, 2].includes(status)) {
      return res.status(400).json({
        code: 400,
        message: '状态值不合法'
      })
    }

    // 3. 执行数据库更新（你用的 mysql2）
    const [result] = await req.db.query(
      'UPDATE task SET status = ? WHERE id = ?',
      [status, id]
    )

    // 4. 判断是否更新成功
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: '任务不存在'
      })
    }

    // 5. 返回成功
    return res.json({
      code: 200,
      message: '状态修改成功'
    })

  } catch (err) {
    console.error('更新状态失败：', err)
    return res.status(500).json({
      code: 500,
      message: '服务器异常'
    })
  }
})

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