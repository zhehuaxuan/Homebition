<template>
    <div class="article-edit" style="padding:20px; background:#fff; min-height:calc(100vh - 100px)">
      <h3 style="margin-bottom:20px">{{ isEdit ? '编辑文章' : '新增文章' }}</h3>
  
      <el-form :model="form" label-width="80px" style="max-width:600px">
        <el-form-item label="文章标题">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
  
        <el-form-item label="文章内容">
          <el-input v-model="form.content" type="textarea"  placeholder="请输入内容" />
        </el-form-item>
  
        <el-form-item>
          <el-button @click="goBack">返回</el-button>
          <el-button type="primary" @click="save">保存文章</el-button>
        </el-form-item>
      </el-form>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { ElMessage } from 'element-plus'
  
  const router = useRouter()
  const route = useRoute()
  
  const isEdit = ref(!!route.params.id)
  const form = reactive({
    id: '',
    title: '',
    content: '',
    createTime: '',
    updateTime: ''
  })
  
  // 模拟根据ID获取文章
  const mockData = [
    { id: 1, title: '2025年产品规划总结', content: '内容...', createTime: '2025-12-01 10:23:45', updateTime: '2025-12-05 16:10:22' },
    { id: 2, title: '前端工程化最佳实践', content: '内容...', createTime: '2025-12-02 09:15:33', updateTime: '2025-12-03 11:20:10' },
  ]
  
  onMounted(() => {
    if (isEdit.value) {
      const id = +route.params.id
      const article = mockData.find(item => item.id === id)
      if (article) Object.assign(form, article)
    }
  })
  
  // 保存
  function save() {
    if (!form.title) {
      ElMessage.warning('请输入标题')
      return
    }
    ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
    goBack()
  }
  
  // 返回列表
  function goBack() {
    router.push('/article')
  }
  </script>