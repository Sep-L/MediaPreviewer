import { ref, watch } from 'vue'
import { getSetting, setSetting } from './useSettings'
import {
  ZOOM_STEP_KEY,
  CURRENT_ZOOM_KEY,
  DEFAULT_ZOOM_STEP,
  DEFAULT_CURRENT_ZOOM,
  DEFAULT_GRID_PERCENT
} from '../constants'
import { calculateGridPercent } from '../utils'

export function useZoom() {
  const zoomStep = ref(DEFAULT_ZOOM_STEP)
  const currentZoom = ref(DEFAULT_CURRENT_ZOOM)
  const gridPercent = ref(DEFAULT_GRID_PERCENT)

  watch(gridPercent, (val) => {
    document.documentElement.style.setProperty('--grid-percent', `${val.toFixed(2)}%`)
  })

  async function handleWheel(event: WheelEvent) {
    if (!event.ctrlKey) return
    event.preventDefault()
    
    const delta = event.deltaY > 0 ? -zoomStep.value : zoomStep.value
    currentZoom.value = Math.max(1, Math.min(100, currentZoom.value + delta))
    gridPercent.value = calculateGridPercent(currentZoom.value)
    
    await setSetting(CURRENT_ZOOM_KEY, currentZoom.value)
    await setSetting('gridPercent', gridPercent.value)
  }

  async function saveZoomStep() {
    await setSetting(ZOOM_STEP_KEY, zoomStep.value)
  }

  async function saveCurrentZoom() {
    await setSetting(CURRENT_ZOOM_KEY, currentZoom.value)
    gridPercent.value = calculateGridPercent(currentZoom.value)
  }

  async function init() {
    const savedCurrentZoom = await getSetting<number | null>(CURRENT_ZOOM_KEY, null)
    if (savedCurrentZoom) {
      currentZoom.value = savedCurrentZoom
      gridPercent.value = calculateGridPercent(currentZoom.value)
    } else {
      const savedGridPercent = await getSetting<number | null>('gridPercent', null)
      if (savedGridPercent) gridPercent.value = savedGridPercent
    }

    const savedZoomStep = await getSetting<number | null>(ZOOM_STEP_KEY, null)
    if (savedZoomStep) zoomStep.value = savedZoomStep
  }

  return {
    zoomStep,
    currentZoom,
    gridPercent,
    handleWheel,
    saveZoomStep,
    saveCurrentZoom,
    init
  }
}
