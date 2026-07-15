// server/services/scheduler.js
const cron = require('node-cron');
const logger = require('./logger');

let schedulerRunning = false;

/**
 * Check if a subscription matches the current time
 */
function isTimeToRun(subscription) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (subscription.type === 'once') {
        const sendTime = new Date(subscription.send_time);
        const diff = Math.abs(now - sendTime);
        // Within 60 seconds window
        return diff <= 60000;
    }

    if (subscription.type === 'periodic') {
        // Check weekday (0=Sunday in JS)
        const today = now.getDay();
        const weekDays = subscription.week_days || [];
        if (!weekDays.includes(today)) {
            return false;
        }

        // Check time: send_time is "HH:mm:ss" format
        if (!subscription.send_time) return false;
        const parts = subscription.send_time.split(':');
        const taskMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        return currentMinutes === taskMinutes;
    }

    return false;
}

/**
 * Initialize the cron scheduler
 */
function initScheduler(pool) {
    if (schedulerRunning) {
        logger.warn('[scheduler] 调度器已在运行');
        return;
    }

    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            logger.info('[scheduler] 开始扫描订阅任务...');
            const [rows] = await pool.query(
                'SELECT * FROM subscription WHERE status = 1'
            );

            const matchedTasks = [];
            for (const row of rows) {
                // Parse week_days from JSON string
                const subscription = {
                    ...row,
                    week_days: typeof row.week_days === 'string'
                        ? JSON.parse(row.week_days || '[]')
                        : (row.week_days || [])
                };
                if (isTimeToRun(subscription)) {
                    matchedTasks.push(subscription);
                }
            }

            if (matchedTasks.length === 0) {
                logger.info('[scheduler] 本次扫描无匹配任务');
                return;
            }

            logger.info(`[scheduler] 本次扫描到 ${matchedTasks.length} 个任务待执行`);

            const { executeSubscription } = require('./pipeline');
            const results = await Promise.allSettled(
                matchedTasks.map(task => executeSubscription(task, pool))
            );

            results.forEach((result, index) => {
                const task = matchedTasks[index];
                if (result.status === 'fulfilled') {
                    logger.info(`[scheduler] 任务执行成功: ${task.name}`);
                } else {
                    logger.error(`[scheduler] 任务执行失败: ${task.name} - ${result.reason?.message || '未知错误'}`);
                }
            });
        } catch (err) {
            logger.error('[scheduler] 扫描出错: ' + err.message);
        }
    });

    schedulerRunning = true;
    logger.info('[scheduler] 定时调度器已启动，每分钟扫描一次');
}

module.exports = { initScheduler };
