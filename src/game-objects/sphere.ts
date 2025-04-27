import { Body, Sphere as SphereBody } from 'cannon-es'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'

export class Sphere extends GameObject {
	body: Body

	constructor(state: State) {
		super(state)
		this.body = new Body({
			mass: 2,
			shape: new SphereBody(2),
		})
		this.body.position.set(0, 10, 0)
		this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
		state.physicsWorld.addBody(this.body)
	}

	animate(): void {}
}
