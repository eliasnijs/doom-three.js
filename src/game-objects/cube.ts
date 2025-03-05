import { Body, Box as BoxBody, Vec3 } from 'cannon-es'
import { BoxGeometry, Mesh, MeshStandardMaterial, WebGLRenderer } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'

export class Cube extends GameObject {
	body: Body
	mesh: Mesh

	constructor(state: State, position = { x: 0, y: 5, z: 0 }, size = 5) {
		super(state)

		const geometry = new BoxGeometry(size, size, size)
		const material = new MeshStandardMaterial({ color: 0xff0000 })
		this.mesh = new Mesh(geometry, material)
		state.scene.add(this.mesh)

		// create physics body
		this.body = new Body({
			mass: 0, // Mass of 0 makes it static (won't fall)
			shape: new BoxBody(new Vec3(size/2, size/2, size/2)),
		})

		this.body.position.set(position.x, position.y, position.z)
		state.physicsWorld.addBody(this.body)
	}

	animate(deltaTime: number, state: State, renderer: WebGLRenderer): void {
		this.mesh.position.copy(this.body.position as any)
		this.mesh.quaternion.copy(this.body.quaternion as any)
	}

	cleanup(): void {
		this.mesh.removeFromParent()
	}
}


