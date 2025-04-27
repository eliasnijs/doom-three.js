////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Dependencies

import { Vector3 } from 'three'
import { GameObject } from './game-object.ts'
import { OctTree, octrree_rebuild, octtree_insert, octtree_initialize} from './octtree.ts'
import { OctreeVisualizer } from '../game-objects/octree-visualizer.ts'


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Data Layouts

export interface BoxCollider {
	// NOTE(Elias): requires mesh
	ref:		GameObject
	// NOTE(Elias): The center is not necessarily the object position! The center of the bouding box should be
	// calculated as follows: `center = pos_object + (bbl_rel + ftr_rel)/2`.
	bbl_rel:	Vector3		// most back, bottom, left point of the element relative to the center
	ftr_rel:	Vector3		// most front, top, right point of the element relative to the center
}

export interface PhysicsWorld {
	gravity:	Vector3			// gravity of the world
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Function Implementations

export function
getCollisionCorrection(collider1: BoxCollider,	// collider of the static object
                       collider2: BoxCollider	// collider of the dynamic object
                      ): Vector3 {				// displacement vector to update the dynamic object

    const pos1 = collider1.ref.mesh.position;
    const pos2 = collider2.ref.mesh.position;

    const min1 = new Vector3().addVectors(pos1, collider1.bbl_rel);
    const max1 = new Vector3().addVectors(pos1, collider1.ftr_rel);
    const min2 = new Vector3().addVectors(pos2, collider2.bbl_rel);
    const max2 = new Vector3().addVectors(pos2, collider2.ftr_rel);

    // check overlap
    if (min1.x > max2.x || max1.x < min2.x ||
        min1.y > max2.y || max1.y < min2.y ||
        min1.z > max2.z || max1.z < min2.z) {
        return new Vector3(0, 0, 0);
    }

    const overlapX = Math.min(max1.x, max2.x) - Math.max(min1.x, min2.x);
    const overlapY = Math.min(max1.y, max2.y) - Math.max(min1.y, min2.y);
    const overlapZ = Math.min(max1.z, max2.z) - Math.max(min1.z, min2.z);
    const center1	= new Vector3().addVectors(min1, max1).multiplyScalar(0.5);
    const center2	= new Vector3().addVectors(min2, max2).multiplyScalar(0.5);
    const direction = new Vector3().subVectors(center2, center1);

    const correction = new Vector3(0, 0, 0);
    if (overlapX <= overlapY && overlapX <= overlapZ) {
        correction.x = direction.x > 0 ? overlapX : -overlapX;
    } else if (overlapY <= overlapZ) {
        correction.y = direction.y > 0 ? overlapY : -overlapY;
    } else {
        correction.z = direction.z > 0 ? overlapZ : -overlapZ;
    }

    return correction;
}

