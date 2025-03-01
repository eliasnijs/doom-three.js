import { Color, WebGLRenderer } from 'three'

import { State } from './engine/state.ts'
import { window_init } from './engine/window.ts'
import { DebugPanel } from './game-objects/debug-panel.ts'
import { Hallway } from './game-objects/hallway.ts'
import { generate } from './utils/generate-maze.ts'
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

	const X_SIZE = 16
	const Z_SIZE = 10
	const grid = generate(Z_SIZE, X_SIZE)

	for (let row = 0; row < grid.n_rows; row++) {
		for (let col = 0; col < grid.n_cols; col++) {
			const i = row * grid.n_cols + col
			const x = col - Math.floor(X_SIZE / 2)
			const z = row - Math.floor(Z_SIZE / 2)

			new Hallway(
				state,
				hallwayObjects,
				-x,
				-z,
				grid.cells[i].walls.map(w => !w) as [boolean, boolean, boolean, boolean],
			)
		}
	}

	// new Hallway(state, hallwayObjects, 0, 0, [true, false, false, false])

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
