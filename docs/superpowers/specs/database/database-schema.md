# 数据库设计文档

> **日期**: 2026-07-13
> **数据库**: homebition (MySQL 8)
> **引擎**: 所有表使用 InnoDB，字符集 `utf8mb4`

---

## 1. 表结构总览

当前数据库包含 **10 张表**：

| # | 表名 | 用途 | 行数规模 |
|---|------|------|----------|
| 1 | `user` | 管理员用户 | 1 |
| 2 | `article` | 文章内容 | 低 |
| 3 | `task` | 任务主表 | 低-中 |
| 4 | `taskdetail` | 任务进展详情 | 低-中 |
| 5 | `tag` | 标签定义 | 低 |
| 6 | `subscription` | 邮件订阅任务 | 低 |
| 7 | `mail_address` | 联系人邮箱 | 低 |
| 8 | `mail_template` | 邮件模板（数据库版） | 低 |
| 9 | `api_manager` | 外部接口注册 | 低 |
| 10 | EJS 模板文件 | 文件系统 `server/templates/` | — |

---

## 2. 详细表结构

### 2.1 user — 管理员用户

```sql
CREATE TABLE user (
    id          INT             AUTO_INCREMENT PRIMARY KEY,
    user        VARCHAR(255)    COMMENT '用户名（旧版字段）',
    username    VARCHAR(255)    COMMENT '用户名（新版字段）',
    password    VARCHAR(255)    NOT NULL COMMENT '登录密码（明文）',
    profile     TEXT            COMMENT '个人介绍 HTML'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**说明**: `user`/`username` 双字段兼容历史变迁，代码通过 `SHOW COLUMNS` 动态判断。

### 2.2 article — 文章

```sql
CREATE TABLE article (
    id          INT             AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255)    NOT NULL COMMENT '文章标题',
    url         VARCHAR(500)    COMMENT '原文链接（GitHub 同步来源）',
    content     LONGTEXT        COMMENT '富文本 HTML 内容',
    create_time DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    last_time   DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后修改时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**索引建议**: `create_time`, `url`（去重查询用）

### 2.3 task — 任务主表

```sql
CREATE TABLE task (
    id          INT             AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255)    COMMENT '任务名称',
    target      TEXT            COMMENT '任务目标描述',
    tags        TEXT            COMMENT '关联标签 JSON，如 "[1,3,5]"',
    status      INT             DEFAULT 0 COMMENT '0=待启动 1=进行中 2=已完成 3=其他',
    importance  INT             COMMENT '重要性等级',
    create_time DATETIME        COMMENT '任务创建日期',
    close_time  DATETIME        COMMENT '目标闭环日期'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**说明**: `tags` 字段以 JSON 字符串存储标签 ID 数组，应用层序列化/反序列化。

### 2.4 taskdetail — 任务进展

```sql
CREATE TABLE taskdetail (
    id          INT         AUTO_INCREMENT PRIMARY KEY,
    task_id     INT         NOT NULL COMMENT '关联任务 ID',
    content     TEXT        NOT NULL COMMENT '进展描述文本',
    create_time DATETIME    COMMENT '提交时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**索引建议**: `task_id`（进展列表查询）

### 2.5 tag — 标签定义

```sql
CREATE TABLE tag (
    id          INT             AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL COMMENT '标签名称',
    color       VARCHAR(50)     COMMENT 'UI 显示颜色',
    create_time DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.6 subscription — 邮件订阅任务

```sql
CREATE TABLE subscription (
    id            INT             AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255)    NOT NULL COMMENT '任务名称',
    type          VARCHAR(20)     NOT NULL COMMENT 'once=一次性, periodic=周期性',
    send_time     DATETIME        COMMENT '发送时间（一次性）或每日时间（周期性）',
    week_days     TEXT            COMMENT '周期性周几发，JSON 如 "[1,3,5]"',
    email         VARCHAR(255)    NOT NULL COMMENT '目标推送邮箱',
    template      VARCHAR(255)    COMMENT 'EJS 模板文件名',
    api_id        INT             COMMENT '关联数据接口 ID',
    template_data TEXT            COMMENT '模板变量 JSON（预留）',
    status        INT             DEFAULT 1 COMMENT '0=停用 1=启用',
    create_time   DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**说明**: `api_id` 字段是后期 ALTER TABLE 添加的。

### 2.7 mail_address — 联系人邮箱

```sql
CREATE TABLE mail_address (
    id          INT             AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL COMMENT '联系人名称',
    address     VARCHAR(255)    NOT NULL COMMENT '邮箱地址',
    type        VARCHAR(50)     DEFAULT 'personal' COMMENT 'personal/work/other',
    create_time DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.8 mail_template — 邮件模板（数据库版）

```sql
CREATE TABLE mail_template (
    id          INT             AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(100)    COMMENT '模板编码',
    name        VARCHAR(255)    COMMENT '模板名称',
    subject     VARCHAR(500)    COMMENT '邮件主题（支持 {{var}} 变量）',
    content     TEXT            COMMENT '邮件正文（支持 {{var}} 变量）',
    create_time DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.9 api_manager — 外部接口注册

```sql
CREATE TABLE api_manager (
    id          INT             AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL COMMENT '接口名称',
    path        VARCHAR(500)    NOT NULL COMMENT '接口 URL',
    description TEXT            COMMENT '接口描述',
    create_time DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. ER 关系

箭头方向为"引用方 → 被引用方"：

```
task ────< taskdetail
         (task_id)

task.tags (JSON) ──── tag.id
         (应用层解析，非外键)

api_manager.id ──── subscription.api_id
         (逻辑外键，无约束)

mail_address.address ──── subscription.email
         (逻辑关联，无约束)

subscription.template ──── server/templates/*.ejs 文件名
         (逻辑关联，无约束)
```

**所有外键均为逻辑外键，无数据库级 FOREIGN KEY 约束。**

---

## 4. 索引建议

| 表 | 字段 | 类型 | 说明 | 优先级 |
|----|------|------|------|--------|
| article | create_time | INDEX | 按时间排序文章列表 | 中 |
| article | url | INDEX | GitHub 同步去重查询 | 低 |
| task | create_time | INDEX | 任务列表排序 | 中 |
| taskdetail | task_id | INDEX | 按任务查进展 | 高 |
| subscription | status | INDEX | 查询启用任务 | 中 |
| mail_address | address | INDEX | 去重检查 | 低 |

---

## 5. 数据完整性与约束

### 当前问题

| 问题 | 影响 | 改进方向 |
|------|------|----------|
| 密码明文存储 | 安全风险 | 改为 `bcrypt` 哈希 |
| JSON 字段无校验 | 数据损坏风险 | 改为 MySQL JSON 类型或关联表 |
| 无外键约束 | 引用不一致 | 添加 FK 约束（可选） |
| `user` 双字段 | 表结构混乱 | 统一为 `username`，迁移数据后删除 `user` |
| 无 UNIQUE 约束 | 重复数据 | 按业务需求添加唯一索引 |

### 推荐的约束清单

```sql
-- 标签名唯一
ALTER TABLE tag ADD UNIQUE INDEX idx_tag_name (name);

-- 文章 URL 唯一（仅对非空值）
ALTER TABLE article ADD UNIQUE INDEX idx_article_url (url);

-- 邮箱地址唯一
ALTER TABLE mail_address ADD UNIQUE INDEX idx_mail_address (address);
```

---

## 6. 命名规范

当前使用规范，及与标准的差异：

| 当前 | 标准 | 说明 |
|------|------|------|
| `taskdetail` | `task_detail` | 应下划线分隔 |
| `user`/`username` | `username` | 双字段过渡中 |
| `create_time` | ✅ | 正确 |
| `last_time` | ✅ | 正确 |
| `close_time` | ✅ | 正确 |
| `tagIds` (JSON) | `tag_ids` (整数数组) | 代码中命名 |
