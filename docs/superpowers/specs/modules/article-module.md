# 文章模块设计文档

> **日期**: 2026-07-13
> **文件**: server/routes/article.js, client/src/views/MyArticles.vue, client/src/views/ArticleEdit.vue, client/src/views/about/ArticleList.vue
> **表**: article

## 功能概述

富文本文章编辑器，支持新建、编辑、列表浏览和从 GitHub Pages 同步文章链接。

## 页面结构

### 文章列表（MyArticles.vue）
- 公开页面，无需登录
- 自定义样式（非 Element Plus 表格）
- 展示序号、日期、标题
- 点击跳转原文链接（`window.open`）

### 文章编辑器（ArticleEdit.vue）
- 复用组件，通过路由 `:id` 区分新增/编辑
- 使用 wangeditor 5 富文本编辑器
- WangEditor 图片上传 → `POST /api/upload/image`
- 预览功能

### 文章管理（ArticleList.vue）
- 后台管理视图（需登录，在 About 页面内）
- GitHub 同步触发按钮

## CRUD 接口

```
CREATE → POST  /api/article/save
READ   → GET   /api/article/list
READ   → GET   /api/article/detail/:id
UPDATE → POST  /api/article/update
SYNC   → POST  /api/article/sync (from GitHub)
```

## GitHub 同步逻辑

```
POST /api/article/sync
  → fetch('zhehuaxuan.github.io/archives/')
  → cheerio 解析 <a> 链接
  → 提取标题 + URL
  → INSERT 去重(url)

当前 source 地址硬编码，未做可配置化。
```

## 编辑器集成

```
ArticleEdit.vue
  ├── @wangeditor/editor
  ├── @wangeditor/editor-for-vue
  └── 图片上传: MENU_CONF.uploadImage.server = '/api/upload/image'
      → 返回格式: { code: 0, data: { url: "..." }, msg: "..." }
```

## 关注点
- LONGTEXT 存储富文本 HTML，大数据量时可能性能下降
- 无文章分类/标签系统
- 无分页（全量查询）
