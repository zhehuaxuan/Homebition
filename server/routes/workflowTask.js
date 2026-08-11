const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

// 获取工作流任务列表
router.get('/workflow-tasks', async (req, res) => {
  try {
    let sql = 'SELECT * FROM workflow_task';
    const params = [];
    const conditions = [];

    if (req.query.status !== undefined && req.query.status !== '') {
      conditions.push('status = ?');
      params.push(parseInt(req.query.status));
    }
    if (req.query.keyword) {
      conditions.push('title LIKE ?');
      params.push(`%${req.query.keyword}%`);
    }
    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await req.db.query(sql, params);
    res.json({ code: 0, data: rows });
  } catch (err) {
    logger.error('[workflowTask] 查询列表失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取任务详情（含步骤列表）
router.get('/workflow-tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [tasks] = await req.db.query('SELECT * FROM workflow_task WHERE id = ?', [id]);
    if (!tasks.length) {
      return res.status(404).json({ code: 404, message: '任务不存在' });
    }
    const [steps] = await req.db.query(
      'SELECT * FROM workflow_step WHERE task_id = ? ORDER BY step_order ASC',
      [id]
    );
    res.json({ code: 0, data: { ...tasks[0], steps } });
  } catch (err) {
    logger.error('[workflowTask] 查询详情失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取当前待完成的步骤
router.get('/workflow-tasks/:id/current-step', async (req, res) => {
  try {
    const { id } = req.params;
    const [tasks] = await req.db.query('SELECT * FROM workflow_task WHERE id = ?', [id]);
    if (!tasks.length) {
      return res.status(404).json({ code: 404, message: '任务不存在' });
    }
    const task = tasks[0];
    if (task.status === 0) {
      return res.json({ code: 0, data: null, message: '任务未启动' });
    }
    if (task.status === 2) {
      return res.json({ code: 0, data: null, message: '任务已完成' });
    }
    const [steps] = await req.db.query(
      'SELECT * FROM workflow_step WHERE task_id = ? AND status = 1 ORDER BY step_order ASC LIMIT 1',
      [id]
    );
    res.json({ code: 0, data: steps.length ? steps[0] : null });
  } catch (err) {
    logger.error('[workflowTask] 查询当前步骤失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 创建任务（含步骤）
router.post('/workflow-tasks', async (req, res) => {
  try {
    const { title, description, steps } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ code: 400, message: '任务标题不能为空' });
    }
    if (!steps || !steps.length) {
      return res.status(400).json({ code: 400, message: '至少需要一个步骤' });
    }

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();

      const [taskResult] = await conn.query(
        'INSERT INTO workflow_task (title, description, total_steps, current_step_order) VALUES (?, ?, ?, 0)',
        [title.trim(), description || '', steps.length]
      );
      const taskId = taskResult.insertId;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await conn.query(
          'INSERT INTO workflow_step (task_id, step_order, name, guide, estimated_duration) VALUES (?, ?, ?, ?, ?)',
          [taskId, i + 1, step.name, step.guide || null, step.estimated_duration || null]
        );
      }

      await conn.commit();

      const [tasks] = await req.db.query('SELECT * FROM workflow_task WHERE id = ?', [taskId]);
      res.json({ code: 0, data: tasks[0] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    logger.error('[workflowTask] 创建失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新任务（仅待启动状态允许）
router.put('/workflow-tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, steps } = req.body;

    const [tasks] = await req.db.query('SELECT * FROM workflow_task WHERE id = ?', [id]);
    if (!tasks.length) {
      return res.status(404).json({ code: 404, message: '任务不存在' });
    }
    if (tasks[0].status === 2) {
      return res.status(400).json({ code: 400, message: '已完成的任务不可编辑' });
    }

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE workflow_task SET title = ?, description = ? WHERE id = ?',
        [title || tasks[0].title, description !== undefined ? description : tasks[0].description, id]
      );

      if (steps && steps.length) {
        // 按序号就地更新步骤，保留已完成步骤的状态/进展/完成时间
        const [existingSteps] = await conn.query(
          'SELECT id, step_order FROM workflow_step WHERE task_id = ? ORDER BY step_order ASC',
          [id]
        );
        for (let i = 0; i < steps.length; i++) {
          const order = i + 1;
          const existing = existingSteps.find(s => s.step_order === order);
          if (existing) {
            await conn.query(
              'UPDATE workflow_step SET name = ?, guide = ?, estimated_duration = ? WHERE id = ?',
              [steps[i].name, steps[i].guide || null, steps[i].estimated_duration || null, existing.id]
            );
          } else {
            await conn.query(
              'INSERT INTO workflow_step (task_id, step_order, name, guide, estimated_duration, status) VALUES (?, ?, ?, ?, ?, 0)',
              [id, order, steps[i].name, steps[i].guide || null, steps[i].estimated_duration || null]
            );
          }
        }
        // 删除被移除的步骤
        await conn.query(
          'DELETE FROM workflow_step WHERE task_id = ? AND step_order > ?',
          [id, steps.length]
        );
        await conn.query(
          'UPDATE workflow_task SET total_steps = ? WHERE id = ?',
          [steps.length, id]
        );
      }

      // 进行中任务编辑后，重新对齐活动步骤（当前步骤被删除/重排时兜底）
      if (tasks[0].status === 1) {
        const [allSteps] = await conn.query(
          'SELECT id, step_order, status FROM workflow_step WHERE task_id = ? ORDER BY step_order ASC',
          [id]
        );
        const active = allSteps.find(s => s.status === 1);
        if (active) {
          await conn.query(
            'UPDATE workflow_task SET current_step_order = ? WHERE id = ?',
            [active.step_order, id]
          );
        } else {
          const firstPending = allSteps.find(s => s.status === 0);
          if (firstPending) {
            await conn.query('UPDATE workflow_step SET status = 1 WHERE id = ?', [firstPending.id]);
            await conn.query(
              'UPDATE workflow_task SET current_step_order = ? WHERE id = ?',
              [firstPending.step_order, id]
            );
          }
        }
      }

      await conn.commit();

      const [updated] = await req.db.query('SELECT * FROM workflow_task WHERE id = ?', [id]);
      res.json({ code: 0, data: updated[0] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    logger.error('[workflowTask] 更新失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 删除任务（级联删除步骤）
router.delete('/workflow-tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [tasks] = await req.db.query('SELECT id FROM workflow_task WHERE id = ?', [id]);
    if (!tasks.length) {
      return res.status(404).json({ code: 404, message: '任务不存在' });
    }

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM workflow_step WHERE task_id = ?', [id]);
      await conn.query('DELETE FROM workflow_task WHERE id = ?', [id]);
      await conn.commit();
      res.json({ code: 0, message: '删除成功' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    logger.error('[workflowTask] 删除失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 启动任务
router.post('/workflow-tasks/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const [tasks] = await req.db.query('SELECT * FROM workflow_task WHERE id = ?', [id]);
    if (!tasks.length) {
      return res.status(404).json({ code: 404, message: '任务不存在' });
    }
    if (tasks[0].status !== 0) {
      return res.status(400).json({ code: 400, message: '任务已启动或已完成' });
    }
    if (tasks[0].total_steps === 0) {
      return res.status(400).json({ code: 400, message: '任务没有步骤，无法启动' });
    }

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE workflow_task SET status = 1, current_step_order = 1 WHERE id = ?',
        [id]
      );
      await conn.query(
        'UPDATE workflow_step SET status = 1 WHERE task_id = ? AND step_order = 1',
        [id]
      );

      await conn.commit();

      const [updated] = await req.db.query('SELECT * FROM workflow_task WHERE id = ?', [id]);
      res.json({ code: 0, data: updated[0] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    logger.error('[workflowTask] 启动失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 完成当前步骤
router.post('/workflow-tasks/:id/step/:stepId/complete', async (req, res) => {
  try {
    const { id, stepId } = req.params;
    const { progress } = req.body;

    const [tasks] = await req.db.query('SELECT * FROM workflow_task WHERE id = ?', [id]);
    if (!tasks.length) {
      return res.status(404).json({ code: 404, message: '任务不存在' });
    }

    const [steps] = await req.db.query(
      'SELECT * FROM workflow_step WHERE id = ? AND task_id = ?',
      [stepId, id]
    );
    if (!steps.length) {
      return res.status(404).json({ code: 404, message: '步骤不存在' });
    }
    if (steps[0].status !== 1) {
      return res.status(400).json({ code: 400, message: '该步骤不在进行中状态' });
    }

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();

      // 完成当前步骤
      await conn.query(
        'UPDATE workflow_step SET status = 2, progress = ?, finished_at = NOW() WHERE id = ?',
        [progress || '', stepId]
      );

      // 查找下一步
      const [nextSteps] = await conn.query(
        'SELECT id, step_order FROM workflow_step WHERE task_id = ? AND step_order > ? ORDER BY step_order ASC LIMIT 1',
        [id, steps[0].step_order]
      );

      if (nextSteps.length) {
        // 有下一步 → 激活下一步
        await conn.query(
          'UPDATE workflow_step SET status = 1 WHERE id = ?',
          [nextSteps[0].id]
        );
        await conn.query(
          'UPDATE workflow_task SET current_step_order = ? WHERE id = ?',
          [nextSteps[0].step_order, id]
        );
        await conn.commit();
        res.json({ code: 0, data: { completed: false, next_step_order: nextSteps[0].step_order } });
      } else {
        // 最后一步 → 任务闭环
        await conn.query(
          'UPDATE workflow_task SET status = 2, current_step_order = total_steps, finished_at = NOW() WHERE id = ?',
          [id]
        );
        await conn.commit();
        res.json({ code: 0, data: { completed: true } });
      }
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    logger.error('[workflowTask] 完成步骤失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;
