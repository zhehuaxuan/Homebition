<style>@import './index.css';</style>
<script setup></script>

<template>
 <!-- 顶部导航栏 -->
 <nav>
        <div class="nav-brand">Homebition</div>
        <ul class="nav-links">
            <li><a href="#">首页</a></li>
            <li><a href="#">我的文章</a></li>
            <li><a href="#">关于我</a></li>
        </ul>
        <div class="nav-actions">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
        </div>
    </nav>

    <!-- 主体内容 -->
    <div class="container">
        <!-- 左侧个人信息 -->
        <div class="profile-section">
            <img src="./images/Avatar.jpeg" alt="Rick Li Avatar" class="avatar">
            <h2 class="profile-name">Edword Xuan</h2>
            <p class="profile-degree">软件工程 硕士</p>
            <p class="profile-school">西南交通大学</p>
            <div class="profile-links">
                <a href="mailto:your@email.com" title="Email"><i class="fas fa-envelope"></i></a>
                <a href="https://github.com" target="_blank" title="GitHub"><i class="fab fa-github"></i></a>
                <a href="#" title="CV"><i class="fas fa-file-alt"></i></a>
            </div>
        </div>

        <!-- 右侧内容 -->
        <div class="content-section">
            <div class="biography">
                <h1>关于我</h1>
                <p>
                    Hi there, I am Rick Li! Currently I am on MSc program in Rootics at TU Delft, Netherland.
                    Before this I completed my BEng in Nanjing University of Aeronautics and Astronautics. I
                    prefer to seek PhD opportunity after my Master study. My research interests include robot
                    perception, computer vision and autonomous system.
                </p>
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
                            <span class="edu-degree">软件工程师, 2017 ~2026</span>
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

    <!-- 作品展示区 -->
    <div class="work-section">
        <h2 class="work-title">在这里能做什么</h2>
        <div style="text-align: center; margin-bottom: 1rem;">
            <span style="color: var(--accent); font-size: 1.2rem;">⚡</span>
        </div>
        <div class="work-grid">
            <!-- Larkmap -->
            <div class="work-card">
                <div class="work-icon" style="background-color: #7b61ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fas fa-compass"></i>
                </div>
                <div class="work-content">
                    <div class="work-name">Larkmap</div>
                    <div class="work-desc">设计常用的工具、网站导航</div>
                </div>
                <span class="work-arrow">→</span>
            </div>

            <!-- Qinglcon -->
            <div class="work-card">
                <div class="work-icon" style="background-color: #00c853; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fas fa-phone"></i>
                </div>
                <div class="work-content">
                    <div class="work-name">Qinglcon</div>
                    <div class="work-desc">2200+ 填充、双色型图标</div>
                </div>
            </div>

            <!-- Fljicon -->
            <div class="work-card">
                <div class="work-icon" style="background-color: #00c853; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fas fa-phone"></i>
                </div>
                <div class="work-content">
                    <div class="work-name">Fljicon</div>
                    <div class="work-desc">Figma 图标库插件</div>
                </div>
            </div>

            <!-- 语雀 -->
            <div class="work-card">
                <div class="work-icon" style="background-color: #00b42a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fas fa-feather"></i>
                </div>
                <div class="work-content">
                    <div class="work-name">语雀</div>
                    <div class="work-desc">12w+ 字经验分享</div>
                </div>
            </div>

            <!-- Github -->
            <div class="work-card">
                <div class="work-icon" style="background-color: #1f2937; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fab fa-github"></i>
                </div>
                <div class="work-content">
                    <div class="work-name">Github</div>
                    <div class="work-desc">日常研究的代码</div>
                </div>
            </div>

            <!-- 公众号 -->
            <div class="work-card">
                <div class="work-icon" style="background-color: #07c160; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fab fa-weixin"></i>
                </div>
                <div class="work-content">
                    <div class="work-name">公众号</div>
                    <div class="work-desc">偶尔会更新的所思所想</div>
                </div>
            </div>

            <!-- Figma -->
            <div class="work-card">
                <div class="work-icon" style="background: linear-gradient(135deg, #f24e1e, #a259ff, #1abcfe, #0acf83); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fas fa-palette"></i>
                </div>
                <div class="work-content">
                    <div class="work-name">Figma</div>
                    <div class="work-desc">无私奉献的设计文件</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
