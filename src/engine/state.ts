import * as THREE from 'three'
import { PerspectiveCamera, Scene } from 'three'

import { GameObject } from './game-object.ts'

export class State {
	scene: Scene
	camera: PerspectiveCamera
	gameObjects: GameObject[]
	last_time_ms: number

	constructor() {
		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000,
		)
		this.camera.position.z = 5
		this.gameObjects = []
		this.last_time_ms = 0.0
	}

	animate(time_ms: number) {
		const delta = time_ms - this.last_time_ms
		this.last_time_ms = time_ms

		this.gameObjects.forEach(gameObject => gameObject.animate(delta))
	}

	// Register a game object with the state
	registerGameObject(gameObject: GameObject) {
		this.gameObjects.push(gameObject)
	}

	// Get the first game object of a given type, useful for finding singletons
	findFirstGameObjectOfType<T extends GameObject>(
		type: new (state: State) => T,
	): T | undefined {
		for (const gameObject of this.gameObjects) {
			if (gameObject instanceof type) {
				return gameObject
			}
		}
	}

	// Get all game objects of a given type
	findAllGameObjectsOfType<T extends GameObject>(type: new (state: State) => T): T[] {
		const gameObjects: T[] = []
		for (const gameObject of this.gameObjects) {
			if (gameObject instanceof type) {
				gameObjects.push(gameObject)
			}
		}
		return gameObjects
	}
}
