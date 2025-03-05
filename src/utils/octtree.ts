
////////////////////////////////////////////////////////////////////////////////////////////////
///// Dependencies

import { Vec3 } from 'cannon-es'

////////////////////////////////////////////////////////////////////////////////////////////////
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
	origin:		Vec3 // most left,bottom,back point
	size:		number
	state:		CTU_State
	octants:	[CTU, CTU, CTU, CTU, CTU, CTU, CTU, CTU] | null
	leaf:		CTU_LeafData | null
}

// Define what will be stored in the global list
export interface OctreeElement {
	position: Vec3
	// Add any other properties needed for your game objects
	// For example: size, type, reference to actual game object, etc.
}

export interface OctTree {
	root:			CTU
	elements:		OctreeElement[]
	maxDepth:		number
}


////////////////////////////////////////////////////////////////////////////////////////////////
///// Utility Functions

function getOctant(origin: Vec3, size: number, position: Vec3): Octant {
	const halfsize = size / 2
    const centerX = origin.x + halfsize
    const centerY = origin.y + halfsize
    const centerZ = origin.z + halfsize

    const isRight = position.x >= centerX;  // +X is right
    const isTop = position.y >= centerY; // +Y is top
    const isFront = position.z >= centerZ; // +Z is front

	return (isFront << 2) | (isTop << 1) | isRight
}

////////////////////////////////////////////////////////////////////////////////////////////////
///// Implementation


export function
initialize(origin: Vec3, size: number, n_capacity: number, maxDepth: number): OctTree {
    const root: CTU = {
        origin:		origin,
        size:		size,
        state:		CTU_State.CTU_LEAF,
        octants:	null,
        leaf: {
			n_capacity,
            n_fill: 0,
            indices: []
        }
    };
    return {
        root: root,
        elements: [],
		maxDepth: maxDepth,
    };
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
				const origin = new Vec3(
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
				const pos = tree.elements[i].position;
				const octant = getOctant(n.origin, n.size, pos);
				_insert(tree, n.octants[octant], i, remainingDepth - 1)
			}
			n.leaf = null
		}
	}

	const pos = tree.elements[i_element].position;
	const octant = getOctant(n.origin, n.size, pos);
	_insert(tree, n.octants[octant], i_element, remainingDepth - 1)
}

export function
insert(tree: OctTree, element: OctreeElement): void {
    const i_element = tree.elements.length;
    tree.elements.push(element);
	_insert(tree, tree.root, i_element, tree.maxDepth)
}


