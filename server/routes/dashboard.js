const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

/**
 * 工具：将 Date 或任意值转为 YYYY-MM-DD 字符串（使用本地时间）
 */
const toDateStr = (d) => {
    if (!d) return '';
    if (d instanceof Date) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }
    return String(d).slice(0, 10);
};

/**
 * 工具：将 Date 或任意值转为 YYYY-MM-DD HH:mm:ss 字符串（使用本地时间）
 */
const toDateTimeStr = (d) => {
    if (!d) return '';
    if (d instanceof Date) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        return y + '-' + m + '-' + day + ' ' + h + ':' + min + ':' + s;
    }
    return String(d).slice(0, 19).replace('T', ' ');
};

/**
 * GET /api/dashboard
 * 聚合全系统关键数据，返回工作指挥中心所需数据
 */
router.get('/dashboard', async (req, res) => {
    try {
        const db = req.db;

        // 1. 任务统计
        const [taskRows] = await db.query(
            "SELECT COUNT(*) as count, status FROM task GROUP BY status"
        );
        const taskStats = { pending: 0, inProgress: 0, done: 0, suspended: 0 };
        taskRows.forEach(r => {
            const s = Number(r.status);
            if (s === 0) taskStats.pending = r.count;
            else if (s === 1) taskStats.inProgress = r.count;
            else if (s === 2) taskStats.done = r.count;
            else if (s === 3) taskStats.suspended = r.count;
        });

        // 2. 临期任务列表（待启动+进行中，按截止日期升序，null 放最后，取前5）
        const [recentTasks] = await db.query(
            `SELECT id, title, importance, close_time as deadline, status
             FROM task
             WHERE status IN (0, 1)
             ORDER BY close_time IS NULL, close_time ASC
             LIMIT 5`
        );

        // 3. 今日复盘检查 + 最新复盘
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const [todayReview] = await db.query(
            'SELECT id FROM investment_review WHERE review_date = ? LIMIT 1',
            [today]
        );
        const [latestReviewRows] = await db.query(
            'SELECT id, review_date, market_sentiment, action_plan, risk_warnings, confidence_score, created_at FROM investment_review ORDER BY review_date DESC LIMIT 1'
        );

        // 4. 基本面研究统计
        const [researchCountRows] = await db.query(
            'SELECT COUNT(*) as count FROM fundamental_research'
        );
        const [latestResearchRows] = await db.query(
            `SELECT v.research_id, r.company_name, r.current_version, v.created_at
             FROM fundamental_research_version v
             JOIN fundamental_research r ON r.id = v.research_id
             ORDER BY v.created_at DESC LIMIT 3`
        );

        // 5. 文章统计
        const [articleCountRows] = await db.query(
            'SELECT COUNT(*) as count FROM article'
        );
        const [latestArticles] = await db.query(
            'SELECT id, title, create_time FROM article ORDER BY create_time DESC LIMIT 3'
        );

        // 6. 日报检查 + 最新日报
        const [todaySummary] = await db.query(
            'SELECT id FROM daily_summary WHERE date = ? LIMIT 1',
            [today]
        );
        const [latestSummaryRows] = await db.query(
            'SELECT date, work_progress, next_plan, submitted_at FROM daily_summary ORDER BY date DESC LIMIT 1'
        );

        // 7. 订阅统计
        const [subCountRows] = await db.query(
            'SELECT COUNT(*) as count FROM subscription WHERE status = 1'
        );

        // 7b. 最新闪念
        const [latestFlashIdeas] = await db.query(
            `SELECT id, content, status, created_at
             FROM flash_ideas
             ORDER BY created_at DESC
             LIMIT 4`
        );

        // 8. 构建最近动态（混合类型，按时间倒序最多 8 条）
        const activities = [];

        // 日报动态
        const [summaryActs] = await db.query(
            "SELECT date, work_progress, submitted_at FROM daily_summary ORDER BY date DESC LIMIT 3"
        );
        summaryActs.forEach(s => {
            const dateStr = toDateStr(s.date);
            const timeStr = toDateTimeStr(s.submitted_at) || dateStr;
            if (dateStr) {
                activities.push({
                    type: 'summary',
                    label: '日报',
                    title: dateStr.slice(5) + ' 工作日报',
                    desc: s.work_progress ? s.work_progress.slice(0, 50) + (s.work_progress.length > 50 ? '...' : '') : '',
                    time: timeStr,
                    link: '/about/daily-summary'
                });
            }
        });

        // 复盘动态
        const [reviewActs] = await db.query(
            'SELECT review_date, market_sentiment, created_at FROM investment_review ORDER BY created_at DESC LIMIT 3'
        );
        reviewActs.forEach(r => {
            const dateStr = toDateStr(r.review_date);
            const timeStr = toDateTimeStr(r.created_at) || dateStr;
            if (dateStr) {
                activities.push({
                    type: 'review',
                    label: '复盘',
                    title: dateStr.slice(5) + ' 每日复盘',
                    desc: r.market_sentiment ? '大盘感受：' + r.market_sentiment : '',
                    time: timeStr,
                    link: '/about/daily-review'
                });
            }
        });

        // 基本面研究动态
        latestResearchRows.forEach(r => {
            const timeStr = toDateTimeStr(r.created_at);
            if (timeStr) {
                activities.push({
                    type: 'research',
                    label: '研究',
                    title: '基本面研究：' + (r.company_name || '') + ' ' + (r.current_version || ''),
                    desc: '',
                    time: timeStr,
                    link: '/about/research/' + r.research_id
                });
            }
        });

        // 文章动态
        latestArticles.forEach(a => {
            const timeStr = toDateTimeStr(a.create_time);
            if (timeStr) {
                activities.push({
                    type: 'article',
                    label: '文章',
                    title: '文章：' + (a.title || ''),
                    desc: '',
                    time: timeStr,
                    link: '/about/article-list'
                });
            }
        });

        // 按时间倒序，取前 8 条
        activities.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
        const recentActivities = activities.slice(0, 8);

        // 生成每日建议
        const tips = [];
        const totalPending = taskStats.pending + taskStats.inProgress;
        if (totalPending > 0) {
            tips.push('还有 ' + totalPending + ' 个任务待推进');
        }
        if (!todayReview.length) {
            tips.push('今日尚未复盘');
        }
        if (!todaySummary.length) {
            tips.push('今日日报还未提交');
        }
        if (taskStats.done > 0) {
            tips.push('已完成 ' + taskStats.done + ' 个任务');
        }
        if (researchCountRows[0].count > 0) {
            tips.push('跟踪 ' + researchCountRows[0].count + ' 家公司研究');
        }
        if (latestFlashIdeas.length > 0) {
            tips.push('有 ' + latestFlashIdeas.length + ' 条闪念待梳理');
        }
        let dailyTip = '';
        if (tips.length === 0) {
            dailyTip = '今天还没有安排，可以规划一下今天要做的事情。';
        } else {
            dailyTip = tips.join('，') + '。';
        }

        // 组装返回
        res.json({
            code: 0,
            data: {
                stats: {
                    pendingTasks: taskStats.pending,
                    inProgressTasks: taskStats.inProgress,
                    doneTasks: taskStats.done,
                    hasTodayReview: todayReview.length > 0,
                    latestReview: latestReviewRows.length > 0 ? {
                        reviewDate: toDateStr(latestReviewRows[0].review_date),
                        marketSentiment: latestReviewRows[0].market_sentiment,
                        actionPlan: latestReviewRows[0].action_plan,
                        riskWarnings: latestReviewRows[0].risk_warnings
                            ? (typeof latestReviewRows[0].risk_warnings === 'string'
                                ? JSON.parse(latestReviewRows[0].risk_warnings)
                                : latestReviewRows[0].risk_warnings)
                            : null,
                        confidenceScore: latestReviewRows[0].confidence_score,
                        createdAt: toDateTimeStr(latestReviewRows[0].created_at)
                    } : null,
                    researchCount: researchCountRows[0].count,
                    articleCount: articleCountRows[0].count,
                    hasTodaySummary: todaySummary.length > 0,
                    latestSummary: latestSummaryRows.length > 0 ? {
                        date: toDateStr(latestSummaryRows[0].date),
                        workProgress: latestSummaryRows[0].work_progress,
                        nextPlan: latestSummaryRows[0].next_plan,
                        submittedAt: toDateTimeStr(latestSummaryRows[0].submitted_at)
                    } : null,
                    activeSubscriptionCount: subCountRows[0].count,
                    flashIdeasCount: latestFlashIdeas.length
                },
                recentTasks: recentTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    importance: t.importance,
                    deadline: toDateStr(t.deadline),
                    status: t.status
                })),
                latestFlashIdeas: latestFlashIdeas.map(f => ({
                    id: f.id,
                    content: f.content,
                    status: f.status,
                    createdAt: toDateTimeStr(f.created_at)
                })),
                latestReview: latestReviewRows.length > 0 ? {
                    id: latestReviewRows[0].id,
                    reviewDate: toDateStr(latestReviewRows[0].review_date),
                    marketSentiment: latestReviewRows[0].market_sentiment,
                    actionPlan: latestReviewRows[0].action_plan,
                    riskWarnings: latestReviewRows[0].risk_warnings
                        ? (typeof latestReviewRows[0].risk_warnings === 'string'
                            ? JSON.parse(latestReviewRows[0].risk_warnings)
                            : latestReviewRows[0].risk_warnings)
                        : null,
                    confidenceScore: latestReviewRows[0].confidence_score,
                    createdAt: toDateTimeStr(latestReviewRows[0].created_at)
                } : null,
                activities: recentActivities,
                dailyTip: dailyTip
            }
        });

    } catch (err) {
        logger.error('[dashboard] 获取看板数据失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

module.exports = router;
