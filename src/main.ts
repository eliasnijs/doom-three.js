import { Color, WebGLRenderer } from 'three'

import { Vec3 } from 'cannon-es'
import { createMap } from './engine/map.ts'
import { State } from './engine/state.ts'
import { windowInit } from './engine/window.ts'
import { Cube } from './game-objects/cube.ts'
import { DebugPanel } from './game-objects/debug-panel.ts'
import { OctreeVisualizer } from './game-objects/octree-visualizer.ts'
import { octtree_initialize, octtree_insert } from './utils/octtree.ts'

export const MAZE_X_SIZE = 42
export const MAZE_Z_SIZE = 42
export const GRID_SIZE = 10
export const MAZE_X_CENTER = GRID_SIZE * Math.floor(MAZE_X_SIZE / 2)
export const MAZE_Z_CENTER = GRID_SIZE * Math.floor(MAZE_Z_SIZE / 2)

function animate(time_ms: number, state: State, renderer: WebGLRenderer) {
	renderer.setClearColor(new Color(0, 0, 0)) // Set background color to black

	// update state
	state.animate(time_ms, renderer)

	// render and swap
	renderer.render(state.scene, state.activeCamera)
	renderer.state.reset()
}

async function main(renderer: WebGLRenderer) {
	windowInit(renderer)

	const state = new State()

	const debugPanel = new DebugPanel(state, renderer)
	// new RotatingTv(state)
	// await createMap(debugPanel, state)

	// Create an octree
	const octree = octtree_initialize(
		new Vec3(-50, -50, -50), // origin
		100,                     // size
		4,                       // capacity (how many objects per node before subdividing)
		5                        // max depth
	)

	const numCubes = 30;
	for (let i = 0; i < numCubes; i++) {
		const position = new Vec3(
			(Math.random() * 80) - 40, // -40 to 40
			(Math.random() * 80) - 40, // -40 to 40
			(Math.random() * 80) - 40  // -40 to 40
		);
		const cubeSize = 5;
		const cube = new Cube(state, position, cubeSize);

		// Create bounding box vectors for the element
		const bbl = new Vec3(position.x - cubeSize/2, position.y - cubeSize/2, position.z - cubeSize/2);
		const ftr = new Vec3(position.x + cubeSize/2, position.y + cubeSize/2, position.z + cubeSize/2);
		const element = {bbl: bbl, ftr: ftr, reference: cube};
		octtree_insert(octree, element);
	}

	new OctreeVisualizer(state, octree)
	console.log('Octree structure:', octree)

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
