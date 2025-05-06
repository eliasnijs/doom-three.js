/***************************************************************************************************************

Octtree Implementation

 ***************************************************************************************************************/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Dependencies

import { Vector3 } from 'three'

import { BoxCollider } from './physics.ts'

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Data Layouts

export enum Octant {
	OCTANT_BBL,
	OCTANT_BBR,
	OCTANT_BTL,
	OCTANT_BTR,
	OCTANT_FBL,
	OCTANT_FBR,
	OCTANT_FTL,
	OCTANT_FTR,
}

export const OCTANT_STRING_TABLE: string[] = [
	'Back-Bottom-Left',
	'Back-Bottom-Right',
	'Back-Top-Left',
	'Back-Top-Right',
	'Front-Bottom-Left',
	'Front-Bottom-Right',
	'Front-Top-Left',
	'Front-Top-Right',
]

export enum CtuState {
	CTU_LEAF,
	CTU_NODE,
}

export interface CtuLeafData {
	capacity: number
	fill: number
	indices: number[]
}

export interface CTU {
	origin: Vector3 // most back,bottom,left point
	size: number // width of the side of the square the CTU represents
	state: CtuState
	octants: [CTU, CTU, CTU, CTU, CTU, CTU, CTU, CTU] | null
	leaf: CtuLeafData | null
}

/*
NOTE(Elias): This could server as a general element of the octtree. However, since, we are only
using the tree for collision detection, we store colliders directly at the moment.
export interface OctreeElement<T=any> {
	bbl: Vector3	// most back, bottom, left point of the element
	ftr: Vector3   // most fron, top, right point of the element
	ref: T
}
*/

export interface OctTree {
	root: CTU
	elements: (BoxCollider | undefined)[]
	maxDepth: number
	capacity: number
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Utility Functions

// Returns the octants that the given bounding box overlaps with
function getOctants(origin: Vector3, size: number, bbl: Vector3, ftr: Vector3): Octant[] {
	const midPoint = origin.clone().add(new Vector3(size / 2, size / 2, size / 2))
	const atLeft = bbl.x < midPoint.x
	const atRight = ftr.x >= midPoint.x
	const atBottom = bbl.y < midPoint.y
	const atTop = ftr.y >= midPoint.y
	const atBack = bbl.z < midPoint.z
	const atFront = ftr.z >= midPoint.z

	const result: Octant[] = []
	for (let i = 0; i < 8; ++i) {
		const xCond = i & 1 ? atRight : atLeft
		const yCond = i & 2 ? atTop : atBottom
		const zCond = i & 4 ? atFront : atBack
		if (xCond && yCond && zCond) {
			result.push(i as Octant)
		}
	}

	return result
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Implementation

// Initializes a new octree with the specified parameters
export function octTreeInitialize(origin: Vector3, width: number, capacity: number, maxDepth: number): OctTree {
	const root: CTU = {
		origin: origin,
		size: width,
		state: CtuState.CTU_LEAF,
		octants: null,
		leaf: {
			capacity: capacity,
			fill: 0,
			indices: [],
		},
	}

	return {
		root: root,
		elements: [],
		maxDepth: maxDepth,
		capacity: capacity,
	}
}

// Helper function to recursively insert an element into the correct octants
function _insertRecurse(tree: OctTree, n: CTU, i: number, remainingDepth: number): void {
	if (tree.elements[i] === undefined) {
		return // Skip undefined elements
	}

	const pos = tree.elements[i].ref.mesh.position
	const bbl = pos.clone().add(tree.elements[i].bbl_rel)
	const ftr = pos.clone().add(tree.elements[i].ftr_rel)
	const octants = getOctants(n.origin, n.size, bbl, ftr)
	for (const octant of octants) {
		if (!n.octants) {
			throw new Error('No octants')
		}

		if (!n.octants[octant]) {
			throw new Error('No octants')
		}

		_insert(tree, n.octants[octant], i, remainingDepth - 1) // Recurse into child octant
	}
}

// Inserts an element into the octree, splitting nodes as needed
function _insert(tree: OctTree, n: CTU, element: number, remainingDepth: number): void {
	if (remainingDepth == 0) {
		if (!n.leaf) {
			throw new Error('No leaf')
		}

		n.leaf.capacity = Number.MAX_SAFE_INTEGER // Unlimited capacity at max depth
		n.leaf.indices.push(element)
		++n.leaf.fill

		return
	} else if (n.state === CtuState.CTU_LEAF) {
		if (!n.leaf) {
			throw new Error('No leaf')
		}

		if (n.leaf.fill < n.leaf.capacity) {
			n.leaf.indices.push(element)
			++n.leaf.fill

			return
		} else {
			n.state = CtuState.CTU_NODE // Split leaf into node
			const octants = [null, null, null, null, null, null, null, null] as [
				CTU | null,
				CTU | null,
				CTU | null,
				CTU | null,
				CTU | null,
				CTU | null,
				CTU | null,
				CTU | null,
			]

			const size = n.size / 2
			for (let octant = 0; octant < 8; ++octant) {
				const origin = new Vector3(
					n.origin.x + (octant & 1 ? size : 0),
					n.origin.y + (octant & 2 ? size : 0),
					n.origin.z + (octant & 4 ? size : 0),
				)
				octants[octant] = {
					origin: origin,
					size: size,
					state: CtuState.CTU_LEAF,
					octants: null,
					leaf: {
						capacity: n.leaf.capacity,
						fill: 0,
						indices: [],
					},
				}
			}

			n.octants = octants as [CTU, CTU, CTU, CTU, CTU, CTU, CTU, CTU]

			for (const i of n.leaf.indices) {
				_insertRecurse(tree, n, i, remainingDepth - 1) // Re-insert existing elements
			}

			n.leaf = null // Clear leaf data
		}
	}

	_insertRecurse(tree, n, element, remainingDepth - 1) // Recurse for new element
}

// Public API to insert a BoxCollider into the octree
export function octTreeInsert(tree: OctTree, element: BoxCollider): void {
	const elementsLength = tree.elements.length
	tree.elements.push(element)
	_insert(tree, tree.root, elementsLength, tree.maxDepth)
}

// Helper to recursively collect all indices that overlap a bounding box
function _get(tree: OctTree, n: CTU, bbl: Vector3, ftr: Vector3, result: Set<number>): void {
	if (n.state === CtuState.CTU_LEAF) {
		if (!n.leaf) {
			throw new Error('No leaf')
		}

		for (const i of n.leaf.indices) {
			result.add(i)
		}

		return
	}

	const octants = getOctants(n.origin, n.size, bbl, ftr)

	for (const octant of octants) {
		if (!n.octants) {
			throw new Error('No octants')
		}

		if (!n.octants[octant]) {
			throw new Error('No octants')
		}

		_get(tree, n.octants[octant], bbl, ftr, result) // Recurse into child octant
	}
}

// Public API to get all BoxColliders overlapping a bounding box
export function octTreeGet(tree: OctTree, bbl: Vector3, ftr: Vector3): BoxCollider[] {
	const indexSet: Set<number> = new Set<number>()
	_get(tree, tree.root, bbl, ftr, indexSet)

	return Array.from(indexSet)
		.map(index => tree.elements[index])
		.filter((item): item is BoxCollider => item !== undefined)
}

// Marks a collider as dead so it will be removed on rebuild
export function octTreeMarkDead(tree: OctTree, element: BoxCollider): void {
	const index = tree.elements.findIndex(e => e === element)
	if (index !== -1) {
		tree.elements[index] = undefined // Mark as undefined
	}
}

// Rebuilds the octree, removing dead elements
export function octTreeRebuild(tree: OctTree): void {
	const validElements = tree.elements.filter(element => element !== undefined) as BoxCollider[]
	const newTree = octTreeInitialize(tree.root.origin.clone(), tree.root.size, tree.capacity, tree.maxDepth)
	for (const element of validElements) {
		octTreeInsert(newTree, element)
	}

	tree.root = newTree.root
	tree.elements = newTree.elements
}
