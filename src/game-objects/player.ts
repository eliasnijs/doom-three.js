import {
	BoxGeometry,
	BufferGeometry,
	Line,
	LineBasicMaterial,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	PerspectiveCamera,
	Quaternion,
	Raycaster,
	Vector3,
} from 'three'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { GameObject } from '../engine/game-object.ts'
import { octTreeGet } from '../engine/octtree.ts'
import { BoxCollider, getCollisionCorrection } from '../engine/physics.ts'
import { State } from '../engine/state.ts'
import { GRID_SIZE } from '../main.ts'
import { mazeGridToWorldGrid, Pos } from '../utils/generate-maze.ts'
import { loadGLTF } from '../utils/loader-utils'
import { setWireframe } from '../utils/three-utils'

const PLAYER_SPEED = 10
const PLAYER_MOUSE_SENSITIVITY = 0.002
const PLAYER_HEIGHT = 4
const PLAYER_WIDTH = 0.5
const CAMERA_HEIGHT_OFFSET = 1.5

// Gun model constants
const GUN_SCALE = { x: 0.1, y: 0.1, z: 0.1 }
const GUN_OFFSET = { x: 0.6, y: -0.55, z: -0.85 }
const GUN_INWARD_ROTATION = 0.05 // radians, negative for slight inward (left) tilt

export class Player extends GameObject {
	mesh: Object3D
	parent: Object3D
	keys: { [key: string]: boolean }
	rotationY: number = 0
	rotationX: number = 0
	camera: PerspectiveCamera
	isLocked = false
	collider: BoxCollider
	gun: Object3D | null = null
	_debugRay: any = null

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

		// Create a parent object for both camera and gun
		this.parent = new Object3D()
		this.mesh.add(this.parent)
		this.parent.position.set(0, CAMERA_HEIGHT_OFFSET, 0)

		// Create a camera
		this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
		this.parent.add(this.camera)
		this.camera.position.set(0, 0, 0)

		// Add dynamic collider
		this.collider = {
			ref: this,
			bbl_rel: new Vector3(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2, -PLAYER_WIDTH / 2),
			ftr_rel: new Vector3(PLAYER_WIDTH / 2, PLAYER_HEIGHT / 2, PLAYER_WIDTH / 2),
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

		// Load gun model and attach to parent
		void loadGLTF('gun', 'gun.glb').then((gltf: GLTF) => {
			console.log('loaded')
			this.gun = gltf.scene
			this.gun.scale.set(GUN_SCALE.x, GUN_SCALE.y, GUN_SCALE.z)
			this.parent.add(this.gun)
			this.gun.position.set(GUN_OFFSET.x, GUN_OFFSET.y, GUN_OFFSET.z)
			this.gun.rotation.set(0, GUN_INWARD_ROTATION, 0)
		})
	}

	onPointerLockChange = () => {
		this.isLocked = !!document.pointerLockElement
	}

	handleMouseMove(event: MouseEvent) {
		if (this.isLocked) {
			// Calculate the new rotations
			this.rotationX -= event.movementY * PLAYER_MOUSE_SENSITIVITY * (1 / this.camera.aspect)
			this.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationX))
			this.rotationY -= event.movementX * PLAYER_MOUSE_SENSITIVITY

			// Apply the rotations
			this.mesh.rotation.y = this.rotationY
			this.parent.rotation.set(this.rotationX, 0, 0)
		}
	}

	enableCamera(state: State) {
		state.activeCamera = this.camera
	}

	animate(deltaTime: number, state: State): void {
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
		direction.multiplyScalar((PLAYER_SPEED * deltaTime) / 1000)

		// Apply movement to mesh position
		this.mesh.position.add(direction)

		// Rotate the mesh to face the direction of movement
		if (moveVec.length() > 0) {
			this.mesh.rotation.y = this.rotationY
		}

		// Resolve collisions
		const pos = this.mesh.position
		const bbl = pos.clone().add(this.collider.bbl_rel)
		const ftr = pos.clone().add(this.collider.ftr_rel)
		const colliders = [
			...octTreeGet(state.staticCollisionTree, bbl, ftr),
			...octTreeGet(state.dynamicCollisionTree, bbl, ftr),
		]
		const displace = new Vector3(0.0, 0.0, 0.0)
		let n_displace = 0
		for (const other_collider of colliders) {
			if (other_collider !== this.collider) {
				const d = getCollisionCorrection(other_collider, this.collider)
				n_displace += d.x !== 0 || d.y !== 0 || d.z !== 0 ? 1 : 0
				displace.add(d)
			}
		}

		if (n_displace > 0) {
			displace.multiplyScalar(1.1)
			displace.divideScalar(n_displace)
		}

		this.mesh.position.add(displace)

		// --- Gun wall proximity check (using Raycaster) ---
		if (this.gun) {
			const origin = this.mesh.getWorldPosition(new Vector3())
			origin.setY(5)
			const rotation = this.camera.getWorldQuaternion(new Quaternion())
			const forward = new Vector3(0, 0, -1).applyQuaternion(rotation).normalize()
			const rayLength = 2.0
			const raycaster = new Raycaster(origin, forward, 0, rayLength)
			// Only test against static world meshes (walls)
			const worldMeshes = state.scene.children.filter(
				obj => obj !== this.parent && obj !== this.mesh && obj.type === 'Mesh',
			)

			// Debug: visualize the raycast
			if (state.debug) {
				// Remove previous debug ray if any
				if (this._debugRay) {
					state.scene.remove(this._debugRay)
					this._debugRay.geometry.dispose()
					if (this._debugRay.material) {
						this._debugRay.material.dispose()
					}
				}

				const rayEnd = origin.clone().add(forward.clone().normalize().multiplyScalar(rayLength))
				const geometry = new BufferGeometry().setFromPoints([origin, rayEnd])
				const material = new LineBasicMaterial({ color: 0xff0000 })
				const line = new Line(geometry, material)
				state.scene.add(line)
				this._debugRay = line
			}

			const intersects = raycaster.intersectObjects(worldMeshes, true)

			if (intersects.length > 0) {
				this.gun.rotation.x = -Math.PI * (70 / 180) // rotate down 70 deg
				this.gun.position.y = GUN_OFFSET.y - 0.5
			} else {
				this.gun.rotation.x = 0
				this.gun.position.y = GUN_OFFSET.y
			}

			setWireframe(this.gun, state.debug)
		}
	}
}
