import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'

export class Floor extends GameObject {
	body: Body

	constructor(state: State) {
		super(state)
	}

	animate(): void {}
}
