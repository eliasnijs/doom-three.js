import { Vec3, World } from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import {
	AmbientLight,
	DirectionalLight,
	Mesh,
	PerspectiveCamera,
	Scene,
	WebGLRenderer,
} from 'three'

import { MAZE_X_CENTER, MAZE_Z_CENTER } from '../main.ts'
import { GameObject } from './game-object.ts'

type Constructor<T> = { new (...args: never[]): T }

export class State {
	scene: Scene
	debugCamera: PerspectiveCamera
	gameObjects: GameObject[]
	last_time_ms: number
	ambientLight: AmbientLight
	directionalLight: DirectionalLight
	debug: boolean = false
	physicsWorld: World
	cannonDebugger?: { update: () => void }
	cannonDebuggerMeshes: Mesh[] = []
	activeCamera: PerspectiveCamera

	constructor() {
		this.scene = new Scene()

		// Create a debug camera
		this.debugCamera = new PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000,
		)
		this.debugCamera.position.z = MAZE_Z_CENTER - 25
		this.debugCamera.position.x = MAZE_X_CENTER
		this.debugCamera.position.y = 150

		this.gameObjects = []
		this.last_time_ms = 0.0

		// Set the active camera
		this.activeCamera = this.debugCamera

		// Create an ambient light
		this.ambientLight = new AmbientLight(0xffffff, 0.5)
		this.scene.add(this.ambientLight)

		// Create a directional light
		this.directionalLight = new DirectionalLight(0xffffff, 5)
		this.directionalLight.position.set(5, 5, 0)

		// Enable shadow casting
		this.directionalLight.castShadow = true
		this.directionalLight.shadow.mapSize.width = 2048 // Higher resolution shadows
		this.directionalLight.shadow.mapSize.height = 2048
		this.directionalLight.shadow.camera.near = 0.5
		this.directionalLight.shadow.camera.far = 50

		// Add the light to the scene
		this.scene.add(this.directionalLight)

		// Create the physics world
		this.physicsWorld = new World({
			gravity: new Vec3(0, -9.82, 0),
		})

		// Update the cannon-es debugger
		this.cannonDebugger = CannonDebugger(this.scene, this.physicsWorld, {
			color: 0xff0000,
			onInit: (_, mesh) => {
				this.cannonDebuggerMeshes.push(mesh)
				mesh.visible = this.debug
			},
		})
	}

	toggleDebug() {
		// Loop all objects and set the wireframe
		this.debug = !this.debug
		for (const obj of this.gameObjects) {
			obj.setDebug(this.debug)
		}

		// Toggle the visibility of the cannon-es debugger
		for (const mesh of this.cannonDebuggerMeshes) {
			mesh.visible = this.debug
		}
	}

	animate(time_ms: number, renderer: WebGLRenderer) {
		const delta = time_ms - this.last_time_ms
		this.last_time_ms = time_ms

		// Run the physics simulation
		this.physicsWorld.step(delta / 1000)

		// Update the cannon-es debugger
		this.cannonDebugger?.update()

		// Update all game objects
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
