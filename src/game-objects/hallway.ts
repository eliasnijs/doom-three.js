import { Mesh, MeshStandardMaterial, Object3D, Vector3, WebGLRenderer } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { BoxCollider } from '../engine/physics.ts'
import { State } from '../engine/state.ts'
import { GRID_SIZE } from '../main.ts'
import { getRandomItem, HallwayObjects, renderEnvMapForHallwayType } from '../utils/hallway-utils.ts'

const HALLWAY_SCALE = 1.25
const COLLIDER_THICKNESS = 0.6

export class Hallway extends GameObject {
	static _materialCache: Record<string, MeshStandardMaterial> = {}

	static getEnvironmentMaterial(
		hallwayObjects: HallwayObjects,
		type: string,
		rotation: number,
		renderer: WebGLRenderer,
	): MeshStandardMaterial {
		const cacheKey = `${type}_${rotation}`
		let cachedMaterial = Hallway._materialCache[cacheKey]
		if (!cachedMaterial) {
			const envMap = renderEnvMapForHallwayType(
				hallwayObjects,
				type,
				renderer,
				128,
				(rotation * Math.PI) / 180,
			)
			const mesh = hallwayObjects[type].clone()
			mesh.rotation.y = (rotation * Math.PI) / 180
			let found = false
			mesh.traverse(child => {
				const meshChild = child as Mesh
				const material = meshChild.material as MeshStandardMaterial | undefined
				if (!found && material && material.name === 'M_Environment') {
					const newMaterial = material.clone()
					newMaterial.envMap = envMap
					newMaterial.envMapIntensity = 1
					newMaterial.metalness = 0.7
					newMaterial.roughness = 0
					Hallway._materialCache[cacheKey] = newMaterial
					cachedMaterial = newMaterial
					found = true
				}
			})
		}

		return cachedMaterial
	}

	mesh: Object3D
	grid_x: number
	grid_z: number
	type: string
	rotation: number
	envMaterial: MeshStandardMaterial

	constructor(
		state: State,
		hallwayObjects: HallwayObjects,
		grid_x: number,
		grid_z: number,
		openSides: [boolean, boolean, boolean, boolean],
		renderer: WebGLRenderer,
	) {
		super(state)
		this.grid_x = grid_x
		this.grid_z = grid_z

		const [north, east, south, west] = openSides
		const count = openSides.filter(Boolean).length

		// Determine the type of hallway
		if (count === 0) {
			throw new Error('Hallway must have at least one open side')
		} else if (count === 1) {
			this.type = 'Hall_End'
			this.rotation = openSides.indexOf(true) * -90
		} else if (count === 2) {
			if (north && south) {
				this.type = getRandomItem(['Hall_Light', 'Hall_NoLight'])
				this.rotation = 0
			} else if (east && west) {
				this.type = getRandomItem(['Hall_Light', 'Hall_NoLight'])
				this.rotation = 90
			} else {
				this.type = getRandomItem(['Hall_Light_90Turn', 'Hall_NoLight__90Turn'])
				this.rotation = 0
				if (north && east) {
					this.rotation = 0
				} else if (east && south) {
					this.rotation = -90
				} else if (south && west) {
					this.rotation = -180
				} else if (west && north) {
					this.rotation = -270
				}
			}
		} else if (count === 3) {
			this.type = 'Hall_Junction_T'
			this.rotation = openSides.indexOf(false) * -90 + 180
		} else {
			this.type = 'Hall_Junction_X'
			this.rotation = 0
		}

		// Load the hallway object TODO: use instanced mesh
		this.mesh = hallwayObjects[this.type].clone()
		state.scene.add(this.mesh)

		// Set the position, rotation and scale of the hallway object
		this.mesh.position.set(this.grid_x * GRID_SIZE, 0, this.grid_z * GRID_SIZE)
		this.mesh.rotation.y = (this.rotation * Math.PI) / 180
		this.mesh.scale.set(HALLWAY_SCALE, HALLWAY_SCALE, HALLWAY_SCALE)

		this.envMaterial = Hallway.getEnvironmentMaterial(hallwayObjects, this.type, this.rotation, renderer)
		if (this.envMaterial) {
			this.mesh.traverse(child => {
				const meshChild = child as Mesh
				const material = meshChild.material as MeshStandardMaterial | undefined
				if (material && material.name === 'M_Environment') {
					meshChild.material = this.envMaterial
				}
			})
		}

		// Add colliders to the hallway
		const wallPositions = [
			{ x: 0, z: GRID_SIZE / 2, xw: GRID_SIZE / 2 + 0.1, zw: COLLIDER_THICKNESS, open: north },
			{ x: -GRID_SIZE / 2, z: 0, xw: COLLIDER_THICKNESS, zw: GRID_SIZE / 2 + 0.1, open: east },
			{ x: 0, z: -GRID_SIZE / 2, xw: GRID_SIZE / 2 + 0.1, zw: COLLIDER_THICKNESS, open: south },
			{ x: GRID_SIZE / 2, z: 0, xw: COLLIDER_THICKNESS, zw: GRID_SIZE / 2 + 0.1, open: west },
		]

		for (const { x, z, xw, zw, open } of wallPositions) {
			if (!open) {
				const c: BoxCollider = {
					ref: this,
					bbl_rel: new Vector3(x - xw, 0, z - zw),
					ftr_rel: new Vector3(x + xw, GRID_SIZE, z + zw),
				}
				state.registerCollider(c, false)
			}
		}
	}

	animate(): void {}

	setDebug(wireframe: boolean): void {
		this.mesh.traverse(child => {
			if ('material' in child) {
				;(child.material as MeshStandardMaterial).wireframe = wireframe
			}
		})
	}
}
