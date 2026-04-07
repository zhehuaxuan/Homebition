<template>
  <div class="tag-manager-container">
    <!-- 顶部标题 + 新增按钮 + 刷新按钮 -->
    <div class="header-bar">
      <h2>标签管理</h2>
      <div class="header-buttons">
        <el-button type="primary" @click="handleAdd">新增</el-button>
        <el-button type="success" @click="getList">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input v-model="searchKey" placeholder="请输入标签名称搜索" clearable style="width: 300px" @input="handleSearch" />
    </div>

    <!-- 表格 -->
    <div class="table-box">
      <el-table :data="tableData" border stripe>
        <el-table-column label="序号" prop="serialNumber" width="60" align="center" />
        <el-table-column label="标签名称" prop="name" min-width="150" />
        <el-table-column label="创建时间" prop="create_time" width="180" />
        <el-table-column label="操作" width="180" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination v-model:current-page="pageNo" v-model:page-size="pageSize" :total="total"
        layout="total, prev, pager, next, jumper" @size-change="handleSearch" />
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
 * 获取标签列表 + 前端过滤
 * 规范：异常捕获、空指针保护、状态管理
 */
const getList = async () => {
  // 开始加载
  loading.value = true

  try {
    // 1. 请求接口
    const res = await axios.get('/api/tags')

    // 2. 安全获取数据（空值保护）
    const list = res?.data?.list || [] // 防止 res/data/list 为空

    // 3. 前端关键词过滤 + 自动增加序号
    const filteredList = list.filter(item => {
      if (!searchKey.value) return true;
      return String(item.name || '').includes(searchKey.value.trim());
    }).map((item, index) => {
      // 给每一项增加序号：自然数从 1 开始
      return {
        ...item,
        serialNumber: index + 1  // 1、2、3、4...
      };
    });
    // 4. 赋值
    tableData.value = filteredList
    total.value = filteredList.length

  } catch (err) {
    // 5. 统一异常处理
    console.error('获取标签列表失败：', err)
    ElMessage.error('获取标签列表失败，请稍后重试')

    // 异常时清空数据，防止页面空白
    tableData.value = []
    total.value = 0

  } finally {
    // 无论成功失败，关闭加载
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
  console.log(form);
  const { id, name } = form;

  if (!name) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  try {
    if (isEdit) {
      // 编辑：调用修改接口
      await axios.put(`/api/tag/update/${id}`, { name });
      ElMessage.success('修改成功');
    } else {
      // 新增：调用新增接口
      await axios.post('/api/tag/add', { name });
      ElMessage.success('新增成功');
    }
  } catch (err) {
    ElMessage.error('操作失败：' + (err.response?.data?.message || '网络异常'));
    return;
  }
  dialogVisible.value = false;
  getList(); // 刷新列表
};

// 删除标签
const handleDelete = async (id) => {
  // 确认弹窗
  await ElMessageBox.confirm('确定要删除该标签吗？', '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).catch(() => {
    ElMessage.info('已取消删除')
    // 抛出错误终止执行
    throw new Error('cancel')
  })

  try {
    // 调用 DELETE 接口
    await axios.delete(`/api/tag/delete/${id}`)
    ElMessage.success('删除成功')
    // 刷新列表
    getList()
  } catch (err) {
    // 取消删除不提示错误
    if (err.message === 'cancel') return
    ElMessage.error('删除失败：' + (err.response?.data?.message || '网络异常'))
  }
}

</script>

<style scoped>
.tag-manager-container {
  padding: 20px;
  min-height: calc(100vh - 120px);
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-bar {
  margin-bottom: 20px;
}

.table-box {
  margin-bottom: 20px;
}

.pagination {
  text-align: right;
}
</style>