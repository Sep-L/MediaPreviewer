import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const value = await invoke<T | null>('get_setting', { key })
    return value !== null && value !== undefined ? value : defaultValue
  } catch {
    return defaultValue
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await invoke('set_setting', { key, value })
}

export function useSetting<T>(key: string, defaultValue: T) {
  const value = ref<T>(defaultValue)

  onMounted(async () => {
    value.value = await getSetting(key, defaultValue)
  })

  async function update(newVal: T) {
    value.value = newVal
    await setSetting(key, newVal)
  }

  return { value, update }
}
