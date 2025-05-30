import { WebGLRenderer } from 'three'
import { FlyControls } from 'three/examples/jsm/Addons.js'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { DebugPanel } from './debug-panel.ts'

export class FlyCameraControls extends GameObject {
	flyControls: FlyControls
	debugPanel: DebugPanel | null

	constructor(state: State, renderer: WebGLRenderer) {
		super(state)

		this.flyControls = new FlyControls(state.debugCamera, renderer.domElement)
		this.flyControls.movementSpeed = 20
		// this.flyControls.rollSpeed = Math.PI / 24
		this.flyControls.autoForward = false
		this.flyControls.dragToLook = true

		this.debugPanel = state.findFirstGameObjectOfType(DebugPanel)
	}

	animate(deltaTime: number): void {
		this.flyControls.update(deltaTime / 1000)
		this.flyControls.rollSpeed = (10 * Math.PI) / 24

		if (this.debugPanel) {
			this.debugPanel.setData(
				'camera position',
				`x: ${this.flyControls.object.position.x.toFixed(2)}, y: ${this.flyControls.object.position.y.toFixed(2)}, z: ${this.flyControls.object.position.z.toFixed(2)}`,
			)
		}
	}

	cleanup() {
		this.flyControls.dispose()
	}
}
