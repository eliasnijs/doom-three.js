import { RepeatWrapping, TextureLoader } from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/Addons.js'

const textureLoader = new TextureLoader()

export function loadTexture(folder: string, name: string) {
	const path = `src/assets/${folder}/${name}`
	const texture = textureLoader.load(path, undefined, undefined, error => {
		console.error(`Error loading texture from ${path}:`, error)
	})
	texture.wrapS = RepeatWrapping
	texture.wrapT = RepeatWrapping

	return texture
}

const gltfLoader = new GLTFLoader()

export function loadGLTF(folder: string, name: string): Promise<GLTF> {
	const path = `src/assets/${folder}/${name}`

	return new Promise(resolve => {
		gltfLoader.load(
			path,
			gltf => {
				resolve(gltf)
			},
			undefined,
			error => {
				console.log(`Error loading GLTF from ${path}`, error)
			},
		)
	})
}
