import { ref, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { MediaFile } from '../types'
import { logger } from '../utils/logger'

const imageCache = ref<Map<string, string>>(new Map())
const loadingImages = ref<Set<string>>(new Set())

// 加载队列
const pendingLoadQueue: MediaFile[] = []
let isProcessingQueue = false
// 提高并发数：从 4 提升到 16，充分利用多核 CPU 和 I/O 并行
const PRELOAD_BATCH_SIZE = 16

export function useThumbnail() {
  async function loadThumbnail(file: MediaFile): Promise<void> {
    if (imageCache.value.has(file.path) || loadingImages.value.has(file.path)) return
    
    loadingImages.value.add(file.path)
    
    try {
      const data = await invoke<number[]>('get_thumbnail', { 
        filePath: file.path, 
        size: 512
      })
      const uint8Array = new Uint8Array(data)
      const blob = new Blob([uint8Array], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      imageCache.value.set(file.path, url)
    } catch (error) {
      logger.error(`[缩略图] 加载失败: ${file.path}, 错误: ${JSON.stringify(error)}`)
    } finally {
      loadingImages.value.delete(file.path)
    }
  }

  function getImageUrl(file: MediaFile): string {
    return imageCache.value.get(file.path) || ''
  }

  function isImageLoaded(file: MediaFile): boolean {
    return imageCache.value.has(file.path)
  }

  function isImageLoading(file: MediaFile): boolean {
    return loadingImages.value.has(file.path)
  }

  // 处理加载队列 - 按批次并发加载所有图片
  async function processLoadQueue() {
    if (isProcessingQueue) return
    isProcessingQueue = true
    
    while (pendingLoadQueue.length > 0) {
      const batch: MediaFile[] = []
      
      // 按顺序取出批次
      while (batch.length < PRELOAD_BATCH_SIZE && pendingLoadQueue.length > 0) {
        const file = pendingLoadQueue.shift()!
        if (!imageCache.value.has(file.path) && !loadingImages.value.has(file.path)) {
          batch.push(file)
        }
      }
      
      if (batch.length > 0) {
        // 并发加载当前批次
        await Promise.all(batch.map(f => loadThumbnail(f)))
      }
    }
    
    isProcessingQueue = false
  }

  // 加载所有缩略图 - 一次性加载所有图片，不清理已加载的缓存
  function loadAllThumbnails(imageFiles: MediaFile[], _gridSize: number) {
    // 只添加尚未加载的图片到队列
    imageFiles.forEach(file => {
      if (!imageCache.value.has(file.path) && !loadingImages.value.has(file.path)) {
        pendingLoadQueue.push(file)
      }
    })
    
    // 立即开始处理队列
    nextTick(() => {
      processLoadQueue()
    })
  }

  // 清理缓存 - 仅在应用卸载时调用
  function clearCache() {
    imageCache.value.forEach((url) => URL.revokeObjectURL(url))
    imageCache.value.clear()
    loadingImages.value.clear()
    pendingLoadQueue.length = 0
  }

  return {
    imageCache,
    loadingImages,
    loadThumbnail,
    getImageUrl,
    isImageLoaded,
    isImageLoading,
    loadAllThumbnails,
    clearCache
  }
}
