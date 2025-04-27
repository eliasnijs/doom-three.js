import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Vector3 } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { OctTree, octtree_get } from '../engine/octtree.ts'
import { BoxCollider, getCollisionCorrection } from '../engine/physics.ts'
import { State } from '../engine/state.ts'
import { GRID_SIZE } from '../main.ts'
import { mazeGridToWorldGrid, Pos } from '../utils/generate-maze.ts'

const PLAYER_SPEED = 10
const PLAYER_MOUSE_SENSITIVITY = 0.002
const PLAYER_HEIGHT = 4
const PLAYER_WIDTH = 0.2
const CAMERA_HEIGHT_OFFSET = 1.5

export class Player extends GameObject {
	mesh:		Object3D
	keys:		{ [key: string]: boolean }
	velocity:	Vector3	= new Vector3(0.0, 0.0, 0.0)
	rotationY:	number = 0
	rotationX:	number = 0
	camera:		PerspectiveCamera
	isLocked	= false
	collider:	BoxCollider

	constructor(state: State, [x, z]: Pos) {
		super(state)

		// Set the position of the player
		const [newX, newZ] = mazeGridToWorldGrid([z, x])
		const position = new Vector3(newX * GRID_SIZE, PLAYER_HEIGHT, newZ * GRID_SIZE)

		// Create a simple mesh for the player
		const geometry = new BoxGeometry(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH)
		const material = new MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 })
		this.mesh = new Mesh(geometry, material)
		this.mesh.position.copy(position)
		state.scene.add(this.mesh)

		// Create a camera
		this.camera = new PerspectiveCamera(
			90,
			window.innerWidth / window.innerHeight,
			0.1,
			1000,
		)
		this.camera.position.z = 0
		this.camera.position.x = 0
		this.camera.position.y = CAMERA_HEIGHT_OFFSET

		// Add dynamic collider
		this.collider = {
			ref:	 this,
			bbl_rel: new Vector3(-PLAYER_WIDTH/2, -PLAYER_HEIGHT/2, -PLAYER_WIDTH/2),
			ftr_rel: new Vector3(PLAYER_WIDTH/2, PLAYER_HEIGHT/2, PLAYER_WIDTH/2)
		}
		state.registerCollider(this.collider, true)


		// Initialize the controls
		this.keys = {}
		document.addEventListener('keydown', e => (this.keys[e.code] = true))
		document.addEventListener('keyup', e => (this.keys[e.code] = false))
		document.addEventListener('mousemove', this.handleMouseMove.bind(this))

		// Request pointer lock on click
		document.addEventListener('click', () => {
			if (state.activeCamera === this.camera) {
				void document.body.requestPointerLock()
			}
		})

		// Listen for pointer lock change
		document.addEventListener('pointerlockchange', this.onPointerLockChange)
	}

	onPointerLockChange = () => {
		this.isLocked = !!document.pointerLockElement
	}

	handleMouseMove(event: MouseEvent) {
		if (this.isLocked) {
			// Calculate the new rotations
			this.rotationX -=
				event.movementY * PLAYER_MOUSE_SENSITIVITY * (1 / this.camera.aspect)
			this.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationX))
			this.rotationY -= event.movementX * PLAYER_MOUSE_SENSITIVITY

			// Apply the rotations
			this.mesh.rotation.y = this.rotationY
			this.camera.rotation.set(this.rotationX, this.rotationY, 0, 'YXZ')
		}
	}

	enableCamera(state: State) {
		state.activeCamera = this.camera
	}

	animate(deltaTime: number, state:State): void {
		let moveX = 0, moveZ = 0
		if (this.keys['KeyW']) { moveZ -= 1 }
		if (this.keys['KeyS']) { moveZ += 1 }
		if (this.keys['KeyA']) { moveX -= 1 }
		if (this.keys['KeyD']) { moveX += 1 }

		// Create movement vector
		const moveVec = new Vector3(moveX, 0, moveZ)
		if (moveVec.length() > 0) {
			moveVec.normalize()
		}

		// Rotate the movement vector by the player's Y rotation
		const direction = new Vector3()
		direction.copy(moveVec)
		direction.applyAxisAngle(new Vector3(0, 1, 0), this.rotationY)

		// Scale movement by speed and deltaTime
		direction.multiplyScalar(PLAYER_SPEED * deltaTime / 1000)

		// Apply movement to mesh position
		this.mesh.position.add(direction)

		// Rotate the mesh to face the direction of movement
		if (moveVec.length() > 0) {
			this.mesh.rotation.y = this.rotationY
		}

		// Resolve collisions
		const pos = this.mesh.position
		const bbl = pos.clone().add(this.collider.bbl_rel);
		const ftr = pos.clone().add(this.collider.ftr_rel);
		const colliders = [
			...octtree_get(state.staticCollisionTree, bbl, ftr),
			...octtree_get(state.dynamicCollisionTree, bbl, ftr)
		]
		const displace = new Vector3(0.0, 0.0, 0.0);
		for (const other_collider of colliders) {
			if (other_collider !== this.collider) {
				displace.add(getCollisionCorrection(other_collider, this.collider));
			}
		}
		this.mesh.position.add(displace);

		// Update the camera position to follow the mesh
		this.camera.position.copy(this.mesh.position)
		this.camera.position.y += CAMERA_HEIGHT_OFFSET
	}
}

