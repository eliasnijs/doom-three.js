import { Object3D, Vector3, WebGLRenderer } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { GRID_SIZE, MAZE_X_SIZE, MAZE_Z_SIZE } from '../main.ts'
import { Grid, Pos, drawLine, drawSquare, idx2pos } from '../utils/generate-maze.ts'
import { FlyCameraControls } from './fly-camera-controls.ts'
import { OrbitCameraControls } from './orbit-camera-controls.ts'
import { Player } from './player.ts'

export class MazePanel extends GameObject {
	container: HTMLCanvasElement
	width: number = 300
	height: number = 300
	player: Player | null = null
	playerPosition: Pos | null = null

	constructor(state: State, renderer: WebGLRenderer, style?: any) {
		super(state)

		this.container = document.createElement('canvas')
		this.container.width = this.width
		this.container.height = this.height
		document.body.appendChild(this.container)

		this.container.style.position = 'fixed'
		this.container.style.zIndex = '100'
		this.container.style.top = '20px'
		this.container.style.right = '20px'
		this.container.style.backgroundColor = 'rgba(0,0,0,0.7)'
		this.container.style.border = '1px solid white'
		this.container.style.color = 'white'
		this.container.style.fontFamily = 'monospace'
		this.container.style.display = 'block'
		this.container.style.width = `${this.width}px`
		this.container.style.height = `${this.height}px`

		this.container.onpointerdown = e => e.stopPropagation()

		this.player = state.findFirstGameObjectOfType(Player)

		this.renderGrid(state.grid)
	}

	animate(deltaTime: number, state: State) {
		if (!this.player) {
			this.player = state.findFirstGameObjectOfType(Player)
		}

		if (this.player && this.player.mesh) {
			const worldPos = this.player.mesh.position.clone()
			const gridX = Math.floor((worldPos.x + GRID_SIZE/2) / GRID_SIZE)
			const gridZ = Math.floor((worldPos.z + GRID_SIZE/2) / GRID_SIZE)
			const col = MAZE_X_SIZE - 1 - gridX
			const row = MAZE_Z_SIZE - 1 - gridZ
			this.playerPosition = [row, col]
		}

		this.renderGrid(state.grid)
	}

	renderGrid(grid: Grid) {
		if (!grid) return

		const ctx = this.container.getContext('2d')
		if (!ctx) return

		ctx.clearRect(0, 0, this.width, this.height)

		const cellWidth = Math.floor(this.width / grid.nCols)
		const cellHeight = Math.floor(this.height / grid.nRows)
		for (let row = 0; row < grid.nRows; row++) {
			for (let col = 0; col < grid.nCols; col++) {
				const idx = row * grid.nCols + col
				const cell = grid.cells[idx]
				const x = col * cellWidth
				const y = row * cellHeight

				drawSquare(this.container, x, y, cellWidth, cellHeight, 'rgba(30, 30, 30, 0.3)')
				if (cell.walls[0]) { // North
					drawLine(this.container, x, y, x + cellWidth, y, 2, 'white')
				}
				if (cell.walls[1]) { // East
					drawLine(this.container, x + cellWidth, y, x + cellWidth, y + cellHeight, 2, 'white')
				}
				if (cell.walls[2]) { // South
					drawLine(this.container, x, y + cellHeight, x + cellWidth, y + cellHeight, 2, 'white')
				}
				if (cell.walls[3]) { // West
					drawLine(this.container, x, y, x, y + cellHeight, 2, 'white')
				}
			}
		}

		if (this.playerPosition) {
			const [row, col] = this.playerPosition
			if (row >= 0 && row < grid.nRows && col >= 0 && col < grid.nCols) {
				const x = col * cellWidth + cellWidth / 2
				const y = row * cellHeight + cellHeight / 2
				const radius = Math.min(cellWidth, cellHeight) / 4
				ctx.beginPath()
				ctx.arc(x, y, radius, 0, 2 * Math.PI)
				ctx.fillStyle = 'red'
				ctx.fill()
			}
		}
	}

}
