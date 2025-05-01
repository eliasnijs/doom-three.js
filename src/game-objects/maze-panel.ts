/***************************************************************************************************************

  MazePanel

  Creates a 2D minimap overlay that displays the maze layout and player position.
  Responsibilities:
  - Renders the maze grid with walls as a 2D minimap
  - Shows player's current position within the maze
  - Allows selecting destination points by clicking
  - Displays the calculated path to the destination
  - Provides visual feedback for hover/selection
  - Acts as control for the path selection and updateing in PathVisualisation

***************************************************************************************************************/

import { WebGLRenderer } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { GRID_SIZE, MAZE_X_SIZE, MAZE_Z_SIZE } from '../main.ts'
import { drawLine, drawSquare, Grid, Pos } from '../utils/generate-maze.ts'
import { PathVisualisation } from './path-visualisation.ts'
import { Player } from './player.ts'

export class MazePanel extends GameObject {
	container: HTMLCanvasElement
	width: number = 240
	height: number = 240
	player: Player | null = null
	playerPosition: Pos | null = null
	pathVisualisation: PathVisualisation | null = null
	destinationPos: Pos | null = null
	hoveredCell: Pos | null = null

	private readonly colors = {
		cellDefault: 'rgba(30, 30, 50, 0.3)',
		cellPath: 'rgba(80, 240, 80, 0.3)',
		cellDestination: 'rgba(0, 255, 0, 0.3)',
		cellHighlight: 'rgba(100, 200, 255, 0.8)',
		wallColor: 'white',
		playerColor: 'red',
		destinationMarkerColor: 'lime',
	}
	private readonly lineWidth = 2
	private readonly playerMarkerScale = 4 // divides cell size
	private readonly destinationMarkerScale = 3 // divides cell size

	constructor(state: State, _renderer: WebGLRenderer, style?: Record<string, string>) {
		super(state)

		this.container = document.createElement('canvas')
		this.container.width = this.width
		this.container.height = this.height
		document.body.appendChild(this.container)

		const defaultStyle = {
			position: 'fixed',
			zIndex: '100',
			top: '20px',
			right: '20px',
			backgroundColor: 'rgba(20, 20, 80, 0.3)',
			border: '1px solid white',
			color: 'white',
			fontFamily: 'monospace',
			display: 'block',
			width: `${this.width}px`,
			height: `${this.height}px`,
			cursor: 'pointer',
		}

		Object.assign(this.container.style, defaultStyle, style || {})

		this.player = state.findFirstGameObjectOfType(Player)
		this.pathVisualisation = state.findFirstGameObjectOfType(PathVisualisation)

		if (this.pathVisualisation) {
			this.destinationPos = this.pathVisualisation.getDestination()
		}

		this.container.onpointerdown = e => {
			e.stopPropagation()
			if (state.grid && this.pathVisualisation && this.playerPosition) {
				const cellPos = this.getCellPositionFromEvent(e, state.grid)
				if (cellPos) {
					this.destinationPos = cellPos
					this.pathVisualisation.setDestination(state, this.destinationPos)
				}
			}
		}

		this.container.onpointermove = e => {
			if (state.grid) {
				this.hoveredCell = this.getCellPositionFromEvent(e, state.grid)
			}
		}

		this.container.onpointerleave = () => {
			this.hoveredCell = null
		}

		this.renderGrid(state.grid)
	}

	animate(_deltaTime: number, state: State) {
		if (!this.player) {
			const foundPlayer = state.findFirstGameObjectOfType(Player)
			if (foundPlayer) {
				this.player = foundPlayer
			}
		}

		if (!this.pathVisualisation) {
			const foundPathVis = state.findFirstGameObjectOfType(PathVisualisation)
			if (foundPathVis) {
				this.pathVisualisation = foundPathVis
			}

			if (this.pathVisualisation) {
				this.destinationPos = this.pathVisualisation.getDestination()
			}
		}

		if (this.player && this.player.mesh) {
			const worldPos = this.player.mesh.position.clone()
			const gridX = Math.floor((worldPos.x + GRID_SIZE / 2) / GRID_SIZE)
			const gridZ = Math.floor((worldPos.z + GRID_SIZE / 2) / GRID_SIZE)
			const col = MAZE_X_SIZE - 1 - gridX
			const row = MAZE_Z_SIZE - 1 - gridZ
			const newPosition: Pos = [row, col]
			if (
				!this.playerPosition ||
				this.playerPosition[0] !== newPosition[0] ||
				this.playerPosition[1] !== newPosition[1]
			) {
				this.playerPosition = newPosition
				if (this.destinationPos && this.pathVisualisation) {
					this.pathVisualisation.setStartPoint(state, this.playerPosition)
				}
			}
		}

		this.renderGrid(state.grid)
	}

	renderGrid(grid: Grid | null) {
		if (!grid) {
			return
		}

		const ctx = this.container.getContext('2d')
		if (!ctx) {
			return
		}

		ctx.clearRect(0, 0, this.width, this.height)

		const { cellWidth, cellHeight } = this.getCellDimensions(grid)

		const pathCells: Pos[] = this.pathVisualisation ? this.pathVisualisation.getPath() : []

		for (let row = 0; row < grid.nRows; row++) {
			for (let col = 0; col < grid.nCols; col++) {
				const idx = row * grid.nCols + col
				const cell = grid.cells[idx]
				const x = col * cellWidth
				const y = row * cellHeight

				let cellBg = this.colors.cellDefault
				if (pathCells.some(p => p[0] === row && p[1] === col)) {
					cellBg = this.colors.cellPath
				}

				if (this.destinationPos && this.destinationPos[0] === row && this.destinationPos[1] === col) {
					cellBg = this.colors.cellDestination
				}

				if (this.hoveredCell && this.hoveredCell[0] === row && this.hoveredCell[1] === col) {
					cellBg = this.colors.cellHighlight
				}

				drawSquare(this.container, x, y, cellWidth, cellHeight, cellBg)
				if (cell.walls[0]) {
					// North
					drawLine(this.container, x, y, x + cellWidth, y, this.lineWidth, this.colors.wallColor)
				}

				if (cell.walls[1]) {
					// East
					drawLine(
						this.container,
						x + cellWidth,
						y,
						x + cellWidth,
						y + cellHeight,
						this.lineWidth,
						this.colors.wallColor,
					)
				}

				if (cell.walls[2]) {
					// South
					drawLine(
						this.container,
						x,
						y + cellHeight,
						x + cellWidth,
						y + cellHeight,
						this.lineWidth,
						this.colors.wallColor,
					)
				}

				if (cell.walls[3]) {
					// West
					drawLine(this.container, x, y, x, y + cellHeight, this.lineWidth, this.colors.wallColor)
				}
			}
		}

		if (this.playerPosition) {
			const [row, col] = this.playerPosition
			if (row >= 0 && row < grid.nRows && col >= 0 && col < grid.nCols) {
				const x = col * cellWidth + cellWidth / 2
				const y = row * cellHeight + cellHeight / 2
				const radius = Math.min(cellWidth, cellHeight) / this.playerMarkerScale

				ctx.beginPath()
				ctx.arc(x, y, radius, 0, 2 * Math.PI)
				ctx.fillStyle = this.colors.playerColor
				ctx.fill()
			}
		}

		if (this.destinationPos) {
			const [row, col] = this.destinationPos
			if (row >= 0 && row < grid.nRows && col >= 0 && col < grid.nCols) {
				const x = col * cellWidth + cellWidth / 2
				const y = row * cellHeight + cellHeight / 2
				const size = Math.min(cellWidth, cellHeight) / this.destinationMarkerScale

				ctx.strokeStyle = this.colors.destinationMarkerColor
				ctx.lineWidth = this.lineWidth + 1
				ctx.beginPath()
				ctx.moveTo(x - size / 2, y - size / 2)
				ctx.lineTo(x + size / 2, y + size / 2)
				ctx.moveTo(x + size / 2, y - size / 2)
				ctx.lineTo(x - size / 2, y + size / 2)
				ctx.stroke()
			}
		}
	}

	private getCellDimensions(grid: Grid): { cellWidth: number; cellHeight: number } {
		const cellWidth = Math.floor(this.width / grid.nCols)
		const cellHeight = Math.floor(this.height / grid.nRows)

		return { cellWidth, cellHeight }
	}

	private getCellPositionFromEvent(e: PointerEvent, grid: Grid): Pos | null {
		const rect = this.container.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		const { cellWidth, cellHeight } = this.getCellDimensions(grid)
		const col = Math.floor(x / cellWidth)
		const row = Math.floor(y / cellHeight)

		if (row >= 0 && row < grid.nRows && col >= 0 && col < grid.nCols) {
			return [row, col]
		}

		return null
	}
}
