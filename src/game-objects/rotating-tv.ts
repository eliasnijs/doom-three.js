import { Group } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { loadGLTF } from '../utils/loader-utils.ts'
import { DebugPanel } from './debug-panel.ts'

const ROTATION_SPEED = 0.001

export class RotatingTv extends GameObject {
	mesh: Group | undefined
	debugPanel: DebugPanel | undefined

	constructor(state: State) {
		super(state)
		this.debugPanel = state.findFirstGameObjectOfType(DebugPanel)
		void loadGLTF('tv', 'Television_01_1k.gltf').then(gltf => {
			this.mesh = gltf.scene
			state.scene.add(this.mesh)
		})
	}

	animate(deltaTime: number): void {
		if (this.mesh) {
			this.mesh.rotation.y += ROTATION_SPEED * deltaTime
			if (this.debugPanel) {
				this.debugPanel.setData('cube rotation', this.mesh.rotation.y.toFixed(2))
			}
		}
	}
}
