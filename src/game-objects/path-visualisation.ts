import { Sprite, SpriteMaterial, Vector3 } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { GRID_SIZE } from '../main.ts'
import { mazeGridToWorldGrid, Pos } from '../utils/generate-maze.ts'
import { loadTexture } from '../utils/loader-utils.ts'

export class PathVisualisation extends GameObject {
	constructor(state: State, path: Pos[]) {
		super(state)

		const points = path.map(([y, x]) => {
			const [newX, newZ] = mazeGridToWorldGrid([x, y])

			return new Vector3(newX * GRID_SIZE, 2.5, newZ * GRID_SIZE)
		})

		const glowTexture = loadTexture('glow', 'glow.png')

		const material = new SpriteMaterial({
			map: glowTexture,
			// color: 0xff9900,
			transparent: true,
			opacity: 1,
		})

		// Create sprites along the path
		for (let i = 0; i < points.length; i++) {
			const sprite = new Sprite(material)
			sprite.position.copy(points[i])
			sprite.scale.set(1, 1, 1) // Adjust size
			state.scene.add(sprite)
		}
	}

	animate() {}
}
