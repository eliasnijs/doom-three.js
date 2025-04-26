import { Body, Plane } from 'cannon-es'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'

export class Floor extends GameObject {
	body: Body

	constructor(state: State) {
		super(state)

		// Create a plane
		this.body = new Body({
			type: Body.STATIC,
			shape: new Plane(),
		})

		// Set the rotation of the plane
		this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0)

		// Add the body to the world
		// TODO(Elias): replace with correct collider
		state.physicsWorld.addBody(this.body)
	}

	animate(): void {}
}
