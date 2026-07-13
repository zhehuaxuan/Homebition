<template>
  <div class="page-container">
    <div class="header-row">
      <h2 class="page-title">文章管理</h2>
      <el-button type="success" :loading="syncing" @click="handleSync">同步</el-button>
    </div>

    <div class="table-wrapper">
      <div class="table-container">
      <el-table :data="articleList" border stripe v-loading="loading">
        <el-table-column label="序号" type="index" width="60" align="center" />
        <el-table-column label="文章标题" prop="title" min-width="260" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="create_time" width="120" :formatter="formatDate" />
        <el-table-column label="链接" width="100" align="center" class-name="hide-on-mobile">
          <template #default="scope">
            <el-button type="primary" link @click="openArticle(scope.row.url)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 手机端卡片列表 -->
    <div class="mobile-article-cards">
      <div v-for="item in articleList" :key="item.id" class="mobile-article-card">
        <div class="card-title">{{ item.title }}</div>
        <div class="card-meta">创建于 {{ formatDate(item) }}</div>
        <div class="card-actions">
          <el-button type="primary" size="small" link @click="openArticle(item.url)" v-if="item.url">查看原文</el-button>
          <span v-else style="color:#94a3b8;font-size:12px;">无链接</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const articleList = ref([])
const loading = ref(false)
const syncing = ref(false)

const formatDate = (row) => {
  if (!row.create_time) return '-'
  const date = new Date(row.create_time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 从数据库获取文章列表
async function getList() {
  try {
    loading.value = true
    const res = await axios.get('/api/article/list')
    if (res.data.code === 0) {
      articleList.value = res.data.rows
    }
  } catch (err) {
    console.error('获取文章列表失败', err)
  } finally {
    loading.value = false
  }
}

// 同步文章到数据库
async function handleSync() {
  try {
    syncing.value = true
    const res = await axios.post('/api/article/sync')
    if (res.data.code === 0) {
      ElMessage.success(`同步完成：新增 ${res.data.data.synced} 篇，跳过 ${res.data.data.skipped} 篇已存在的文章`)
      getList()
    } else {
      ElMessage.error(res.data.msg || '同步失败')
    }
  } catch (err) {
    console.error('同步失败', err)
    ElMessage.error('同步失败，请稍后重试')
  } finally {
    syncing.value = false
  }
}

const openArticle = (url) => {
  if (url) {
    window.open(url, '_blank')
  }
}

onMounted(() => getList())
</script>

<style scoped>
.page-container {
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.table-wrapper {
  margin-bottom: 16px;
}

.mobile-article-cards {
  display: none;
}

.mobile-article-card {
  background: #1e293b;
  border-radius: 8px;
  padding: 14px;
  border: 1px solid #334155;
  margin-bottom: 10px;
}
.mobile-article-card .card-title {
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 6px;
  line-height: 1.4;
}
.mobile-article-card .card-meta {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}
.mobile-article-card .card-actions {
  padding-top: 8px;
  border-top: 1px solid #334155;
}

@media (max-width: 768px) {
  .table-wrapper {
    display: none;
  }
  .mobile-article-cards {
    display: flex;
    flex-direction: column;
  }
}
</style>