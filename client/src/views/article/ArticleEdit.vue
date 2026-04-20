<template>
  <div class="page-container">
    <h2 class="page-title">{{ isEdit ? '编辑文章' : '新增文章' }}</h2>

    <el-form label-width="80px" style="max-width: 1200px; margin-top: 16px">
      <el-form-item label="文章标题">
        <el-input v-model="form.title" placeholder="请输入标题" class="dark-input" />
      </el-form-item>

      <el-form-item label="文章内容">
        <div class="editor-wrapper">
          <Editor
            v-model="form.content"
            :defaultConfig="editorConfig"
            mode="default"
            style="height: 550px"
          />
        </div>
      </el-form-item>

      <el-form-item>
        <el-button @click="goBack">返回</el-button>
        <el-button @click="saveDraft">保存草稿</el-button>
        <el-button type="primary" @click="publish">发布</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Editor } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

const router = useRouter()
const route = useRoute()
const isEdit = ref(!!route.params.id)

// ==========================
// 🔥 显示菜单 + 粘贴图片自动转 Base64
// ==========================
const editorConfig = {
  placeholder: '输入文字、粘贴截图、插入表格',
  // 👇 开启完整工具栏（恢复所有菜单）
  toolbarKeys: [
    'headerSelect',
      'bold',
      'underline',
      'italic',
      'through',
      'clearStyle',
      'color',
      'bgColor',
      'indent',
      'delIndent',
      'justifyLeft',
      'justifyCenter',
      'justifyRight',
      'justifyJustify',
      'lineHeight',
      'insertTable',
      'deleteTable',
      'insertTableRow',
      'deleteTableRow',
      'insertTableCol',
      'deleteTableCol',
      'tableHeader',
      'tableFullWidth',
      'insertLink',
      'editLink',
      'unLink',
      'viewLink',
      'undo',
      'redo',
      'fullScreen'
  ],
  MENU_CONF: {
    uploadImage: {
      server: '', // 空接口
      base64LimitSize: 10 * 1024 * 1024, // 图片最大 10M，转 Base64
    },
  },
  pasteIgnoreImg: false, // 允许粘贴图片
  pasteFilterStyle: false,
}

const form = reactive({
  id: '',
  title: '',
  content: '',
})

const mockData = [
  { id: 1, title: '2025 年产品规划总结', content: '<p>请编辑内容</p>' },
]

onMounted(() => {
  if (isEdit.value) {
    const id = +route.params.id
    const article = mockData.find(item => item.id === id)
    if (article) Object.assign(form, article)
  }
})

const saveDraft = () => {
  if (!form.title) {
    ElMessage.warning('请输入标题')
    return
  }
  ElMessage.success('草稿保存成功')
  console.log('内容（Base64图片）：', form.content)
  goBack()
}

const publish = () => {
  if (!form.title) {
    ElMessage.warning('请输入标题')
    return
  }
  ElMessage.success('发布成功')
  console.log('内容（Base64图片）：', form.content)
  goBack()
}

const goBack = () => {
  router.push('/about/task-list')
}
</script>

<style scoped>
.page-container {
  padding: 20px;
  background: transparent !important;
  box-shadow: none !important;
}

.page-title {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

:deep(.el-form-item__label) {
  color: #e2e8f0 !important;
}

:deep(.dark-input .el-input__wrapper) {
  background: #1e293b !important;
  box-shadow: 0 0 0 1px #475569 inset !important;
}
:deep(.dark-input .el-input__inner) {
  color: #fff !important;
}

.editor-wrapper {
  width: 100%;
}
:deep(.w-e-root) {
  width: 100% !important;
}

/* 编辑区白色 + 黑色文字 */
:deep(.w-e-text-container) {
  height: 450px !important;
  background: #ffffff !important;
  border: 1px solid #ddd !important;
}

:deep(.w-e-text),
:deep(.w-e-text *),
:deep(.w-e-text p),
:deep(.w-e-text div),
:deep(.w-e-text span) {
  color: #000 !important;
  font-size: 15px !important;
}

:deep(.w-e-placeholder) {
  color: #999 !important;
}

/* 工具栏深色 + 白色文字 */
:deep(.w-e-toolbar) {
  background: #1e293b !important;
  border: 1px solid #475569 !important;
}
:deep(.w-e-menu) {
  color: #fff !important;
}
</style>