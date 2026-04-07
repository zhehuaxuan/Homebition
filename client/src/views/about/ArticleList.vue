<template>
  <div class="article-manager">
    <div class="header">
      <h3>文章管理</h3>
      <el-button type="primary" @click="toAdd">+ 新增文章</el-button>
    </div>

    <div class="search-box">
      <el-input
        v-model="searchTitle"
        placeholder="搜索文章标题"
        clearable
        style="width: 300px"
        @change="getList"
      />
    </div>

    <div class="table-wrapper">
      <el-table :data="articleList" border stripe>
        <el-table-column label="序号" type="index" width="60" align="center" />
        <el-table-column label="文章标题" prop="title" min-width="260" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column label="最后修改时间" prop="updateTime" width="180" />
        <el-table-column label="操作" width="100" align="center">
          <template #default="scope">
            <el-button type="primary" link @click="toEdit(scope.row.id)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination" style="text-align:right; margin-top:16px">
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
.article-manager {
  padding: 20px;
  background: #fff;
  min-height: calc(100vh - 100px);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.search-box {
  margin-bottom: 16px;
}
</style>