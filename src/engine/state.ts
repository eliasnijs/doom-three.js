////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Dependencies

import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'

import { BoxColliderVisualizer } from '../game-objects/box-collider-visualizer.ts'
import { OctreeVisualizer } from '../game-objects/octree-visualizer.ts'
import { MAZE_X_CENTER, MAZE_Z_CENTER } from '../main.ts'
import { GameObject } from './game-object.ts'
import { OctTree, octTreeInitialize, octTreeInsert, octTreeMarkDead, octTreeRebuild } from './octtree.ts'
import { BoxCollider } from './physics.ts'

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Types

type Constructor<T> = { new (...args: never[]): T }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Configuration

const DYNAMIC_TREE_MAX_DEPTH = 8 // max depth of the dynamic spatial partitioning octtree
const DYNAMIC_TREE_N_CAPACITY = 8 // max capacity of a leaf in the dynamic spatial partitioning octtree
const STATIC_TREE_MAX_DEPTH = 8 // max depth of the static spatial partitioning octtree
const STATIC_TREE_N_CAPACITY = 8 // max capacity of a leaf in the static spatial partitioning octtree

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Data Layouts

export class State {
	scene: Scene
	last_time_ms: number

	gameObjects: GameObject[]

	// NOTE(Elias): management of the colliders is the responsibility of the owner of the colliders, meaning
	// that the owner is also responsible for cleaning up it's colliders using the 'unregister' function.
	dynamicCollisionTree: OctTree // stores colliders that are updated each frame
	staticCollisionTree: OctTree // stores colliders that are updated on load

	activeCamera: PerspectiveCamera
	ambientLight: AmbientLight
	directionalLight: DirectionalLight

	debugCamera: PerspectiveCamera
	debug: boolean = false
	boxColliderVisualizer?: BoxColliderVisualizer
	octreeVisualizer?: OctreeVisualizer

	constructor(worldsize: number) {
		this.scene = new Scene()
		this.last_time_ms = 0.0

		this.gameObjects = []
		this.dynamicCollisionTree = octTreeInitialize(
			new Vector3(-10.0, -10, -10),
			worldsize,
			DYNAMIC_TREE_N_CAPACITY,
			DYNAMIC_TREE_MAX_DEPTH,
		)
		this.staticCollisionTree = octTreeInitialize(
			new Vector3(-10.0, -10, -10),
			worldsize,
			STATIC_TREE_N_CAPACITY,
			STATIC_TREE_MAX_DEPTH,
		)

		// Create a debug camera
		this.debugCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
		this.debugCamera.position.z = MAZE_Z_CENTER - 25
		this.debugCamera.position.x = MAZE_X_CENTER
		this.debugCamera.position.y = 150
		this.activeCamera = this.debugCamera

		// Set lighting
		this.ambientLight = new AmbientLight(0xffffff, 0.5)
		this.scene.add(this.ambientLight)

		this.directionalLight = new DirectionalLight(0xffffff, 5)
		this.directionalLight.position.set(5, 5, 0)
		this.directionalLight.castShadow = true
		this.directionalLight.shadow.mapSize.width = 1024 // Higher resolution shadows
		this.directionalLight.shadow.mapSize.height = 2048
		this.directionalLight.shadow.camera.near = 0.5
		this.directionalLight.shadow.camera.far = 50
		this.scene.add(this.directionalLight)

		// Listen for window resize
		window.addEventListener('resize', () => {
			// Update debug camera
			this.debugCamera.aspect = window.innerWidth / window.innerHeight
			this.debugCamera.updateProjectionMatrix()
			// Update active camera if different
			if (this.activeCamera && this.activeCamera !== this.debugCamera) {
				this.activeCamera.aspect = window.innerWidth / window.innerHeight
				this.activeCamera.updateProjectionMatrix()
			}
		})
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//// Configuring Functions

	toggleDebug() {
		this.debug = !this.debug

		for (const obj of this.gameObjects) {
			obj.setDebug(this.debug)
		}

		if (this.debug) {
			const staticColliders = this.getAllCollidersFromTree(this.staticCollisionTree)
			const dynamicColliders = this.getAllCollidersFromTree(this.dynamicCollisionTree)
			const allColliders = [...staticColliders, ...dynamicColliders]
			if (!this.boxColliderVisualizer) {
				this.boxColliderVisualizer = new BoxColliderVisualizer(this, allColliders)
			} else {
				this.boxColliderVisualizer.setColliders(allColliders)
			}

			if (!this.octreeVisualizer) {
				this.octreeVisualizer = new OctreeVisualizer(this, this.staticCollisionTree, 40, 8)
				new OctreeVisualizer(this, this.dynamicCollisionTree, 0.2, 8)
			}
		} else {
			if (this.boxColliderVisualizer) {
				this.boxColliderVisualizer.cleanup()
				this.unregisterGameObject(this.boxColliderVisualizer)
				this.boxColliderVisualizer = undefined
			}

			const octreeVisualizers = this.findAllGameObjectsOfType(OctreeVisualizer)
			for (const visualizer of octreeVisualizers) {
				visualizer.cleanup()
				this.unregisterGameObject(visualizer)
			}

			this.octreeVisualizer = undefined
		}
	}

	private getAllCollidersFromTree(tree: OctTree): BoxCollider[] {
		return tree.elements.filter((element): element is BoxCollider => element !== undefined)
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//// Updates

	animate(time_ms: number, renderer: WebGLRenderer) {
		const delta = time_ms - this.last_time_ms
		this.last_time_ms = time_ms
		octTreeRebuild(this.dynamicCollisionTree)
		this.gameObjects.forEach(gameObject => gameObject.animate(delta, this, renderer))
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//// Handling GameObjects

	registerGameObject(gameObject: GameObject) {
		this.gameObjects.push(gameObject)
	}

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

	////////////////////////////////////////////////////////////////////////////////////////////////////////////
	///// Physics

	registerCollider(collider: BoxCollider, isDynamic: boolean) {
		if (isDynamic) {
			octTreeInsert(this.dynamicCollisionTree, collider)
		} else {
			octTreeInsert(this.staticCollisionTree, collider)
		}
	}

	unregisterCollider(collider: BoxCollider) {
		octTreeMarkDead(this.dynamicCollisionTree, collider)
		octTreeMarkDead(this.staticCollisionTree, collider)
	}
}
