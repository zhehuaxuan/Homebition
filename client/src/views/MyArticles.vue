    <style>
    /* 技能标签容器 */
    .skill-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        margin-bottom: 32px;
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
    }

    /* 技能标签样式 */
    .skill-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 16px;
        border-radius: 6px;
        font-size: 15px;
        font-weight: 500;
        color: #ffffff;
    }

    /* 标签颜色分类 */
    .tag-green {
        background-color: #36d399;
    }

    .tag-black {
        background-color: #1e1e1e;
    }

    .tag-purple {
        background-color: #9f7aea;
    }

    .tag-blue {
        background-color: #3abff8;
    }

    /* 发现区域 */
    .section-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* 文章列表容器 */
    .article-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    /* 文章卡片样式 */
    .article-card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        display: flex;
        gap: 20px;
        padding: 20px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .article-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    /* 文章图片 */
    .article-img {
        width: 40%;
        border-radius: 8px;
        object-fit: cover;
    }

    /* 文章内容区 */
    .article-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .article-title {
        font-size: 22px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
    }

    .article-meta {
        font-size: 14px;
        color: #999;
        margin-bottom: 12px;
        display: flex;
        gap: 12px;
        align-items: center;
    }

    .article-desc {
        font-size: 16px;
        color: #555;
        line-height: 1.7;
    }

    /* 双列文章卡片 */
    .article-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .article-card-single {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        padding: 24px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .article-card-single:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .article-card-single .article-title {
        font-size: 24px;
        margin-bottom: 8px;
    }

    .article-card-single .article-meta {
        margin-bottom: 12px;
    }

    .article-card-single .article-desc {
        font-size: 16px;
        color: #666;
    }

    .article-img-right {
        width: 100%;
        border-radius: 8px;
        object-fit: cover;
    }

    /* 响应式适配 */
    @media (max-width: 768px) {
        .article-card {
            flex-direction: column;
        }

        .article-img {
            width: 100%;
            height: 200px;
        }

        .article-row {
            grid-template-columns: 1fr;
        }
    }
</style>
    <template>
        <!-- 技能标签区 -->
        <div class="skill-card">
            <div class="skill-tag tag-green">
                <span>🧩</span> Java 6
            </div>
            <div class="skill-tag tag-black">
                <span>🧩</span> SpringBoot 9
            </div>
            <div class="skill-tag tag-black">
                <span>🧩</span> 大数据 4
            </div>
            <div class="skill-tag tag-green">
                <span>🧩</span> MySQL 1
            </div>
            <div class="skill-tag tag-black">
                <span>🧩</span> Redis 2
            </div>
            <div class="skill-tag tag-black">
                <span>🧩</span> Dubbo 2
            </div>
            <div class="skill-tag tag-purple">
                <span>🧩</span> SpringCloud 6
            </div>
            <div class="skill-tag tag-purple">
                <span>🧩</span> MyBatis 2
            </div>
            <div class="skill-tag tag-blue">
                <span>🧩</span> MQ 1
            </div>
        </div>

        <!-- 发现区域 -->
        <div class="section-title">
            <span>🌱</span> 发现
        </div>

        <div class="article-list">
            <!-- 文章1：礁石不说话 -->
            <div class="article-card">
                <img src="https://picsum.photos/800/400?sunset" alt="夕阳风景" class="article-img">
                <div class="article-content">
                    <h2 class="article-title">
                        <span>🏹</span> 礁石不说话
                    </h2>
                    <div class="article-meta">
                        <span>⌚ 发表于 2025-08-16</span>
                        <span>📁 随笔</span>
                    </div>
                    <p class="article-desc">
                        礁石不说话—黄昏时分凝望夕阳，对人类算得上一件有意义的事吗？我说不清。但我喜欢看，也只是看着。上一次欣赏夕阳带来的景色...
                    </p>
                </div>
            </div>
        </div>
    </template>