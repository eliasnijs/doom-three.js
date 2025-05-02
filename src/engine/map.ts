import { WebGLRenderer } from 'three'

import { DebugPanel } from '../game-objects/debug-panel.ts'
import { Hallway } from '../game-objects/hallway.ts'
import { PathVisualisation } from '../game-objects/path-visualisation.ts'
import { Player } from '../game-objects/player.ts'
import { MAZE_X_SIZE, MAZE_Z_SIZE } from '../main.ts'
import { generate, mazeGridToWorldGrid, pathfind, randomCell } from '../utils/generate-maze.ts'
import { loadHallwayObjects } from '../utils/hallway-utils.ts'
import { State } from './state.ts'

export async function createMap(debugPanel: DebugPanel, state: State, renderer: WebGLRenderer) {
	const hallwayObjects = await loadHallwayObjects()

	const grid = generate(MAZE_Z_SIZE, MAZE_X_SIZE)
	state.grid = grid

	for (let row = 0; row < grid.nRows; row++) {
		for (let col = 0; col < grid.nCols; col++) {
			const i = row * grid.nCols + col

			const [x, y] = mazeGridToWorldGrid([col, row])

			const openSides = grid.cells[i].walls.map(w => !w) as [boolean, boolean, boolean, boolean]
			const count = openSides.filter(Boolean).length

			if (count > 0) {
				new Hallway(
					state,
					hallwayObjects,
					x,
					y,
					grid.cells[i].walls.map(w => !w) as [boolean, boolean, boolean, boolean],
					renderer,
				)
			}
		}
	}

	// Choose a random start and destination cell
	const start = randomCell(grid)
	const destination = randomCell(grid)
	debugPanel.setData('route', `(${start.toString()}) -> (${destination.toString()})`)

	const path = pathfind(grid, start, destination)
	new PathVisualisation(state, path)

	// Add player
	new Player(state, start, hallwayObjects, renderer).enableCamera(state)

	return grid
}
