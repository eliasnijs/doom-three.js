import { Body, Cylinder, Quaternion, Vec3 } from 'cannon-es'
import { PerspectiveCamera } from 'three'

import { GameObject } from '../engine/game-object.ts'
import { State } from '../engine/state.ts'

const PLAYER_SPEED = 1
const PLAYER_MOUSE_SENSITIVITY = 0.002
const PLAYER_HEIGHT = 5
const PLAYER_RADIUS = 1
const CAMERA_HEIGHT_OFFSET = 1.5

export class Player extends GameObject {
	body: Body
	keys: { [key: string]: boolean }
	velocity = new Vec3()
	rotationY = 0
	rotationX = 0
	camera: PerspectiveCamera
	isLocked = false

	constructor(state: State) {
		super(state)

		// Create a player
		this.body = new Body({
			mass: 75,
			shape: new Cylinder(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_HEIGHT, 16),
		})

		// Set the position of the player
		this.body.position.set(0, 2.5, 0)

		// Limit the angular velocity
		this.body.angularDamping = 1

		// Add the body to the world
		state.physicsWorld.addBody(this.body)

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
			this.body.quaternion.setFromEuler(0, this.rotationY, 0)
			this.camera.rotation.set(this.rotationX, this.rotationY, 0, 'YXZ')
		}
	}

	enableCamera(state: State) {
		state.activeCamera = this.camera
	}

	animate(deltaTime: number): void {
		let moveX = 0,
			moveZ = 0
		if (this.keys['KeyW']) {
			moveZ -= 1
		}

		if (this.keys['KeyS']) {
			moveZ += 1
		}

		if (this.keys['KeyA']) {
			moveX -= 1
		}

		if (this.keys['KeyD']) {
			moveX += 1
		}

		const moveDir = new Vec3(moveX, 0, moveZ)
		moveDir.normalize()

		// Rotate the movement vector by the player's Y rotation
		const quaternion = new Quaternion()
		quaternion.setFromAxisAngle(new Vec3(0, 1, 0), this.rotationY)

		const transformedMove = new Vec3()
		quaternion.vmult(moveDir, transformedMove) // Apply rotation

		// Scale movement by speed and deltaTime
		transformedMove.scale(PLAYER_SPEED * deltaTime, this.velocity)

		// Apply velocity
		this.body.velocity.x = this.velocity.x
		this.body.velocity.z = this.velocity.z

		// Update the camera position
		this.camera.position.copy(this.body.position)
		this.camera.position.y += CAMERA_HEIGHT_OFFSET
	}
}
