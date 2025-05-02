import { Object3D, WebGLRenderer } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { FlyCameraControls } from './fly-camera-controls.ts'
import { Hallway } from './hallway.ts'
import { OrbitCameraControls } from './orbit-camera-controls.ts'
import { Player } from './player.ts'

enum CameraType {
	FLY,
	ORBIT,
	FIRST_PERSON,
}

export class DebugPanel extends GameObject {
	container: HTMLDivElement
	textContainer: HTMLDivElement
	data: Record<string, string>
	flyButton: HTMLButtonElement
	orbitButton: HTMLButtonElement
	firstPersonButton: HTMLButtonElement
	cameraTypeActive: CameraType
	camera: OrbitCameraControls | FlyCameraControls | null = null
	debugButton: HTMLButtonElement

	constructor(state: State, renderer: WebGLRenderer) {
		super(state)

		// Set the camera type to fly
		this.cameraTypeActive = CameraType.ORBIT
		this.changeCameraType(state, renderer, CameraType.ORBIT)

		// Add a div to the body to display the debug info
		this.container = document.createElement('div')
		document.body.appendChild(this.container)

		// Set the style of the div
		this.container.style.position = 'fixed'
		this.container.style.zIndex = '100'
		this.container.style.top = '20px'
		this.container.style.left = '20px'
		this.container.style.padding = '10px'
		this.container.style.backgroundColor = 'rgba(255,255,255,0.3)'
		this.container.style.color = 'white'
		this.container.style.fontFamily = 'monospace'
		this.container.style.display = 'flex'
		this.container.style.flexDirection = 'column'
		this.container.style.gap = '10px'
		this.container.style.width = '300px'

		// Stop pointer events from propagating to the canvas
		this.container.onpointerdown = e => e.stopPropagation()

		// Add a div for the camera type buttons
		const cameraTypeContainer = document.createElement('div')
		cameraTypeContainer.style.display = 'flex'
		this.container.appendChild(cameraTypeContainer)

		// Add a button to change the camera type to orbit
		this.orbitButton = document.createElement('button')
		this.orbitButton.onclick = () => this.changeCameraType(state, renderer, CameraType.ORBIT)
		cameraTypeContainer.appendChild(this.orbitButton)
		this.orbitButton.innerText = '🌍'

		// Add a button to change the camera type to fly
		this.flyButton = document.createElement('button')
		this.flyButton.onclick = () => this.changeCameraType(state, renderer, CameraType.FLY)
		cameraTypeContainer.appendChild(this.flyButton)
		this.flyButton.innerText = '✈️'

		// Add a button to change the camera type to first person
		this.firstPersonButton = document.createElement('button')
		this.firstPersonButton.onclick = () => this.changeCameraType(state, renderer, CameraType.FIRST_PERSON)
		cameraTypeContainer.appendChild(this.firstPersonButton)
		this.firstPersonButton.innerText = '👤'

		// Add a button to toggle debug mode
		this.debugButton = document.createElement('button')
		this.debugButton.onclick = () => {
			state.toggleDebug()
			this.setDebugButtonLabel(state)
		}

		this.container.appendChild(this.debugButton)
		this.setDebugButtonLabel(state)

		// Add another container for the text
		this.textContainer = document.createElement('div')
		this.container.appendChild(this.textContainer)

		// Set the initial data to an empty object
		this.data = {}
	}

	changeCameraType(state: State, renderer: WebGLRenderer, cameraType: CameraType) {
		this.cameraTypeActive = cameraType
		this.camera?.destroy(state)
		if (this.cameraTypeActive === CameraType.FLY) {
			this.camera = new FlyCameraControls(state, renderer)
			state.activeCamera = state.debugCamera
		} else if (this.cameraTypeActive === CameraType.ORBIT) {
			this.camera = new OrbitCameraControls(state, renderer)
			state.activeCamera = state.debugCamera
		} else {
			this.camera = null
			// Find player
			const player = state.findFirstGameObjectOfType(Player)
			if (player) {
				player.enableCamera(state)
			} else {
				console.warn('Trying to enable first person camera but no player found')
			}
		}
	}

	setDebugButtonLabel(state: State) {
		this.debugButton.innerText = state.debug ? '🔲 Disable Debug' : '🔳 Enable Debug'
	}

	async animate(deltaTime: number, state: State) {
		// Add FPS to the data
		this.setData('FPS', (1 / (deltaTime / 1000)).toFixed(2))

		// Add game stats
		// GameObjects
		this.setData('GameObjects', state.gameObjects?.length?.toString() ?? 'N/A')

		// Meshes
		let meshCount = 0
		if (state.scene && state.scene.children) {
			const countMeshes = (obj: Object3D) => {
				if (obj.type === 'Mesh') {
					meshCount++
				}

				if (obj.children) {
					obj.children.forEach(countMeshes)
				}
			}

			state.scene.children.forEach(countMeshes)
		}

		this.setData('Meshes', meshCount.toString())

		// Colliders
		const colliderCount =
			(state.staticCollisionTree?.elements?.length || 0) +
			(state.dynamicCollisionTree?.elements?.length || 0)
		this.setData('Colliders', colliderCount.toString())

		// Octree size (static tree)
		const octreeSize = state.staticCollisionTree?.elements?.length || 0
		this.setData('Octree size', octreeSize.toString())

		// Add cache size for hallway env materials
		const cacheSize = Hallway && Hallway._materialCache ? Object.keys(Hallway._materialCache).length : 0
		this.setData('Hallway EnvMap Cache', cacheSize.toString())

		// Add a title to the div
		this.textContainer.innerHTML = 'DEBUG PANEL'

		// Add all records to the div
		for (const key in this.data) {
			const p = document.createElement('p')
			p.innerText = `${key}: ${this.data[key]}`
			this.textContainer.appendChild(p)
		}
	}

	setData(key: string, value: string): void {
		this.data[key] = value
	}
}
