import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { GRID_SIZE } from '../main.ts'
import { Pos } from '../utils/generate-maze.ts'

export class PathVisualisation extends GameObject {
	constructor(state: State, path: Pos[]) {
		super(state)

		// Convert to Vector3 with y = 5
		const points = path.map(([x, z]) => new Vector3(x * GRID_SIZE, 5, z * GRID_SIZE))

		// Create a geometry from the points
		const geometry = new BufferGeometry().setFromPoints(points)

		// Create a material
		const material = new LineBasicMaterial({ color: 0xff0000 })

		// Create the line
		const routeLine = new Line(geometry, material)

		// Add to the scene
		state.scene.add(routeLine)
	}

	animate() {}
}
