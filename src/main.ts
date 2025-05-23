import { Color, WebGLRenderer } from 'three'
// --- Bloom imports ---
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

import { createMap } from './engine/map.ts'
import { State } from './engine/state.ts'
import { windowInit } from './engine/window.ts'
import { DebugPanel } from './game-objects/debug-panel.ts'
import { MazePanel } from './game-objects/maze-panel.ts'

// Size of the final grid, so double the size of the maze
export const MAZE_X_SIZE = 22
export const MAZE_Z_SIZE = 22
export const GRID_SIZE = 10
export const MAZE_X_CENTER = GRID_SIZE * Math.floor(MAZE_X_SIZE / 2)
export const MAZE_Z_CENTER = GRID_SIZE * Math.floor(MAZE_Z_SIZE / 2)

// --- Composer variables ---
let composer: EffectComposer
let renderPass: RenderPass

function animate(time_ms: number, state: State, renderer: WebGLRenderer) {
	renderer.setClearColor(new Color(0, 0, 0)) // Set background color to black

	renderPass.camera = state.activeCamera

	state.animate(time_ms, renderer)

	// Use composer for rendering
	composer.render()
	renderer.state.reset()
}

async function main(renderer: WebGLRenderer) {
	renderer.autoClear = false

	windowInit(renderer)

	const MAX_DIMENSION = (Math.max(MAZE_X_SIZE, MAZE_Z_SIZE) + 2) * GRID_SIZE // add +2 for margin
	const state = new State(MAX_DIMENSION, renderer)
	const debugPanel = new DebugPanel(state, renderer)
	await createMap(debugPanel, state, renderer)
	new MazePanel(state, renderer)

	// --- Set up EffectComposer and passes ---
	composer = new EffectComposer(renderer)
	renderPass = new RenderPass(state.scene, state.activeCamera)
	composer.addPass(renderPass)

	// Bloom disabled due to performance issues
	// const bloomPass = new UnrealBloomPass(
	// 	new Vector2(window.innerWidth, window.innerHeight),
	// 	0.5, // strength
	// 	0.3, // radius
	// 	0.85, // threshold
	// )
	// composer.addPass(bloomPass)

	// Resize composer on window resize
	renderer.setSize(window.innerWidth, window.innerHeight)
	composer.setSize(window.innerWidth, window.innerHeight)

	window.addEventListener('resize', () => {
		renderer.setSize(window.innerWidth, window.innerHeight)
		composer.setSize(window.innerWidth, window.innerHeight)
	})

	console.log('starting loop')
	renderer.setAnimationLoop(time_ms => {
		animate(time_ms, state, renderer)
	})
}

const renderer = new WebGLRenderer()
document.body.appendChild(renderer.domElement)
renderer.setSize(window.innerWidth, window.innerHeight)

void main(renderer)
