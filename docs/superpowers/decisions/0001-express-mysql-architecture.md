# ADR-0001: Express + MySQL 单体后端架构

**状态**: 已接受
**日期**: 2026-04-01

## 背景
Homebition 是一个个人全栈站点，需要支持文章管理、任务追踪、邮件服务和 AI 集成等功能。选择后端技术栈时考虑：个人项目、单机部署、快速迭代。

## 选项
1. **Express + MySQL** — 成熟的 Node.js 框架，社区资源丰富，个人项目启动快
2. **Spring Boot + PostgreSQL** — Java 生态，但项目过于重
3. **Next.js 全栈** — SSR 友好，但后端灵活度受限
4. **FastAPI + SQLite** — Python 异步框架，但部署依赖多

## 决策
选择 **Express 5 + MySQL**。理由：
- 个人项目，Express 开发效率最高
- MySQL 本地部署成熟稳定
- Express 5 支持原生 async 错误处理
- 无需 ORM 层，直接 SQL 保持简单

## 后果
- 需要在代码中手动管理数据库迁移
- 无 TypeScript 类型安全保障
- 需自行处理认证/安全中间件
