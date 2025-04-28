import { BoxGeometry, Color, EdgesGeometry, LineBasicMaterial, LineSegments, Scene, Vector3 } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { BoxCollider } from '../engine/physics.ts'
import { State } from '../engine/state.ts'

export class BoxColliderVisualizer extends GameObject {
	private colliders: BoxCollider[] = []
	private lines: LineSegments[] = []
	private scene: Scene
	private color: Color = new Color(0, 1, 0) // default color: green

	constructor(state: State, colliders: BoxCollider[] = [], color?: Color) {
		super(state)
		this.colliders = colliders
		this.scene = state.scene
		if (color) {
			this.color = color
		}

		this.renderColliders()
	}

	setColliders(colliders: BoxCollider[]): void {
		this.colliders = colliders
		this.renderColliders()
	}

	renderColliders(): void {
		this.clearVisualization()

		for (const collider of this.colliders) {
			this.renderCollider(collider)
		}
	}

	private renderCollider(collider: BoxCollider): void {
		const pos = collider.ref.mesh?.position || new Vector3(0, 0, 0)

		const min = new Vector3().addVectors(pos, collider.bbl_rel)
		const max = new Vector3().addVectors(pos, collider.ftr_rel)

		const width = Math.abs(max.x - min.x)
		const height = Math.abs(max.y - min.y)
		const depth = Math.abs(max.z - min.z)

		const geometry = new BoxGeometry(width, height, depth)
		const edges = new EdgesGeometry(geometry)

		const material = new LineBasicMaterial({
			color: this.color,
			linewidth: 2,
			transparent: true,
			opacity: 0.7,
		})

		const wireframe = new LineSegments(edges, material)

		wireframe.position.set(min.x + width / 2, min.y + height / 2, min.z + depth / 2)

		this.scene.add(wireframe)
		this.lines.push(wireframe)
	}

	private clearVisualization(): void {
		for (const line of this.lines) {
			this.scene.remove(line)
			if (line.geometry) {
				line.geometry.dispose()
			}

			if (line.material) {
				if (Array.isArray(line.material)) {
					line.material.forEach(material => material.dispose())
				} else {
					line.material.dispose()
				}
			}
		}

		this.lines = []
	}

	animate(): void {
		this.renderColliders()
	}

	cleanup(): void {
		this.clearVisualization()
	}
}
