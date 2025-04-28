import { Color, Vector2, WebGLRenderer } from 'three'
// --- Bloom imports ---
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import { createMap } from './engine/map.ts'
import { State } from './engine/state.ts'
import { windowInit } from './engine/window.ts'
import { DebugPanel } from './game-objects/debug-panel.ts'

export const MAZE_X_SIZE = 4
export const MAZE_Z_SIZE = 4
export const GRID_SIZE = 10
export const MAZE_X_CENTER = GRID_SIZE * Math.floor(MAZE_X_SIZE / 2)
export const MAZE_Z_CENTER = GRID_SIZE * Math.floor(MAZE_Z_SIZE / 2)

// --- Composer variables ---
let composer: EffectComposer
let renderPass: RenderPass

function animate(time_ms: number, state: State, renderer: WebGLRenderer) {
	renderer.setClearColor(new Color(0, 0, 0)) // Set background color to black

	state.animate(time_ms, renderer)

	// Use composer for rendering
	composer.render()
	renderer.state.reset()
}

async function main(renderer: WebGLRenderer) {
	windowInit(renderer)

	const state = new State(450, renderer) // Pass renderer
	const debugPanel = new DebugPanel(state, renderer)
	await createMap(debugPanel, state)

	// --- Set up EffectComposer and passes ---
	composer = new EffectComposer(renderer)
	renderPass = new RenderPass(state.scene, state.activeCamera)
	composer.addPass(renderPass)

	const bloomPass = new UnrealBloomPass(
		new Vector2(window.innerWidth, window.innerHeight),
		1.2, // strength
		0.3, // radius
		0.85, // threshold
	)
	composer.addPass(bloomPass)

	// Make renderPass globally accessible for DebugPanel
	if (typeof window !== 'undefined') {
		;(window as any).renderPass = renderPass
	}

	// Resize composer on window resize
	renderer.setSize(window.innerWidth, window.innerHeight)
	composer.setSize(window.innerWidth, window.innerHeight)

	window.addEventListener('resize', () => {
		renderer.setSize(window.innerWidth, window.innerHeight)
		composer.setSize(window.innerWidth, window.innerHeight)
	})

	console.log('starting loop')
	renderer.setAnimationLoop(time_ms => {
		// Pass state and renderer
		animate(time_ms, state, renderer)
	})

	// TODO(...): figure out where this needs to go and whether it is
	// necessary in the first place.
	// window_die(renderer);
}

const renderer = new WebGLRenderer()
document.body.appendChild(renderer.domElement)
renderer.setSize(window.innerWidth, window.innerHeight)

void main(renderer)
