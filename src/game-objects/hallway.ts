import { Object3D } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'
import { HallwayObjects } from '../utils/hallway-utils.ts'

const HALLWAY_SCALE = 1.25
const GRID_SIZE = 10

export class Hallway extends GameObject {
	mesh: Object3D
	grid_x: number
	grid_z: number
	type: string
	rotation: number

	constructor(
		state: State,
		hallwayObjects: HallwayObjects,
		grid_x: number,
		grid_z: number,
		openSides: [boolean, boolean, boolean, boolean],
	) {
		super(state)
		this.grid_x = grid_x
		this.grid_z = grid_z

		const [north, east, south, west] = openSides
		const count = openSides.filter(Boolean).length

		// Determine the type of hallway
		if (count === 0) {
			throw new Error('Hallway must have at least one open direction')
		} else if (count === 1) {
			this.type = 'Hall_End'
			this.rotation = openSides.indexOf(true) * -90
		} else if (count === 2) {
			if (north && south) {
				this.type = 'Hall_Light'
				this.rotation = 0
			} else if (east && west) {
				this.type = 'Hall_Light'
				this.rotation = 90
			} else {
				this.type = 'Hall_Light_90Turn'
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
	}

	animate() {}
}
