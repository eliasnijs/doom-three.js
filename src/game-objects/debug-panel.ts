import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'

export class DebugPanel extends GameObject {
	container: HTMLDivElement
	data: Record<string, string>

	constructor(state: State) {
		super(state)

		// Add a div to the body to display the debug info
		this.container = document.createElement('div')
		document.body.appendChild(this.container)

		// Set the style of the div
		this.container.style.position = 'fixed'
		this.container.style.zIndex = '100'
		this.container.style.top = '20px'
		this.container.style.left = '20px'
		this.container.style.padding = '10px'
		this.container.style.backgroundColor = 'rgba(255,255,255,0.3)'
		this.container.style.color = 'white'
		this.container.style.fontFamily = 'monospace'

		this.data = {}
	}

	animate(): void {
		this.container.innerHTML = 'DEBUG PANEL'

		// Add all records to the div
		for (const key in this.data) {
			const p = document.createElement('p')
			p.innerText = `${key}: ${this.data[key]}`
			this.container.appendChild(p)
		}
	}

	setData(key: string, value: string): void {
		this.data[key] = value
	}
}
