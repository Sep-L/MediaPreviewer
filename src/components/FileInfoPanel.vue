<script setup lang="ts">
import { ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { MediaFile } from '../types'

const props = defineProps<{
  file: MediaFile | null
}>()

interface ImageInfo {
  width: number
  height: number
  format: string
}

const imageInfo = ref<ImageInfo | null>(null)
const isLoading = ref(false)
const fileStats = ref<{ created: string; modified: string } | null>(null)

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadImageInfo() {
  if (!props.file || props.file.file_type !== 'image') {
    imageInfo.value = null
    fileStats.value = null
    return
  }
  
  isLoading.value = true
  
  try {
    const info = await invoke<ImageInfo>('get_image_info', { 
      filePath: props.file.path 
    })
    imageInfo.value = info
    
    const stats = await invoke<{ created: number; modified: number }>('get_file_stats', {
      filePath: props.file.path
    })
    fileStats.value = {
      created: formatDate(stats.created),
      modified: formatDate(stats.modified)
    }
  } catch (error) {
    console.error('Failed to load image info:', error)
  } finally {
    isLoading.value = false
  }
}

watch(() => props.file, loadImageInfo, { immediate: true })
</script>

<template>
  <div v-if="file" class="info-panel">
    <div class="info-header">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#409EFF">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
      <span>文件详情</span>
    </div>
    
    <div v-if="isLoading" class="info-loading">
      <div class="circular-progress small"></div>
    </div>
    
    <div v-else class="info-content">
      <div class="info-item">
        <span class="info-label">文件名</span>
        <span class="info-value" :title="file.name">{{ file.name }}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">大小</span>
        <span class="info-value">{{ formatFileSize(file.size) }}</span>
      </div>
      
      <div v-if="imageInfo" class="info-item">
        <span class="info-label">尺寸</span>
        <span class="info-value">{{ imageInfo.width }} × {{ imageInfo.height }} px</span>
      </div>
      
      <div v-if="imageInfo" class="info-item">
        <span class="info-label">格式</span>
        <span class="info-value">{{ imageInfo.format.toUpperCase() }}</span>
      </div>
      
      <div v-if="fileStats" class="info-item">
        <span class="info-label">创建时间</span>
        <span class="info-value">{{ fileStats.created }}</span>
      </div>
      
      <div v-if="fileStats" class="info-item">
        <span class="info-label">修改时间</span>
        <span class="info-value">{{ fileStats.modified }}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">路径</span>
        <span class="info-value path" :title="file.path">{{ file.path }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  overflow: hidden;
  min-width: 280px;
  max-width: 320px;
}
.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
.info-loading {
  padding: 24px;
  display: flex;
  justify-content: center;
}
.info-content { padding: 12px; }
.info-item {
  display: flex;
  flex-direction: column;
  padding: 8px 4px;
  border-bottom: 1px solid #f0f0f0;
}
.info-item:last-child { border-bottom: none; }
.info-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.info-value {
  font-size: 13px;
  color: #303133;
  word-break: break-all;
}
.info-value.path {
  font-size: 11px;
  color: #606266;
  background: #f5f7fa;
  padding: 6px 8px;
  border-radius: 4px;
  margin-top: 4px;
}
.circular-progress.small {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-top-color: #409EFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
