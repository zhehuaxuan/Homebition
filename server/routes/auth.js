const express = require('express');
const router = express.Router();
const { sendMail } = require('../services/mail');
const mailConfig = require('../config/mail');

// 默认管理员信息
const ADMIN_USER = {
    username: 'xuanzhehua',
    password: '224539',
    profile: '<p><strong>2017年毕业于西南交通大学</strong>，现任职于<strong>华为技术有限公司</strong>。</p><p> 工作经验：先后从事过<strong>华为公司软件系统架构设计与开发</strong>，<strong>大型软件项目管理</strong>，<strong>华为云计算运维</strong>，<strong>企业AI系统架构设计方案规划及落地</strong>的相关工作，对企业研发<strong>IPD流程</strong>，<strong>软件工程能力建设</strong>，<strong>AI战略变革转型</strong>有深刻的认识和见解。</p><p>当前技术方向：聚焦于<strong>金融客户</strong>的<strong>AI战略变革</strong>，通过<strong>人工智能目标架构规划</strong>、<strong>专题联创</strong>等方式使能企业AI转型，当前聚焦课题包括：<strong>AI编码</strong>，<strong>AI基础设施生命周期管理</strong>等。</p><p>如果你也在探索这些技术方向，欢迎交流~</p>'
};

// 初始化管理员用户
const initAdminUser = async (db) => {
    try {
        // 检查用户是否已存在
        const [rows] = await db.execute('SELECT * FROM `user` WHERE `username` = ?', [ADMIN_USER.username]);
        if (rows.length === 0) {
            // 插入默认管理员用户
            await db.execute('INSERT INTO `user` (username, password, profile) VALUES (?, ?, ?)', [ADMIN_USER.username, ADMIN_USER.password, ADMIN_USER.profile]);
            console.log('✅ 管理员用户已初始化: xuanzhehua');
        } else if (!rows[0].profile) {
            // 用户已存在但 profile 为空时补充更新
            await db.execute('UPDATE `user` SET profile = ? WHERE `username` = ?', [ADMIN_USER.profile, ADMIN_USER.username]);
            console.log('✅ 管理员用户个人介绍已补充');
        }
    } catch (err) {
        console.error('❌ 初始化管理员用户失败:', err);
    }
};

// 初始化 api_manager 表
const initApiManagerTable = async (db) => {
    try {
        const [tables] = await db.execute("SHOW TABLES LIKE 'api_manager'");
        if (tables.length === 0) {
            await db.execute(`
                CREATE TABLE api_manager (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL COMMENT '接口名称',
                    path VARCHAR(500) NOT NULL COMMENT '接口路径',
                    description TEXT COMMENT '接口描述',
                    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ api_manager 表已创建');
        }

        // 检查 subscription 表是否有 api_id 字段
        const [subCols] = await db.execute("SHOW COLUMNS FROM subscription LIKE 'api_id'");
        if (subCols.length === 0) {
            await db.execute("ALTER TABLE subscription ADD COLUMN api_id INT COMMENT '接口ID' AFTER template");
            console.log('✅ subscription 表已添加 api_id 字段');
        }
    } catch (err) {
        console.error('❌ 初始化 api_manager 表失败:', err);
    }
};

// 登录接口
router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 初始化用户（每次登录时检查）
        await initAdminUser(req.db);

        // 查询用户
        const [rows] = await req.db.execute('SELECT * FROM `user` WHERE `username` = ?', [username]);
        const user = rows[0];

        if (user && user.password === password) {
            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
            res.json({
                code: 0,
                message: '登录成功',
                token: token,
                user: { username: user.username }
            });
        } else {
            res.status(401).json({
                code: 401,
                message: '用户名或密码错误'
            });
        }
    } catch (err) {
        console.error('登录失败:', err);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});

// 退出接口
router.post('/auth/logout', (req, res) => {
    res.json({
        code: 0,
        message: '退出成功'
    });
});

// 获取用户个人信息
router.get('/auth/profile', async (req, res) => {
    try {
        // 获取第一个用户的信息
        const [rows] = await req.db.execute(`SELECT * FROM \`user\` LIMIT 1`);
        if (rows.length > 0) {
            res.json({
                code: 0,
                data: {
                    username: rows[0].username,
                    profile: rows[0].profile || ''
                }
            });
        } else {
            res.json({
                code: 0,
                data: {
                    username: '',
                    profile: ''
                }
            });
        }
    } catch (err) {
        console.error('获取用户信息失败:', err);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});

// 导出初始化函数，供 server 启动时调用
router.initAdmin = initAdminUser;
router.initApiManagerTable = initApiManagerTable;

// 发送邮件测试接口
router.post('/auth/send-mail', async (req, res) => {
    const { to, subject, content, template, data } = req.body;

    if (!mailConfig.enabled) {
        return res.status(400).json({
            code: 400,
            message: '邮件服务未启用，请在 config/mail.js 中配置并启用'
        });
    }

    if (!to || !subject) {
        return res.status(400).json({
            code: 400,
            message: '参数不完整，需要提供 to 和 subject'
        });
    }

    if (!content && !template) {
        return res.status(400).json({
            code: 400,
            message: '需要提供 content 或 template'
        });
    }

    try {
        await sendMail({
            to,
            subject,
            html: content,
            template,
            data
        });
        res.json({
            code: 0,
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

// 邮件模板测试接口
router.get('/auth/test-mail-template', async (req, res) => {
    const { sendMail } = require('../services/mail');

    if (!mailConfig.enabled) {
        return res.status(400).json({
            code: 400,
            message: '邮件服务未启用'
        });
    }

    try {
        await sendMail({
            to: 'zhehuaxuan@aliyun.com',
            subject: '欢迎邮件',
            template: 'welcome.ejs',
            data: {
                title: '欢迎使用 Homebition',
                username: '张三',
                message: '感谢您的注册！',
                items: ['功能一', '功能二'],
                footer: '祝您使用愉快'
            }
        });
        res.json({
            code: 0,
            message: '测试邮件发送成功'
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
