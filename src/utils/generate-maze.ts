/* constants */
import { MAZE_X_SIZE, MAZE_Z_SIZE } from '../main.ts'

const NEIGHBOR_DIRECTIONS: [number, number][] = [
	[-1, 0],
	[0, 1],
	[1, 0],
	[0, -1],
]

/* types */
export type Cell = {
	walls: [boolean, boolean, boolean, boolean]
	visited: boolean
}

export type Grid = {
	cells: Cell[]
	nRows: number
	nCols: number
}

export type Pos = [number, number]

/* functions */
function idx(grid: Grid, pos: Pos): number | undefined {
	if (pos[0] < 0 || pos[0] >= grid.nRows) {
		return undefined
	}

	if (pos[1] < 0 || pos[1] >= grid.nCols) {
		return undefined
	}

	return pos[0] * grid.nCols + pos[1]
}

function next(grid: Grid, pos: Pos): Pos | undefined {
	const neighbors: Pos[] = []
	for (const dp of NEIGHBOR_DIRECTIONS) {
		const pos_: Pos = [pos[0] + dp[0], pos[1] + dp[1]]
		const i = idx(grid, pos_)
		if (i !== undefined && !grid.cells[i].visited) {
			neighbors.push(pos_)
		}
	}

	if (neighbors.length <= 0) {
		return undefined
	}

	const selectedIdx = Math.floor(Math.random() * neighbors.length)

	return neighbors[selectedIdx]
}

function removeWall(grid: Grid, p1: Pos, p2: Pos): void {
	const i1 = idx(grid, p1)
	const i2 = idx(grid, p2)
	if (i1 === undefined || i2 === undefined) {
		return
	}

	const c1 = grid.cells[i1]
	const c2 = grid.cells[i2]
	const di = p2[0] - p1[0]
	const dj = p2[1] - p1[1]

	if (di === -1) {
		c1.walls[0] = false
		c2.walls[2] = false
	}

	if (di === 1) {
		c1.walls[2] = false
		c2.walls[0] = false
	}

	if (dj === -1) {
		c1.walls[3] = false
		c2.walls[1] = false
	}

	if (dj === 1) {
		c1.walls[1] = false
		c2.walls[3] = false
	}
}

export function generate(nRows: number, nCols: number, upscale: boolean = true): Grid {
	const cells: Cell[] = new Array(nRows * nCols).fill(null).map(() => ({
		walls: [true, true, true, true],
		visited: false,
	}))
	const grid: Grid = { cells, nRows: nRows, nCols: nCols }

	const stack: Pos[] = []
	let pos: Pos = [0, 0]
	grid.cells[idx(grid, pos)!].visited = true
	stack.push(pos)
	while (stack.length > 0) {
		pos = stack[stack.length - 1]
		const nextPos = next(grid, pos)
		if (nextPos) {
			grid.cells[idx(grid, nextPos)!].visited = true
			removeWall(grid, pos, nextPos)
			stack.push(nextPos)
		} else {
			stack.pop()
		}
	}

	if (!upscale) {
		return grid
	}

	// --- Second pass: upscale and insert empty space between all cells ---
	const bigRows = nRows * 2 - 1
	const bigCols = nCols * 2 - 1
	const bigCells: Cell[] = new Array(bigRows * bigCols).fill(null).map(() => ({
		walls: [true, true, true, true],
		visited: false,
	}))
	// Copy original cells to even-even positions
	for (let r = 0; r < nRows; r++) {
		for (let c = 0; c < nCols; c++) {
			const origIdx = r * nCols + c
			const bigR = r * 2
			const bigC = c * 2
			const bigIdx = bigR * bigCols + bigC
			bigCells[bigIdx].walls = [...grid.cells[origIdx].walls]
			bigCells[bigIdx].visited = grid.cells[origIdx].visited
		}
	}

	// Set buffer cells between connected originals
	for (let r = 0; r < nRows; r++) {
		for (let c = 0; c < nCols; c++) {
			const origIdx = r * nCols + c
			const bigR = r * 2
			const bigC = c * 2
			const here = grid.cells[origIdx]
			// South neighbor
			if (!here.walls[2] && r + 1 < nRows) {
				const bufIdx = (bigR + 1) * bigCols + bigC
				bigCells[bufIdx].walls = [false, true, false, true] // open north & south
			}

			// East neighbor
			if (!here.walls[1] && c + 1 < nCols) {
				const bufIdx = bigR * bigCols + (bigC + 1)
				bigCells[bufIdx].walls = [true, false, true, false] // open east & west
			}
		}
	}

	return { cells: bigCells, nRows: bigRows, nCols: bigCols }
}

export function drawLine(
	canvas: HTMLCanvasElement,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	w: number,
	color: string,
): void {
	const ctx = canvas.getContext('2d')
	if (!ctx) {
		return
	}

	ctx.beginPath()
	ctx.moveTo(x1, y1)
	ctx.lineTo(x2, y2)
	ctx.lineWidth = w
	ctx.strokeStyle = color
	ctx.stroke()
}

export function drawSquare(
	canvas: HTMLCanvasElement,
	x: number,
	y: number,
	w: number,
	h: number,
	color: string,
): void {
	const ctx = canvas.getContext('2d')
	if (!ctx) {
		return
	}

	ctx.fillStyle = color
	ctx.fillRect(x, y, w, h)
}

export function render(grid: Grid, A: Pos, B: Pos, path: Pos[]) {
	const canvas = document.getElementById('canvas')
	if (!(canvas instanceof HTMLCanvasElement)) {
		throw new Error('Canvas not found')
	}

	const ctx = canvas.getContext('2d')
	if (!ctx) {
		throw new Error('2D context not found')
	}

	ctx.clearRect(0, 0, canvas.width, canvas.height)
	const w = Math.floor(canvas.width / grid.nCols)
	const h = Math.floor(canvas.height / grid.nRows)

	const pad = 0
	path.forEach(C => drawSquare(canvas, w * C[1] + pad / 2, h * C[0] + pad / 2, w - pad, h - pad, '#FAA'))

	drawSquare(canvas, w * A[1], h * A[0], w, h, '#f00')
	drawSquare(canvas, w * B[1], h * B[0], w, h, '#f00')

	for (let rowIdx = 0; rowIdx < grid.nRows; ++rowIdx) {
		for (let colIdx = 0; colIdx < grid.nCols; ++colIdx) {
			const { walls } = grid.cells[rowIdx * grid.nCols + colIdx]
			const x = colIdx * w
			const y = rowIdx * h

			// if (visited) draw_square(canvas, x, y, w, h, 'rgba(224, 49, 49, 0.2)');

			if (walls[0]) {
				drawLine(canvas, x, y, x + w, y, 1, '#000')
			} // North

			if (walls[1]) {
				drawLine(canvas, x + w, y, x + w, y + h, 1, '#000')
			} // East

			if (walls[2]) {
				drawLine(canvas, x, y + h, x + w, y + h, 1, '#000')
			} // South

			if (walls[3]) {
				drawLine(canvas, x, y, x, y + h, 1, '#000')
			} // West
		}
	}
}

export function randomCell(grid: Grid): Pos {
	// Only pick cells with at least one open side
	const candidates: Pos[] = []
	for (let row = 0; row < grid.nRows; row++) {
		for (let col = 0; col < grid.nCols; col++) {
			const idx = row * grid.nCols + col
			const cell = grid.cells[idx]
			if (cell.walls.some(w => !w)) {
				candidates.push([row, col])
			}
		}
	}

	if (candidates.length === 0) {
		// fallback: just pick any cell
		return [0, 0]
	}

	return candidates[Math.floor(Math.random() * candidates.length)]
}

export function distManhattan(a: Pos, b: Pos): number {
	return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])
}

export function idx2pos(grid: Grid, i: number): Pos {
	const row = Math.floor(i / grid.nCols)
	const col = i % grid.nCols

	return [row, col]
}

export function reconstructPath(grid: Grid, parents: Record<number, number>, iNode: number): Pos[] {
	const path: Pos[] = [idx2pos(grid, iNode)]
	while (iNode in parents) {
		iNode = parents[iNode]
		path.unshift(idx2pos(grid, iNode))
	}

	return path
}

export function pathfind(grid: Grid, A: Pos, B: Pos): Pos[] {
	const iA = idx(grid, A)
	const iB = idx(grid, B)

	// Handle invalid positions
	if (iA === undefined || iB === undefined) {
		return []
	}

	const gScore: number[] = new Array(grid.nRows * grid.nCols).fill(Infinity)
	const fScore: number[] = new Array(grid.nRows * grid.nCols).fill(Infinity)
	const parents: Record<number, number> = {}
	const open: number[] = [iA]

	gScore[iA] = 0
	fScore[iA] = distManhattan(A, B)

	while (open.length > 0) {
		let iCurrent = open[0]
		let f = fScore[iCurrent]

		// Find node with lowest f-score
		for (const iNew of open) {
			const fNew = fScore[iNew]
			if (fNew < f) {
				f = fNew
				iCurrent = iNew
			}
		}

		// If reached goal, reconstruct and return path
		if (iB === iCurrent) {
			return reconstructPath(grid, parents, iCurrent)
		}

		// Remove current node from open list
		open.splice(open.indexOf(iCurrent), 1)

		// Check neighbors
		for (const dir of NEIGHBOR_DIRECTIONS) {
			const pos = idx2pos(grid, iCurrent)
			const neighborPos: Pos = [pos[0] + dir[0], pos[1] + dir[1]]
			const iNeighbor = idx(grid, neighborPos)

			if (iNeighbor === undefined) {
				continue
			}

			// Check if there's a wall in this direction
			let wallExists = false
			if (dir[0] === -1) {
				wallExists = grid.cells[iCurrent].walls[0]
			} // North
			else if (dir[0] === 1) {
				wallExists = grid.cells[iCurrent].walls[2]
			} // South
			else if (dir[1] === -1) {
				wallExists = grid.cells[iCurrent].walls[3]
			} // West
			else if (dir[1] === 1) {
				wallExists = grid.cells[iCurrent].walls[1]
			} // East

			if (wallExists) {
				continue
			}

			// Calculate new g-score
			const g = gScore[iCurrent] + 1 // Cost to move is 1
			const gNeighbor = gScore[iNeighbor]

			if (g < gNeighbor) {
				// This path is better, record it
				parents[iNeighbor] = iCurrent
				gScore[iNeighbor] = g
				fScore[iNeighbor] = g + distManhattan(idx2pos(grid, iNeighbor), B)

				if (!open.includes(iNeighbor)) {
					open.push(iNeighbor)
				}
			}
		}
	}

	// No path found
	return []
}

export function mazeGridToWorldGrid([x, y]: Pos): Pos {
	return [MAZE_X_SIZE - 1 - x, MAZE_Z_SIZE - 1 - y]
}
