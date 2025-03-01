import { WebGLRenderer } from 'three'

let currentRenderer: WebGLRenderer | null = null
let currentCanvas: HTMLCanvasElement | null = null

function windowResizeCallback() {
	if (currentRenderer) {
		currentRenderer.setSize(window.innerWidth, window.innerHeight)
		const devicePixelRatio = window.devicePixelRatio || 1
		if (currentCanvas) {
			currentCanvas.width = currentCanvas.scrollWidth * devicePixelRatio
			currentCanvas.height = currentCanvas.scrollHeight * devicePixelRatio
		}
	}
}

export function windowInit(renderer: WebGLRenderer) {
	currentRenderer = renderer
	currentCanvas = renderer.domElement
	const devicePixelRatio = window.devicePixelRatio || 1
	currentCanvas.width = currentCanvas.scrollWidth * devicePixelRatio
	currentCanvas.height = currentCanvas.scrollHeight * devicePixelRatio
	window.addEventListener('resize', windowResizeCallback)
}

export function windowDie(renderer: WebGLRenderer) {
	renderer.setAnimationLoop(null)
	window.removeEventListener('resize', windowResizeCallback)
	currentRenderer = null
	currentCanvas = null
}
