import { Mesh, MeshStandardMaterial, Object3D } from 'three'

/**
 * Recursively sets the wireframe property on all mesh materials in the object.
 * Type-safe for Three.js Material types.
 */
export function setWireframe(obj: Object3D, wireframe: boolean) {
	obj.traverse(child => {
		// Some objects may not have material
		const material = (child as Mesh).material as MeshStandardMaterial | MeshStandardMaterial[] | undefined
		if (material) {
			if (Array.isArray(material)) {
				material.forEach(mat => {
					if ('wireframe' in mat) {
						;(mat as MeshStandardMaterial).wireframe = wireframe
					}
				})
			} else {
				if ('wireframe' in material) {
					;(material as MeshStandardMaterial).wireframe = wireframe
				}
			}
		}
	})
}
