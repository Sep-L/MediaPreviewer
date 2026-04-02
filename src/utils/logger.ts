import { invoke } from '@tauri-apps/api/core'

function sendToBackend(level: string, message: string) {
  invoke('log_frontend', { level, message }).catch(() => {})
}

export const logger = {
  info(msg: string) {
    sendToBackend('info', msg)
  },
  warn(msg: string) {
    sendToBackend('warn', msg)
  },
  error(msg: string) {
    sendToBackend('error', msg)
  },
}
