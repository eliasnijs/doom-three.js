import * as THREE from 'three'
import { PerspectiveCamera, Scene } from 'three'

import { GameObject } from './game-object.ts'

export type State = {
	scene: Scene
	camera: PerspectiveCamera
	gameObjects: GameObject[]
	last_time_ms: number
}

export function createState(): State {
	const scene = new THREE.Scene()

	const camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000,
	)
	camera.position.z = 5

	return {
		scene,
		camera,
		gameObjects: [],
		last_time_ms: 0.0,
	}
}

export function updateState(state: State, time_ms: number) {
	const delta = time_ms - state.last_time_ms
	state.last_time_ms = time_ms

	// update all game objects
	state.gameObjects.forEach(gameObject => gameObject.animate(delta))
}
