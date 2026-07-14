// 邮件服务配置（从环境变量读取）
const mailConfig = {
    enabled: true,
    host: process.env.MAIL_HOST || 'smtp.aliyun.com',
    port: parseInt(process.env.MAIL_PORT || '465', 10),
    secure: process.env.MAIL_SECURE !== 'false',
    user: process.env.MAIL_USER || 'zhehuaxuan@aliyun.com',
    pass: process.env.MAIL_PASS || '224539xzh',
    from: process.env.MAIL_FROM || '"Homebition" <zhehuaxuan@aliyun.com>'
};

module.exports = mailConfig;
