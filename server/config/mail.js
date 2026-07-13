// 邮件服务配置
const mailConfig = {
    // 启用邮件服务（设置为 true 并配置下方参数）
    enabled: true,

    // SMTP 配置
    host: 'smtp.aliyun.com',      // 邮件服务器地址
    port: 465,                      // 端口（465 为 SSL）
    secure: true,                   // true for 465, false for other ports
    user: 'zhehuaxuan@aliyun.com', // 邮箱账号
    pass: '224539xzh',          // 邮箱密码或授权码

    // 发件人信息
    from: '"Homebition" <zhehuaxuan@aliyun.com>'
};

module.exports = mailConfig;
