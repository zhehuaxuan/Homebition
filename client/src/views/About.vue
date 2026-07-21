<template>
  <div class="about-layout">
    <!-- 手机端：分段控制器 + 标签栏 -->
    <div class="mobile-container">
      <div class="mobile-segments">
        <button
          v-for="g in groups"
          :key="g.key"
          :class="['segment-btn', { active: activeGroup === g.key }]"
          @click="activeGroup = g.key"
        >
          {{ g.label }}
        </button>
      </div>
      <div class="mobile-tab-bar">
        <router-link
          v-for="tab in filteredTabs"
          :key="tab.to"
          :to="tab.to"
          class="mobile-tab-item"
        >
          <span class="mobile-tab-icon">{{ tab.icon }}</span>
          <span class="mobile-tab-text">{{ tabLabels[tab.to] }}</span>
        </router-link>
      </div>
    </div>
    <!-- 左侧导航栏 -->
    <div class="sidebar">
      <div class="sidebar-header">后台管理</div>
      <div v-for="group in menuGroups" :key="group.key" class="sidebar-group">
        <div class="group-title">{{ group.label }}</div>
        <ul class="sidebar-menu">
          <li v-for="item in group.children" :key="item.to">
            <router-link :to="item.to" class="menu-item">
              <span class="icon">{{ item.icon }}</span>
              <span class="text">{{ item.label }}</span>
            </router-link>
          </li>
        </ul>
      </div>
    </div>

    <!-- 右侧内容面板 -->
    <div class="content-panel">
      <!-- 这里一定能显示内容！ -->
      <router-view />
    </div>
  </div>
</template>


<script setup>
import { ref, computed } from 'vue'

// 分组定义
const groups = [
  { key: 'dashboard', label: '仪表盘' },
  { key: 'tasks', label: '任务与订阅' },
  { key: 'invest', label: '投资管理' },
  { key: 'content', label: '内容管理' },
  { key: 'personal', label: '设置' },
]

// 分组标题 + 菜单项定义
const menuGroups = [
  {
    key: 'dashboard',
    label: '仪表盘',
    children: [
      { to: '/about/dashboard', label: '我的看板', icon: '📊' },
    ],
  },
  {
    key: 'tasks',
    label: '任务与订阅',
    children: [
      { to: '/about/flash-ideas', label: '闪念管理', icon: '💡' },
      { to: '/about/task-list', label: '任务清单', icon: '📋' },
      { to: '/about/subscription-list', label: '订阅管理', icon: '📧' },
      { to: '/about/daily-summary', label: '每日总结', icon: '📋' },
    ],
  },
  {
    key: 'invest',
    label: '投资管理',
    children: [
      { to: '/about/daily-review', label: '每日复盘', icon: '📈' },
      { to: '/about/research', label: '基本面研究', icon: '📋' },
      { to: '/about/review-config', label: '复盘配置', icon: '⚙️' },
    ],
  },
  {
    key: 'content',
    label: '内容管理',
    children: [
      { to: '/about/article-list', label: '文章清单', icon: '📄' },
      { to: '/about/tag-list', label: '标签管理', icon: '🏷' },
    ],
  },
  {
    key: 'personal',
    label: '设置',
    children: [
      { to: '/about/profile', label: '关于我', icon: '⚙️' },
      { to: '/about/devices', label: '我的设备', icon: '💻' },
    ],
  },
]

// 移动端：当前选中的分组
const activeGroup = ref('dashboard')

// 移动端：当前分组下的标签栏数据
const filteredTabs = computed(() => {
  const group = menuGroups.find((g) => g.key === activeGroup.value)
  return group ? group.children : []
})

// 移动端标签（短标签用于移动端显示）
const tabLabels = {
  '/about/dashboard': '看板',
  '/about/flash-ideas': '闪念',
  '/about/profile': '关于我',
  '/about/devices': '设备',
  '/about/article-list': '文章',
  '/about/tag-list': '标签',
  '/about/task-list': '任务',
  '/about/subscription-list': '订阅',
  '/about/daily-summary': '日报',
  '/about/daily-review': '复盘',
  '/about/review-config': '配置',
  '/about/research': '研究',
}
</script>


<style scoped>
/* 整体布局：背景色改为#0f172a，保留清新柔和质感 */
.about-layout {
  display: flex;
  align-items: flex-start;
  min-height: calc(100vh - 60px);
  background-color: #0f172a;
  padding: 16px;
  box-sizing: border-box;
}

/* 左侧导航栏：深色卡片，适配整体风格 */
.sidebar {
  width: 220px;
  background: #1e293b;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.15);
  padding: 24px 0;
  border-radius: 12px;
  margin-right: 16px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: fit-content;
}

.sidebar-header {
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0; /* 浅灰色字体，不刺眼 */
  padding: 0 20px 16px;
  border-bottom: 1px solid #334155; /* 淡色分隔线，柔和不突兀 */
  margin-bottom: 12px;
}

.sidebar-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #cbd5e1; /* 灰色系字体，贴合原要求 */
  text-decoration: none;
  font-size: 15px;
  transition: all 0.2s ease; /* 柔和过渡，提升体验 */
}

/* 鼠标悬浮效果：柔和变亮，不刺眼 */
.menu-item:hover {
  background-color: #2d3a52;
  color: #a5b4fc; /* 浅蓝紫色，呼应主色，不突兀 */
}

/* 选中高亮：保留原要求的浅蓝背景+左边框，适配深色 */
:deep(.router-link-active) {
  background-color: rgba(64, 158, 255, 0.15); /* 主色#409eff 透明背景，清新不厚重 */
  color: #409eff; /* 主色字体，突出选中 */
  font-weight: 500;
  border-left: 4px solid #409eff; /* 原要求浅蓝左边框 */
}

.icon {
  margin-right: 10px;
  font-size: 16px;
  color: #94a3b8; /* 图标淡灰色，贴合整体柔和感 */
}

/* 右侧内容面板：深色卡片，与导航呼应，保证内容清晰 */
.content-panel {
  flex: 1;
  height: calc(100vh - 92px);
  background: #1e293b;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.15);
  color: #e2e8f0;
  box-sizing: border-box;
  overflow: hidden;
}

/* 适配二级内容页面的基础样式，确保文字不刺眼 */
:deep(.content-page) {
  line-height: 1.6;
  font-size: 14px;
  color: #cbd5e1;
}

:deep(.content-page h3) {
  color: #e2e8f0;
  margin-bottom: 20px;
  font-weight: 600;
}

/* 分组标题 */
.sidebar-group {
  padding: 0;
}

.sidebar-group + .sidebar-group {
  border-top: 1px solid #334155;
}

.group-title {
  font-size: 12px;
  color: #64748b;
  padding: 8px 20px 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 移动端容器 */
.mobile-container {
  display: none;
}

@media (max-width: 768px) {
  .about-layout {
    flex-direction: column;
    padding: 8px;
  }

  .sidebar {
    display: none !important;
  }

  .mobile-container {
    display: block;
  }

  .mobile-segments {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
    gap: 0;
    background: #1e293b;
    border-radius: 8px 8px 0 0;
    border: 1px solid #334155;
    border-bottom: none;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .mobile-segments::-webkit-scrollbar {
    display: none;
  }

  .segment-btn {
    flex-shrink: 0;
    padding: 12px 16px;
    border: none;
    background: transparent;
    color: #94a3b8;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
  }

  .segment-btn.active {
    color: #409eff;
    background: rgba(64, 158, 255, 0.08);
    border-bottom-color: #409eff;
  }

  .segment-btn:not(.active):hover {
    color: #e2e8f0;
    background: rgba(255, 255, 255, 0.03);
  }

  .mobile-tab-bar {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
    gap: 0;
    background: #1e293b;
    border-radius: 0 0 8px 8px;
    margin-bottom: 8px;
    border: 1px solid #334155;
    border-top: 1px solid #334155;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .mobile-tab-bar::-webkit-scrollbar {
    display: none;
  }

  .mobile-tab-item {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 14px;
    color: #94a3b8;
    text-decoration: none;
    font-size: 13px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  .mobile-tab-item.router-link-active {
    color: #409eff;
    border-bottom-color: #409eff;
  }
  .mobile-tab-icon {
    font-size: 14px;
  }
  .mobile-tab-text {
    white-space: nowrap;
  }

  .content-panel {
    margin-left: 0 !important;
    padding: 16px !important;
    border-radius: 8px !important;
    height: auto !important;
    min-height: auto !important;
  }
}
</style>
