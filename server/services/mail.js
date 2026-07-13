const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const mailConfig = require('../config/mail');

let transporter = null;

// 初始化邮件 transporter
const initTransporter = (config) => {
    transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port || 465,
        secure: config.secure !== false,
        auth: {
            user: config.user,
            pass: config.pass
        }
    });
    return transporter;
};

// 渲染 EJS 模板
const renderTemplate = async (templateName, data) => {
    const templatePath = path.join(__dirname, '../templates', templateName);
    const template = fs.readFileSync(templatePath, 'utf8');
    return ejs.render(template, data);
};

// 发送邮件
const sendMail = async (options) => {
    if (!transporter) {
        throw new Error('邮件服务未初始化，请先调用 initMailService 配置');
    }

    let htmlContent;
    if (options.template) {
        // 使用模板渲染
        htmlContent = await renderTemplate(options.template, options.data || {});
    } else {
        htmlContent = options.html || options.content || '';
    }

    const mailOptions = {
        from: mailConfig.from,
        to: options.to,
        subject: options.subject,
        html: htmlContent
    };

    console.log('📧 正在发送邮件到:', options.to);
    console.log('📧 邮件主题:', options.subject);

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ 邮件发送成功, messageId:', result.messageId);
    return result;
};

module.exports = {
    initTransporter,
    sendMail
};
