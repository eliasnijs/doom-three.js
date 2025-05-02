/***************************************************************************************************************
  PathVisualisation

  Creates a visual representation of the path from the player to a destination point in the maze.

  Responsibilities:
  - Calculates the shortest path between two points using pathfinding
  - Visualizes the path with 3D sprites in the game world
  - Updates the path when player position or destination changes

  The path start and destination points are controlled externally through:
  - MazePanel UI (when user clicks to select a destination)
  - Player movement (which updates the starting position)

 ***************************************************************************************************************/

import { Sprite, SpriteMaterial, Texture, Vector3 } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { GRID_SIZE } from '../main.ts'
import { mazeGridToWorldGrid, pathfind, Pos } from '../utils/generate-maze.ts'
import { loadTexture } from '../utils/loader-utils.ts'

export class PathVisualisation extends GameObject {
	private sprites: Sprite[] = []
	private glowTexture: Texture
	private material: SpriteMaterial
	private currentPath: Pos[] = []
	private startPoint: Pos | null = null
	private endPoint: Pos | null = null

	constructor(state: State, path: Pos[]) {
		super(state)

		this.currentPath = [...path]
		if (path.length >= 2) {
			this.startPoint = path[0]
			this.endPoint = path[path.length - 1]
		}

		this.glowTexture = loadTexture('glow', 'glow.png')
		this.material = new SpriteMaterial({
			map: this.glowTexture,
			transparent: true,
			opacity: 1,
		})

		this.createPathVisualization(state, path)
	}

	private createPathVisualization(state: State, path: Pos[]) {
		this.clearPath(state)

		const points = path.map(([y, x]) => {
			const [newX, newZ] = mazeGridToWorldGrid([x, y])

			return new Vector3(newX * GRID_SIZE, 2.5, newZ * GRID_SIZE)
		})

		for (let i = 0; i < points.length; i++) {
			const sprite = new Sprite(this.material)
			sprite.position.copy(points[i])

			if (i === 0 || i === points.length - 1) {
				sprite.scale.set(1.5, 1.5, 1.5)
			} else {
				sprite.scale.set(1, 1, 1)
			}

			state.scene.add(sprite)
			this.sprites.push(sprite)
		}
	}

	private clearPath(state: State) {
		for (const sprite of this.sprites) {
			state.scene.remove(sprite)
		}

		this.sprites = []
	}

	setDestination(state: State, destination: Pos) {
		if (!this.startPoint || !state.grid) {
			return
		}

		this.endPoint = destination
		const path = pathfind(state.grid, this.startPoint, destination)
		this.currentPath = [...path]
		this.createPathVisualization(state, path)

		return path
	}

	setStartPoint(state: State, start: Pos) {
		if (!this.endPoint || !state.grid) {
			return
		}

		this.startPoint = start
		const path = pathfind(state.grid, start, this.endPoint)
		this.currentPath = [...path]
		this.createPathVisualization(state, path)

		return path
	}

	getPath(): Pos[] {
		return [...this.currentPath]
	}

	getDestination(): Pos | null {
		return this.endPoint
	}

	getStartPoint(): Pos | null {
		return this.startPoint
	}

	animate() {}
}
