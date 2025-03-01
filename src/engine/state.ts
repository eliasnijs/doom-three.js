import {
	AmbientLight,
	DirectionalLight,
	Object3D,
	PerspectiveCamera,
	Scene,
	WebGLRenderer,
} from 'three'

import { MAZE_X_CENTER, MAZE_Z_CENTER } from '../main.ts'
import { GameObject } from './game-object.ts'

type Constructor<T> = { new (...args: never[]): T }

export class State {
	scene: Scene
	camera: PerspectiveCamera
	gameObjects: GameObject[]
	last_time_ms: number
	ambientLight: AmbientLight
	directionalLight: DirectionalLight
	debug: boolean = false

	constructor() {
		this.scene = new Scene()
		this.camera = new PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000,
		)

		this.camera.position.z = MAZE_Z_CENTER - 25
		this.camera.position.x = MAZE_X_CENTER
		this.camera.position.y = 150

		this.gameObjects = []
		this.last_time_ms = 0.0

		// Create an ambient light
		this.ambientLight = new AmbientLight(0xffffff, 0.5)
		this.scene.add(this.ambientLight)

		// Create a directional light
		this.directionalLight = new DirectionalLight(0xffffff, 5)
		this.directionalLight.position.set(5, 5, 0)

		// Create a target object below the light
		const lightTarget = new Object3D()
		lightTarget.position.set(0, 0, 0) // Adjust as needed
		this.scene.add(lightTarget)

		// Enable shadow casting
		this.directionalLight.castShadow = true
		this.directionalLight.shadow.mapSize.width = 2048 // Higher resolution shadows
		this.directionalLight.shadow.mapSize.height = 2048
		this.directionalLight.shadow.camera.near = 0.5
		this.directionalLight.shadow.camera.far = 50

		// Set the light to point at the target
		this.scene.add(this.directionalLight)
	}

	animate(time_ms: number, renderer: WebGLRenderer) {
		const delta = time_ms - this.last_time_ms
		this.last_time_ms = time_ms

		this.gameObjects.forEach(gameObject => gameObject.animate(delta, this, renderer))
	}

	// Register a game object with the state
	registerGameObject(gameObject: GameObject) {
		this.gameObjects.push(gameObject)
	}

	// Remove a game object from the state
	unregisterGameObject(gameObject: GameObject) {
		const index = this.gameObjects.indexOf(gameObject)
		if (index !== -1) {
			this.gameObjects.splice(index, 1)
		}
	}

	// Get the first game object of a given type, useful for finding singletons
	findFirstGameObjectOfType<T extends GameObject>(type: Constructor<T>): T | undefined {
		for (const gameObject of this.gameObjects) {
			if (gameObject instanceof type) {
				return gameObject
			}
		}
	}

	// Get all game objects of a given type
	findAllGameObjectsOfType<T extends GameObject>(type: Constructor<T>): T[] {
		const gameObjects: T[] = []
		for (const gameObject of this.gameObjects) {
			if (gameObject instanceof type) {
				gameObjects.push(gameObject)
			}
		}

		return gameObjects
	}
}
