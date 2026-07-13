<template>
     <!-- 主体内容 -->
     <div class="container">
        <!-- 左侧个人信息 -->
        <div class="profile-section">
            <img src="../images/Avatar.jpeg" alt="Rick Li Avatar" class="avatar">
            <h2 class="profile-name">Edword Xuan</h2>
            <p class="profile-degree">软件工程 硕士</p>
            <p class="profile-school">西南交通大学</p>
            <div class="contact-info">
                <div class="contact-item">
                    <el-icon><Message /></el-icon>
                    &nbsp;zhehuaxuan@aliyun.com
                </div>
                <div class="contact-item">
                    <el-icon><Phone /></el-icon>
                    &nbsp;13260721072
                </div>
            </div>
            <div class="profile-links">
                <a href="mailto:zhehuaxuan@aliyun.com" title="Email"><i class="fas fa-envelope"></i></a>
                <a href="https://github.com" target="_blank" title="GitHub"><i class="fab fa-github"></i></a>
                <a href="#" title="CV"><i class="fas fa-file-alt"></i></a>
            </div>
        </div>
        <!-- 右侧内容 -->
        <div class="content-section">
            <div class="biography">
                <h1>关于我</h1>
                <div v-if="profile" v-html="profile"></div>
                <p v-else>暂无个人介绍</p>
            </div>

            <div class="info-grid">
                <!-- 兴趣 -->
                <div class="interests">
                    <h3 class="section-title">兴趣爱好</h3>
                    <ul class="interests-list">
                        <li>人工智能</li>
                        <li>历史，哲学，心理学，投资学</li>
                        <li>思考如何搞钱</li>
                    </ul>
                </div>

                <!-- 教育背景 -->
                <div class="education">
                    <h3 class="section-title">教育及求职经历</h3>
                    <ul class="education-list">
                        <li>
                            <span class="edu-degree">软件工程师, 2017 ~ 至今</span>
                            <span class="edu-school">华为技术有限公司</span>
                        </li>
                        <li>
                            <span class="edu-degree">软件工程硕士, 2014 ~2017</span>
                            <span class="edu-school">西南交通大学</span>
                        </li>
                        <li>
                          <span class="edu-degree">计算机软件本科, 2010 ~2014</span>
                          <span class="edu-school">西南交通大学</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- 友情链接 -->
    <div class="work-section">
        <h2 class="work-title">友情链接</h2>
        <div style="text-align: center; margin-bottom: 1rem;">
            <span style="color: var(--accent); font-size: 1.2rem;">🔗</span>
        </div>
        <div class="work-grid">
            <!-- GitHub -->
            <a href="https://github.com" target="_blank" class="work-card" rel="noopener">
                <div class="work-icon" style="background-color: #1f2937; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fab fa-github"></i>
                </div>
                <div class="work-content">
                    <div class="work-name">GitHub</div>
                    <div class="work-desc">代码托管与开源社区</div>
                </div>
                <span class="work-arrow">→</span>
            </a>

            <!-- IMA -->
            <a href="https://ima.qq.com" target="_blank" class="work-card" rel="noopener">
                <div class="work-icon" style="background-color: #07c160; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    <span style="font-size: 14px;">IMA</span>
                </div>
                <div class="work-content">
                    <div class="work-name">IMA</div>
                    <div class="work-desc">腾讯智能工作台</div>
                </div>
                <span class="work-arrow">→</span>
            </a>

            <!-- 腾讯文档 -->
            <a href="https://docs.qq.com" target="_blank" class="work-card" rel="noopener">
                <div class="work-icon" style="background-color: #0052d9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    <span style="font-size: 14px;">T</span>
                </div>
                <div class="work-content">
                    <div class="work-name">腾讯文档</div>
                    <div class="work-desc">在线文档协作平台</div>
                </div>
                <span class="work-arrow">→</span>
            </a>

            <!-- DeepSeek -->
            <a href="https://chat.deepseek.com" target="_blank" class="work-card" rel="noopener">
                <div class="work-icon" style="background-color: #4f46e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    <span style="font-size: 12px;">DS</span>
                </div>
                <div class="work-content">
                    <div class="work-name">DeepSeek</div>
                    <div class="work-desc">AI 对话与推理助手</div>
                </div>
                <span class="work-arrow">→</span>
            </a>

            <!-- 通义千问 -->
            <a href="https://tongyi.aliyun.com" target="_blank" class="work-card" rel="noopener">
                <div class="work-icon" style="background-color: #ff6a00; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    <span style="font-size: 12px;">QW</span>
                </div>
                <div class="work-content">
                    <div class="work-name">通义千问</div>
                    <div class="work-desc">阿里 AI 大模型助手</div>
                </div>
                <span class="work-arrow">→</span>
            </a>

            <!-- 豆包 -->
            <a href="https://www.doubao.com" target="_blank" class="work-card" rel="noopener">
                <div class="work-icon" style="background-color: #00a854; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    <span style="font-size: 14px;">豆</span>
                </div>
                <div class="work-content">
                    <div class="work-name">豆包</div>
                    <div class="work-desc">字节跳动 AI 对话助手</div>
                </div>
                <span class="work-arrow">→</span>
            </a>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Message, Phone } from '@element-plus/icons-vue'
import axios from 'axios'

const profile = ref('')

const fetchProfile = async () => {
    try {
        const res = await axios.get('/api/auth/profile')
        if (res.data.code === 200) {
            profile.value = res.data.data.profile
        }
    } catch (err) {
        console.error('获取用户信息失败:', err)
    }
}

onMounted(() => {
    fetchProfile()
})
</script>

<style scoped>
.contact-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.contact-link {
    display: flex;
    align-items: center;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.biography {
    max-height: 100px;
    overflow: hidden;
}

@media (max-width: 480px) {
  .avatar {
    width: 140px !important;
    height: 140px !important;
  }
  .profile-name {
    font-size: 1.4rem !important;
  }
  .container {
    padding: 1rem !important;
  }
}
</style>