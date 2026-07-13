const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

const TEMPLATES_DIR = path.join(__dirname, '../templates');

// 确保模板目录存在
if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// 获取模板列表
router.get('/templates', async (req, res) => {
    try {
        const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.ejs'));
        const templates = files.map(name => {
            const filePath = path.join(TEMPLATES_DIR, name);
            const stat = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            return {
                name,
                path: `/templates/${name}`,
                size: stat.size,
                updated_at: stat.mtime,
                // 提取标题（从 title 标签或 h1）
                preview: content.substring(0, 100).replace(/\s+/g, ' ')
            };
        });
        res.json({ code: 200, list: templates });
    } catch (err) {
        console.error('获取模板列表失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 获取单个模板内容
router.get('/template/:name', async (req, res) => {
    try {
        const name = req.params.name;
        if (!name.endsWith('.ejs')) {
            return res.status(400).json({ code: 400, message: '必须是 .ejs 文件' });
        }
        const filePath = path.join(TEMPLATES_DIR, name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ code: 404, message: '模板不存在' });
        }
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ code: 200, name, content });
    } catch (err) {
        console.error('获取模板内容失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 创建模板
router.post('/template', async (req, res) => {
    const { name, content } = req.body;

    if (!name || !content) {
        return res.status(400).json({ code: 400, message: '名称和内容不能为空' });
    }
    if (!name.endsWith('.ejs')) {
        return res.status(400).json({ code: 400, message: '文件名必须以 .ejs 结尾' });
    }

    const filePath = path.join(TEMPLATES_DIR, name);
    if (fs.existsSync(filePath)) {
        return res.status(400).json({ code: 400, message: '模板已存在' });
    }

    try {
        fs.writeFileSync(filePath, content, 'utf8');
        res.json({ code: 200, message: '创建成功', name });
    } catch (err) {
        console.error('创建模板失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 更新模板
router.put('/template/:name', async (req, res) => {
    const name = req.params.name;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ code: 400, message: '内容不能为空' });
    }

    const filePath = path.join(TEMPLATES_DIR, name);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    try {
        fs.writeFileSync(filePath, content, 'utf8');
        res.json({ code: 200, message: '更新成功' });
    } catch (err) {
        console.error('更新模板失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 删除模板
router.delete('/template/:name', async (req, res) => {
    const name = req.params.name;

    const filePath = path.join(TEMPLATES_DIR, name);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    try {
        // 检查是否被订阅任务使用
        const [subs] = await req.db.query('SELECT COUNT(*) as count FROM subscription WHERE template = ?', [name]);
        if (subs[0].count > 0) {
            return res.status(400).json({ code: 400, message: '该模板已被订阅任务使用，无法删除' });
        }

        fs.unlinkSync(filePath);
        res.json({ code: 200, message: '删除成功' });
    } catch (err) {
        console.error('删除模板失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 渲染模板
router.post('/template/render', async (req, res) => {
    const { template, data } = req.body;

    if (!template) {
        return res.status(400).json({ code: 400, message: '模板名称不能为空' });
    }

    const filePath = path.join(TEMPLATES_DIR, template);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    try {
        const templateContent = fs.readFileSync(filePath, 'utf8');
        const html = ejs.render(templateContent, data || {});
        res.json({ code: 200, html });
    } catch (err) {
        console.error('渲染模板失败:', err);
        res.status(500).json({ code: 500, message: '渲染失败: ' + err.message });
    }
});

module.exports = router;
