<template>
  <div class="dashboard">
    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading" :size="28"><Loading /></el-icon>
    </div>

    <template v-else>
      <!-- 顶部 -->
      <div class="top-bar">
        <div>
          <h2 class="page-title">我的看板</h2>
          <p class="greeting">{{ username }}，{{ greetingText }}</p>
        </div>
      </div>

      <!-- 每日建议 -->
      <div v-if="data.dailyTip" class="daily-tip">
        <span class="tip-icon">💡</span>
        <span class="tip-text">{{ data.dailyTip }}</span>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <template v-for="group in statGroups" :key="group.key">
          <div class="stat-group-divider">
            <span class="stat-group-label">{{ group.label }}</span>
          </div>
          <div class="stat-group-cards">
            <div
              v-for="card in group.cards"
              :key="card.key"
              class="stat-card"
              :style="{ '--accent': card.color }"
              @click="card.link && $router.push(card.link)"
            >
              <div class="stat-icon-wrap"><span>{{ card.icon }}</span></div>
              <div class="stat-card-right">
                <div class="stat-card-right-top">
                  <span class="stat-value" :class="{ 'is-warning': card.warn }">{{ card.value }}</span>
                  <el-tag v-if="card.badge" :type="card.badgeType" size="small" effect="plain" class="stat-badge">{{ card.badge }}</el-tag>
                </div>
                <span class="stat-label">{{ card.label }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 下部分：两栏 -->
      <div class="content-grid">
        <!-- 左栏 -->
        <div class="col-left">
          <!-- 临期任务 -->
          <section class="panel">
            <div class="panel-head">
              <h3><el-icon :size="16"><List /></el-icon>临期任务</h3>
              <router-link to="/about/task-list" class="panel-more">全部</router-link>
            </div>
            <div v-if="!data.recentTasks?.length" class="panel-empty">暂无临期任务</div>
            <div v-else class="task-list">
              <div v-for="task in data.recentTasks" :key="task.id" class="task-row" @click="$router.push('/about/task-list')">
                <span class="task-dot" :class="task.status === '进行中' ? 'dot-progress' : 'dot-pending'" />
                <span class="task-title">{{ task.title }}</span>
                <span v-if="task.importance && importanceStars(task.importance)" class="task-stars" :title="task.importance">
                  <span v-for="i in importanceStars(task.importance)" :key="i">★</span>
                </span>
                <span v-if="task.deadline" class="task-date">{{ task.deadline.replace(/-/g, '/') }}</span>
              </div>
            </div>
          </section>

          <!-- 最新复盘 -->
          <section class="panel">
            <div class="panel-head">
              <h3><el-icon :size="16"><TrendCharts /></el-icon>最新复盘</h3>
              <router-link to="/about/daily-review" class="panel-more">全部</router-link>
            </div>
            <div v-if="!data.latestReview" class="panel-empty">暂无复盘记录</div>
            <div v-else class="review-body">
              <div class="review-head">
                <span class="review-date">{{ data.latestReview.reviewDate?.replace(/-/g, '/') }}</span>
                <el-tag v-if="data.latestReview.marketSentiment" size="small" effect="plain" :type="tagType(data.latestReview.marketSentiment)">
                  {{ data.latestReview.marketSentiment }}
                </el-tag>
                <span v-if="data.latestReview.confidenceScore" class="review-score">
                  {{ '★'.repeat(data.latestReview.confidenceScore) }}{{ '☆'.repeat(5 - data.latestReview.confidenceScore) }}
                </span>
              </div>
              <div v-if="data.latestReview.actionPlan" class="review-line">
                <span class="review-label">操作计划</span>
                <span class="review-text">{{ data.latestReview.actionPlan }}</span>
              </div>
              <div v-if="data.latestReview.riskWarnings?.length" class="review-line">
                <span class="review-label">风险预警</span>
                <div class="review-tags">
                  <el-tag v-for="(w, i) in data.latestReview.riskWarnings" :key="i" size="small" type="danger" effect="plain">{{ w }}</el-tag>
                </div>
              </div>
            </div>
          </section>

          <!-- 最新闪念 -->
          <section class="panel">
            <div class="panel-head">
              <h3>💡最新闪念</h3>
              <router-link to="/about/flash-ideas" class="panel-more">全部</router-link>
            </div>
            <div v-if="!data.latestFlashIdeas?.length" class="panel-empty">暂无闪念</div>
            <div v-else class="flash-list">
              <div v-for="item in data.latestFlashIdeas" :key="item.id" class="flash-row" @click="$router.push('/about/flash-ideas')">
                <span class="flash-status-dot" :class="'dot-' + item.status" :title="statusLabels[item.status]"></span>
                <span class="flash-text">{{ item.content }}</span>
                <span class="flash-time">{{ item.createdAt?.slice(5, 16) }}</span>
              </div>
            </div>
          </section>
        </div>

        <!-- 右栏：最近动态 -->
        <div class="col-right">
          <section class="panel">
            <div class="panel-head">
              <h3><el-icon :size="16"><Clock /></el-icon>最近动态</h3>
            </div>
            <div v-if="!data.activities?.length" class="panel-empty">暂无动态</div>
            <div v-else class="activity-list">
              <div v-for="(act, i) in data.activities" :key="i" class="activity-row" @click="act.link && $router.push(act.link)">
                <span class="act-type" :class="'type-' + act.type">{{ act.label }}</span>
                <div class="act-body">
                  <span class="act-title">{{ act.title }}</span>
                  <span v-if="act.desc" class="act-desc">{{ act.desc }}</span>
                </div>
                <span class="act-time">{{ act.time?.slice(5, 16) }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Loading, List, TrendCharts, Clock } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const username = auth.username

const loading = ref(true)
const data = ref({ stats: {}, recentTasks: [], latestReview: null, activities: [], latestFlashIdeas: [] })

const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  if (h < 22) return '晚上好'
  return '夜深了'
})

const statGroups = computed(() => {
  const s = data.value.stats || {}
  const unfinished = !s.hasTodaySummary || !s.hasTodayReview
  return [
    {
      key: 'daily',
      label: '日常工作',
      cards: [
        { key: 'flash',    icon: '💡', label: '闪念',      value: (s.flashIdeasCount || 0) + '', color: '#a855f7', link: '/about/flash-ideas' },
        { key: 'tasks',    icon: '📋', label: '临期任务',  value: (s.pendingTasks || 0) + (s.inProgressTasks || 0) + '', color: '#409eff', link: '/about/task-list', badge: unfinished ? (s.hasTodaySummary ? '复盘' : '日报') : null, badgeType: 'warning' },
        { key: 'summary',  icon: '📊', label: '日报状态',  value: s.hasTodaySummary ? '已写' : '未写', color: s.hasTodaySummary ? '#06b6d4' : '#f59e0b', warn: !s.hasTodaySummary, link: '/about/daily-summary' },
      ]
    },
    {
      key: 'research',
      label: '投研跟踪',
      cards: [
        { key: 'research', icon: '🔬', label: '研究跟踪',  value: (s.researchCount || 0) + '', color: '#f59e0b', link: '/about/research' },
        { key: 'review',   icon: '📈', label: '今日复盘',  value: s.hasTodayReview ? '已复盘' : '未复盘', color: s.hasTodayReview ? '#22c55e' : '#f59e0b', warn: !s.hasTodayReview, link: '/about/daily-review' },
      ]
    },
    {
      key: 'content',
      label: '内容输出',
      cards: [
        { key: 'articles', icon: '📄', label: '我的文章',  value: (s.articleCount || 0) + '', color: '#8b5cf6', link: '/about/article-list' },
        { key: 'subs',     icon: '🔔', label: '订阅监控',  value: (s.activeSubscriptionCount || 0) + '', color: '#ec4899', link: '/about/subscription-list' },
      ]
    },
  ]
})

const importanceStars = (imp) => ({ '极高': 4, '高': 3, '中': 2, '低': 1 }[imp] || 0)

const statusLabels = { sapling: '🌱 小树苗', tree: '🌳 大树', forest: '🌲 森林' }

const tagType = (v) => {
  if (!v) return 'info'
  if (['牛','涨','好','强'].some(k => v.includes(k))) return 'success'
  if (['熊','跌','差','弱','风险'].some(k => v.includes(k))) return 'danger'
  return 'warning'
}

const fetchDashboard = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/dashboard')
    if (res.data.code === 0) data.value = res.data.data
  } catch { ElMessage.error('获取看板数据失败') }
  finally { loading.value = false }
}

onMounted(fetchDashboard)
</script>

<style scoped>
.dashboard {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ====== 加载 ====== */
.loading-box {
  display: flex;
  justify-content: center;
  padding: 100px 0;
  color: #64748b;
}
.loading-box .el-icon { color: #409eff; }

/* ====== 顶部 ====== */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 16px;
}
.page-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: -0.3px;
}
.greeting {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

/* ====== 每日建议 ====== */
.daily-tip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, rgba(64,158,255,0.08), rgba(64,158,255,0.02));
  border: 1px solid rgba(64,158,255,0.15);
  border-radius: 10px;
  padding: 12px 18px;
  margin-bottom: 16px;
}
.tip-icon { font-size: 18px; flex-shrink: 0; }
.tip-text {
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.6;
}

/* ====== 统计卡片 ====== */
.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}
.stat-group-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 2px 4px;
}
.stat-group-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #1e293b;
}
.stat-group-label {
  font-size: 11px;
  font-weight: 500;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.stat-group-cards {
  display: flex;
  gap: 12px;
}
.stat-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-card:hover {
  border-color: #334155;
  background: #131d30;
  transform: translateY(-1px);
}
.stat-icon-wrap {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
}
.stat-card-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.stat-card-right-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-value {
  font-size: 17px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: -0.3px;
  line-height: 1.2;
}
.stat-value.is-warning { color: #f59e0b; }
.stat-badge {
  font-size: 10px;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
  flex-shrink: 0;
}
.stat-label {
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
}
@media (max-width: 768px) {
  .stat-card { padding: 12px; gap: 10px; }
  .stat-icon-wrap { width: 32px; height: 32px; font-size: 14px; }
  .stat-value { font-size: 14px; }
}

/* ====== 内容两栏 ====== */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  align-items: start;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}
.content-grid::-webkit-scrollbar { width: 4px; }
.content-grid::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
.content-grid::-webkit-scrollbar-track { background: transparent; }
.content-grid > * {
  min-width: 0;
}
@media (max-width: 900px) {
  .content-grid { grid-template-columns: 1fr; }
  .col-right { order: -1; }
}


/* ====== 卡片面板 ====== */
.panel {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.panel-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.panel-head .el-icon { color: #409eff; }
.panel-more {
  font-size: 12px;
  color: #64748b;
  text-decoration: none;
  transition: color 0.15s;
}
.panel-more:hover { color: #409eff; }
.panel-empty {
  font-size: 13px;
  color: #475569;
  text-align: center;
  padding: 20px 0;
}

/* ====== 待办任务 ====== */
.task-list { display: flex; flex-direction: column; }
.task-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #1e293b;
}
.task-row:last-child { border-bottom: none; }
.task-row:hover { background: rgba(64, 158, 255, 0.06); }
.task-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-pending { background: #60a5fa; }
.dot-progress { background: #22c55e; }
.task-title {
  flex: 1;
  font-size: 13px;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-stars {
  flex-shrink: 0;
  font-size: 11px;
  color: #fbbf24;
  letter-spacing: -1px;
}
.task-date {
  flex-shrink: 0;
  font-size: 11px;
  color: #64748b;
}

/* ====== 复盘 ====== */
.review-body { display: flex; flex-direction: column; gap: 10px; }
.review-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.review-date {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}
.review-score {
  font-size: 12px;
  color: #fbbf24;
  letter-spacing: 1px;
}
.review-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.review-label {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.review-text {
  color: #cbd5e1;
  line-height: 1.5;
}
.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* ====== 动态 ====== */
.activity-list { display: flex; flex-direction: column; }
.activity-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #1e293b;
}
.activity-row:last-child { border-bottom: none; }
.activity-row:hover { background: rgba(64, 158, 255, 0.06); }

.act-type {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 1px;
  line-height: 1.4;
}
.type-summary { background: rgba(6, 182, 212, 0.12); color: #22d3ee; }
.type-review  { background: rgba(34, 197, 94, 0.12); color: #4ade80; }
.type-research { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
.type-article  { background: rgba(139, 92, 246, 0.12); color: #a78bfa; }

.act-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.act-title {
  font-size: 13px;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.act-desc {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.act-time {
  font-size: 11px;
  color: #475569;
  flex-shrink: 0;
  margin-top: 2px;
}

/* ====== 闪念 ====== */
.flash-list { display: flex; flex-direction: column; }
.flash-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #1e293b;
}
.flash-row:last-child { border-bottom: none; }
.flash-row:hover { background: rgba(168, 85, 247, 0.06); }

.flash-status-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-sapling { background: #a78bfa; }
.dot-tree    { background: #60a5fa; }
.dot-forest  { background: #22c55e; }

.flash-text {
  flex: 1;
  font-size: 13px;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.flash-time {
  flex-shrink: 0;
  font-size: 11px;
  color: #64748b;
}
</style>
