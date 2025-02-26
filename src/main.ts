import { window_init } from './engine/window.ts'
import { createState, State, updateState } from './engine/state.ts'
import { Color, WebGLRenderer } from 'three'
import { RotatingCube } from './game-objects/rotating-cube.ts'
import { FlyCameraControls } from './game-objects/fly-camera-controls.ts'

function animate(time_ms: number, state: State) {
	renderer.setClearColor(new Color(0, 0, 0)) // Set background color to black

	// update state
	updateState(state, time_ms)

	// render and swap
	renderer.render(state.scene, state.camera)
	renderer.state.reset()
}

async function main(renderer: WebGLRenderer) {
	window_init(renderer)

	const state = createState()

	new RotatingCube(state)
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
