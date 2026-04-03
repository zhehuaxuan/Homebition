<template>
  <div class="page">
    <h3>文章清单</h3>
    <div>
      <!-- 直接用，无需在 script 中 import -->
      <el-table :data="tableData" border style="width: 100%">
        <el-table-column prop="title" label="标题" width="180" />
        <el-table-column prop="tag" label="标签" width="180" />
        <el-table-column prop="lastData" label="最后修改时间" />
        <el-table-column prop="action" label="操作" />
      </el-table>
    </div>
  </div>
</template>


<script setup>
// 模拟表格数据
const tableData = [
  {
    title: '2026-04-01',
    tag: '张三',
    lastData: '北京市朝阳区',
    action:"详情"
  }
]
</script>