const express = require('express');
const router = express.Router();

// 使用模板发送邮件（支持变量替换）
router.post('/mail/send-with-template', async (req, res) => {
    const { templateCode, to, variables } = req.body;
    const mailConfig = require('../config/mail');

    if (!mailConfig.enabled) {
        return res.status(400).json({
            code: 400,
            message: '邮件服务未启用'
        });
    }

    if (!templateCode || !to) {
        return res.status(400).json({
            code: 400,
            message: '参数不完整，需要 templateCode, to'
        });
    }

    try {
        // 获取模板
        const [templates] = await req.db.execute('SELECT * FROM mail_template WHERE code = ?', [templateCode]);
        if (templates.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '模板不存在'
            });
        }

        const template = templates[0];

        // 替换变量
        let subject = template.subject;
        let content = template.content;

        if (variables) {
            for (const [key, value] of Object.entries(variables)) {
                const regex = new RegExp(`{{${key}}}`, 'g');
                subject = subject.replace(regex, value);
                content = content.replace(regex, value);
            }
        }

        // 发送邮件
        const { sendMail } = require('../services/mail');
        await sendMail({
            to,
            subject,
            content
        });

        res.json({
            code: 200,
            message: '邮件发送成功'
        });
    } catch (err) {
        console.error('发送邮件失败:', err);
        res.status(500).json({
            code: 500,
            message: '邮件发送失败: ' + err.message
        });
    }
});


module.exports = router;
