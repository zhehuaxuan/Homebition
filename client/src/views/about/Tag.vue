<template>
  <div class="page-container">
    <!-- 标题置顶 -->
    <h2 class="page-title">标签管理</h2>

    <!-- 统一操作栏：搜索 + 按钮 紧凑同行 -->
    <div class="action-bar">
      <el-input
        v-model="searchKey"
        placeholder="搜索标签名称"
        clearable
        style="width: 260px"
        @keyup.enter="handleSearch"
      />

      <div class="spacer"></div>

      <el-button type="primary" @click="handleAdd">新增</el-button>
      <el-button type="success" @click="getList">刷新</el-button>
    </div>

    <!-- 表格 -->
    <div class="table-box">
      <el-table :data="tableData" border stripe>
        <el-table-column label="序号" prop="serialNumber" width="60" align="center" />
        <el-table-column label="标签名称" prop="name" min-width="180" />
        <!-- 🔥 格式化时间：只显示年月日，隐藏时分秒 -->
        <el-table-column label="创建时间" prop="create_time" width="160" :formatter="formatDate" />
        <el-table-column label="操作" width="160" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="pageNo"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next, jumper"
        @size-change="handleSearch"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" title="标签信息" width="500px">
      <el-form :model="form" label-width="80px" label-position="left">
        <el-form-item label="标签名称">
          <el-input v-model="form.name" placeholder="请输入标签名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 搜索
const searchKey = ref('')
const pageNo = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 表格数据
const tableData = ref([])

// 弹窗
const dialogVisible = ref(false)
const form = reactive({
  id: '',
  name: '',
  status: true
})
let isEdit = false

// 初始化加载
onMounted(() => {
  getList()
})

const loading = ref(false) // 加载状态

/**
 * 🔥 时间格式化函数：只展示 年-月-日
 */
const formatDate = (row) => {
  if (!row.create_time) return ''
  const d = new Date(row.create_time)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

/**
 * 获取标签列表 + 前端过滤
 */
const getList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/tags')
    const list = res?.data?.list || []

    const filteredList = list.filter(item => {
      if (!searchKey.value) return true;
      return String(item.name || '').includes(searchKey.value.trim());
    }).map((item, index) => {
      return {
        ...item,
        serialNumber: index + 1
      };
    });

    tableData.value = filteredList
    total.value = filteredList.length

  } catch (err) {
    console.error('获取标签列表失败：', err)
    ElMessage.error('获取标签列表失败')
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pageNo.value = 1
  getList()
}

// 新增
const handleAdd = () => {
  isEdit = false
  Object.assign(form, { id: '', name: '' })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  isEdit = true
  Object.assign(form, row)
  dialogVisible.value = true
}

// 提交保存
const handleSubmit = async () => {
  const { id, name } = form;
  if (!name) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  try {
    if (isEdit) {
      await axios.put(`/api/tag/update/${id}`, { name });
      ElMessage.success('修改成功');
    } else {
      await axios.post('/api/tag/add', { name });
      ElMessage.success('新增成功');
    }
  } catch (err) {
    ElMessage.error('操作失败：' + (err.response?.data?.message || '网络异常'));
    return;
  }
  dialogVisible.value = false;
  getList();
};

// 删除标签
const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定要删除该标签吗？', '提示', {
    type: 'warning',
  }).catch(() => {
    ElMessage.info('已取消删除')
    throw new Error('cancel')
  })

  try {
    await axios.delete(`/api/tag/delete/${id}`)
    ElMessage.success('删除成功')
    getList()
  } catch (err) {
    if (err.message === 'cancel') return
    ElMessage.error('删除失败')
  }
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

.table-box {
  margin-bottom: 20px;
}

.pagination {
  text-align: right;
}
</style>