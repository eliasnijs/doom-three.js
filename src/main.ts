import { Color, WebGLRenderer } from 'three'

import { createMap } from './engine/map.ts'
import { State } from './engine/state.ts'
import { windowInit } from './engine/window.ts'
import { Cube } from './game-objects/cube.ts'
import { DebugPanel } from './game-objects/debug-panel.ts'
import { OctreeVisualizer } from './game-objects/octree-visualizer.ts'
import { initialize, insert } from './utils/octtree.ts'

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
	const octree = initialize(
		{ x: -50, y: -50, z: -50 }, // origin
		100,                         // size
		4,                           // capacity (how many objects per node before subdividing)
		5                            // max depth
	)

	// Create cubes at random positions and add them to the octree
	const numCubes = 30;

	for (let i = 0; i < numCubes; i++) {
		// Generate random position within the octree bounds
		const position = {
			x: (Math.random() * 80) - 40, // -40 to 40
			y: (Math.random() * 80) - 40, // -40 to 40
			z: (Math.random() * 80) - 40  // -40 to 40
		};

		// Create a cube at this position
		const cube = new Cube(state, position);

		// Add to octree
		const element = {
			position: position,
			reference: cube // Store reference to the cube object
		};

		insert(octree, octree.root, element);

		// Log each cube's position
		console.log(`Cube ${i}: Position (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
	}

	// Create the octree visualizer
	new OctreeVisualizer(state, octree)

	// Log the octree to the browser console
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
