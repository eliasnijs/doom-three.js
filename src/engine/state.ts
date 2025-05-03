////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Dependencies

import {
	AmbientLight,
	Color,
	FogExp2,
	PerspectiveCamera,
	PMREMGenerator,
	Scene,
	Vector3,
	WebGLRenderer,
} from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

import { BoxColliderVisualizer } from '../game-objects/box-collider-visualizer.ts'
import { OctreeVisualizer } from '../game-objects/octree-visualizer.ts'
import { MAZE_X_CENTER, MAZE_Z_CENTER } from '../main.ts'
import { Grid } from '../utils/generate-maze.ts'
import { GameObject } from './game-object.ts'
import { OctTree, octTreeInitialize, octTreeInsert, octTreeMarkDead, octTreeRebuild } from './octtree.ts'
import { BoxCollider } from './physics.ts'

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Types

// Type alias for a constructor function that creates a new instance of a given type
type Constructor<T> = { new (...args: never[]): T }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Configuration

// Maximum depth of the dynamic spatial partitioning octtree
const DYNAMIC_TREE_MAX_DEPTH = 8
// Maximum capacity of a leaf in the dynamic spatial partitioning octtree
const DYNAMIC_TREE_N_CAPACITY = 8
// Maximum depth of the static spatial partitioning octtree
const STATIC_TREE_MAX_DEPTH = 8
// Maximum capacity of a leaf in the static spatial partitioning octtree
const STATIC_TREE_N_CAPACITY = 8

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Data Layouts

// State class manages the main scene, cameras, lighting, fog, and game objects
export class State {
	// Three.js scene
	scene: Scene
	// Last frame time in ms
	last_time_ms: number
	// Fog toggle
	fogEnabled: boolean = true

	// All game objects in the scene
	gameObjects: GameObject[]

	// NOTE(Elias): management of the colliders is the responsibility of the owner of the colliders, meaning
	// that the owner is also responsible for cleaning up it's colliders using the 'unregister' function.
	// stores colliders that are updated each frame
	dynamicCollisionTree: OctTree
	// stores colliders that are updated on load
	staticCollisionTree: OctTree

	// Camera currently used for rendering
	activeCamera: PerspectiveCamera
	// Ambient light in the scene
	ambientLight: AmbientLight

	// Debug camera
	debugCamera: PerspectiveCamera
	// Debug mode toggle
	debug: boolean = false
	// Visualizer for box colliders
	boxColliderVisualizer?: BoxColliderVisualizer
	// Visualizer for octrees
	octreeVisualizer?: OctreeVisualizer

	// Reference to maze grid
	grid: Grid | null = null

	// Constructor initializes the scene, cameras, lighting, and game objects
	constructor(worldsize: number, renderer: WebGLRenderer) {
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
		this.ambientLight = new AmbientLight(0xfde9ff, 0.5)
		this.scene.add(this.ambientLight)

		// Listen for window resize and update camera aspect ratios
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

		// Add exponential fog to the scene - most efficient type of fog
		// Dark purplish color to match the ambient light
		const fogColor = new Color(0x150515)
		this.scene.fog = new FogExp2(fogColor, 0.04) // Increased density for more visible effect

		// Load office.hdr as environment map
		const pmremGenerator = new PMREMGenerator(renderer)
		pmremGenerator.compileEquirectangularShader()
		new RGBELoader().setPath('src/assets/env/').load('office.hdr', texture => {
			const envMap = pmremGenerator.fromEquirectangular(texture).texture
			this.scene.environment = envMap
			this.scene.background = envMap // optional: comment out if you don't want as background
			this.scene.environmentIntensity = 0.1
			texture.dispose()
			pmremGenerator.dispose()
		})
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//// Configuring Functions

	// Toggle fog in the scene
	toggleFog() {
		this.fogEnabled = !this.fogEnabled

		// Toggle fog on/off
		if (this.fogEnabled && !this.scene.fog) {
			const fogColor = new Color(0x150515)
			this.scene.fog = new FogExp2(fogColor, 0.02)
		} else if (!this.fogEnabled && this.scene.fog) {
			this.scene.fog = null
		}
	}

	// Toggle debug mode and visualizers
	toggleDebug() {
		this.debug = !this.debug

		// Set debug flag on all game objects
		for (const obj of this.gameObjects) {
			obj.setDebug(this.debug)
		}

		if (this.debug) {
			// Collect all colliders from both trees
			const staticColliders = this.getAllCollidersFromTree(this.staticCollisionTree)
			const dynamicColliders = this.getAllCollidersFromTree(this.dynamicCollisionTree)
			const allColliders = [...staticColliders, ...dynamicColliders]
			if (!this.boxColliderVisualizer) {
				// Create box collider visualizer if not present
				this.boxColliderVisualizer = new BoxColliderVisualizer(this, allColliders)
			} else {
				// Update colliders in existing visualizer
				this.boxColliderVisualizer.setColliders(allColliders)
			}

			if (!this.octreeVisualizer) {
				// Create octree visualizer for static and dynamic trees
				this.octreeVisualizer = new OctreeVisualizer(this, this.staticCollisionTree, 40, 8)
				new OctreeVisualizer(this, this.dynamicCollisionTree, 0.2, 8)
			}
		} else {
			// Cleanup visualizers when debug is off
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

	// Get all BoxColliders from an octtree
	private getAllCollidersFromTree(tree: OctTree): BoxCollider[] {
		return tree.elements.filter((element): element is BoxCollider => element !== undefined)
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//// Updates

	// Animate all game objects and update dynamic collision tree
	animate(time_ms: number, renderer: WebGLRenderer) {
		const delta = time_ms - this.last_time_ms
		this.last_time_ms = time_ms
		octTreeRebuild(this.dynamicCollisionTree)
		this.gameObjects.forEach(gameObject => gameObject.animate(delta, this, renderer))
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//// Handling GameObjects

	// Register a new game object
	registerGameObject(gameObject: GameObject) {
		this.gameObjects.push(gameObject)
	}

	// Remove a game object
	unregisterGameObject(gameObject: GameObject) {
		const index = this.gameObjects.indexOf(gameObject)
		if (index !== -1) {
			this.gameObjects.splice(index, 1)
		}
	}

	// Get the first game object of a given type, useful for finding singletons
	findFirstGameObjectOfType<T extends GameObject>(type: Constructor<T>): T | null {
		for (const gameObject of this.gameObjects) {
			if (gameObject instanceof type) {
				return gameObject
			}
		}

		return null
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

	// Register a collider in the correct tree
	registerCollider(collider: BoxCollider, isDynamic: boolean) {
		if (isDynamic) {
			octTreeInsert(this.dynamicCollisionTree, collider)
		} else {
			octTreeInsert(this.staticCollisionTree, collider)
		}
	}

	// Remove a collider from both trees
	unregisterCollider(collider: BoxCollider) {
		octTreeMarkDead(this.dynamicCollisionTree, collider)
		octTreeMarkDead(this.staticCollisionTree, collider)
	}
}
