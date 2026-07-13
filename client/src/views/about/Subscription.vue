<template>
  <div class="page-container">
    <h2 class="page-title">订阅管理</h2>

    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 订阅任务 -->
      <el-tab-pane label="订阅任务" name="subscription">
        <div class="action-bar">
          <el-input v-model="queryParams.keyword" placeholder="搜索任务名称" clearable
            @keyup.enter="getSubscriptions" />
          <el-select v-model="queryParams.status" placeholder="状态过滤" clearable>
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
          <el-button type="primary" @click="getSubscriptions">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
          <div class="spacer"></div>
          <el-button type="primary" @click="handleAddSubscription">新增订阅</el-button>
        </div>

        <div class="table-container">
        <el-table :data="filteredSubscriptions" border stripe style="width: 100%">
          <el-table-column prop="name" label="任务名称" min-width="150" />
          <el-table-column prop="type" label="类型" width="100" class-name="hide-on-mobile">
            <template #default="scope">
              <el-tag :type="scope.row.type === 'once' ? 'warning' : 'success'" size="small">
                {{ scope.row.type === 'once' ? '一次性' : '周期性' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="执行时间" min-width="180">
            <template #default="scope">
              <span>{{ formatExecTime(scope.row) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="email" label="推送邮箱" min-width="180" />
          <el-table-column label="接口名称" width="120" class-name="hide-on-mobile">
            <template #default="scope">
              <span>{{ getApiNameById(scope.row.api_id) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="scope">
              <el-switch v-model="scope.row.status" :active-value="1" :inactive-value="0"
                @change="handleToggleSubscription(scope.row)" />
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="170" class-name="hide-on-mobile">
            <template #default="scope">
              <span>{{ formatCreateTime(scope.row.create_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center">
            <template #default="scope">
              <el-button size="small" type="primary" @click="handleEditSubscription(scope.row)">修改</el-button>
              <el-button size="small" type="danger" @click="handleDeleteSubscription(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        </div>

        <!-- 手机端订阅卡片 -->
        <div class="mobile-subscription-cards">
          <div v-for="item in filteredSubscriptions" :key="item.id" class="mobile-card">
            <div class="card-title">{{ item.name }}</div>
            <div class="card-row"><span class="card-label">类型</span>{{ item.type === 'once' ? '一次性' : '周期性' }}</div>
            <div class="card-row"><span class="card-label">执行时间</span>{{ formatExecTime(item) }}</div>
            <div class="card-row"><span class="card-label">推送邮箱</span>{{ item.email }}</div>
            <div class="card-row"><span class="card-label">接口</span>{{ getApiNameById(item.api_id) }}</div>
            <div class="card-row"><span class="card-label">状态</span>
              <el-switch v-model="item.status" :active-value="1" :inactive-value="0" size="small"
                @change="handleToggleSubscription(item)" />
            </div>
            <div class="card-actions">
              <el-button size="small" type="primary" @click="handleEditSubscription(item)">修改</el-button>
              <el-button size="small" type="danger" @click="handleDeleteSubscription(item.id)">删除</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 邮箱管理 -->
      <el-tab-pane label="邮箱管理" name="mail">
        <div class="action-bar">
          <el-input v-model="mailQueryParams.keyword" placeholder="搜索名称/地址" clearable
            @keyup.enter="getMails" />
          <el-select v-model="mailQueryParams.type" placeholder="类型过滤" clearable>
            <el-option label="个人" value="personal" />
            <el-option label="工作" value="work" />
            <el-option label="其他" value="other" />
          </el-select>
          <el-button type="primary" @click="getMails">查询</el-button>
          <el-button @click="resetMailQuery">重置</el-button>
          <div class="spacer"></div>
          <el-button type="primary" @click="handleAddMail">新增邮箱</el-button>
        </div>

        <div class="table-container">
        <el-table :data="filteredMails" border stripe style="width: 100%">
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="address" label="邮箱地址" min-width="200" />
          <el-table-column prop="type" label="类型" width="100" class-name="hide-on-mobile">
            <template #default="scope">
              <el-tag :type="getMailTypeTag(scope.row.type)" size="small">
                {{ getMailTypeName(scope.row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="170" class-name="hide-on-mobile">
            <template #default="scope">
              <span>{{ formatCreateTime(scope.row.create_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center">
            <template #default="scope">
              <el-button size="small" type="primary" @click="handleEditMail(scope.row)">修改</el-button>
              <el-button size="small" type="danger" @click="handleDeleteMail(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        </div>

        <!-- 手机端邮箱卡片 -->
        <div class="mobile-mail-cards">
          <div v-for="item in filteredMails" :key="item.id" class="mobile-card">
            <div class="card-title">{{ item.name }}</div>
            <div class="card-row"><span class="card-label">地址</span>{{ item.address }}</div>
            <div class="card-row"><span class="card-label">类型</span>{{ getMailTypeName(item.type) }}</div>
            <div class="card-actions">
              <el-button size="small" type="primary" @click="handleEditMail(item)">修改</el-button>
              <el-button size="small" type="danger" @click="handleDeleteMail(item.id)">删除</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 模板管理 -->
      <el-tab-pane label="模板管理" name="template">
        <div class="action-bar">
          <el-input v-model="templateQueryParams.keyword" placeholder="搜索模板名称" clearable
            @keyup.enter="getTemplates" />
          <el-button type="primary" @click="getTemplates">查询</el-button>
          <div class="spacer"></div>
          <el-button type="primary" @click="handleAddTemplate">新增模板</el-button>
        </div>

        <div class="table-container">
        <el-table :data="filteredTemplates" border stripe style="width: 100%">
          <el-table-column prop="name" label="模板名称" min-width="200">
            <template #default="scope">
              <span class="template-name">{{ scope.row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="大小" width="100" class-name="hide-on-mobile">
            <template #default="scope">
              {{ formatTemplateSize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="170" class-name="hide-on-mobile">
            <template #default="scope">
              {{ formatTemplateDate(scope.row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center">
            <template #default="scope">
              <el-button size="small" type="primary" @click="handleViewTemplate(scope.row)">查看</el-button>
              <el-button size="small" type="warning" @click="handleEditTemplate(scope.row)">编辑</el-button>
              <el-button size="small" type="danger" @click="handleDeleteTemplate(scope.row.name)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        </div>

        <!-- 手机端模板卡片 -->
        <div class="mobile-template-cards">
          <div v-for="item in filteredTemplates" :key="item.name" class="mobile-card">
            <div class="card-title"><span class="template-name">{{ item.name }}</span></div>
            <div class="card-row"><span class="card-label">大小</span>{{ formatTemplateSize(item.size) }}</div>
            <div class="card-row"><span class="card-label">更新于</span>{{ formatTemplateDate(item.updated_at) }}</div>
            <div class="card-actions">
              <el-button size="small" @click="handleViewTemplate(item)">查看</el-button>
              <el-button size="small" type="warning" @click="handleEditTemplate(item)">编辑</el-button>
              <el-button size="small" type="danger" @click="handleDeleteTemplate(item.name)">删除</el-button>
            </div>
          </div>
        </div>

        <!-- 模板新增/编辑弹窗 -->
        <el-dialog v-model="templateDialogVisible" :title="isTemplateEdit ? '编辑模板' : '新增模板'" width="800px">
          <el-form :model="templateForm" label-width="100px">
            <el-form-item label="模板名称" required>
              <el-input v-model="templateForm.name" placeholder="请输入模板名称，如: welcome.ejs" :disabled="isTemplateEdit" />
              <span class="form-tip">文件名必须以 .ejs 结尾</span>
            </el-form-item>
            <el-form-item label="模板内容" required>
              <el-input v-model="templateForm.content" type="textarea" :rows="20" placeholder="请输入 EJS 模板内容" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="templateDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSubmitTemplate">确认</el-button>
          </template>
        </el-dialog>

        <!-- 模板查看弹窗（只读） -->
        <el-dialog v-model="templateViewVisible" title="查看模板" width="1200px">
          <div class="template-viewer">
            <div class="viewer-header">
              <span class="template-name">{{ currentTemplate?.name }}</span>
              <el-tag type="info" size="small">EJS 模板</el-tag>
            </div>
            <div class="viewer-tabs">
              <el-radio-group v-model="templateViewTab">
                <el-radio-button value="code">模板内容</el-radio-button>
                <el-radio-button value="preview">效果预览</el-radio-button>
              </el-radio-group>
            </div>

            <!-- 模板内容视图 -->
            <div v-if="templateViewTab === 'code'" class="viewer-body-code">
              <div class="content-panel-full">
                <div class="panel-title">模板内容</div>
                <pre class="viewer-content">{{ currentTemplate?.content }}</pre>
              </div>
              <div class="variables-panel-full">
                <div class="panel-title">模板变量</div>
                <pre class="variables-content">{{ extractedTemplateVariables }}</pre>
                <div class="variables-edit">
                  <div class="edit-title">编辑示例数据</div>
                  <el-input v-model="templatePreviewData" type="textarea" :rows="6" placeholder='{"key": "value"}' />
                  <div class="preview-actions">
                    <el-button type="primary" @click="updateTemplatePreview">更新预览</el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 效果预览视图 -->
            <div v-if="templateViewTab === 'preview'" class="template-preview-panel">
              <div class="template-preview-container">
                <div class="template-preview-content" v-html="templateRenderedHtml"></div>
              </div>
            </div>
          </div>
          <template #footer>
            <el-button @click="templateViewVisible = false">关闭</el-button>
            <el-button type="primary" @click="handleEditTemplateFromView">编辑</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- 接口管理 -->
      <el-tab-pane label="接口管理" name="api">
        <div class="action-bar">
          <el-input v-model="apiQueryParams.keyword" placeholder="搜索接口名称/路径" clearable
            @keyup.enter="getApis" />
          <el-button type="primary" @click="getApis">查询</el-button>
          <el-button @click="resetApiQuery">重置</el-button>
          <div class="spacer"></div>
          <el-button type="primary" @click="handleAddApi">新增接口</el-button>
        </div>

        <div class="table-container">
        <el-table :data="filteredApis" border stripe style="width: 100%">
          <el-table-column prop="name" label="接口名称" min-width="150" />
          <el-table-column prop="path" label="接口路径" min-width="300">
            <template #default="scope">
              <span class="api-path">{{ scope.row.path }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip class-name="hide-on-mobile" />
          <el-table-column label="创建时间" width="170" class-name="hide-on-mobile">
            <template #default="scope">
              <span>{{ formatCreateTime(scope.row.create_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250" align="center">
            <template #default="scope">
              <el-button size="small" type="success" @click="handleTestApi(scope.row)" :loading="scope.row.testing">
                测试
              </el-button>
              <el-button size="small" type="primary" @click="handleEditApi(scope.row)">修改</el-button>
              <el-button size="small" type="danger" @click="handleDeleteApi(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        </div>

        <!-- 手机端接口卡片 -->
        <div class="mobile-api-cards">
          <div v-for="item in filteredApis" :key="item.id" class="mobile-card">
            <div class="card-title">{{ item.name }}</div>
            <div class="card-row" style="word-break:break-all;"><span class="card-label">路径</span><span class="api-path">{{ item.path }}</span></div>
            <div class="card-row" v-if="item.description"><span class="card-label">描述</span>{{ item.description }}</div>
            <div class="card-actions">
              <el-button size="small" type="success" @click="handleTestApi(item)" :loading="item.testing">测试</el-button>
              <el-button size="small" type="primary" @click="handleEditApi(item)">修改</el-button>
              <el-button size="small" type="danger" @click="handleDeleteApi(item.id)">删除</el-button>
            </div>
          </div>
        </div>

        <!-- 接口新增/编辑弹窗 -->
        <el-dialog v-model="apiDialogVisible" :title="isApiEdit ? '修改接口' : '新增接口'" width="600px">
          <el-form :model="apiForm" ref="apiFormRef" label-width="100px">
            <el-form-item label="接口名称" prop="name" required>
              <el-input v-model="apiForm.name" placeholder="请输入接口名称，如：获取用户信息" />
            </el-form-item>
            <el-form-item label="接口路径" prop="path" required>
              <el-input v-model="apiForm.path" placeholder="请输入接口路径，如：https://api.example.com/users" />
              <span class="form-tip">支持 GET 请求的 HTTP/HTTPS URL</span>
            </el-form-item>
            <el-form-item label="描述" prop="description">
              <el-input v-model="apiForm.description" type="textarea" :rows="3" placeholder="请输入接口描述（可选）" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="apiDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSubmitApi">确认</el-button>
          </template>
        </el-dialog>

        <!-- 接口测试结果弹窗 -->
        <el-dialog v-model="testResultVisible" title="接口测试结果" width="700px">
          <div class="test-result">
            <div class="result-header">
              <el-tag :type="testResultData.error ? 'danger' : 'success'">
                {{ testResultData.error ? '失败' : '成功' }}
              </el-tag>
              <span v-if="testResultData.status" class="status-text">HTTP {{ testResultData.status }} {{ testResultData.statusText }}</span>
              <span v-if="testResultData.duration" class="duration-text">耗时: {{ testResultData.duration }}ms</span>
            </div>
            <div v-if="testResultData.error" class="error-info">
              <div class="error-label">错误信息:</div>
              <pre class="error-content">{{ testResultData.error }}</pre>
            </div>
            <div v-if="testResultData.body" class="response-body">
              <div class="body-label">
                响应内容:
                <el-button type="primary" size="small" @click="handleCopyResult" class="copy-btn">复制</el-button>
              </div>
              <pre class="body-content">{{ typeof testResultData.body === 'object' ? JSON.stringify(testResultData.body, null, 2) : testResultData.body }}</pre>
            </div>
          </div>
          <template #footer>
            <el-button type="primary" @click="testResultVisible = false">关闭</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>

    <!-- 订阅弹窗 -->
    <el-dialog v-model="subscriptionDialogVisible" :title="isSubscriptionEdit ? '修改订阅' : '新增订阅'" width="600px">
      <el-form :model="subscriptionForm" ref="subscriptionFormRef" label-width="100px">
        <el-form-item label="任务名称" prop="name" required>
          <el-input v-model="subscriptionForm.name" placeholder="请输入任务名称" />
        </el-form-item>

        <el-form-item label="推送类型" prop="type" required>
          <el-radio-group v-model="subscriptionForm.type" @change="handleSubscriptionTypeChange">
            <el-radio label="once">一次性</el-radio>
            <el-radio label="periodic">周期性</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="subscriptionForm.type === 'once'" label="发送时间" prop="send_time" required>
          <el-date-picker v-model="subscriptionForm.send_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择发送时间" style="width: 100%" />
        </el-form-item>

        <template v-if="subscriptionForm.type === 'periodic'">
          <el-form-item label="选择星期" prop="week_days" required>
            <el-checkbox-group v-model="subscriptionForm.week_days">
              <el-checkbox :label="1">周一</el-checkbox>
              <el-checkbox :label="2">周二</el-checkbox>
              <el-checkbox :label="3">周三</el-checkbox>
              <el-checkbox :label="4">周四</el-checkbox>
              <el-checkbox :label="5">周五</el-checkbox>
              <el-checkbox :label="6">周六</el-checkbox>
              <el-checkbox :label="0">周日</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="每日时间" prop="send_time" required>
            <el-time-picker v-model="subscriptionForm.send_time" value-format="HH:mm:ss" placeholder="选择时间"
              style="width: 100%" />
          </el-form-item>
        </template>

        <el-form-item label="推送邮箱" prop="email" required>
          <el-select v-model="subscriptionForm.email" placeholder="请选择或输入邮箱" filterable allow-create clearable
            style="width: 100%">
            <el-option v-for="mail in mailList" :key="mail.id" :label="mail.address" :value="mail.address" />
          </el-select>
        </el-form-item>

        <el-form-item label="选择模板" prop="template" required>
          <el-select v-model="subscriptionForm.template" placeholder="请选择模板" style="width: 100%">
            <el-option v-for="tpl in templateList" :key="tpl.name" :label="tpl.name" :value="tpl.name" />
          </el-select>
        </el-form-item>

        <el-form-item label="选择接口" prop="api_id" required>
          <el-select v-model="subscriptionForm.api_id" placeholder="请选择接口" style="width: 100%">
            <el-option v-for="api in apiList" :key="api.id" :label="api.name" :value="api.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="subscriptionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitSubscription">确认</el-button>
      </template>
    </el-dialog>

    <!-- 邮箱弹窗 -->
    <el-dialog v-model="mailDialogVisible" :title="isMailEdit ? '修改邮箱' : '新增邮箱'" width="500px">
      <el-form :model="mailForm" ref="mailFormRef" label-width="80px">
        <el-form-item label="名称" prop="name" required>
          <el-input v-model="mailForm.name" placeholder="请输入名称，如：个人邮箱" />
        </el-form-item>
        <el-form-item label="地址" prop="address" required>
          <el-input v-model="mailForm.address" placeholder="请输入邮箱地址" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="mailForm.type" placeholder="选择类型" style="width: 100%">
            <el-option label="个人" value="personal" />
            <el-option label="工作" value="work" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="mailDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitMail">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('subscription')

// ===== 模板相关 =====
const templateList = ref([])
const templateDialogVisible = ref(false)
const templateViewVisible = ref(false)
const templateViewTab = ref('code')
const isTemplateEdit = ref(false)
const currentTemplate = ref(null)
const templatePreviewData = ref('{}')
const templateRenderedHtml = ref('')

const templateQueryParams = reactive({
  keyword: ''
})

const templateForm = reactive({
  name: '',
  content: ''
})

const filteredTemplates = computed(() => {
  if (!templateQueryParams.keyword) return templateList.value
  return templateList.value.filter(item => item.name.includes(templateQueryParams.keyword))
})

// 提取 EJS 模板中的变量
const extractedTemplateVariables = computed(() => {
  if (!currentTemplate.value?.content) return '{}'

  const content = currentTemplate.value.content
  const regularVars = new Set()
  const arrayVars = new Set()
  const loopVars = new Set()

  const forEachPattern = /(\w+)\.forEach\s*\(\s*function\s*\(\s*(\w+)\s*\)/g
  let match
  while ((match = forEachPattern.exec(content)) !== null) {
    arrayVars.add(match[1])
    loopVars.add(match[2])
  }

  const forOfPattern = /for\s*\(\s*(?:let|const|var)\s+(\w+)\s+of\s+(\w+)/g
  while ((match = forOfPattern.exec(content)) !== null) {
    arrayVars.add(match[2])
    loopVars.add(match[1])
  }

  const lengthPattern = /(\w+)\.length/g
  while ((match = lengthPattern.exec(content)) !== null) {
    if (!loopVars.has(match[1])) {
      arrayVars.add(match[1])
    }
  }

  const arrayAccessPattern = /(\w+)\[[\w]+\]/g
  while ((match = arrayAccessPattern.exec(content)) !== null) {
    if (!loopVars.has(match[1])) {
      arrayVars.add(match[1])
    }
  }

  const outputPattern = /<%[=-]\s+(\w+)/g
  while ((match = outputPattern.exec(content)) !== null) {
    const varName = match[1]
    if (!loopVars.has(varName)) {
      regularVars.add(varName)
    }
  }

  arrayVars.forEach(v => regularVars.delete(v))

  if (regularVars.size === 0 && arrayVars.size === 0) {
    return '{\n  "暂无变量"\n}'
  }

  const orderedResult = {}
  regularVars.forEach(v => { orderedResult[v] = "" })
  arrayVars.forEach(v => { orderedResult[v] = [""] })

  return JSON.stringify(orderedResult, null, 2)
})

const formatTemplateSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatTemplateDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, '0')}-${(d.getDate() + '').padStart(2, '0')} ${(d.getHours() + '').padStart(2, '0')}:${(d.getMinutes() + '').padStart(2, '0')}`
}

const getTemplates = async () => {
  try {
    const { data } = await axios.get('/api/templates')
    if (data.code === 200) {
      templateList.value = data.list
    }
  } catch (err) {
    ElMessage.error('获取模板列表失败')
  }
}

const handleAddTemplate = () => {
  isTemplateEdit.value = false
  templateForm.name = ''
  templateForm.content = ''
  templateDialogVisible.value = true
}

const handleViewTemplate = async (row) => {
  try {
    const { data } = await axios.get(`/api/template/${row.name}`)
    if (data.code === 200) {
      currentTemplate.value = data
      templateViewVisible.value = true
    }
  } catch (err) {
    ElMessage.error('获取模板内容失败')
  }
}

const handleEditTemplate = async (row) => {
  try {
    const { data } = await axios.get(`/api/template/${row.name}`)
    if (data.code === 200) {
      isTemplateEdit.value = true
      templateForm.name = data.name
      templateForm.content = data.content
      templateDialogVisible.value = true
    }
  } catch (err) {
    ElMessage.error('获取模板内容失败')
  }
}

const handleEditTemplateFromView = () => {
  isTemplateEdit.value = true
  templateForm.name = currentTemplate.value.name
  templateForm.content = currentTemplate.value.content
  templateViewVisible.value = false
  templateDialogVisible.value = true
}

// 更新模板预览
const updateTemplatePreview = () => {
  try {
    const data = JSON.parse(templatePreviewData.value)
    // 先切换到预览视图
    templateViewTab.value = 'preview'
    // 使用后端 API 渲染模板
    axios.post('/api/template/render', {
      template: currentTemplate.value.name,
      data: data
    }).then(res => {
      if (res.data.code === 200) {
        templateRenderedHtml.value = res.data.html
      } else {
        templateRenderedHtml.value = '<div style="color: red; padding: 20px;">渲染失败: ' + (res.data.message || '未知错误') + '</div>'
      }
    }).catch(err => {
      templateRenderedHtml.value = '<div style="color: red; padding: 20px;">请求失败: ' + err.message + '</div>'
    })
  } catch {
    ElMessage.warning('示例数据格式错误，请输入正确的 JSON')
  }
}

const handleSubmitTemplate = async () => {
  if (!templateForm.name) {
    return ElMessage.warning('请输入模板名称')
  }
  if (!templateForm.name.endsWith('.ejs')) {
    return ElMessage.warning('文件名必须以 .ejs 结尾')
  }
  if (!templateForm.content) {
    return ElMessage.warning('请输入模板内容')
  }

  try {
    if (isTemplateEdit.value) {
      await axios.put(`/api/template/${templateForm.name}`, { content: templateForm.content })
      ElMessage.success('更新成功')
    } else {
      await axios.post('/api/template', { name: templateForm.name, content: templateForm.content })
      ElMessage.success('创建成功')
    }
    templateDialogVisible.value = false
    getTemplates()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  }
}

const handleDeleteTemplate = async (name) => {
  try {
    await ElMessageBox.confirm(`确定删除模板 "${name}"？`, '提示', { type: 'warning' })
    await axios.delete(`/api/template/${name}`)
    ElMessage.success('删除成功')
    getTemplates()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || '删除失败')
    }
  }
}

// ===== 订阅相关 =====
const subscriptions = ref([])
const subscriptionDialogVisible = ref(false)
const isSubscriptionEdit = ref(false)
const subscriptionFormRef = ref(null)

const queryParams = reactive({
  keyword: '',
  status: ''
})

const subscriptionForm = reactive({
  id: null,
  name: '',
  type: 'once',
  send_time: '',
  week_days: [],
  email: '',
  template: 'welcome.ejs',
  api_id: null,
  status: 1
})

const filteredSubscriptions = computed(() => {
  let data = [...subscriptions.value]
  if (queryParams.keyword) {
    data = data.filter(item => item.name.includes(queryParams.keyword))
  }
  if (queryParams.status !== '') {
    data = data.filter(item => item.status === queryParams.status)
  }
  return data
})

const formatWeekDays = (weekDays) => {
  const map = { 0: '周日', 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六' }
  return weekDays.map(d => map[d]).join('、')
}

// 格式化执行时间
const formatExecTime = (row) => {
  if (row.type === 'once') {
    // 一次性：显示完整的日期时间
    return formatDateTime(row.send_time)
  } else {
    // 周期性：显示 周几 + 时间
    const weekStr = formatWeekDays(row.week_days || [])
    const timeStr = formatTime(row.send_time)
    return `${weekStr} ${timeStr}`
  }
}

// 格式化日期时间
const formatDateTime = (time) => {
  if (!time) return '-'
  const d = new Date(time)
  const y = d.getFullYear()
  const m = (d.getMonth() + 1 + '').padStart(2, '0')
  const day = (d.getDate() + '').padStart(2, '0')
  const h = (d.getHours() + '').padStart(2, '0')
  const min = (d.getMinutes() + '').padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

// 格式化时间（只有时间部分）
const formatTime = (time) => {
  if (!time) return '-'
  // time 可能是 "HH:mm:ss" 格式
  const parts = time.split(':')
  return `${parts[0]}:${parts[1]}`
}

// 格式化创建时间
const formatCreateTime = (time) => {
  if (!time) return '-'
  const d = new Date(time)
  const y = d.getFullYear()
  const m = (d.getMonth() + 1 + '').padStart(2, '0')
  const day = (d.getDate() + '').padStart(2, '0')
  const h = (d.getHours() + '').padStart(2, '0')
  const min = (d.getMinutes() + '').padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const handleSubscriptionTypeChange = () => {
  subscriptionForm.send_time = ''
  subscriptionForm.week_days = []
}

const getSubscriptions = async () => {
  const { data } = await axios.get('/api/subscriptions')
  if (data.code === 200) {
    subscriptions.value = data.list
  }
}

const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.status = ''
}

const handleAddSubscription = () => {
  isSubscriptionEdit.value = false
  Object.assign(subscriptionForm, {
    id: null, name: '', type: 'once', send_time: '', week_days: [],
    email: '', template: 'welcome.ejs', api_id: null, status: 1
  })
  subscriptionDialogVisible.value = true
}

const handleEditSubscription = (row) => {
  isSubscriptionEdit.value = true
  subscriptionForm.id = row.id
  subscriptionForm.name = row.name
  subscriptionForm.type = row.type
  subscriptionForm.send_time = row.send_time
  subscriptionForm.week_days = [...(row.week_days || [])]
  subscriptionForm.email = row.email
  subscriptionForm.template = row.template || 'welcome.ejs'
  subscriptionForm.api_id = row.api_id || null
  subscriptionForm.status = row.status
  subscriptionDialogVisible.value = true
}

const handleSubmitSubscription = async () => {
  if (!subscriptionForm.name || !subscriptionForm.email) {
    return ElMessage.warning('请完善必填项')
  }
  if (!subscriptionForm.template) {
    return ElMessage.warning('请选择模板')
  }
  if (!subscriptionForm.api_id) {
    return ElMessage.warning('请选择接口')
  }
  if (subscriptionForm.type === 'once' && !subscriptionForm.send_time) {
    return ElMessage.warning('请选择发送时间')
  }
  if (subscriptionForm.type === 'periodic' && subscriptionForm.week_days.length === 0) {
    return ElMessage.warning('请选择至少一天')
  }
  if (subscriptionForm.type === 'periodic' && !subscriptionForm.send_time) {
    return ElMessage.warning('请选择每日发送时间')
  }

  const payload = {
    name: subscriptionForm.name,
    type: subscriptionForm.type,
    send_time: subscriptionForm.send_time,
    week_days: subscriptionForm.type === 'periodic' ? subscriptionForm.week_days : [],
    email: subscriptionForm.email,
    template: subscriptionForm.template,
    api_id: subscriptionForm.api_id,
    status: subscriptionForm.status !== undefined ? subscriptionForm.status : 1
  }

  try {
    if (isSubscriptionEdit.value) {
      await axios.put(`/api/subscription/update/${subscriptionForm.id}`, payload)
      ElMessage.success('修改成功')
    } else {
      await axios.post('/api/subscription/add', payload)
      ElMessage.success('创建成功')
    }
    subscriptionDialogVisible.value = false
    getSubscriptions()
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

const handleToggleSubscription = async (row) => {
  try {
    await axios.post(`/api/subscription/toggle/${row.id}`)
    ElMessage.success(row.status === 1 ? '已启用' : '已停用')
  } catch {
    row.status = row.status === 1 ? 0 : 1
    ElMessage.error('操作失败')
  }
}

const handleDeleteSubscription = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该订阅任务？', '提示', { type: 'warning' })
    await axios.delete(`/api/subscription/delete/${id}`)
    ElMessage.success('删除成功')
    getSubscriptions()
  } catch {
    // 取消不提示
  }
}

// 根据接口ID获取接口名称
const getApiNameById = (apiId) => {
  if (!apiId) return '-'
  const api = apiList.value.find(item => item.id === apiId)
  return api ? api.name : '-'
}

// ===== 邮箱相关 =====
const mailList = ref([])
const mailDialogVisible = ref(false)
const isMailEdit = ref(false)
const mailFormRef = ref(null)

const mailQueryParams = reactive({
  keyword: '',
  type: ''
})

const mailForm = reactive({
  id: null,
  name: '',
  address: '',
  type: 'personal'
})

const filteredMails = computed(() => {
  let data = [...mailList.value]
  if (mailQueryParams.keyword) {
    const kw = mailQueryParams.keyword.toLowerCase()
    data = data.filter(item =>
      item.name.toLowerCase().includes(kw) ||
      item.address.toLowerCase().includes(kw)
    )
  }
  if (mailQueryParams.type) {
    data = data.filter(item => item.type === mailQueryParams.type)
  }
  return data
})

const getMailTypeName = (type) => {
  const map = { personal: '个人', work: '工作', other: '其他' }
  return map[type] || type
}

const getMailTypeTag = (type) => {
  const map = { personal: '', work: 'success', other: 'info' }
  return map[type] || 'default'
}

const getMails = async () => {
  const { data } = await axios.get('/api/mails')
  if (data.code === 200) {
    mailList.value = data.list
  }
}

const resetMailQuery = () => {
  mailQueryParams.keyword = ''
  mailQueryParams.type = ''
}

const handleAddMail = () => {
  isMailEdit.value = false
  Object.assign(mailForm, { id: null, name: '', address: '', type: 'personal' })
  mailDialogVisible.value = true
}

const handleEditMail = (row) => {
  isMailEdit.value = true
  mailForm.id = row.id
  mailForm.name = row.name
  mailForm.address = row.address
  mailForm.type = row.type || 'personal'
  mailDialogVisible.value = true
}

const handleSubmitMail = async () => {
  if (!mailForm.name || !mailForm.address) {
    return ElMessage.warning('请完善必填项')
  }

  try {
    if (isMailEdit.value) {
      await axios.put(`/api/mail/update/${mailForm.id}`, {
        name: mailForm.name,
        address: mailForm.address,
        type: mailForm.type
      })
      ElMessage.success('修改成功')
    } else {
      await axios.post('/api/mail/add', {
        name: mailForm.name,
        address: mailForm.address,
        type: mailForm.type
      })
      ElMessage.success('创建成功')
    }
    mailDialogVisible.value = false
    getMails()
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

const handleDeleteMail = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该邮箱？', '提示', { type: 'warning' })
    await axios.delete(`/api/mail/delete/${id}`)
    ElMessage.success('删除成功')
    getMails()
  } catch (err) {
    if (err !== 'cancel' && err.response?.data?.message) {
      ElMessage.error(err.response.data.message)
    }
  }
}

// ===== 接口管理相关 =====
const apiList = ref([])
const apiDialogVisible = ref(false)
const isApiEdit = ref(false)
const apiFormRef = ref(null)
const testResultVisible = ref(false)
const testResultData = ref({})

const apiQueryParams = reactive({
  keyword: ''
})

const apiForm = reactive({
  id: null,
  name: '',
  path: '',
  description: ''
})

const filteredApis = computed(() => {
  let data = [...apiList.value]
  if (apiQueryParams.keyword) {
    const kw = apiQueryParams.keyword.toLowerCase()
    data = data.filter(item =>
      item.name.toLowerCase().includes(kw) ||
      item.path.toLowerCase().includes(kw)
    )
  }
  return data
})

const getApis = async () => {
  try {
    const { data } = await axios.get('/api/apis')
    if (data.code === 200) {
      apiList.value = data.list
    }
  } catch (err) {
    ElMessage.error('获取接口列表失败')
  }
}

const resetApiQuery = () => {
  apiQueryParams.keyword = ''
}

const handleAddApi = () => {
  isApiEdit.value = false
  Object.assign(apiForm, { id: null, name: '', path: '', description: '' })
  apiDialogVisible.value = true
}

const handleEditApi = (row) => {
  isApiEdit.value = true
  apiForm.id = row.id
  apiForm.name = row.name
  apiForm.path = row.path
  apiForm.description = row.description || ''
  apiDialogVisible.value = true
}

const handleSubmitApi = async () => {
  if (!apiForm.name || !apiForm.path) {
    return ElMessage.warning('请完善必填项')
  }

  try {
    if (isApiEdit.value) {
      await axios.put(`/api/api/update/${apiForm.id}`, {
        name: apiForm.name,
        path: apiForm.path,
        description: apiForm.description
      })
      ElMessage.success('修改成功')
    } else {
      await axios.post('/api/api/add', {
        name: apiForm.name,
        path: apiForm.path,
        description: apiForm.description
      })
      ElMessage.success('创建成功')
    }
    apiDialogVisible.value = false
    getApis()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  }
}

const handleDeleteApi = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该接口？', '提示', { type: 'warning' })
    await axios.delete(`/api/api/delete/${id}`)
    ElMessage.success('删除成功')
    getApis()
  } catch (err) {
    if (err !== 'cancel' && err.response?.data?.message) {
      ElMessage.error(err.response.data.message)
    }
  }
}

const handleTestApi = async (row) => {
  row.testing = true
  testResultData.value = {}
  testResultVisible.value = true

  try {
    const { data } = await axios.post(`/api/api/test/${row.id}`)
    if (data.code === 200) {
      testResultData.value = data.data
    } else {
      testResultData.value = { error: data.message || '测试失败' }
    }
  } catch (err) {
    testResultData.value = { error: err.message || '请求失败' }
  } finally {
    row.testing = false
  }
}

const handleCopyResult = async () => {
  const content = typeof testResultData.value.body === 'object'
    ? JSON.stringify(testResultData.value.body, null, 2)
    : testResultData.value.body
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('复制成功')
  } catch {
    ElMessage.error('复制失败')
  }
}

onMounted(() => {
  getSubscriptions()
  getMails()
  getTemplates()
  getApis()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
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
}

.spacer {
  flex: 1;
}

.main-tabs {
  background: transparent;
}

:deep(.el-tabs__content) {
  padding: 0;
}

.template-name {
  font-weight: 500;
  color: #409eff;
}

.viewer-tabs {
  padding: 10px 15px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

.variables-edit {
  padding: 15px;
  border-top: 1px solid #3d3d3d;
}

.edit-title {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}

/* 模板效果预览样式 */
.template-preview-panel {
  background: #ffffff;
  min-height: 400px;
  overflow: hidden;
}

.template-preview-header {
  padding: 12px 15px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-preview-label {
  color: #666;
  font-size: 13px;
}

.template-preview-container {
  padding: 20px;
  background: #ffffff;
  min-height: 350px;
  max-height: 400px;
  overflow: auto;
}

.template-preview-content {
  color: #333;
  max-width: 600px;
  margin: 0 auto;
}

.template-preview-content :deep(h1) {
  font-size: 24px;
  color: #333;
  margin: 0 0 15px 0;
}

.template-preview-content :deep(p) {
  margin: 10px 0;
}

.template-preview-content :deep(ul),
.template-preview-content :deep(ol) {
  padding-left: 20px;
}

.template-preview-content :deep(li) {
  margin: 5px 0;
}

.preview-panel {
  background: #1e1e1e;
  min-height: 400px;
  overflow: hidden;
}

.preview-container {
  padding: 20px;
  background: #ffffff;
  min-height: 350px;
  max-height: 400px;
  overflow: auto;
  box-sizing: border-box;
}

.preview-header {
  padding: 12px 15px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-label {
  color: #909399;
  font-size: 13px;
}

.preview-content {
  color: #333;
  max-width: 600px;
  margin: 0 auto;
}

.preview-content :deep(h1),
.preview-content :deep(h2),
.preview-content :deep(h3) {
  color: #333;
}

.preview-content :deep(h1) {
  font-size: 24px;
}

.preview-content :deep(p) {
  margin: 10px 0;
}

.preview-content :deep(ul),
.preview-content :deep(ol) {
  padding-left: 20px;
}

.preview-content :deep(li) {
  margin: 5px 0;
}

.form-tip {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.template-viewer {
  background: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
}

.viewer-header {
  background: #2d2d2d;
  padding: 10px 15px;
  border-bottom: 1px solid #3d3d3d;
  display: flex;
  align-items: center;
  gap: 10px;
}

.viewer-header .template-name {
  color: #e0e0e0;
}

.viewer-body {
  display: flex;
  max-height: 500px;
}

.variables-panel {
  width: 200px;
  border-right: 1px solid #3d3d3d;
  background: #252526;
}

.viewer-body-code {
  display: flex;
  max-height: 500px;
}

.variables-panel-full {
  width: 320px;
  border-left: 1px solid #3d3d3d;
  background: #252526;
  display: flex;
  flex-direction: column;
}

.variables-panel-full .panel-title {
  flex-shrink: 0;
}

.variables-panel-full .variables-content {
  flex-shrink: 0;
  max-height: 120px;
}

.variables-edit {
  padding: 15px;
  border-top: 1px solid #3d3d3d;
  flex: 1;
  overflow: auto;
}

.preview-actions {
  margin-top: 10px;
}

.content-panel-full {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.content-panel-full .panel-title {
  flex-shrink: 0;
}

.content-panel-full .viewer-content {
  flex: 1;
  overflow: auto;
  max-height: 480px;
}

.panel-title {
  padding: 10px 15px;
  font-size: 13px;
  color: #858585;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

.variables-content {
  margin: 0;
  padding: 15px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #4ec9b0;
  background: #252526;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 450px;
}

.content-panel {
  flex: 1;
}

.content-panel .viewer-content {
  max-height: 450px;
}

.viewer-content {
  margin: 0;
  padding: 15px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #d4d4d4;
  background: #1e1e1e;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 深色编辑器样式 */
:deep(.el-textarea__inner) {
  background-color: #1e1e1e !important;
  color: #d4d4d4 !important;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
}

/* 接口管理样式 */
.api-path {
  color: #67c23a;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.test-result {
  background: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
}

.result-header {
  padding: 12px 15px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-text {
  color: #909399;
  font-size: 13px;
}

.duration-text {
  color: #909399;
  font-size: 13px;
  margin-left: auto;
}

.error-info {
  padding: 15px;
}

.error-label,
.body-label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.copy-btn {
  padding: 2px 10px;
  font-size: 12px;
}

.error-content {
  margin: 0;
  padding: 12px;
  background: #2d1f1f;
  border-radius: 4px;
  color: #f56c6c;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
}

.response-body {
  padding: 15px;
}

.body-content {
  margin: 0;
  padding: 12px;
  background: #252526;
  border-radius: 4px;
  color: #d4d4d4;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow: auto;
}

.mobile-subscription-cards,
.mobile-mail-cards,
.mobile-template-cards,
.mobile-api-cards {
  display: none;
}

.mobile-card {
  background: #1e293b;
  border-radius: 8px;
  padding: 14px;
  border: 1px solid #334155;
  margin-bottom: 10px;
}
.mobile-card .card-title {
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 8px;
}
.mobile-card .card-row {
  font-size: 13px;
  color: #cbd5e1;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.mobile-card .card-label {
  color: #94a3b8;
  min-width: 60px;
  flex-shrink: 0;
}
.mobile-card .card-actions {
  display: flex;
  gap: 6px;
  padding-top: 10px;
  margin-top: 6px;
  border-top: 1px solid #334155;
}

@media (max-width: 768px) {
  .table-container {
    display: none;
  }
  .action-bar {
    flex-wrap: wrap;
  }
  .action-btn {
    padding: 5px 8px;
    font-size: 12px;
  }
  .mobile-subscription-cards,
  .mobile-mail-cards,
  .mobile-template-cards,
  .mobile-api-cards {
    display: flex;
    flex-direction: column;
  }
}
</style>
