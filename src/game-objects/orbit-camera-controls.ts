import { WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { MAZE_X_CENTER, MAZE_Z_CENTER } from '../main.ts'
import { DebugPanel } from './debug-panel.ts'

export class OrbitCameraControls extends GameObject {
	orbitControls: OrbitControls
	debugPanel: DebugPanel | null

	constructor(state: State, renderer: WebGLRenderer) {
		super(state)

		this.orbitControls = new OrbitControls(state.debugCamera, renderer.domElement)
		this.orbitControls.target.set(MAZE_X_CENTER, 0, MAZE_Z_CENTER)

		this.debugPanel = state.findFirstGameObjectOfType(DebugPanel)
	}

	animate(deltaTime: number): void {
		this.orbitControls.update(deltaTime / 1000)

		if (this.debugPanel) {
			this.debugPanel.setData(
				'camera position',
				`x: ${this.orbitControls.object.position.x.toFixed(2)}, y: ${this.orbitControls.object.position.y.toFixed(2)}, z: ${this.orbitControls.object.position.z.toFixed(2)}`,
			)
		}
	}

	cleanup() {
		this.orbitControls.dispose()
	}
}
