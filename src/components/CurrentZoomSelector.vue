<template>
  <div class="current-zoom-selector" ref="selectorRef">
    <div 
      class="zoom-trigger" 
      @click="isOpen = !isOpen"
      :class="{ 'is-open': isOpen }"
    >
      <input 
        v-model.number="inputValue"
        type="number"
        step="1"
        min="1"
        max="100"
        class="zoom-input"
        @change="handleInputChange"
        @click.stop
      />
      <span class="zoom-percent">%</span>
      <svg class="zoom-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    <Transition name="dropdown">
      <div v-if="isOpen" class="zoom-dropdown">
        <div
          v-for="option in options"
          :key="option.value"
          class="zoom-option"
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

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [value: number]
}>()

const isOpen = ref(false)
const selectorRef = ref<HTMLElement | null>(null)
const inputValue = ref(props.modelValue)

// 同步外部值变化
watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

// 缩放比例选项（百分比对应每行图片数量）
// 10% = 一行10张, 20% = 一行5张, 25% = 一行4张, 33% = 一行3张, 50% = 一行2张, 100% = 一行1张
const options = [
  { value: 10, label: '10%', imagesPerRow: 10 },
  { value: 20, label: '20%', imagesPerRow: 5 },
  { value: 25, label: '25%', imagesPerRow: 4 },
  { value: 33, label: '33%', imagesPerRow: 3 },
  { value: 50, label: '50%', imagesPerRow: 2 },
  { value: 100, label: '100%', imagesPerRow: 1 }
]

function handleInputChange() {
  let value = inputValue.value
  // 限制范围
  if (value < 1) value = 1
  if (value > 100) value = 100
  inputValue.value = Math.round(value)
  emit('update:modelValue', inputValue.value)
  emit('change', inputValue.value)
}

function selectOption(value: number) {
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
.current-zoom-selector {
  position: relative;
  display: inline-block;
}

.zoom-trigger {
  display: flex;
  align-items: center;
  gap: 0.3vw;
  padding: 0.6vh 1vw;
  padding-right: 0.8vw;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 4.5vw;
  justify-content: center;
}

.zoom-trigger:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
  transform: translateY(-1px);
}

.zoom-trigger.is-open {
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3), 0 4px 12px rgba(139, 92, 246, 0.5);
}

.zoom-input {
  width: 3vw;
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

.zoom-input::-webkit-outer-spin-button,
.zoom-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.zoom-input:focus {
  outline: none;
}

.zoom-percent {
  font-size: clamp(12px, 1vw, 15px);
  font-weight: 700;
  color: white;
  margin-left: 0.2vw;
}

.zoom-arrow {
  width: 14px;
  height: 14px;
  color: white;
  transition: transform 0.2s ease;
}

.zoom-trigger.is-open .zoom-arrow {
  transform: rotate(180deg);
}

.zoom-dropdown {
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

.zoom-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1vh 1vw;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 0.3vh;
}

.zoom-option:last-child {
  margin-bottom: 0;
}

.zoom-option:hover {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
}

.zoom-option.is-selected {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.option-value {
  font-size: clamp(12px, 0.95vw, 14px);
  font-weight: 600;
  color: #334155;
}

.zoom-option:hover .option-value {
  color: #6d28d9;
}

.zoom-option.is-selected .option-value {
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
