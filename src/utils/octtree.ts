
////////////////////////////////////////////////////////////////////////////////////////////////
///// Data Layouts

interface vec3 {
  x: number
  y: number
  z: number
}

enum Octant {
	OCTANT_BBL,
	OCTANT_BBR,
	OCTANT_BTL,
	OCTANT_BTR,
	OCTANT_FBL,
	OCTANT_FBR,
	OCTANT_FTL,
	OCTANT_FTR,
}
const OCTANT_STRING_TABLE: string[] = [
    "Back-Bottom-Left", "Back-Bottom-Right", "Back-Top-Left", "Back-Top-Right",
    "Front-Bottom-Left", "Front-Bottom-Right", "Front-Top-Left", "Front-Top-Right"
];

enum CTU_State {
	CTU_LEAF,
	CTU_NODE
}

interface CTU_LeafData {
	n_capacity:	number
	n_fill:		number
	indices:	number[]
}

interface CTU {
	origin:		vec3 // most left,bottom,back point
	size:		number
	state:		CTU_State
	octants:	[CTU, CTU, CTU, CTU, CTU, CTU, CTU, CTU] | null
	leaf:		CTU_LeafData | null
}

// Define what will be stored in the global list
interface OctreeElement {
	position: vec3
	// Add any other properties needed for your game objects
	// For example: size, type, reference to actual game object, etc.
}

interface OctTree {
	root:			CTU
	elements:		OctreeElement[]
	maxDepth:		number
}


////////////////////////////////////////////////////////////////////////////////////////////////
///// Utility Functions

function getOctant(origin: vec3, size: number, position: vec3): Octant {
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
initialize(origin: vec3, size: number, n_capacity: number, maxDepth: number): OctTree {
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

// TODO(Elias): take into account bouding box when inputting,
// sometimes we might have to put the index in more than one bucket
export function
insert(tree: OctTree, n: CTU, element: OctreeElement): void {
    const i_element = tree.elements.length;
    tree.elements.push(element);

	let depth = 0;
	while (depth <= tree.maxDepth) {
		if (depth == tree.maxDepth) {
				n.leaf.n_capacity = Number.MAX_SAFE_INTEGER;
				n.leaf.indices.push(i_element);
				n.leaf.n_fill++;
				return
		}
		if (n.state === CTU_State.CTU_LEAF) {
			if (n.leaf.n_fill < n.leaf.n_capacity) {
				n.leaf.indices.push(i_element);
				n.leaf.n_fill++;
				return;
			} else {
				n.octants = [] as unknown as [CTU, CTU, CTU, CTU, CTU, CTU, CTU, CTU]
				const halfSize = n.size / 2;
				for (let octant = 0; octant < 8; octant++) {
					n.octants[octant] = {
						origin: {
							x: n.origin.x + (octant & 1 ? halfSize : 0),
							y: n.origin.y + (octant & 2 ? halfSize : 0),
							z: n.origin.z + (octant & 4 ? halfSize : 0)
						},
						size: halfSize,
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
					const position_ = tree.elements[i].position;
					const octant = getOctant(n.origin, n.size, position_);
					const octantNode = n.octants[octant];
					octantNode.leaf.indices.push(i);
					octantNode.leaf.n_fill++;
				}

				n.leaf  = null
				n.state = CTU_State.CTU_NODE;
			}
		}

		const octant = getOctant(n.origin, n.size, element.position);
		n = n.octants[octant];
		depth++;
	}
}

