<script setup lang="ts">
import type { RecentFolder } from '../composables/useRecentFolders'

defineProps<{
  recentFolders: RecentFolder[]
}>()

const emit = defineEmits<{
  (e: 'selectFolder', path: string): void
  (e: 'removeRecent', path: string): void
}>()

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<template>
  <div class="empty-state">
    <div class="empty-content">
      <!-- 主图标区域 -->
      <div class="empty-icon-wrapper">
        <div class="empty-icon-bg">
          <div class="empty-icon-glow"></div>
        </div>
        <div class="empty-icon-container">
          <svg class="empty-icon" width="72" height="72" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="folderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#3b82f6"/>
                <stop offset="100%" style="stop-color:#2563eb"/>
              </linearGradient>
            </defs>
            <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z" fill="url(#folderGradient)"/>
            <circle cx="15" cy="13" r="2" fill="white" fill-opacity="0.3"/>
            <circle cx="10" cy="13" r="2" fill="white" fill-opacity="0.3"/>
          </svg>
        </div>
        <!-- 浮动装饰元素 -->
        <div class="floating-element fe-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" opacity="0.6"/>
          </svg>
        </div>
        <div class="floating-element fe-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" opacity="0.5"/>
          </svg>
        </div>
        <div class="floating-element fe-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" opacity="0.4"/>
          </svg>
        </div>
      </div>

      <!-- 文字内容 -->
      <h2 class="empty-title">拖拽文件夹开始预览</h2>
      <p class="empty-subtitle">支持 JPG、PNG、GIF、WebP 等图片格式</p>
      
      <!-- 提示卡片 -->
      <div class="empty-hint">
        <div class="hint-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </div>
        <span>也可拖拽多个文件夹同时预览</span>
      </div>
    </div>
    
    <!-- 最近访问 -->
    <div v-if="recentFolders.length > 0" class="recent-folders">
      <div class="recent-header">
        <div class="recent-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7-7-3.13-7-7-7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
        </div>
        <span>最近访问</span>
      </div>
      <div class="recent-list">
        <div 
          v-for="(folder, index) in recentFolders" 
          :key="folder.path" 
          class="recent-item"
          :style="{ animationDelay: index * 80 + 'ms' }"
          @click="emit('selectFolder', folder.path)"
        >
          <div class="recent-item-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
          </div>
          <div class="recent-item-content">
            <span class="recent-item-name">{{ folder.name }}</span>
            <span class="recent-item-time">{{ formatTime(folder.lastAccessed) }}</span>
          </div>
          <button 
            class="recent-item-remove" 
            @click.stop="emit('removeRecent', folder.path)"
            title="从列表中移除"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 48px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* 图标区域 */
.empty-icon-wrapper {
  position: relative;
  margin-bottom: 40px;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon-bg {
  position: absolute;
  width: 140px;
  height: 140px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(96, 165, 250, 0.1) 50%, rgba(14, 165, 233, 0.05) 100%);
  border-radius: 50%;
  animation: pulse-bg 3s ease-in-out infinite;
}

.empty-icon-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-bg {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

.empty-icon-container {
  position: relative;
  z-index: 2;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #fff 0%, #eff6ff 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 20px 40px rgba(59, 130, 246, 0.2),
    0 0 0 1px rgba(59, 130, 246, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty-icon {
  filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3));
}

/* 浮动装饰元素 */
.floating-element {
  position: absolute;
  animation: float-around 6s ease-in-out infinite;
}

.fe-1 {
  top: 10px;
  right: 20px;
  animation-delay: 0s;
  color: #3b82f6;
}

.fe-2 {
  bottom: 30px;
  left: 15px;
  animation-delay: -2s;
  color: #60a5fa;
}

.fe-3 {
  top: 40px;
  left: 25px;
  animation-delay: -4s;
  color: #0ea5e9;
}

@keyframes float-around {
  0%, 100% { 
    transform: translate(0, 0) rotate(0deg); 
    opacity: 0.6;
  }
  25% { 
    transform: translate(5px, -8px) rotate(5deg); 
    opacity: 0.8;
  }
  50% { 
    transform: translate(0, -5px) rotate(0deg); 
    opacity: 0.6;
  }
  75% { 
    transform: translate(-5px, -8px) rotate(-5deg); 
    opacity: 0.8;
  }
}

/* 文字样式 */
.empty-title { 
  font-size: 26px; 
  font-weight: 700; 
  color: #111827;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #111827 0%, #4b5563 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.empty-subtitle { 
  font-size: 15px; 
  color: #6b7280;
  margin-bottom: 28px;
  font-weight: 500;
}

/* 提示卡片 */
.empty-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(96, 165, 250, 0.04) 100%);
  border-radius: 14px;
  font-size: 14px;
  color: #2563eb;
  font-weight: 600;
  border: 1px solid rgba(59, 130, 246, 0.15);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
}

.hint-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}

/* 最近访问区域 */
.recent-folders {
  width: 100%;
  max-width: 420px;
}

.recent-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.recent-header-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #f3f4f6 0%, #fff 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.recent-list {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  opacity: 0;
  animation: slideUp 0.4s ease-out forwards;
}

.recent-item:last-child { 
  border-bottom: none; 
}

.recent-item:hover { 
  background: rgba(99, 102, 241, 0.04);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.recent-item-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #eff6ff 0%, #fff 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  margin-right: 14px;
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.1);
  transition: all 0.2s;
}

.recent-item:hover .recent-item-icon {
  transform: scale(1.05);
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.recent-item-content {
  flex: 1;
  min-width: 0;
}

.recent-item-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.recent-item:hover .recent-item-name {
  color: #2563eb;
}

.recent-item-time {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 3px;
  font-weight: 500;
}

.recent-item-remove {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  opacity: 0;
  transition: all 0.2s;
}

.recent-item:hover .recent-item-remove { 
  opacity: 1; 
}

.recent-item-remove:hover { 
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
</style>
