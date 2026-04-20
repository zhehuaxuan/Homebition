<template>
  <div class="page-container">
    <!-- 标题置顶 -->
    <h2 class="page-title">文章管理</h2>

    <!-- 统一操作栏：搜索 + 按钮 同行紧凑布局 -->
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

    <!-- 表格 -->
    <div class="table-wrapper">
      <el-table :data="articleList" border stripe>
        <el-table-column label="序号" type="index" width="60" align="center" />
        <el-table-column label="文章标题" prop="title" min-width="260" show-overflow-tooltip />
        
        <!-- 时间只显示 年月日 -->
        <el-table-column label="创建时间" width="160" :formatter="formatDate" prop="createTime" />
        <el-table-column label="最后修改时间" width="160" :formatter="formatDate" prop="updateTime" />
        
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <el-button type="primary" link @click="toEdit(scope.row.id)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next, jumper"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchTitle = ref('')
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const articleList = ref([])

// 模拟数据
const mockData = [
  { id: 1, title: '2025年产品规划总结', createTime: '2025-12-01 10:23:45', updateTime: '2025-12-05 16:10:22' },
  { id: 2, title: '前端工程化最佳实践', createTime: '2025-12-02 09:15:33', updateTime: '2025-12-03 11:20:10' },
]

// 时间格式化：只显示 年-月-日
const formatDate = (row, col) => {
  const val = row[col.prop]
  if (!val) return ''
  return val.split(' ')[0]
}

onMounted(() => getList())
function getList() {
  const data = mockData.filter(item => !searchTitle.value || item.title.includes(searchTitle.value))
  total.value = data.length
  articleList.value = data
}

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
/* 完全统一 任务管理 / 标签管理 样式 */
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

.pagination {
  text-align: right;
}
</style>