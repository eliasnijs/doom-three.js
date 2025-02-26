import { State } from './state.ts'

// This is the base class for all game objects
export abstract class GameObject {
	constructor(state: State) {
		state.registerGameObject(this)
	}

	// This method is called every frame
	abstract animate(deltaTime: number): void
}
