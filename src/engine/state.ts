import { World } from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import {
	AmbientLight,
	DirectionalLight,
	Mesh,
	PerspectiveCamera,
	Scene,
	WebGLRenderer,
	Vector3
} from 'three'

import { MAZE_X_CENTER, MAZE_Z_CENTER } from '../main.ts'
import { GameObject } from './game-object.ts'
import { OctTree, octrree_rebuild, octtree_insert, octtree_initialize} from '../utils/octtree.ts'
import { BoxCollider } from '../engine/box-collider.ts'
import { OctreeVisualizer } from '../game-objects/octree-visualizer.ts'

type Constructor<T> = { new (...args: never[]): T }

export class State {
	// TODO(Elias): check if this is nessecary: `physicsWorld:World`

	scene:					Scene
	activeCamera:			PerspectiveCamera
	gameObjects:			GameObject[]

	dynamicCollisionTree:	OctTree // stores colliders that are updated each frame
	staticCollisionTree:	OctTree // stores colliders that are updated on load
	octtreevision:			OctTreeVisualizer[]

	ambientLight:			AmbientLight
	directionalLight:		DirectionalLight

	last_time_ms:			number

	debugCamera:			PerspectiveCamera
	debug:					boolean				= false
	cannonDebugger?:		{ update: () => void }
	cannonDebuggerMeshes:	Mesh[] = []


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

		this.dynamicCollisionTree = octtree_initialize(new Vector3(-10.0,-10,-10), 450, 8, 8)
		this.staticCollisionTree  = octtree_initialize(new Vector3(-10.0,-10,-10), 450, 8, 8)

		this.octtreevision = []
		// this.octreevision.push(new OctreeVisualizer(this, this.dynamicCollisionTree, 0.2))
		// this.octtreevision.push(new OctreeVisualizer(this, this.staticCollisionTree, 0.8))

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
			gravity: new Vector3(0, -9.82, 0),
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

	// ANCHOR(Elias)
	registerCollider(collider: BoxCollider, isDynamic:bool) {
		if (isDynamic) {
			octtree_insert(this.dynamicCollisionTree, collider)
		} else {
			octtree_insert(this.staticCollisionTree, collider)
		}
	}

	unregisterCollider(collider: BoxCollider) {
		octtree_mark_dead(this.dynamicCollisionTree, collider)
		octtree_mark_dead(this.staticCollisionTree,  collider)
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
