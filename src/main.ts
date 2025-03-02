import { Color, WebGLRenderer } from 'three'

import { createMap } from './engine/map.ts'
import { State } from './engine/state.ts'
import { windowInit } from './engine/window.ts'
import { DebugPanel } from './game-objects/debug-panel.ts'

export const MAZE_X_SIZE = 10
export const MAZE_Z_SIZE = 10
export const GRID_SIZE = 10
export const MAZE_X_CENTER = GRID_SIZE * Math.floor(MAZE_X_SIZE / 2)
export const MAZE_Z_CENTER = GRID_SIZE * Math.floor(MAZE_Z_SIZE / 2)

function animate(time_ms: number, state: State, renderer: WebGLRenderer) {
	renderer.setClearColor(new Color(0, 0, 0)) // Set background color to black

	// update state
	state.animate(time_ms, renderer)

	// render and swap
	renderer.render(state.scene, state.activeCamera)
	renderer.state.reset()
}

async function main(renderer: WebGLRenderer) {
	windowInit(renderer)

	const state = new State()

	const debugPanel = new DebugPanel(state, renderer)
	// new RotatingTv(state)
	await createMap(debugPanel, state)

	console.log('starting loop')
	renderer.setAnimationLoop(time_ms => {
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
