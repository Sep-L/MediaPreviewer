import { GRID_GAP, MIN_GRID_SIZE } from '../constants'
import type { FileTypeCount, MediaFile, FolderGroup } from '../types'

// 根据每行图片数量计算 grid 百分比
export function calculatePercentFromImagesPerRow(imagesPerRow: number): number {
  const availableWidth = 100 - GRID_GAP
  return availableWidth / imagesPerRow
}

// 根据当前缩放比例计算 grid 百分比
export function calculateGridPercent(currentZoom: number): number {
  const imagesPerRow = 100 / currentZoom
  return calculatePercentFromImagesPerRow(imagesPerRow)
}

// 根据容器宽度和 grid 百分比计算实际像素值
export function calculateGridSizePx(containerWidth: number, gridPercent: number): number {
  return containerWidth > 0
    ? Math.max(MIN_GRID_SIZE, (gridPercent / 100) * containerWidth)
    : Math.max(MIN_GRID_SIZE, (gridPercent / 100) * window.innerWidth)
}

// 计算文件类型统计
export function calculateFileCountByType(allFiles: MediaFile[]): FileTypeCount {
  const counts: FileTypeCount = { all: allFiles.length, image: 0, other: 0 }
  allFiles.forEach(file => {
    if (file.file_type === 'image') counts.image++
    else counts.other++
  })
  return counts
}

// 排序文件夹组（按层级和路径）
export function sortFolderGroups(groups: FolderGroup[]): FolderGroup[] {
  return [...groups].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.folder_path.localeCompare(b.folder_path)
  })
}

// 筛选文件（按类型）
export function filterFilesByType(groups: FolderGroup[], filter: string): FolderGroup[] {
  if (filter === 'all') return groups
  return groups
    .map(g => ({
      ...g,
      files: g.files.filter(f => f.file_type === filter)
    }))
    .filter(g => g.files.length > 0 || g.level === 1)
}

// 防抖函数
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

// 节流函数
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 检查文件是否为图片
export function isImageFile(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'].includes(ext)
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
