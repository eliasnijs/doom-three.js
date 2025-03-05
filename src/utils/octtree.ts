
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
	origin:		Vec3 // most back,bottom,left point
	size:		number
	state:		CTU_State
	octants:	[CTU, CTU, CTU, CTU, CTU, CTU, CTU, CTU] | null
	leaf:		CTU_LeafData | null
}

export interface OctreeElement {
	bbl: Vec3	// most back, bottom, left point of the element
	ftr: Vec3   // most fron, top, right point of the element
}

export interface OctTree {
	root:			CTU
	elements:		OctreeElement[]
	maxDepth:		number
}


////////////////////////////////////////////////////////////////////////////////////////////////
///// Utility Functions

function getOctants(origin: Vec3, size: number, bbl: Vec3, ftr: Vec3): Octant[] {
	const midPoint = origin.clone().vadd(new Vec3(size/2, size/2, size/2));
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
recurse(tree:OctTree, n: CTU, i:number, remainingDepth:number): void {
	const bbl = tree.elements[i].bbl;
	const ftr = tree.elements[i].ftr;
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
				recurse(tree, n, i, remainingDepth - 1)
			}
			n.leaf = null
		}
	}

	recurse(tree, n, i_element, remainingDepth - 1)
}


export function
insert(tree: OctTree, element: OctreeElement): void {
    const i_element = tree.elements.length;
    tree.elements.push(element);
	_insert(tree, tree.root, i_element, tree.maxDepth)
}


