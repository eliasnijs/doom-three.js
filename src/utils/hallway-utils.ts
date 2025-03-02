import { Object3D } from 'three'

import { loadGLTF } from './loader-utils.ts'

export type HallwayObjects = Record<string, Object3D>

export async function loadHallwayObjects(): Promise<HallwayObjects> {
	const sectionsByName: Record<string, Object3D> = {}

	await loadGLTF('hallway', 'HallwayPACK_GLB.glb').then(gltf => {
		for (const child of gltf.scene.children) {
			sectionsByName[child.name] = child
		}

		// Log all found section names
		console.log(Object.keys(sectionsByName))
	})

	return sectionsByName
}

export function getRandomItem<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)]
}
