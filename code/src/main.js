import * as THREE from 'three';

import { window_init, window_die } from './engine/window.js'
import { ImGui, imgui_init, imgui_start_frame, imgui_end_frame, imgui_render, imgui_die } from './engine/imgui.js'
import { gui_debug_window } from './gui.js'

function nextframe(time_ms, state) {
	renderer.setClearColor(new THREE.Color(
		state.clear_color.x,
		state.clear_color.y,
		state.clear_color.z
	));

	// handle controls

	// update state
	state.instances.forEach((cube) => {
		cube.rotation.x += 0.01
		cube.rotation.y += 0.01
	})


	// update gui overlay
	imgui_start_frame(time_ms)
	gui_debug_window(time_ms, state)
	imgui_end_frame()

	// render and swap
	renderer.render(state.scene, state.camera);
	imgui_render()
	renderer.state.reset();
	state.last_time_ms = time_ms;
}



async function main(renderer) {
	window_init(renderer)
	await imgui_init(renderer)
	console.log('initizalized')

	const state = {
		scene:			undefined,
		camera:			undefined,
		instances:		[],
		clear_color:	new ImGui.Vec4(0.0, 0.0, 0.0, 1.00),
		last_time_ms:	0.0,
	}

	state.scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.z = 5;
	state.camera = camera;

	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
	const cube = new THREE.Mesh(geometry, material);
	state.instances.push(cube);
	state.scene.add(cube);

	console.log('starting loop')
	renderer.setAnimationLoop((time_ms) => {
		nextframe(time_ms, state);
	}).then(() => {
		imgui_die()
		window_die(renderer)
	})

}

const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);
renderer.setSize(window.innerWidth, window.innerHeight);


main(renderer);
