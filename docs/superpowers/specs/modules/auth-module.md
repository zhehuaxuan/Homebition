# 认证模块设计文档

> **日期**: 2026-07-13
> **文件**: server/routes/auth.js
> **表**: user

## 功能概述

简单的管理员登录系统。单用户（xuanzhehua），基于 Base64 token 的会话管理。

## 数据流

```
Login.vue → POST /api/auth/login → auth.js
  ├── 初始化管理员用户（自动建表 + 插入默认用户）
  ├── 明文比对密码
  ├── 生成 Base64 token
  └── 返回 token + username

前端 authStore
  ├── 存储 token 到 localStorage
  └── 通过 isLoggedIn() 控制 UI 显示
```

## 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 认证方式 | Base64 编码 token | 简单，个人项目 |
| 密码存储 | 明文 | 不推荐，技术债务 |
| 会话管理 | 无过期机制 | token 永不过期 |
| 多用户 | 单用户 | 个人站点 |

## 当前限制
- 无 token 校验中间件，后端接口无认证保护
- 密码明文存储
- token 无签名，可被伪造
