# 数据库命名规范

## 表名
- 全小写，下划线分隔: `task_detail` ✅ / `taskDetail` ❌
- 单数形式: `user` ✅ / `users` ❌
- 关联表用双方表名单数: `user_role` ✅

## 字段名
- 全小写，下划线分隔: `create_time` ✅ / `createTime` ❌
- 主键: `id`（统一）
- 外键: `<关联表>_id`: `task_id` ✅
- 时间字段: `create_time`, `last_time`, `send_time`, `close_time`

## 已有表兼容说明

当前数据库中部分表名和字段名存在不一致，迁移计划见 ADR。

| 当前用法 | 标准 | 备注 |
|---------|------|------|
| `taskdetail` | `task_detail` | 历史遗留 |
| `user.user` / `user.username` | `username` | 双字段兼容 |
