const express = require('express');
const router = express.Router();

// 默认管理员信息
const ADMIN_USER = {
    username: 'xuanzhehua',
    password: '224539',
    profile: '<p><strong>2017年毕业于西南交通大学</strong>，现任职于<strong>华为技术有限公司</strong>。</p><p> 工作经验：先后从事过<strong>华为公司软件系统架构设计与开发</strong>，<strong>大型软件项目管理</strong>，<strong>华为云计算运维</strong>，<strong>企业AI系统架构设计方案规划及落地</strong>的相关工作，对企业研发<strong>IPD流程</strong>，<strong>软件工程能力建设</strong>，<strong>AI战略变革转型</strong>有深刻的认识和见解。</p><p>当前技术方向：聚焦于<strong>金融客户</strong>的<strong>AI战略变革</strong>，通过<strong>人工智能目标架构规划</strong>、<strong>专题联创</strong>等方式使能企业AI转型，当前聚焦课题包括：<strong>AI编码</strong>，<strong>AI基础设施生命周期管理</strong>等。</p><p>如果你也在探索这些技术方向，欢迎交流~</p>'
};

// 初始化管理员用户
const initAdminUser = async (db) => {
    try {
        // 检查 user 表是否有 username 字段
        const [cols] = await db.execute('SHOW COLUMNS FROM `user`');
        const hasUsername = cols.some(col => col.Field === 'username');
        const userField = hasUsername ? 'username' : 'user';

        // 检查用户是否已存在
        const [rows] = await db.execute(`SELECT * FROM \`user\` WHERE \`${userField}\` = ?`, [ADMIN_USER.username]);
        if (rows.length === 0) {
            // 插入默认管理员用户
            const fields = hasUsername ? 'username, password, profile' : 'user, password, profile';
            const values = hasUsername
                ? [ADMIN_USER.username, ADMIN_USER.password, ADMIN_USER.profile]
                : [ADMIN_USER.username, ADMIN_USER.password, ADMIN_USER.profile];
            await db.execute(`INSERT INTO \`user\` (${fields}) VALUES (?, ?, ?)`, values);
            console.log('✅ 管理员用户已初始化: xuanzhehua');
        }
    } catch (err) {
        console.error('❌ 初始化管理员用户失败:', err);
    }
};

// 登录接口
router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 初始化用户（每次登录时检查）
        await initAdminUser(req.db);

        // 检查表结构
        const [cols] = await req.db.execute('SHOW COLUMNS FROM `user`');
        const hasUsername = cols.some(col => col.Field === 'username');
        const userField = hasUsername ? 'username' : 'user';

        // 查询用户
        const [rows] = await req.db.execute(`SELECT * FROM \`user\` WHERE \`${userField}\` = ?`, [username]);
        const user = rows[0];

        if (user && user.password === password) {
            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
            res.json({
                code: 200,
                message: '登录成功',
                token: token,
                user: { username: user[userField] }
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
        code: 200,
        message: '退出成功'
    });
});

// 获取用户个人信息
router.get('/auth/profile', async (req, res) => {
    try {
        const [cols] = await req.db.execute('SHOW COLUMNS FROM `user`');
        const hasUsername = cols.some(col => col.Field === 'username');
        const userField = hasUsername ? 'username' : 'user';

        // 获取第一个用户的信息
        const [rows] = await req.db.execute(`SELECT * FROM \`user\` LIMIT 1`);
        if (rows.length > 0) {
            res.json({
                code: 200,
                data: {
                    username: rows[0][userField],
                    profile: rows[0].profile || ''
                }
            });
        } else {
            res.json({
                code: 200,
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

module.exports = router;
