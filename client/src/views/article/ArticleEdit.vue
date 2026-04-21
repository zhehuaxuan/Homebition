<template>
  <div class="article-editor-container">
    <div class="form-item">
      <label>文章标题</label>
      <input v-model="formData.title" type="text" placeholder="请输入文章标题" class="title-input" />
    </div>

    <div class="form-item">
      <label>文章内容</label>
      <Toolbar :editor="editor" :default-config="toolbarConfig" mode="default" style="margin-bottom: 10px" />
      <Editor v-model="formData.content" :default-config="editorConfig" mode="default" @onCreated="onCreated"
        class="wangeditor-box" />
    </div>

    <div class="btn-group">
      <el-button type="primary" @click="rollback">返回</el-button>
      <el-button type="primary" @click="handleSubmit">保存修改</el-button>
      <el-button @click="handlePreview">预览内容</el-button>
    </div>

    <div v-if="previewVisible" class="preview-box">
      <h3>预览：{{ formData.title }}</h3>
      <div v-html="formData.content" class="preview-content"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router' // 加 useRoute
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import axios from 'axios'

const router = useRouter()
const route = useRoute() // 获取路由

const editor = ref(null)
const articleId = ref(null) // 文章ID

// 表单数据
const formData = reactive({
  title: '',
  content: ''
})

const previewVisible = ref(false)

// 工具栏配置
const toolbarConfig = {
  excludeKeys: [],
}

// 编辑器配置
const editorConfig = {
  placeholder: '请输入文章内容...',
  MENU_CONF: {
    uploadImage: {
      server: '/api/upload/image',
      fieldName: 'file',
      maxFileSize: 5 * 1024 * 1024,
      base64LimitSize: 0,
      pasteHandle: true,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
      customInsert(res, insertFn) {
        insertFn(res.data.url)
      }
    }
  }
}

// 返回
function rollback() {
  router.push('/about/article-list')
}

function onCreated(ed) {
  editor.value = ed
}

// ==============================================
// 页面加载时：根据路由 id 查询文章并回显
// ==============================================
onMounted(() => {
  articleId.value = route.params.id
  if (articleId.value) {
    getArticleDetail()
  }
})

// 查询文章详情
async function getArticleDetail() {
  try {
    const res = await axios.get(`/api/article/detail/${articleId.value}`)
    if (res.data.code === 0) {
      formData.title = res.data.data.title
      formData.content = res.data.data.content
    }
  } catch (err) {
    console.error('获取文章详情失败', err)
    alert('获取文章信息失败')
  }
}

// ==============================================
// 提交修改（更新接口）
// ==============================================
async function handleSubmit() {
  if (!formData.title.trim()) {
    alert('请输入标题')
    return
  }
  if (!formData.content.trim()) {
    alert('请输入内容')
    return
  }

  try {
    // 编辑 → 调用 update 接口
    const res = await axios.post('/api/article/update', {
      id: articleId.value,
      title: formData.title,
      content: formData.content
    })

    if (res.data.code === 0) {
      alert('修改成功！')
      rollback()
    } else {
      alert('修改失败：' + res.data.msg)
    }
  } catch (err) {
    console.error(err)
    alert('提交异常')
  }
}

// 预览
function handlePreview() {
  previewVisible.value = true
}

// ==============================================
// 菜单无法关闭 修复
// ==============================================
let closeHandler
onMounted(() => {
  closeHandler = () => {
    document.querySelectorAll('.w-e-panel-container, .w-e-popover').forEach(el => {
      el.style.display = 'none'
    })
  }
  document.addEventListener('mousedown', closeHandler, true)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', closeHandler, true)
})
</script>

<style scoped>
.article-editor-container {
  max-width: 1200px;
  margin: 30px auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 0 10px #eee;
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.title-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #dcdee3;
  border-radius: 4px;
  outline: none;
  font-size: 14px;
  box-sizing: border-box;
}

.wangeditor-box {
  border: 1px solid #dcdee3;
  min-height: 500px;
  border-radius: 4px;
  overflow: hidden;
}

.btn-group {
  margin-top: 20px;
}

.preview-box {
  margin-top: 30px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.preview-content {
  line-height: 1.8;
  font-size: 15px;
}
</style>