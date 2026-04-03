<style scoped>
/* 页面标题 */
.page-title {
      font-size: 24px;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 24px;
    }

    /* 美化添加按钮 - 贴合深色风格 */
    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background-color: #334155; /* 深色按钮背景 */
      border: 1px solid #475569;
      border-radius: 8px;
      font-size: 15px;
      color: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .add-btn:hover {
      background-color: #475569; /* hover 加深 */
      border-color: #64748b;
      transform: translateY(-1px);
    }

    .add-btn span {
      font-size: 18px;
      font-weight: 500;
    }

    /* 任务列表容器 - 深色卡片 */
    .todo-container {
      width: 100%;
      background-color: #0f172a; /* 更深的卡片背景 */
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    /* 表头样式 - 区分度更高 */
    .todo-header {
      display: grid;
      grid-template-columns: 220px 260px 100px 130px 130px 100px 140px 120px;
      padding: 14px 16px;
      font-size: 14px;
      color: #94a3b8; /* 浅灰色表头文字 */
      font-weight: 500;
      border-bottom: 1px solid #334155;
      background-color: #1e293b; /* 表头背景区分 */
      border-radius: 6px 6px 0 0;
      margin: -20px -20px 0 -20px;
      padding-left: 36px;
    }

    /* 任务项 - 深色悬浮效果 */
    .todo-item {
      display: grid;
      grid-template-columns: 220px 260px 100px 130px 130px 100px 140px 120px;
      align-items: center;
      padding: 16px 16px;
      border-bottom: 1px solid #27374d;
      font-size: 15px;
      color: #f1f5f9; /* 主文字颜色 */
      transition: all 0.2s ease;
    }

    .todo-item:last-child {
      border-bottom: none;
    }

    .todo-item:hover {
      background-color: #1e293b; /* 悬浮背景 */
      border-radius: 6px;
      transform: translateX(2px);
    }

    /* 标签美化 - 圆角更圆润，配色适配深色 */
    .tag {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .tag-work { background-color: #1e40af; color: #bfdbfe; }
    .tag-life { background-color: #065f46; color: #a7f3d0; }
    .tag-study { background-color: #92400e; color: #fed7aa; }

    /* 状态美化 - 渐变+圆角，适配深色 */
    .status {
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .status-todo { background-color: #334155; color: #e2e8f0; }
    .status-doing { background: linear-gradient(135deg, #1e40af, #3b82f6); color: #ffffff; }
    .status-done { background: linear-gradient(135deg, #065f46, #10b981); color: #ffffff; }

    /* 紧急度颜色优化 - 适配深色更醒目 */
    .urgent-high { color: #ef4444; font-weight: 600; }
    .urgent-middle { color: #f59e0b; }
    .urgent-low { color: #22c55e; }

    /* 详情按钮美化 - 深色风格 */
    .detail-btn {
      padding: 6px 12px;
      background-color: #334155;
      border: 1px solid #475569;
      border-radius: 6px;
      font-size: 13px;
      color: #f1f5f9;
      cursor: pointer;
      transition: all 0.2s;
    }

    .detail-btn:hover {
      background-color: #475569;
      border-color: #64748b;
    }
</style>
<template>
    <div class="page">
        <h3>我的任务</h3>
        <!-- 第一部分：创建按钮 -->
        <div class="add-btn">
            <span>+</span> 添加新任务
        </div>

        <!-- 第二部分：任务清单（纯HTML写死） -->
        <div class="todo-container">
            <div class="todo-header">
                <div>任务名称</div>
                <div>目标（类型/紧急度/重要性）</div>
                <div>标签</div>
                <div>创建时间</div>
                <div>闭环时间</div>
                <div>状态</div>
                <div>剩余时间</div>
                <div>操作</div>
            </div>

            <div id="todo-list">
                <!-- 任务1 -->
                <div class="todo-item">
                    <div>完成项目需求文档</div>
                    <div>工作 / <span class="urgent-high">高</span> / 高</div>
                    <div><span class="tag tag-work">工作</span></div>
                    <div>2026-04-01 10:30</div>
                    <div>2026-04-05 18:00</div>
                    <div>
                        <div class="status status-doing">进行中</div>
                    </div>
                    <div id="t1">计算中...</div>
                    <div><button class="detail-btn" onclick="show(1)">详情</button></div>
                </div>

                <!-- 任务2 -->
                <div class="todo-item">
                    <div>学习 HTML + CSS 布局</div>
                    <div>学习 / <span class="urgent-middle">中</span> / 高</div>
                    <div><span class="tag tag-study">学习</span></div>
                    <div>2026-04-02 14:00</div>
                    <div>2026-04-10 23:59</div>
                    <div>
                        <div class="status status-todo">待办</div>
                    </div>
                    <div id="t2">计算中...</div>
                    <div><button class="detail-btn" onclick="show(2)">详情</button></div>
                </div>

                <!-- 任务3 -->
                <div class="todo-item">
                    <div>整理家庭月度开支</div>
                    <div>生活 / <span class="urgent-low">低</span> / 中</div>
                    <div><span class="tag tag-life">生活</span></div>
                    <div>2026-04-03 09:15</div>
                    <div>2026-04-07 20:00</div>
                    <div>
                        <div class="status status-done">已完成</div>
                    </div>
                    <div id="t3">计算中...</div>
                    <div><button class="detail-btn" onclick="show(3)">详情</button></div>
                </div>
            </div>
        </div>
    </div>
</template>