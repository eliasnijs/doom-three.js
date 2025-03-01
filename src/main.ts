import { Color, WebGLRenderer } from 'three'

import { State } from './engine/state.ts'
import { windowInit } from './engine/window.ts'
import { DebugPanel } from './game-objects/debug-panel.ts'
import { Hallway } from './game-objects/hallway.ts'
import { PathVisualisation } from './game-objects/path-visualisation.ts'
import { generate, mazeGridToWorldGrid, pathfind, randomCell } from './utils/generate-maze.ts'
import { loadHallwayObjects } from './utils/hallway-utils.ts'

export const MAZE_X_SIZE = 16
export const MAZE_Z_SIZE = 10
export const GRID_SIZE = 10
export const MAZE_X_CENTER = GRID_SIZE * Math.floor(MAZE_X_SIZE / 2)
export const MAZE_Z_CENTER = GRID_SIZE * Math.floor(MAZE_Z_SIZE / 2)

function animate(time_ms: number, state: State, renderer: WebGLRenderer) {
	renderer.setClearColor(new Color(0, 0, 0)) // Set background color to black

	// update state
	state.animate(time_ms, renderer)

	// render and swap
	renderer.render(state.scene, state.camera)
	renderer.state.reset()
}

async function main(renderer: WebGLRenderer) {
	windowInit(renderer)

	const state = new State()

	const debugPanel = new DebugPanel(state, renderer)
	// new RotatingTv(state)

	const hallwayObjects = await loadHallwayObjects()

	const grid = generate(MAZE_Z_SIZE, MAZE_X_SIZE)

	for (let row = 0; row < grid.nRows; row++) {
		for (let col = 0; col < grid.nCols; col++) {
			const i = row * grid.nCols + col

			const [x, y] = mazeGridToWorldGrid([col, row])

			new Hallway(
				state,
				hallwayObjects,
				x,
				y,
				grid.cells[i].walls.map(w => !w) as [boolean, boolean, boolean, boolean],
			)
		}
	}

	// Choose a random start and destination cell
	const start = randomCell(grid)
	const destination = randomCell(grid)
	debugPanel.setData('route', `(${start.toString()}) -> (${destination.toString()})`)

	const path = pathfind(grid, start, destination)
	new PathVisualisation(state, path)

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
