// server/services/ai.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { getMarketData } = require('./market-data');

const deepseekBaseUrl = process.env.DEEPSEEK_BASEURL || 'https://api.deepseek.com';
const deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

// Load tech-news config
const techNewsConfigPath = path.join(__dirname, '../config/tech-news.json');
let techNewsConfig = { sources: [], stocks: { markets: [], industries: [], tickers: [] } };
try {
  techNewsConfig = JSON.parse(fs.readFileSync(techNewsConfigPath, 'utf8'));
} catch (e) {
  logger.warn('[ai] 未找到 tech-news 配置文件，使用默认空配置');
}

// Map source Chinese name to homepage URL from config
const sourceMap = new Map();
try {
    const raw = JSON.parse(fs.readFileSync(techNewsConfigPath, 'utf8'));
    if (raw.sources) {
        raw.sources.forEach(s => sourceMap.set(s.name, s.domain));
    }
} catch (e) {
    // ignore
}

function collectItems(section) {
    const items = [];
    if (section.items) items.push(...section.items);
    if (section.subsections) {
        section.subsections.forEach(sub => {
            if (sub.items) items.push(...sub.items);
        });
    }
    return items;
}

/**
 * Replace AI-generated URLs with verified source homepage URLs
 */
function resolveSourceUrls(result) {
    const allItems = [];
    if (result.highlight) allItems.push(...result.highlight);
    if (result.sections) {
        result.sections.forEach(s => allItems.push(...collectItems(s)));
    }
    allItems.forEach(item => {
        if (item.source && sourceMap.has(item.source)) {
            item.url = `https://${sourceMap.get(item.source)}`;
        } else {
            item.url = ''; // no valid source → remove link
        }
    });
    return result;
}

/**
 * Generate AI Technology Frontier Daily News
 * Calls DeepSeek to produce categorized tech news with verifiable links
 */
async function generateTechNews(db) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1+'').padStart(2,'0')}-${(today.getDate()+'').padStart(2,'0')}`;

    const { sources, stocks } = techNewsConfig;
    const sourceListStr = sources.map(s => `${s.name}（${s.domain}）`).join('、');
    const markets = (stocks.markets || []).join('、');
    const industries = (stocks.industries || []).join('、');
    const tickers = (stocks.tickers || []).join('、');

    const prompt = `你是一个AI技术资讯编辑，当前日期是 ${dateStr}。请生成今天的AI技术前沿早报，所有内容必须使用中文。

## 可用的来源网站

${sourceListStr}

## 市场脉动关注配置

市场：${markets || '未配置'}
行业：${industries || '未配置'}
个股代码：${tickers || '未配置'}

## 栏目要求

请严格按以下 5 个栏目组织内容，每个栏目至少 2 条。
注意：所有资讯必须围绕${dateStr}前后的最新动态，不要包含过时的旧闻：

1. 今日关注 — ${dateStr}最重要的 AI 头条 + 行业讨论热点
2. 技术前沿 — ${dateStr}附近的新论文 + GitHub 热门开源项目
3. 应用落地 — ${dateStr}附近的 AI 产品发布/更新 + 实用 AI 工具推荐
4. 行业观察 — 融资动态 + 行业观点/分析，以${dateStr}前后为主
5. 市场脉动 — 包含三个子版块：
   - 市场：由实时行情数据填充（代码生成，不用 AI 输出条目）
   - 行业：摘录配置行业的动态新闻和机构观点（AI 生成，至少 2 条）
   - 个股：由实时行情数据填充（代码生成，不用 AI 输出条目）

注意：市场脉动的「市场」和「个股」子版块无需 AI 输出条目（会被代码覆盖），仅「行业」子版块需 AI 生成内容。

## 输出要求

资讯只填写 source 字段（来源网站中文名），不用填写 url 字段。每条资讯必须标注来源，从「可用的来源网站」中选择。

市场脉动的涨跌描述仅作定性说明（如"今日上涨""近期走强"），不要出现具体涨跌幅百分比和指数点位数字。

请严格按照以下 JSON 格式返回，不要添加任何解释或额外文本：
{
  "date": "${dateStr}",
  "subject": "AI技术前沿早报 - ${dateStr}",
  "highlight": [
    {
      "title": "重点标题",
      "summary": "摘要",
      "source": "来源名"
    }
  ],
  "sections": [
    {
      "name": "今日关注",
      "icon": "🔥",
      "items": [
        { "title": "标题", "summary": "摘要 50-100字", "source": "来源名" }
      ]
    },
    {
      "name": "技术前沿",
      "icon": "⚡",
      "items": [
        { "title": "标题", "summary": "摘要", "source": "来源名" }
      ]
    },
    {
      "name": "应用落地",
      "icon": "🚀",
      "items": [
        { "title": "标题", "summary": "摘要", "source": "来源名" }
      ]
    },
    {
      "name": "行业观察",
      "icon": "💡",
      "items": [
        { "title": "标题", "summary": "摘要", "source": "来源名" }
      ]
    },
    {
      "name": "市场脉动",
      "icon": "📈",
      "subsections": [
        {
          "name": "市场",
          "items": [
            { "title": "市场名称", "summary": "7月15日 走势分析", "date": "2026-07-15", "source": "来源名" }
          ]
        },
        {
          "name": "行业",
          "items": [
            { "title": "行业名称", "summary": "7月15日 行业动态", "date": "2026-07-15", "source": "来源名" }
          ]
        },
        {
          "name": "个股",
          "items": [
            { "title": "个股名称", "summary": "7月15日 表现分析", "date": "2026-07-15", "source": "来源名" }
          ]
        }
      ]
    }
  ]
}`;

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
            if (!result.sections) result.sections = [];
            if (!result.highlight) result.highlight = [];
            // Replace AI-generated URLs with source homepage URLs
            resolveSourceUrls(result);

            // Replace 市场脉动 market/ticker subsections with real-time data
            const pulseSection = result.sections?.find(s => s.name === '市场脉动');
            if (pulseSection && pulseSection.subsections) {
                const { stocks } = techNewsConfig;
                if (stocks.markets || stocks.tickers) {
                    try {
                        const { marketItems, tickerItems } = await getMarketData(stocks.markets, stocks.tickers);
                        const marketSub = pulseSection.subsections.find(s => s.name === '市场');
                        if (marketSub && marketItems.length > 0) marketSub.items = marketItems;
                        const tickerSub = pulseSection.subsections.find(s => s.name === '个股');
                        if (tickerSub && tickerItems.length > 0) tickerSub.items = tickerItems;
                    } catch (e) {
                        logger.warn('[ai] 获取实时行情失败: ' + e.message);
                    }
                }
            }

            logger.info('[ai] tech-news 生成成功');
            return result;
        }
        throw new Error('无法解析AI返回结果');
    } catch (err) {
        logger.error('[ai] tech-news 生成失败: ' + err.message);
        return {
            date: dateStr,
            subject: `AI技术前沿早报 - ${dateStr}`,
            highlight: [],
            sections: []
        };
    }
}

/**
 * Build non-AI task list sorted by priority
 */
function buildAllTasks(tasks) {
    const statusMap = { 0: '待启动', 1: '进行中', 3: '挂起中' };
    const statusOrder = { 1: 0, 0: 1, 3: 2 };
    const sorted = [...tasks].sort((a, b) => {
        const sa = statusOrder[a.status] ?? 99;
        const sb = statusOrder[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return (a.remain_days ?? 999) - (b.remain_days ?? 999);
    });
    return sorted.map(t => {
        const p = calcPriority(t.remain_days, t.importance);
        return {
            taskId: t.id,
            title: t.title,
            status: statusMap[t.status] || '未知',
            priority: p,
            progress: t.progress || 0,
            remainDays: t.remain_days
        };
    });
}

function calcPriority(remainDays, importance) {
    if (remainDays < 0) return 'urgent';
    if (remainDays <= 3 || importance >= 5) return 'high';
    if (importance >= 3) return 'medium';
    return 'low';
}

const STATUS_TEXT = { 0: '待启动', 1: '进行中', 3: '挂起中' };

/**
 * Format a single task for the prompt
 */
function formatTaskForPrompt(t) {
    const statusText = STATUS_TEXT[t.status] || '未知';
    const rd = t.remain_days;
    const dayText = rd === null || rd === undefined
        ? '未设置截止日期'
        : rd < 0
            ? `已超期 ${Math.abs(rd)} 天`
            : `剩余 ${rd} 天`;
    const progressText = t.status === 1 ? `当前进度：${t.progress}%` : '';
    const workloadText = t.workload ? `预估工作量：${t.workload} 人天` : '';
    const tagText = t.tag_names ? `标签：${t.tag_names}` : '';
    const targetText = t.target ? `目标：${t.target}` : '';
    const closeTimeText = t.close_time
        ? String(t.close_time).slice(0, 10)
        : '未设置';

    let progressLines = '';
    if (t.recent_progress) {
        const lines = t.recent_progress.split(' ||| ').map(l => `  > ${l}`).join('\n');
        progressLines = `最近进展：\n${lines}`;
    }

    return `### 任务ID: ${t.id}
- 标题：${t.title}
- ${targetText}
- 状态：${statusText}
- 重要性：${t.importance}/5
- ${workloadText}
- ${progressText}
- 截止日期：${closeTimeText}（${dayText}）
- ${tagText}
${progressLines}`;
}

/**
 * Generate Today's Task Breakdown
 * Queries the task table and uses AI to analyze and prioritize
 * Returns groups, todaySchedule, allTasks, summary
 */
async function generateTaskBreakdown(db) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1+'').padStart(2,'0')}-${(today.getDate()+'').padStart(2,'0')}`;

    // Query active tasks with progress, tags, and recent details
    const [tasks] = await db.query(
        `SELECT
          t.id, t.title, t.target, t.status, t.importance,
          t.workload, t.progress, t.close_time,
          DATEDIFF(t.close_time, NOW()) AS remain_days,
          GROUP_CONCAT(DISTINCT tg.name ORDER BY tg.id SEPARATOR '、') AS tag_names,
          SUBSTRING_INDEX(
            GROUP_CONCAT(td.content ORDER BY td.create_time DESC SEPARATOR ' ||| '),
            ' ||| ', 3
          ) AS recent_progress
         FROM task t
         LEFT JOIN taskdetail td ON td.task_id = t.id
         LEFT JOIN tag tg ON FIND_IN_SET(tg.id, t.tags)
         WHERE t.status != 2
         GROUP BY t.id
         ORDER BY
           CASE t.status
             WHEN 1 THEN 0
             WHEN 0 THEN 1
             WHEN 3 THEN 2
           END,
           remain_days ASC
         LIMIT 30`
    );

    // Format tasks for prompt
    const formattedTasks = tasks.map(formatTaskForPrompt).join('\n\n');

    const prompt = `你是一个任务管理助手。请分析以下任务列表，生成今日重点工作安排。

当前日期：${dateStr}

## 任务列表

共 ${tasks.length} 个未完成任务：

${formattedTasks}

## 输出要求

请严格按以下 JSON 格式返回，不要添加任何解释或额外文本：

{
  "date": "${dateStr}",
  "subject": "今日工作安排 - ${dateStr}",
  "summary": "（必填）一句话总结今日时间安排，如「今日共安排3个任务：上午处理A和B，下午推进C」",
  "groups": [
    {
      "name": "分组名称，如「紧急优先」「今日推进」「可暂缓」",
      "description": "分组说明",
      "tasks": [
        {
          "taskId": 1,
          "title": "使用原任务标题，不要改写",
          "currentStatus": "进行中",
          "progress": 60,
          "remainDays": -2,
          "priority": "urgent(已超期) 或 high(3天内到期或重要性5) 或 medium 或 low",
          "estimatedMinutes": 120,
          "reason": "为什么今天优先做这个（结合剩余天数和重要性）",
          "suggestion": "具体执行建议（如先做哪个子任务、卡点如何解决）"
        }
      ]
    }
  ],
  "suspendedAdvice": "对挂起中任务的建议（一句话，如无挂起任务则填空字符串）",
  "todaySchedule": [
    { "timeSlot": "09:30-10:15", "taskId": 1, "title": "原任务名", "note": "该时段做什么的具体说明" },
    { "timeSlot": "10:15-10:30", "type": "break", "title": "休息" },
    { "timeSlot": "10:30-11:15", "taskId": 2, "title": "原任务名", "note": "具体说明" },
    { "timeSlot": "11:15-11:30", "type": "break", "title": "缓冲" },
    { "timeSlot": "14:00-14:45", "taskId": 3, "title": "原任务名", "note": "具体说明" },
    { "timeSlot": "14:45-15:00", "type": "break", "title": "休息" },
    { "timeSlot": "15:00-15:45", "taskId": 4, "title": "原任务名", "note": "具体说明" },
    { "timeSlot": "15:45-16:00", "type": "break", "title": "休息" },
    { "timeSlot": "16:00-16:45", "taskId": 5, "title": "原任务名", "note": "具体说明" },
    { "timeSlot": "16:45-17:30", "type": "buffer", "title": "缓冲收尾" }
  ]
}

要求：
- 建议今日推进 2-5 个任务，排入 todaySchedule
- 排满上午 09:30-11:30（2小时）和下午 14:00-17:30（3.5小时）
- 每 45 分钟一个工作 slot，中间固定 15 分钟休息
- 如果推荐任务少于5个，不足的 slot 用 type=break 补满
- summary 字段应简要概括今天安排了哪几个任务、上午和下午分别做什么
- title 字段使用原任务标题，不要改写
- 充分参考任务的当前进度、剩余天数和重要性`;

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
            // Attach code-generated allTasks
            result.allTasks = buildAllTasks(tasks);
            logger.info('[ai] task-breakdown 生成成功');
            return result;
        }
        throw new Error('无法解析AI返回结果');
    } catch (err) {
        logger.error('[ai] task-breakdown 生成失败: ' + err.message);
        // Return fallback: code-generated list only
        return {
            date: dateStr,
            subject: `今日工作安排 - ${dateStr}`,
            summary: 'AI 分析暂不可用，以下为所有未完成任务列表。',
            groups: [],
            suspendedAdvice: '',
            todaySchedule: [],
            allTasks: buildAllTasks(tasks)
        };
    }
}

module.exports = { generateTechNews, generateTaskBreakdown };
