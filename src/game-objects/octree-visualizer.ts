import { BoxGeometry, Color, LineBasicMaterial, LineSegments, Scene, WebGLRenderer } from 'three'
import { EdgesGeometry } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { CTU, CTU_State, OctTree } from '../utils/octtree.ts'

export class OctreeVisualizer extends GameObject {
  private octree: OctTree
  private lines: LineSegments[] = []
  private scene: Scene
  private depth: number = 0
  private maxDepthToRender: number = 10

  constructor(state: State, octree: OctTree, maxDepthToRender = 10) {
    super(state)
    this.octree = octree
    this.scene = state.scene
    this.maxDepthToRender = maxDepthToRender
    this.renderOctree()
  }

  private renderOctree(): void {
    this.clearVisualization()
    this.renderNode(this.octree.root, 0)
  }

  private renderNode(node: CTU, depth: number): void {
    if (depth > this.maxDepthToRender) return

    const geometry = new BoxGeometry(node.size, node.size, node.size)
    const edges = new EdgesGeometry(geometry)

    // Set color based on depth - deeper nodes are more blue, shallower are more red
    const depthRatio = Math.min(depth / 8, 1) // Normalize depth to 0-1 range
    const color = new Color(1 - depthRatio, 0.2, depthRatio)

    const material = new LineBasicMaterial({
      color: color,
      linewidth: 1,
      transparent: true,
      opacity: 0.8 - (depth * 0.05) // Make deeper nodes slightly more transparent
    })

    const wireframe = new LineSegments(edges, material)

    wireframe.position.set(
      node.origin.x + node.size / 2,
      node.origin.y + node.size / 2,
      node.origin.z + node.size / 2
    )

    this.scene.add(wireframe)
    this.lines.push(wireframe)

    if (node.state === CTU_State.CTU_NODE && node.octants) {
      for (let i = 0; i < 8; i++) {
        this.renderNode(node.octants[i], depth + 1)
      }
    }
  }

  updateVisualization(): void {
    this.renderOctree()
  }

  private clearVisualization(): void {
    for (const line of this.lines) {
      this.scene.remove(line)
    }
    this.lines = []
  }

  animate(deltaTime: number, state: State, renderer: WebGLRenderer): void {
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
