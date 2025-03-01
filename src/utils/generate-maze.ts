/* constants */
const NEIGHBOR_DIRECTIONS: [number, number][] = [
	[-1, 0],
	[0, 1],
	[1, 0],
	[0, -1],
]

/* types */
type Cell = {
	walls: [boolean, boolean, boolean, boolean]
	visited: boolean
}

type Grid = {
	cells: Cell[]
	n_rows: number
	n_cols: number
}

type Pos = [number, number]

/* functions */
function idx(grid: Grid, pos: Pos): number | undefined {
	if (pos[0] < 0 || pos[0] >= grid.n_rows) {
		return undefined
	}

	if (pos[1] < 0 || pos[1] >= grid.n_cols) {
		return undefined
	}

	return pos[0] * grid.n_cols + pos[1]
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

	const i_selected = Math.floor(Math.random() * neighbors.length)

	return neighbors[i_selected]
}

function remove_wall(grid: Grid, p1: Pos, p2: Pos): void {
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

export function generate(n_rows: number, n_cols: number): Grid {
	const cells: Cell[] = new Array(n_rows * n_cols).fill(null).map(() => ({
		walls: [true, true, true, true],
		visited: false,
	}))
	const grid: Grid = { cells, n_rows, n_cols }

	const stack: Pos[] = []
	let pos: Pos = [0, 0]
	grid.cells[idx(grid, pos)!].visited = true
	stack.push(pos)
	while (stack.length > 0) {
		pos = stack[stack.length - 1]
		const next_pos = next(grid, pos)
		if (next_pos) {
			grid.cells[idx(grid, next_pos)!].visited = true
			remove_wall(grid, pos, next_pos)
			stack.push(next_pos)
		} else {
			stack.pop()
		}
	}

	return grid
}

function draw_line(
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

export function draw_square(
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
	const w = Math.floor(canvas.width / grid.n_cols)
	const h = Math.floor(canvas.height / grid.n_rows)

	const pad = 0
	path.forEach(C =>
		draw_square(canvas, w * C[1] + pad / 2, h * C[0] + pad / 2, w - pad, h - pad, '#FAA'),
	)

	draw_square(canvas, w * A[1], h * A[0], w, h, '#f00')
	draw_square(canvas, w * B[1], h * B[0], w, h, '#f00')

	for (let i_row = 0; i_row < grid.n_rows; ++i_row) {
		for (let i_col = 0; i_col < grid.n_cols; ++i_col) {
			const { walls } = grid.cells[i_row * grid.n_cols + i_col]
			const x = i_col * w
			const y = i_row * h

			// if (visited) draw_square(canvas, x, y, w, h, 'rgba(224, 49, 49, 0.2)');

			if (walls[0]) {
				draw_line(canvas, x, y, x + w, y, 1, '#000')
			} // North

			if (walls[1]) {
				draw_line(canvas, x + w, y, x + w, y + h, 1, '#000')
			} // East

			if (walls[2]) {
				draw_line(canvas, x, y + h, x + w, y + h, 1, '#000')
			} // South

			if (walls[3]) {
				draw_line(canvas, x, y, x, y + h, 1, '#000')
			} // West
		}
	}
}

export function random_cell(grid: Grid): Pos {
	return [Math.floor(Math.random() * grid.n_rows), Math.floor(Math.random() * grid.n_cols)]
}

export function pathfind(grid: Grid, A: Pos, B: Pos): Pos[] {
	const i_A = idx(grid, A)!
	const i_B = idx(grid, B)!

	const open: number[] = [i_A]
	const parents: Record<number, number> = {}

	while (open.length > 0) {
		let i_current = open.shift()!
		if (i_current === i_B) {
			const path: Pos[] = []
			while (i_current in parents) {
				path.unshift([Math.floor(i_current / grid.n_cols), i_current % grid.n_cols])
				i_current = parents[i_current]
			}

			return path
		}

		for (const dir of NEIGHBOR_DIRECTIONS) {
			const pos: Pos = [
				Math.floor(i_current / grid.n_cols) + dir[0],
				(i_current % grid.n_cols) + dir[1],
			]
			const i_neighbor = idx(grid, pos)
			if (i_neighbor !== undefined && !(i_neighbor in parents)) {
				parents[i_neighbor] = i_current
				open.push(i_neighbor)
			}
		}
	}

	return []
}
