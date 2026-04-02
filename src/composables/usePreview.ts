import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { MediaFile } from '../types'
import { logger } from '../utils/logger'

export function usePreview(allFiles: () => MediaFile[]) {
  const previewFile = ref<MediaFile | null>(null)
  const previewImageUrl = ref('')
  const previewZoom = ref(1)
  const previewPosition = ref({ x: 0, y: 0 })
  const isDraggingPreview = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  const isLoadingPreview = ref(false)
  const previewRotation = ref(0)
  
  // 从 localStorage 恢复缩放值
  const savedZoom = ref(parseFloat(localStorage.getItem('previewZoom') || '1'))

  // 当前文件在列表中的索引
  const currentIndex = computed(() => {
    if (!previewFile.value) return -1
    const files = allFiles().filter(f => f.file_type === 'image')
    return files.findIndex(f => f.path === previewFile.value!.path)
  })

  // 所有图片文件
  const imageFiles = computed(() => {
    return allFiles().filter(f => f.file_type === 'image')
  })

  // 是否可以切换
  const canGoPrev = computed(() => currentIndex.value > 0)
  const canGoNext = computed(() => currentIndex.value < imageFiles.value.length - 1)

  async function openPreview(file: MediaFile) {
    if (file.file_type !== 'image') return
    previewFile.value = file
    previewZoom.value = savedZoom.value
    previewPosition.value = { x: 0, y: 0 }
    previewRotation.value = 0
    isLoadingPreview.value = true
    
    try {
      const data = await invoke<number[]>('get_thumbnail', { 
        filePath: file.path, 
        size: 1920
      })
      const uint8Array = new Uint8Array(data)
      const blob = new Blob([uint8Array], { type: 'image/png' })
      previewImageUrl.value = URL.createObjectURL(blob)
    } catch (error) {
      logger.error(`[预览] 加载失败: ${file.path}, 错误: ${JSON.stringify(error)}`)
    } finally {
      isLoadingPreview.value = false
    }
  }

  function closePreview() {
    savedZoom.value = previewZoom.value
    localStorage.setItem('previewZoom', String(previewZoom.value))
    
    if (previewImageUrl.value) {
      URL.revokeObjectURL(previewImageUrl.value)
    }
    previewFile.value = null
    previewImageUrl.value = ''
    previewPosition.value = { x: 0, y: 0 }
    previewRotation.value = 0
  }

  // 切换到上一张
  async function goToPrev() {
    if (!canGoPrev.value) return
    const prevFile = imageFiles.value[currentIndex.value - 1]
    closePreview()
    await openPreview(prevFile)
  }

  // 切换到下一张
  async function goToNext() {
    if (!canGoNext.value) return
    const nextFile = imageFiles.value[currentIndex.value + 1]
    closePreview()
    await openPreview(nextFile)
  }

  function handlePreviewWheel(event: WheelEvent) {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.15 : 0.15
    previewZoom.value = Math.max(0.1, previewZoom.value + delta)
  }

  function resetZoom() {
    previewZoom.value = 1
  }

  function rotateLeft() {
    previewRotation.value = ((previewRotation.value - 90) % 360 + 360) % 360
  }

  function rotateRight() {
    previewRotation.value = (previewRotation.value + 90) % 360
  }

  function startDragPreview(event: MouseEvent) {
    event.preventDefault()
    isDraggingPreview.value = true
    dragStart.value = { x: event.clientX - previewPosition.value.x, y: event.clientY - previewPosition.value.y }
  }

  function onDragPreview(event: MouseEvent) {
    if (!isDraggingPreview.value) return
    const newX = event.clientX - dragStart.value.x
    const newY = event.clientY - dragStart.value.y
    
    // 边界限制：防止图片拖出可视区域太远
    const maxOffset = Math.max(window.innerWidth, window.innerHeight)
    previewPosition.value = {
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    }
  }

  function stopDragPreview() {
    isDraggingPreview.value = false
  }

  // 键盘事件处理
  function handleKeydown(event: KeyboardEvent) {
    if (!previewFile.value) return
    
    switch (event.key) {
      case 'Escape':
        closePreview()
        break
      case 'ArrowLeft':
        goToPrev()
        break
      case 'ArrowRight':
        goToNext()
        break
      case 'f':
      case 'F':
        // 全屏功能可以后续添加
        break
      case 'r':
      case 'R':
        if (event.shiftKey) {
          rotateLeft()
        } else {
          rotateRight()
        }
        break
      case '0':
        resetZoom()
        break
    }
  }

  // 添加全局事件监听
  onMounted(() => {
    window.addEventListener('mousemove', onDragPreview)
    window.addEventListener('mouseup', stopDragPreview)
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', onDragPreview)
    window.removeEventListener('mouseup', stopDragPreview)
    window.removeEventListener('keydown', handleKeydown)
    if (previewImageUrl.value) {
      URL.revokeObjectURL(previewImageUrl.value)
    }
  })

  return {
    previewFile,
    previewImageUrl,
    previewZoom,
    previewPosition,
    isDraggingPreview,
    isLoadingPreview,
    previewRotation,
    currentIndex,
    canGoPrev,
    canGoNext,
    openPreview,
    closePreview,
    goToPrev,
    goToNext,
    handlePreviewWheel,
    resetZoom,
    rotateLeft,
    rotateRight,
    startDragPreview
  }
}
