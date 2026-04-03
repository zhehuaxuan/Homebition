<template>
  <div class="about-layout">
    <!-- 左侧导航栏 -->
    <div class="sidebar">
      <div class="sidebar-header">关于我</div>
      <ul class="sidebar-menu">
        <li>
          <router-link to="/about/profile" class="menu-item">
            <span class="icon">👤</span>
            <span class="text">我的简介</span>
          </router-link>
        </li>
        <li>
          <router-link to="/about/devices" class="menu-item">
            <span class="icon">💻</span>
            <span class="text">我的设备</span>
          </router-link>
        </li>
        <li>
          <router-link to="/about/article-list" class="menu-item">
            <span class="icon">📄</span>
            <span class="text">文章清单</span>
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


<style scoped>
/* 整体布局：背景色改为#0f172a，保留清新柔和质感 */
.about-layout {
  display: flex;
  min-height: calc(100vh - 60px);
  background-color: #0f172a; /* 核心背景色 */
  padding: 16px;
  box-sizing: border-box;
}

/* 左侧导航栏：深色卡片，适配整体风格 */
.sidebar {
  width: 220px;
  background: #1e293b; /* 深色卡片，比背景浅一点，显层次 */
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.15); /* 极淡阴影，不突兀 */
  padding: 24px 0;
  border-radius: 12px;
  margin-right: 16px;
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
</style>