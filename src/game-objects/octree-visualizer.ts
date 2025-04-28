import { BoxGeometry, Color, EdgesGeometry, LineBasicMaterial, LineSegments, Scene } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { CTU, CtuState, OctTree } from '../engine/octtree.ts'
import { State } from '../engine/state.ts'

export class OctreeVisualizer extends GameObject {
	private octree: OctTree
	private lines: LineSegments[] = []
	private scene: Scene
	private maxDepthToRender: number = 10
	private greenIntensity: number = 0.0

	constructor(state: State, octree: OctTree, greenIntensity: number, maxDepthToRender = 10) {
		super(state)
		this.octree = octree
		this.scene = state.scene
		this.maxDepthToRender = maxDepthToRender
		this.renderOctree()
		this.greenIntensity = greenIntensity
	}

	renderOctree(): void {
		this.clearVisualization()
		this.renderNode(this.octree.root, 0)
	}

	private renderNode(node: CTU, depth: number): void {
		if (depth > this.maxDepthToRender) {
			return
		}

		const geometry = new BoxGeometry(node.size, node.size, node.size)
		const edges = new EdgesGeometry(geometry)

		// set color based on depth - deeper nodes are more blue, shallower are more red
		const depthRatio = Math.min(depth / 8, 1) // normalize depth to 0-1 range
		const color = new Color(1 - depthRatio, this.greenIntensity, depthRatio)

		const material = new LineBasicMaterial({
			color: color,
			linewidth: 1,
			transparent: true,
			opacity: 0.8 - depth * 0.05, // make deeper nodes more transparent
		})

		const wireframe = new LineSegments(edges, material)

		wireframe.position.set(
			node.origin.x + node.size / 2,
			node.origin.y + node.size / 2,
			node.origin.z + node.size / 2,
		)

		this.scene.add(wireframe)
		this.lines.push(wireframe)

		if (node.state === CtuState.CTU_NODE && node.octants) {
			for (let i = 0; i < 8; i++) {
				this.renderNode(node.octants[i], depth + 1)
			}
		}
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
		// pass
	}

	cleanup(): void {
		this.clearVisualization()
	}

	setMaxDepth(depth: number): void {
		this.maxDepthToRender = depth
		this.renderOctree()
	}
}
