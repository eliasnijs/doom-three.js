import { WebGLRenderer } from 'three'

let currentRenderer: WebGLRenderer | null = null
let currentCanvas: HTMLCanvasElement | null = null

function window_resize_callback() {
  if (currentRenderer) {
    currentRenderer.setSize(window.innerWidth, window.innerHeight)
    const devicePixelRatio = window.devicePixelRatio || 1
    if (currentCanvas) {
      currentCanvas.width = currentCanvas.scrollWidth * devicePixelRatio
      currentCanvas.height = currentCanvas.scrollHeight * devicePixelRatio
    }
  }
}

export function window_init(renderer: WebGLRenderer) {
  currentRenderer = renderer
  currentCanvas = renderer.domElement
  const devicePixelRatio = window.devicePixelRatio || 1
  currentCanvas.width = currentCanvas.scrollWidth * devicePixelRatio
  currentCanvas.height = currentCanvas.scrollHeight * devicePixelRatio
  window.addEventListener('resize', window_resize_callback)
}

export function window_die(renderer: WebGLRenderer) {
  renderer.setAnimationLoop(null)
  window.removeEventListener('resize', window_resize_callback)
  currentRenderer = null
  currentCanvas = null
}
