import * as THREE from 'three'

import { imgui_end_frame, imgui_init, imgui_render, imgui_start_frame } from './engine/imgui.ts'
import { window_init } from './engine/window.ts'
import { gui_debug_window } from './gui.ts'

export type State = {
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	instances: THREE.Object3D[]
	last_time_ms: number
	clear_color: number[]
}

function nextframe(time_ms: number, state: State) {
	renderer.setClearColor(
		new THREE.Color(state.clear_color[0], state.clear_color[1], state.clear_color[2]),
	)
	// handle controls

	// update state
	state.instances.forEach(cube => {
		cube.rotation.x += 0.01
		cube.rotation.y += 0.01
	})

	// update gui overlay
	imgui_start_frame(time_ms)
	gui_debug_window(time_ms, state)
	imgui_end_frame()

	// render and swap
	renderer.render(state.scene, state.camera)
	imgui_render()
	renderer.state.reset()
	state.last_time_ms = time_ms
}

async function main(renderer: THREE.WebGLRenderer) {
	window_init(renderer)
	await imgui_init(renderer)
	const scene = new THREE.Scene()

	const camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000,
	)
	camera.position.z = 5

	const state: State = {
		scene,
		camera,
		instances: [],
		last_time_ms: 0.0,
		clear_color: [0.0, 0.0, 0.0],
	}

	const geometry = new THREE.BoxGeometry(1, 1, 1)
	const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
	const cube = new THREE.Mesh(geometry, material)
	state.instances.push(cube)
	state.scene.add(cube)

	console.log('starting loop')
	renderer.setAnimationLoop(time_ms => {
		nextframe(time_ms, state)
	})

	// TODO(...): figure out where this needs to go and wether it is
	// necessary in the first place.
	// window_die(renderer);
}

const renderer = new THREE.WebGLRenderer()
document.body.appendChild(renderer.domElement)
renderer.setSize(window.innerWidth, window.innerHeight)

void main(renderer)
