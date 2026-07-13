<template>
  <div class="about-layout">
    <!-- 手机端水平标签栏 -->
    <div class="mobile-tab-bar">
      <router-link
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="mobile-tab-item"
      >
        <span class="mobile-tab-icon">{{ tab.icon }}</span>
        <span class="mobile-tab-text">{{ tab.label }}</span>
      </router-link>
    </div>
    <!-- 左侧导航栏 -->
    <div class="sidebar">
      <div class="sidebar-header">关于我</div>
      <ul class="sidebar-menu">
        <li>
          <router-link to="/about/profile" class="menu-item">
            <span class="icon">👤</span>
            <span class="text">关于我</span>
          </router-link>
        </li>
        <li>
          <router-link to="/about/devices" class="menu-item">
            <span class="icon">💻</span>
            <span class="text">我的设备</span>
          </router-link>
        </li>
        <li>
          <router-link to="/about/task-list" class="menu-item">
            <span class="icon">📄</span>
            <span class="text">任务清单</span>
          </router-link>
        </li>
        <li>
          <router-link to="/about/article-list" class="menu-item">
            <span class="icon">📄</span>
            <span class="text">文章清单</span>
          </router-link>
        </li>
        <li>
          <router-link to="/about/tag-list" class="menu-item">
            <span class="icon">📄</span>
            <span class="text">标签管理</span>
          </router-link>
        </li>
        <li>
          <router-link to="/about/subscription-list" class="menu-item">
            <span class="icon">📧</span>
            <span class="text">订阅管理</span>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- 右侧内容面板 -->
    <div class="content-panel">
      <!-- 这里一定能显示内容！ -->
      <router-view />
    </div>
  </div>
</template>


<script setup>
const tabs = [
  { to: '/about/profile', label: '关于我', icon: '👤' },
  { to: '/about/devices', label: '设备', icon: '💻' },
  { to: '/about/task-list', label: '任务', icon: '📄' },
  { to: '/about/article-list', label: '文章', icon: '📄' },
  { to: '/about/tag-list', label: '标签', icon: '📄' },
  { to: '/about/subscription-list', label: '订阅', icon: '📧' },
]
</script>


<style scoped>
/* 整体布局：背景色改为#0f172a，保留清新柔和质感 */
.about-layout {
  display: flex;
  align-items: flex-start;
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
  top: 80px;
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
  background: #1e293b; /* 与导航卡片一致，统一协调 */
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.15); /* 极淡阴影，贴合原要求 */
  color: #e2e8f0; /* 浅灰色字体，不刺眼、干净 */
  box-sizing: border-box;
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

/* 手机端水平标签栏 */
.mobile-tab-bar {
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

  .mobile-tab-bar {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
    gap: 0;
    background: #1e293b;
    border-radius: 8px;
    margin-bottom: 8px;
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
    min-height: auto !important;
  }
}
</style>