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
	destroy(): void {
		console.warn('GameObject was destroyed but destroy() was not implemented')
	}
}
