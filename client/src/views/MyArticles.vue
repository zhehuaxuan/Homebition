<style>
.article-page {
    padding: 0;
    margin: 20px 150px 0;
    color: #cbd5e1;
}

.article-list {
    display: flex;
    flex-direction: column;
}

.article-header {
    display: flex;
    align-items: center;
    height: 32px;
    font-size: 13px;
    color: #64748b;
    border-bottom: 1px solid #334155;
    padding-bottom: 8px;
    margin-bottom: 4px;
}

.article-header .col-index {
    width: 40px;
    text-align: center;
}

.article-header .col-date {
    width: 100px;
    text-align: center;
}

.article-header .col-title {
    flex: 1;
}

.article-item {
    display: flex;
    align-items: center;
    height: 32px;
    cursor: pointer;
    font-size: 14px;
}

.article-item:hover {
    background: rgba(64, 158, 255, 0.08);
    border-radius: 4px;
}

.article-item:hover .article-title {
    color: #409eff;
}

.col-index {
    width: 40px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
}

.col-date {
    width: 100px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
}

.col-title {
    flex: 1;
    color: #cbd5e1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.loading, .error, .empty {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
    font-size: 14px;
}

.error {
    color: #f59e0b;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .article-page {
        margin: 12px 16px 0;
    }

    .article-header {
        display: none;
    }

    .article-item {
        flex-wrap: wrap;
        height: auto;
        padding: 10px 0;
        border-bottom: 1px solid #334155;
    }

    .article-item .col-index {
        width: auto;
        margin-right: 6px;
    }

    .article-item .col-date {
        width: auto;
        font-size: 12px;
    }

    .article-item .col-title {
        width: 100%;
        margin-top: 4px;
        font-size: 14px;
        white-space: normal;
        overflow: visible;
        text-overflow: unset;
    }
}
</style>

<template>
    <div class="article-page">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else-if="articles.length === 0" class="empty">暂无文章</div>
        <div v-else class="article-list">
            <div
                v-for="(article, index) in articles"
                :key="article.id"
                class="article-item"
                @click="openArticle(article.url)"
            >
                <span class="col-index">{{ index + 1 }}.</span>
                <span class="col-date">{{ formatDate(article.create_time) }}</span>
                <span class="col-title">{{ article.title }}</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const articles = ref([])
const loading = ref(true)
const error = ref('')

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const fetchArticles = async () => {
    try {
        loading.value = true
        error.value = ''

        const res = await axios.get('/api/article/list')
        if (res.data.code === 0) {
            articles.value = res.data.data
        } else {
            error.value = '加载文章失败'
        }
    } catch (e) {
        error.value = '加载文章失败，请稍后重试'
        console.error('Fetch error:', e)
    } finally {
        loading.value = false
    }
}

const openArticle = (url) => {
    if (url) {
        window.open(url, '_blank')
    }
}

onMounted(() => {
    fetchArticles()
})
</script>
