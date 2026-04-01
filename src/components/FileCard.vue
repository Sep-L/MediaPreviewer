<script setup lang="ts">
import type { MediaFile } from '../types'

const props = defineProps<{
  file: MediaFile
}>()

const emit = defineEmits<{
  (e: 'click', file: MediaFile): void
  (e: 'contextmenu', event: MouseEvent, file: MediaFile): void
}>()

function isImageFile(file: MediaFile): boolean {
  return file.file_type === 'image'
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function handleClick() {
  emit('click', props.file)
}

function handleContextMenu(event: MouseEvent) {
  emit('contextmenu', event, props.file)
}
</script>

<template>
  <div 
    class="card" 
    :data-file-path="file.path"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <div class="card-media">
      <slot name="image" :file="file">
        <div v-if="isImageFile(file)" class="card-placeholder image-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="imgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.6"/>
                <stop offset="100%" style="stop-color:#60a5fa;stop-opacity:0.4"/>
              </linearGradient>
            </defs>
            <rect width="24" height="24" rx="4" fill="url(#imgGradient)" opacity="0.1"/>
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="#3b82f6" opacity="0.5"/>
          </svg>
        </div>
        <div v-else class="card-placeholder file-placeholder">
          <div class="file-icon-wrapper">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="fileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#f59e0b"/>
                  <stop offset="100%" style="stop-color:#d97706"/>
                </linearGradient>
              </defs>
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="url(#fileGradient)"/>
              <path d="M14 3v5h5" fill="rgba(255,255,255,0.3)"/>
              <text x="12" y="17" text-anchor="middle" fill="white" font-size="6" font-weight="bold">{{ getFileExtension(file.name).toUpperCase().slice(0, 4) }}</text>
            </svg>
          </div>
        </div>
      </slot>
      <!-- 悬停指示器 - 显示在右上角，不遮住图片 -->
      <div class="card-hover-indicator">
        <div class="indicator-content">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          <span>点击预览</span>
        </div>
      </div>
    </div>
    <div class="card-content">
      <div class="card-title" :title="file.name">{{ file.name }}</div>
      <div class="card-subtitle">
        <span class="file-ext">{{ getFileExtension(file.name).toUpperCase() }}</span>
        <span class="file-size">{{ formatFileSize(file.size) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.04);
  position: relative;
}

.card:hover {
  box-shadow:
    0 20px 40px rgba(59, 130, 246, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-6px) scale(1.02);
  border-color: rgba(59, 130, 246, 0.15);
}

.card:active {
  transform: translateY(-3px) scale(0.98);
  transition-duration: 0.1s;
}

.card-media {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  overflow: hidden;
  position: relative;
}

.card-media img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover .card-media img {
  transform: scale(1.08);
}

.card-placeholder { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  width: 100%; 
  height: 100%;
}

.image-placeholder {
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
}

.file-placeholder {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.file-icon-wrapper {
  filter: drop-shadow(0 4px 8px rgba(245, 158, 11, 0.3));
}

/* 悬停指示器 - 底部居中，不遮挡图片 */
.card-hover-indicator {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  pointer-events: none;
}

.card:hover .card-hover-indicator {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.indicator-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.9) 100%);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 24px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  backdrop-filter: blur(12px);
  white-space: nowrap;
}

.indicator-content svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.card-content { 
  padding: 14px 16px;
  position: relative;
  z-index: 2;
  background: #fff;
}

.card-title { 
  font-size: 13px; 
  font-weight: 600; 
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}

.card-subtitle { 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
}

.file-ext {
  background: linear-gradient(135deg, #eff6ff 0%, #fff 100%);
  color: #2563eb;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  border: 1px solid rgba(59, 130, 246, 0.15);
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.05);
}

.file-size {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
}
</style>
