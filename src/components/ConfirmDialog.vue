<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="confirm-dialog-overlay" @click="handleOverlayClick">
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-dialog-header">
            <div class="confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 class="confirm-title">{{ title }}</h3>
          </div>
          <div class="confirm-dialog-body">
            <p class="confirm-message">{{ message }}</p>
            <div v-if="detail" class="confirm-detail">
              <span class="detail-label">路径：</span>
              <span class="detail-path">{{ detail }}</span>
            </div>
            <p v-if="warning" class="confirm-warning">
              <span class="warning-icon">⚠️</span>
              {{ warning }}
            </p>
          </div>
          <div class="confirm-dialog-footer">
            <button class="btn btn-secondary" @click="handleCancel">
              {{ cancelText }}
            </button>
            <button class="btn btn-danger" @click="handleConfirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  title?: string
  message?: string
  detail?: string
  warning?: string
  confirmText?: string
  cancelText?: string
}

withDefaults(defineProps<Props>(), {
  title: '确认操作',
  message: '您确定要执行此操作吗？',
  detail: '',
  warning: '',
  confirmText: '确认',
  cancelText: '取消'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}

function handleOverlayClick() {
  emit('cancel')
}
</script>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2vw;
}

.confirm-dialog {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  max-width: 480px;
  width: 100%;
  overflow: hidden;
  animation: dialogSlideIn 0.3s ease-out;
}

@keyframes dialogSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.confirm-dialog-header {
  padding: 2.5vh 2vw 1.5vh;
  text-align: center;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.confirm-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 1.5vh;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc2626;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
}

.confirm-icon svg {
  width: 28px;
  height: 28px;
}

.confirm-title {
  font-size: clamp(16px, 1.3vw, 20px);
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.confirm-dialog-body {
  padding: 2vh 2vw;
}

.confirm-message {
  font-size: clamp(13px, 1vw, 15px);
  color: #475569;
  line-height: 1.6;
  margin: 0 0 1.5vh;
  text-align: center;
}

.confirm-detail {
  background: rgba(241, 245, 249, 0.8);
  border-radius: 8px;
  padding: 1.2vh 1vw;
  margin-bottom: 1.5vh;
  font-size: clamp(11px, 0.85vw, 13px);
  word-break: break-all;
}

.detail-label {
  color: #64748b;
  font-weight: 500;
}

.detail-path {
  color: #334155;
  font-family: 'SF Mono', monospace;
}

.confirm-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5vw;
  font-size: clamp(12px, 0.9vw, 14px);
  color: #dc2626;
  font-weight: 600;
  margin: 0;
  padding: 1vh;
  background: rgba(254, 226, 226, 0.5);
  border-radius: 8px;
}

.warning-icon {
  font-size: 16px;
}

.confirm-dialog-footer {
  display: flex;
  gap: 1vw;
  padding: 1.5vh 2vw 2.5vh;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

.btn {
  flex: 1;
  padding: 1.5vh 1.5vw;
  border-radius: 10px;
  font-size: clamp(13px, 1vw, 15px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
}

.btn-secondary {
  background: rgba(241, 245, 249, 0.8);
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: rgba(226, 232, 240, 0.8);
  color: #475569;
  transform: translateY(-1px);
}

.btn-danger {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
}

.btn:active {
  transform: translateY(0) scale(0.98);
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
