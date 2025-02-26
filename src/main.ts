import { Color, WebGLRenderer } from 'three'

import { State } from './engine/state.ts'
import { window_init } from './engine/window.ts'
import { DebugPanel } from './game-objects/debug-panel.ts'
import { FlyCameraControls } from './game-objects/fly-camera-controls.ts'
import { RotatingTv } from './game-objects/rotating-tv.ts'

function animate(time_ms: number, state: State) {
	renderer.setClearColor(new Color(0, 0, 0)) // Set background color to black

	// update state
	state.animate(time_ms)

	// render and swap
	renderer.render(state.scene, state.camera)
	renderer.state.reset()
}

async function main(renderer: WebGLRenderer) {
	window_init(renderer)

	const state = new State()

	new DebugPanel(state)
	new RotatingTv(state)
	new FlyCameraControls(state, renderer)

	console.log('starting loop')
	renderer.setAnimationLoop(time_ms => {
		animate(time_ms, state)
	})

	// TODO(...): figure out where this needs to go and whether it is
	// necessary in the first place.
	// window_die(renderer);
}

const renderer = new WebGLRenderer()
document.body.appendChild(renderer.domElement)
renderer.setSize(window.innerWidth, window.innerHeight)

void main(renderer)
