import { ref } from 'vue'

const RECENT_FOLDERS_KEY = 'recentFolders'
const MAX_RECENT_FOLDERS = 10

export interface RecentFolder {
  path: string
  name: string
  lastAccessed: number
}

const recentFolders = ref<RecentFolder[]>([])

export function useRecentFolders() {
  function loadRecentFolders() {
    try {
      const saved = localStorage.getItem(RECENT_FOLDERS_KEY)
      if (saved) {
        recentFolders.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载最近文件夹失败:', error)
    }
  }

  function saveRecentFolders() {
    localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(recentFolders.value))
  }

  function addToRecentFolders(folderPaths: string[]) {
    const now = Date.now()
    
    folderPaths.forEach(path => {
      const existingIndex = recentFolders.value.findIndex(f => f.path === path)
      if (existingIndex !== -1) {
        recentFolders.value.splice(existingIndex, 1)
      }
      
      const name = path.split('\\').pop() || path.split('/').pop() || path
      recentFolders.value.unshift({
        path,
        name,
        lastAccessed: now
      })
    })
    
    if (recentFolders.value.length > MAX_RECENT_FOLDERS) {
      recentFolders.value = recentFolders.value.slice(0, MAX_RECENT_FOLDERS)
    }
    
    saveRecentFolders()
  }

  function removeFromRecentFolders(path: string) {
    recentFolders.value = recentFolders.value.filter(f => f.path !== path)
    saveRecentFolders()
  }

  return {
    recentFolders,
    loadRecentFolders,
    addToRecentFolders,
    removeFromRecentFolders
  }
}
