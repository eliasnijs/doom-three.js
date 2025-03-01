import { Color, WebGLRenderer } from 'three'

import { State } from './engine/state.ts'
import { window_init } from './engine/window.ts'
import { DebugPanel } from './game-objects/debug-panel.ts'
import { Hallway } from './game-objects/hallway.ts'
import { loadHallwayObjects } from './utils/hallway-utils.ts'

function animate(time_ms: number, state: State, renderer: WebGLRenderer) {
	renderer.setClearColor(new Color(0, 0, 0)) // Set background color to black

	// update state
	state.animate(time_ms, renderer)

	// render and swap
	renderer.render(state.scene, state.camera)
	renderer.state.reset()
}

async function main(renderer: WebGLRenderer) {
	window_init(renderer)

	const state = new State()

	new DebugPanel(state, renderer)
	// new RotatingTv(state)

	const hallwayObjects = await loadHallwayObjects()
	new Hallway(state, hallwayObjects, 0, 0, [true, false, true, false])
	new Hallway(state, hallwayObjects, 0, 1, [false, false, true, true])
	new Hallway(state, hallwayObjects, 1, 1, [false, true, false, true])
	new Hallway(state, hallwayObjects, 2, 1, [false, true, true, false])
	new Hallway(state, hallwayObjects, 2, 0, [true, true, false, false])
	new Hallway(state, hallwayObjects, 1, 0, [false, false, true, true])
	new Hallway(state, hallwayObjects, 1, -1, [true, true, true, false])
	new Hallway(state, hallwayObjects, 0, -1, [true, true, true, true])
	new Hallway(state, hallwayObjects, 1, -2, [true, true, false, false])
	new Hallway(state, hallwayObjects, 0, -2, [true, false, false, true])
	new Hallway(state, hallwayObjects, -1, -1, [false, false, false, true])

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
