// server/services/ai.js
const axios = require('axios');
const logger = require('./logger');

const deepseekBaseUrl = process.env.DEEPSEEK_BASEURL || 'https://api.deepseek.com';
const deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

/**
 * Generate AI Technology Frontier Daily News
 * Calls DeepSeek to produce structured tech news with links
 */
async function generateTechNews(db) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1+'').padStart(2,'0')}-${(today.getDate()+'').padStart(2,'0')}`;

    const prompt = `你是一个AI技术资讯编辑。请生成今天的AI技术前沿早报。

请覆盖以下三个分类：
1. 通用AI新闻：大模型技术突破、行业动态、新产品发布
2. AI编程：AI辅助开发、代码生成工具、编程模型进展
3. AI金融：AI在金融领域的应用、量化交易、风控技术

请严格按照以下JSON格式返回，不要添加任何解释或额外文本，确保每条资讯都包含真实的URL链接：
{
  "date": "${dateStr}",
  "subject": "AI技术前沿早报 - ${dateStr}",
  "items": [
    {
      "title": "资讯标题",
      "summary": "简要摘要，50-100字",
      "url": "https://...",
      "category": "通用AI/AI编程/AI金融"
    }
  ]
}

要求：
- 至少生成8条资讯，每个分类至少2条
- 每条必须包含真实的URL链接
- 摘要简洁有信息量
- 优先选择近2天的新闻`;

    try {
        const response = await axios.post(`${deepseekBaseUrl}/chat/completions`, {
            model: deepseekModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 4000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekApiKey}`
            },
            timeout: 60000
        });

        const content = response.data.choices[0].message.content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            logger.info('[ai] tech-news 生成成功');
            return result;
        }
        throw new Error('无法解析AI返回结果');
    } catch (err) {
        logger.error('[ai] tech-news 生成失败: ' + err.message);
        throw err;
    }
}

/**
 * Generate Today's Task Breakdown
 * Queries the task table and uses AI to analyze and prioritize
 */
async function generateTaskBreakdown(db) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1+'').padStart(2,'0')}-${(today.getDate()+'').padStart(2,'0')}`;

    // Query active tasks from database
    const [tasks] = await db.query(
        `SELECT title, target, importance, status,
                DATEDIFF(close_time, NOW()) as remain_days
         FROM task
         WHERE status != '已完成'
         ORDER BY
           CASE status
             WHEN '进行中' THEN 0
             WHEN '待启动' THEN 1
             WHEN '挂起中' THEN 2
           END,
           remain_days ASC`
    );

    const tasksJson = JSON.stringify(tasks, null, 2);

    const prompt = `你是一个任务管理助手。请分析以下任务列表，生成今天的重点工作安排。

当前日期：${dateStr}

任务列表：
${tasksJson}

请严格按照以下JSON格式返回，不要添加任何解释或额外文本：
{
  "date": "${dateStr}",
  "subject": "今日工作安排 - ${dateStr}",
  "summary": "今日工作概述，50-100字",
  "tasks": [
    {
      "title": "任务标题",
      "priority": "高/中/低",
      "estimatedTime": "预计耗时，如2h",
      "notes": "建议说明，为什么今天优先做这个"
    }
  ]
}

要求：
- 按优先级排序，最重要的排在前面
- 今日建议完成2-4个任务
- 如果任务太少（少于2个），建议今天可推进的事项
- 考虑任务的剩余天数和重要性`;

    try {
        const response = await axios.post(`${deepseekBaseUrl}/chat/completions`, {
            model: deepseekModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 4000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekApiKey}`
            },
            timeout: 60000
        });

        const content = response.data.choices[0].message.content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            logger.info('[ai] task-breakdown 生成成功');
            return result;
        }
        throw new Error('无法解析AI返回结果');
    } catch (err) {
        logger.error('[ai] task-breakdown 生成失败: ' + err.message);
        throw err;
    }
}

module.exports = { generateTechNews, generateTaskBreakdown };
