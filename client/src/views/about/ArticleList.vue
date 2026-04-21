<template>
  <div class="page-container">
    <h2 class="page-title">文章管理</h2>

    <div class="action-bar">
      <el-input
        v-model="searchTitle"
        placeholder="搜索文章标题"
        clearable
        style="width: 260px"
        @keyup.enter="getList"
      />
      <div class="spacer"></div>
      <el-button type="primary" @click="toAdd">新增</el-button>
      <el-button type="success" @click="getList">刷新</el-button>
    </div>

    <div class="table-wrapper">
      <el-table :data="articleList" border stripe>
        <el-table-column label="序号" type="index" width="60" align="center" />
        <el-table-column label="文章标题" prop="title" min-width="260" show-overflow-tooltip />
        <el-table-column label="创建时间" width="160" :formatter="formatDate" prop="create_time" />
        <el-table-column label="最后修改时间" width="160" :formatter="formatDate" prop="last_time" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <el-button type="primary" link @click="toEdit(scope.row.id)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const searchTitle = ref('')
const articleList = ref([])
const total = ref(0)

// 【修复】健壮的时间格式化，兼容所有数据库时间格式
const formatDate = (row, column) => {
  const time = row[column.property]
  if (!time) return '-'
  
  // 标准化日期处理，无论是否带时分秒都能正确提取年月日
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

// 获取文章列表
async function getList() {
  try {
    const res = await axios.get('/api/article/list', {
      params: {
        title: searchTitle.value
      }
    })
    if (res.data.code === 0) {
      articleList.value = res.data.rows
      total.value = res.data.total
    }
  } catch (err) {
    console.error('获取文章列表失败', err)
  }
}

onMounted(() => getList())

// 跳转到新增
function toAdd() {
  router.push('/article/add')
}

// 跳转到编辑
function toEdit(id) {
  router.push(`/article/edit/${id}`)
}
</script>

<style scoped>
.page-container {
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.page-title {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.spacer {
  flex: 1;
}

.table-wrapper {
  margin-bottom: 16px;
}
</style>