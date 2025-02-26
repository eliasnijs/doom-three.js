import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'

const ROTATION_SPEED = 0.001

export class RotatingCube extends GameObject {
	mesh: Mesh

	constructor(state: State) {
		super(state)

		const geometry = new BoxGeometry(1, 1, 1)
		const material = new MeshBasicMaterial({ color: 0x00ff00 })
		this.mesh = new Mesh(geometry, material)
		state.scene.add(this.mesh)
	}

	animate(deltaTime: number): void {
		this.mesh.rotation.y += ROTATION_SPEED * deltaTime
	}
}
