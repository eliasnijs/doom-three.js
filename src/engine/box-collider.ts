// ANCHOR(Elias)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Dependencies

import { Vector3 } from 'three'
import { GameObject } from './game-object.ts'

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Data Layouts

// NOTE(Elias): The center is not necessarily the object position! The center of the bouding box should be
// calculated as follows: `center = pos_object + (bib_rel + ftr_rel)/2`.

export class BoxCollider {
	ref:		GameObject	// reference to the parent object
	bbl_rel:	Vector3		// most back, bottom, left point of the element relative to the center
	ftr_rel:	Vector3		// most front, top, right point of the element relative to the center
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Functions

function getCollisionCorrection(collider1:BoxCollider,	// collider of the static object
								collider2:BoxCollider	// collider of the dynamic object
							   ):Vector3 {				// displacement vector to update the dynamic object
	// dpos = pos2 - pos1
	// correction = clamp so collision doesn't match
	// return correction
}




