
// TODO(Elias): complete the documentation, add exported functions and structures, add example
// usage and guidance on using a static and dynamic tree, also add something about the
// distinction between elements and indices

/***********************************************************************************************

Octtree Implementation




Example:
```
const octree = octtree_initialize(
	new Vector3(-50, -50, -50), // origin
	100,                     // size
	4,                       // capacity (how many objects per node before subdividing)
	5                        // max depth
)

const numCubes = 30;
for (let i = 0; i < numCubes; i++) {
	const position = new Vector3(
		(Math.random() * 80) - 40, // -40 to 40
		(Math.random() * 80) - 40, // -40 to 40
		(Math.random() * 80) - 40  // -40 to 40
	);
	const cubeSize = 5;
	const cube = new Cube(state, position, cubeSize);

	const element = {
		bbl: new Vector3(position.x - cubeSize/2, position.y - cubeSize/2, position.z - cubeSize/2),
		ftr: new Vector3(position.x + cubeSize/2, position.y + cubeSize/2, position.z + cubeSize/2),
		ref: cube
	};
	octtree_insert(octree, element);
}

new OctreeVisualizer(state, octree)
console.log('Octree structure:', octree)
```

***********************************************************************************************/



////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Dependencies

import { Vector3 } from 'three'

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
	OCTANT_COUNT,
}

export const OCTANT_STRING_TABLE: string[] = [
    "Back-Bottom-Left", "Back-Bottom-Right", "Back-Top-Left", "Back-Top-Right",
    "Front-Bottom-Left", "Front-Bottom-Right", "Front-Top-Left", "Front-Top-Right"
];

export enum CTU_State {
	CTU_LEAF,
	CTU_NODE
}

export interface CTU_LeafData {
	n_capacity:	number
	n_fill:		number
	indices:	number[]
}

export interface CTU {
	origin:		Vector3		// most back,bottom,left point
	size:		number		// width of the side of the square the CTU represents
	state:		CTU_State
	octants:	[CTU, CTU, CTU, CTU, CTU, CTU, CTU, CTU] | null
	leaf:		CTU_LeafData | null
}


/*
NOTE(Elias): This could server as a general element of the octtree. However, since, we are only
using the tree for collision detection, it can directly store colliders at the moment.
export interface OctreeElement<T=any> {
	bbl: Vector3	// most back, bottom, left point of the element
	ftr: Vector3   // most fron, top, right point of the element
	ref: T
}
*/

export interface OctTree {
	root:			CTU
	elements:		BoxCollider[]
	maxDepth:		number
	n_capacity:		number
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Utility Functions

function getOctants(origin: Vector3, size: number, bbl: Vector3, ftr: Vector3): Octant[] {
	const midPoint = origin.clone().add(new Vector3(size/2, size/2, size/2));
	const atLeft   = bbl.x < midPoint.x;
	const atRight  = ftr.x >= midPoint.x
	const atBottom = bbl.y < midPoint.y;
	const atTop    = ftr.y >= midPoint.y
	const atBack   = bbl.z < midPoint.z;
	const atFront  = ftr.z >= midPoint.z;

	const result:Octant[] = [];
	for (let i = 0; i < 8; ++i) {
		const xCond = (i & 1) ? atRight : atLeft;
		const yCond = (i & 2) ? atTop : atBottom;
		const zCond = (i & 4) ? atFront : atBack;
		if (xCond && yCond && zCond) {
			result.push(i as Octant);
		}
	}

	return result;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Implementation

export function
octtree_initialize(origin: Vector3, width: number, n_capacity: number, maxDepth: number): OctTree {
    const root: CTU = {
        origin:		origin,
        size:		width,
        state:		CTU_State.CTU_LEAF,
        octants:	null,
        leaf: {
			n_capacity: n_capacity,
            n_fill: 0,
            indices: []
        }
    };
    return {
        root: root,
        elements: [],
		maxDepth: maxDepth,
		n_capacity: n_capacity
    };
}

function
_insert_recurse(tree:OctTree, n: CTU, i:number, remainingDepth:number): void {
	const pos = tree.elements[i].ref.mesh.position
	const bbl = pos.clone().add(tree.elements[i].bbl_rel);
	const ftr = pos.clone().add(tree.elements[i].ftr_rel);
	const octants = getOctants(n.origin, n.size, bbl, ftr);
	for (const octant of octants) {
		_insert(tree, n.octants[octant], i, remainingDepth - 1)
	}
}

function
_insert(tree:OctTree, n: CTU, i_element:number , remainingDepth:number): void {
	if (remainingDepth == 0) {
		n.leaf.n_capacity = Number.MAX_SAFE_INTEGER;
		n.leaf.indices.push(i_element);
		++n.leaf.n_fill;
		return;
	} else if (n.state === CTU_State.CTU_LEAF) {
		if (n.leaf.n_fill < n.leaf.n_capacity) {
			n.leaf.indices.push(i_element);
			++n.leaf.n_fill;
			return;
		} else {
			n.state = CTU_State.CTU_NODE;
			n.octants = [] as [CTU, CTU, CTU, CTU, CTU, CTU, CTU, CTU]

			const size = n.size / 2;
			for (let octant = 0; octant < 8; ++octant) {
				const origin = new Vector3(
					n.origin.x + (octant & 1 ? size : 0),
					n.origin.y + (octant & 2 ? size : 0),
					n.origin.z + (octant & 4 ? size : 0)
				)
				n.octants[octant] = {
					origin: origin,
					size: size,
					state: CTU_State.CTU_LEAF,
					octants: null,
					leaf: {
						n_capacity: n.leaf.n_capacity,
						n_fill: 0,
						indices: []
					}
				};
			}

			for (const i of n.leaf.indices) {
				_insert_recurse(tree, n, i, remainingDepth - 1)
			}
			n.leaf = null
		}
	}

	_insert_recurse(tree, n, i_element, remainingDepth - 1)
}


export function
octtree_insert(tree: OctTree, element: BoxCollider): void {
    const i_element = tree.elements.length;
	tree.elements.push(element);
	_insert(tree, tree.root, i_element, tree.maxDepth)
}



function
_get(tree: OctTree, n: CTU, bbl: Vector3, ftr: Vector3, result: Set<number>): void
{
	if (n.state === CTU_State.CTU_LEAF) {
		for (const i of n.leaf.indices) {
			result.add(i);
		}
		return;
	}
	const octants = getOctants(n.origin, n.size, bbl, ftr);
	for (const octant of octants) {
		_get(tree, n.octants[octant], bbl, ftr, result);
	}
}

export function
octtree_get(tree: OctTree, bbl: Vector3, ftr: Vector3):number[] {
	const result: Set<number> = new Set<number>();
	_get(tree, tree.root, bbl, ftr, result);
	return Array.from(result);
}


export function
octtree_mark_dead(tree: OctTree, element: BoxCollider): void {
	const index = tree.elements.findIndex(e => e === element);
	if (index !== -1) {
		tree.elements[index] = undefined;
	}
}

export function
octtree_rebuild(tree: OctTree): void {
	const validElements = tree.elements.filter(element => element !== undefined) as BoxCollider[];
	const newTree = octtree_initialize(tree.root.origin.clone(), tree.root.size,
									   tree.n_capacity, tree.maxDepth);
	for (const element of validElements) {
		octtree_insert(newTree, element);
	}

	tree.root = newTree.root;
	tree.elements = newTree.elements;
}





