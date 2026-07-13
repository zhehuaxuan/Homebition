const express = require('express');
const router = express.Router();

// 创建接口
router.post('/api/add', async (req, res) => {
    const { name, path, description } = req.body;

    if (!name || !path) {
        return res.status(400).json({ code: 400, message: '名称和路径不能为空' });
    }

    try {
        const sql = `INSERT INTO api_manager (name, path, description, create_time) VALUES (?, ?, ?, NOW())`;
        const [result] = await req.db.query(sql, [name, path, description || '']);

        res.json({ code: 200, message: '创建成功', id: result.insertId });
    } catch (err) {
        console.error('创建接口失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 获取接口列表
router.get('/apis', async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM api_manager ORDER BY create_time DESC');
        res.json({ code: 200, list: rows });
    } catch (err) {
        console.error('获取接口列表失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 更新接口
router.put('/api/update/:id', async (req, res) => {
    const { id } = req.params;
    const { name, path, description } = req.body;

    if (!name || !path) {
        return res.status(400).json({ code: 400, message: '名称和路径不能为空' });
    }

    try {
        const sql = `UPDATE api_manager SET name=?, path=?, description=? WHERE id=?`;
        const [result] = await req.db.query(sql, [name, path, description || '', id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, message: '接口不存在' });
        }
        res.json({ code: 200, message: '更新成功' });
    } catch (err) {
        console.error('更新接口失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 删除接口
router.delete('/api/delete/:id', async (req, res) => {
    try {
        // 检查是否被订阅任务使用
        const [subs] = await req.db.query('SELECT COUNT(*) as count FROM subscription WHERE api_id = ?', [req.params.id]);
        if (subs[0].count > 0) {
            return res.status(400).json({ code: 400, message: '该接口已被订阅任务使用，无法删除' });
        }

        const [result] = await req.db.query('DELETE FROM api_manager WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, message: '接口不存在' });
        }
        res.json({ code: 200, message: '删除成功' });
    } catch (err) {
        console.error('删除接口失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 测试接口（发送 GET 请求，只支持 JSON 响应）
router.post('/api/test/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // 获取接口信息
        const [rows] = await req.db.query('SELECT * FROM api_manager WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '接口不存在' });
        }

        const api = rows[0];
        const targetUrl = api.path;

        // 发送 GET 请求测试
        const startTime = Date.now();
        try {
            const response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(10000) // 10秒超时
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return res.json({
                    code: 200,
                    message: '失败',
                    data: {
                        error: '该接口不支持 JSON 格式响应，仅支持返回 application/json 的接口',
                        contentType: contentType || '未指定',
                        status: response.status,
                        statusText: response.statusText,
                        duration: duration
                    }
                });
            }

            const responseBody = await response.json();

            res.json({
                code: 200,
                message: '成功',
                data: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: responseBody,
                    duration: duration
                }
            });
        } catch (fetchError) {
            // fetch 失败
            res.json({
                code: 200,
                message: '失败',
                data: {
                    error: fetchError.message,
                    code: fetchError.code || 'FETCH_ERROR',
                    duration: Date.now() - startTime
                }
            });
        }
    } catch (err) {
        console.error('测试接口失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

module.exports = router;
