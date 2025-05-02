import {
	AmbientLight,
	CubeCamera,
	CubeTexture,
	Object3D,
	Scene,
	WebGLCubeRenderTarget,
	WebGLRenderer,
} from 'three'

import { loadGLTF } from './loader-utils.ts'

export type HallwayObjects = Record<string, Object3D>
export type PropsObjects = Record<string, Object3D>

export async function loadHallwayObjects(): Promise<HallwayObjects> {
	const sectionsByName: Record<string, Object3D> = {}

	await loadGLTF('hallway', 'scene.glb').then(gltf => {
		for (const child of gltf.scene.children) {
			sectionsByName[child.name] = child
		}

		// Log all found section names
		console.log(Object.keys(sectionsByName))
	})

	return sectionsByName
}

export async function loadPropsObjects(): Promise<PropsObjects> {
	const propsByName: Record<string, Object3D> = {}

	await loadGLTF('props', 'props.glb').then(gltf => {
		for (const child of gltf.scene.children) {
			if (child.name && child.type === 'Object3D') {
				propsByName[child.name] = child
			}
		}

		// Log all found props names
		console.log(Object.keys(propsByName))
	})

	return propsByName
}

export function getRandomItem<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)]
}

/**
 * Renders and returns a CubeTexture environment map for a given hallway type.
 * Uses a new empty Scene with the hallway mesh and a basic ambient light.
 */
export function renderEnvMapForHallwayType(
	hallwayObjects: HallwayObjects,
	type: string,
	renderer: WebGLRenderer,
	cubeRes: number = 128,
	rotationY: number = 0,
): CubeTexture {
	const mesh = hallwayObjects[type].clone()
	mesh.position.set(0, 0, 0)
	mesh.rotation.y = rotationY
	const scene = new Scene()
	scene.add(mesh)
	scene.add(new AmbientLight(0xffffff, 1.0))
	const cubeRenderTarget = new WebGLCubeRenderTarget(cubeRes)
	const cubeCamera = new CubeCamera(0.1, 1000, cubeRenderTarget)
	scene.add(cubeCamera)
	cubeCamera.update(renderer, scene)
	scene.remove(cubeCamera)
	scene.remove(mesh)

	return cubeCamera.renderTarget.texture as CubeTexture
}
