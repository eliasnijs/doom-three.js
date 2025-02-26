import { State } from './state.ts'

export abstract class GameObject {
	constructor(state: State) {
		state.gameObjects.push(this)
	}

	abstract animate(deltaTime: number): void
}
