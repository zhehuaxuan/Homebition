# 任务管理模块设计文档

> **日期**: 2026-07-13
> **文件**: server/routes/task.js, server/routes/tag.js, client/src/views/MyTasks.vue, client/src/views/about/Task.vue
> **表**: task, taskdetail, tag

## 功能概述

任务管理提供甘特图/表格双视图、标签分类、进展追踪和状态流转功能。

## 页面结构

### MyTasks.vue（主视图）
双模式切换：
- **甘特图模式**: FullCalendar resource-timeline 插件，按时间线展示任务条
- **表格模式**: Element Plus el-table，支持排序

### Task.vue 和 Tag.vue（后台管理）
About 页面内的任务表格管理、标签 CRUD。

## 数据模型

```
task
├── id: INT PK
├── title: VARCHAR(255)
├── target: TEXT
├── status: INT (0=待启动 1=进行中 2=已完成 3=其他)
├── importance: INT
├── tags: TEXT (JSON数组 [tagId1, tagId2])
├── create_time: DATETIME
└── close_time: DATETIME

taskdetail
├── id: INT PK
├── task_id: INT → FK task.id
├── content: TEXT
└── create_time: DATETIME
```

## 接口清单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tasks | 全量任务列表 |
| POST | /api/task/add | 新增任务 |
| POST | /api/task/update | 修改任务 |
| PUT | /api/task/update/:id | 简版修改 |
| POST | /api/task/updateStatus | 状态流转 |
| POST | /api/task/delay | 任务延期 |
| DELETE | /api/task/delete/:id | 删除任务 |
| POST | /api/task/progress/add | 添加进展 |
| GET | /api/task/progress/:taskId | 进展列表 |

## 标签-任务关系

任务通过 `task.tags` JSON 字段关联标签 ID：
```
task.tags = "[1, 3, 5]"
↓ 解析
tag.id=1 "bug", tag.id=3 "feature", tag.id=5 "urgent"
```

这是 N:M 关系的简化实现，无中间表。

## 关注点
- `task.tags` 使用 TEXT 存 JSON，不适合复杂查询
- 无数据库级外键约束
- 无分页（全量查询，数据量大时性能问题）
