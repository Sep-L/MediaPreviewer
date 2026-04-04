<template>
  <div class="zoom-step-selector" ref="selectorRef">
    <div 
      class="zoom-step-trigger" 
      @click="isOpen = !isOpen"
      :class="{ 'is-open': isOpen }"
    >
      <input 
        v-model.number="inputValue"
        type="number"
        step="1"
        min="1"
        max="100"
        class="zoom-step-input"
        @change="handleInputChange"
        @click.stop
      />
      <span class="zoom-step-percent">%</span>
      <svg class="zoom-step-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    <Transition name="dropdown">
      <div v-if="isOpen" class="zoom-step-dropdown">
        <div
          v-for="option in options"
          :key="option.value"
          class="zoom-step-option"
          :class="{ 'is-selected': modelValue === option.value }"
          @click="selectOption(option.value)"
        >
          <span class="option-value">{{ option.label }}</span>
          <span v-if="modelValue === option.value" class="option-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  modelValue: number
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [value: number]
}>()

const isOpen = ref(false)
const selectorRef = ref<HTMLElement | null>(null)

// 当前输入值
const inputValue = ref(props.modelValue)

// 同步外部值变化
watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

const options = [
  { value: 1, label: '1% (Ctrl+滚轮调整1%)' },
  { value: 2, label: '2% (Ctrl+滚轮调整2%)' },
  { value: 3, label: '3% (Ctrl+滚轮调整3%)' },
  { value: 4, label: '4% (Ctrl+滚轮调整4%)' },
  { value: 5, label: '5% (Ctrl+滚轮调整5%)' }
]

function handleInputChange() {
  let value = inputValue.value
  if (value < 1) value = 1
  if (value > 100) value = 100
  inputValue.value = value
  emit('update:modelValue', value)
  emit('change', value)
}

function selectOption(value: number) {
  inputValue.value = value
  emit('update:modelValue', value)
  emit('change', value)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (selectorRef.value && !selectorRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.zoom-step-selector {
  position: relative;
  display: inline-block;
}

.zoom-step-trigger {
  display: flex;
  align-items: center;
  gap: 0.3vw;
  padding: 0.6vh 1vw;
  padding-right: 0.8vw;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 4vw;
  justify-content: center;
}

.zoom-step-input {
  width: 3.5vw;
  background: transparent;
  border: none;
  outline: none;
  color: white;
  font-size: clamp(12px, 1vw, 15px);
  font-weight: 700;
  text-align: right;
  padding: 0;
  margin: 0;
  -moz-appearance: textfield;
}

.zoom-step-input::-webkit-outer-spin-button,
.zoom-step-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.zoom-step-input:focus {
  outline: none;
}

.zoom-step-percent {
  font-size: clamp(12px, 1vw, 15px);
  font-weight: 700;
  color: white;
  margin-left: 0.2vw;
}

.zoom-step-trigger:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
  transform: translateY(-1px);
}

.zoom-step-trigger.is-open {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(59, 130, 246, 0.5);
}

.zoom-step-value {
  font-size: clamp(12px, 1vw, 15px);
  font-weight: 700;
  color: white;
}

.zoom-step-arrow {
  width: 14px;
  height: 14px;
  color: white;
  transition: transform 0.2s ease;
}

.zoom-step-trigger.is-open .zoom-step-arrow {
  transform: rotate(180deg);
}

.zoom-step-dropdown {
  position: absolute;
  top: calc(100% + 0.5vh);
  right: 0;
  min-width: 100%;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 0.8vh 0.5vw;
  z-index: 1000;
  overflow: hidden;
}

.zoom-step-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1vh 1vw;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 0.3vh;
}

.zoom-step-option:last-child {
  margin-bottom: 0;
}

.zoom-step-option:hover {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.zoom-step-option.is-selected {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.option-value {
  font-size: clamp(12px, 0.95vw, 14px);
  font-weight: 600;
  color: #334155;
}

.zoom-step-option:hover .option-value {
  color: #1d4ed8;
}

.zoom-step-option.is-selected .option-value {
  color: white;
  font-weight: 700;
}

.option-check {
  width: 18px;
  height: 18px;
  color: white;
}

.option-check svg {
  width: 100%;
  height: 100%;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
