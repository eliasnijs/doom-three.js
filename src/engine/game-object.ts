import { WebGLRenderer } from 'three'

import { State } from './state.ts'

// This is the base class for all game objects
export abstract class GameObject {
	constructor(state: State) {
		state.registerGameObject(this)
	}

	// This method is called every frame
	abstract animate(deltaTime: number, state: State, renderer: WebGLRenderer): void

	// This method is called when the object is destroyed
	cleanup(): void {
		console.warn('Trying to clean up a game object that does not have a destroy method')
	}

	// This method is called when the object is destroyed
	destroy(state: State): void {
		this.cleanup()
		state.unregisterGameObject(this)
	}
}
