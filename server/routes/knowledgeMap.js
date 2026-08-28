const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

// 初始化表（表已由数据库手动创建，此处仅做存在性兜底校验）
async function initTable(pool) {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'agent_knowledge_map'",
      [process.env.DB_NAME || 'homebition']
    );
    if (rows[0].cnt === 0) {
      logger.warn('[knowledgeMap] agent_knowledge_map 表不存在，请先在数据库中创建');
    }
  } catch (err) {
    logger.error('[knowledgeMap] 初始化校验失败', { error: err.message });
  }
}

// 获取知识地图全量数据（7模块 × 9层级 = 63节点）
router.get('/knowledge-map', async (req, res) => {
  try {
    const [rows] = await req.db.query(
      'SELECT id, module_code, module_name, overview, level_code, level_name, criterion, time_bound, is_mastered, remark ' +
      'FROM agent_knowledge_map ORDER BY module_code ASC, level_code ASC'
    );
    res.json({ code: 0, data: rows });
  } catch (err) {
    logger.error('[knowledgeMap] 查询失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新单条节点（仅允许编辑 criterion/time_bound/remark/is_mastered/overview，不新增不删除）
// overview 为模块维度：更新时同步到同 module_code 的全部行，保持模块内一致
router.put('/knowledge-map/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { criterion, time_bound, remark, is_mastered, overview } = req.body;

    const [existing] = await req.db.query(
      'SELECT id, module_code FROM agent_knowledge_map WHERE id = ?', [id]
    );
    if (!existing.length) {
      return res.status(404).json({ code: 404, message: '节点不存在' });
    }
    const moduleCode = existing[0].module_code;

    const sets = [];
    const params = [];
    if (criterion !== undefined) { sets.push('criterion = ?'); params.push(criterion); }
    if (time_bound !== undefined) { sets.push('time_bound = ?'); params.push(time_bound || null); }
    if (remark !== undefined) { sets.push('remark = ?'); params.push(remark || null); }
    if (is_mastered !== undefined) { sets.push('is_mastered = ?'); params.push(is_mastered ? 1 : 0); }

    if (!sets.length && overview === undefined) {
      return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
    }

    // 模块维度的 overview：同步更新同 module_code 的全部行
    if (overview !== undefined) {
      await req.db.query(
        'UPDATE agent_knowledge_map SET overview = ? WHERE module_code = ?',
        [overview || null, moduleCode]
      );
    }

    // 其余字段只更新当前节点
    if (sets.length) {
      params.push(id);
      await req.db.query(
        `UPDATE agent_knowledge_map SET ${sets.join(', ')} WHERE id = ?`,
        params
      );
    }

    const [rows] = await req.db.query(
      'SELECT id, module_code, module_name, overview, level_code, level_name, criterion, time_bound, is_mastered, remark FROM agent_knowledge_map WHERE id = ?',
      [id]
    );
    res.json({ code: 0, data: rows[0] });
  } catch (err) {
    logger.error('[knowledgeMap] 更新失败', { error: err.message });
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;
module.exports.initTable = initTable;
