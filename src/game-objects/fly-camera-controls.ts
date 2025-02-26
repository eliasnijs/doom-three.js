import { WebGLRenderer } from 'three'
import { FlyControls } from 'three/examples/jsm/Addons.js'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'

export class FlyCameraControls extends GameObject {
	flyControls: FlyControls

	constructor(state: State, renderer: WebGLRenderer) {
		super(state)

		this.flyControls = new FlyControls(state.camera, renderer.domElement)
		this.flyControls.movementSpeed = 25
		this.flyControls.rollSpeed = Math.PI / 24
		this.flyControls.autoForward = false
		this.flyControls.dragToLook = true
	}

	animate(deltaTime: number): void {
		this.flyControls.update(deltaTime / 1000)
	}
}
