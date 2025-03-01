import { WebGLRenderer } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { FlyCameraControls } from './fly-camera-controls.ts'
import { OrbitCameraControls } from './orbit-camera-controls.ts'

enum CameraType {
	FLY,
	ORBIT,
}

export class DebugPanel extends GameObject {
	container: HTMLDivElement
	textContainer: HTMLDivElement
	data: Record<string, string>
	cameraButton: HTMLButtonElement
	cameraTypeActive: CameraType
	camera: OrbitCameraControls | FlyCameraControls

	constructor(state: State, renderer: WebGLRenderer) {
		super(state)

		// Set the camera type to fly
		this.cameraTypeActive = CameraType.ORBIT
		this.camera = new OrbitCameraControls(state, renderer)

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

		// Add a button to change the camera type
		this.cameraButton = document.createElement('button')
		this.cameraButton.onclick = () => this.changeCameraType(state, renderer)
		this.container.appendChild(this.cameraButton)
		this.setCameraButtonLabel()

		// Add another container for the text
		this.textContainer = document.createElement('div')
		this.container.appendChild(this.textContainer)

		// Set the initial data to an empty object
		this.data = {}
	}

	changeCameraType(state: State, renderer: WebGLRenderer) {
		this.camera.destroy(state)
		if (this.cameraTypeActive === CameraType.FLY) {
			this.cameraTypeActive = CameraType.ORBIT
			this.camera = new OrbitCameraControls(state, renderer)
		} else {
			this.cameraTypeActive = CameraType.FLY
			this.camera = new FlyCameraControls(state, renderer)
		}

		this.setCameraButtonLabel()
	}

	setCameraButtonLabel() {
		this.cameraButton.innerText =
			this.cameraTypeActive == CameraType.FLY ? '📷 Switch to Orbit' : '📷 Switch to Fly'
	}

	animate() {
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
