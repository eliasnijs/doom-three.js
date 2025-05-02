import {
	Audio,
	AudioListener,
	AudioLoader,
	BoxGeometry,
	BufferGeometry,
	DoubleSide,
	Line,
	LineBasicMaterial,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	PerspectiveCamera,
	PlaneGeometry,
	Quaternion,
	Raycaster,
	Texture,
	TextureLoader,
	Vector3,
	WebGLRenderer,
} from 'three'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { GameObject } from '../engine/game-object.ts'
import { octTreeGet } from '../engine/octtree.ts'
import { BoxCollider, getCollisionCorrection } from '../engine/physics.ts'
import { State } from '../engine/state.ts'
import { GRID_SIZE } from '../main.ts'
import { mazeGridToWorldGrid, Pos } from '../utils/generate-maze.ts'
import { HallwayObjects } from '../utils/hallway-utils.ts'
import { loadGLTF } from '../utils/loader-utils'
import { setWireframe } from '../utils/three-utils'
import { Hallway } from './hallway.ts'

const PLAYER_SPEED = 10
const PLAYER_MOUSE_SENSITIVITY = 0.002
const PLAYER_HEIGHT = 4
const PLAYER_WIDTH = 2
const CAMERA_HEIGHT_OFFSET = 1.5

// Gun model constants
const GUN_SCALE = { x: 0.1, y: 0.1, z: 0.1 }
const GUN_OFFSET = { x: 0.6, y: -0.55, z: -0.85 }
const GUN_INWARD_ROTATION = 0.05 // radians, negative for slight inward (left) tilt

// Gun kickback constants
const GUN_KICKBACK_AMOUNT = 0.45
const GUN_KICKBACK_RECOVERY = 1 // units per second
const GUN_KICKBACK_MAX = 0.6 // max total kickback distance

// Gun walk animation constants
const GUN_WALK_BOB_FREQ = 12 // Hz
const GUN_WALK_BOB_AMPLITUDE_X = 0.01
const GUN_WALK_BOB_AMPLITUDE_Y = 0.04

// Gun fire rate constants
const GUN_RPM = 600 // rounds per minute
const GUN_FIRE_INTERVAL = 60_000 / GUN_RPM // ms between shots

// Bullet hole fading constants
const BULLET_HOLE_LIMIT = 30
const BULLET_HOLE_FADE_TIME = 6 // seconds to fade if under limit
const BULLET_HOLE_FADE_FAST = 1.5 // seconds to fade if over limit

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
	_debugRay: Line | null = null
	gunIsDown: boolean = false
	bulletTexture: Texture | null = null
	gunKickback: number = 0
	gunKickbackTarget: number = 0
	walkTime: number = 0
	isFiring: boolean = false
	lastFireTime: number = 0
	bulletHoles: { mesh: Mesh; born: number; fade: number }[] = []
	audioListener: AudioListener | null = null
	gunshotSound: Audio | null = null
	ambientSound: Audio | null = null

	constructor(state: State, [x, z]: Pos, hallwayObjects: HallwayObjects, renderer: WebGLRenderer) {
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

		// Create audio listener and attach to camera
		this.audioListener = new AudioListener()
		this.camera.add(this.audioListener)

		// Load gun sound
		const audioLoader = new AudioLoader()
		this.gunshotSound = new Audio(this.audioListener)
		audioLoader.load('src/assets/sound/mixkit-game-gun-shot-1662.mp3', buffer => {
			if (this.gunshotSound) {
				this.gunshotSound.setBuffer(buffer)
				this.gunshotSound.setVolume(0.5)
			}
		})

		// Load and play ambient sound in loop
		this.ambientSound = new Audio(this.audioListener)
		audioLoader.load('src/assets/sound/spaceship-ambience-with-effects-21420.mp3', buffer => {
			if (this.ambientSound) {
				this.ambientSound.setBuffer(buffer)
				this.ambientSound.setVolume(0.2) // Lower volume for background ambience
				this.ambientSound.setLoop(true)
				this.ambientSound.play()
			}
		})

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

			// Find the hallway at this grid position
			const material = Hallway.getEnvironmentMaterial(hallwayObjects, 'Hall_NoLight', 0, renderer)

			// Set all parts of the gun to metallicness 1 and roughness 0.1 (assuming MeshBasicMaterial)
			this.gun.traverse(child => {
				const mesh = child as Mesh
				if (mesh.isMesh && mesh.material instanceof MeshStandardMaterial) {
					mesh.material.metalness = 0.4
					mesh.material.roughness = 0.1
					mesh.material.envMap = material.envMap
					mesh.material.envMapIntensity = 10
					mesh.material.needsUpdate = true
				}
			})
		})

		// Load bullet hole texture
		const loader = new TextureLoader()
		loader.load('src/assets/gun/bullets.png', texture => {
			this.bulletTexture = texture
		})

		// Mouse down/up for firing
		document.addEventListener('mousedown', (e: MouseEvent) => {
			if (e.button === 0) {
				this.isFiring = true
			}
		})
		document.addEventListener('mouseup', (e: MouseEvent) => {
			if (e.button === 0) {
				this.isFiring = false
			}
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

	fire(state: State) {
		if (!this.gunIsDown && this.isLocked && this.bulletTexture && this.gun) {
			// Play gunshot sound
			if (this.gunshotSound && this.gunshotSound.buffer) {
				// Clone the sound to allow overlapping sounds for rapid fire
				const sound = this.gunshotSound.clone()
				sound.play()
			}

			const origin = this.camera.getWorldPosition(new Vector3())
			const direction = new Vector3(0, 0, -1)
				.applyQuaternion(this.camera.getWorldQuaternion(new Quaternion()))
				.normalize()
			const raycaster = new Raycaster(origin, direction, 0, 100)
			const meshes = state.staticCollisionTree.elements.map(e => e?.ref.mesh).filter(e => e !== undefined)
			const intersects = raycaster.intersectObjects(meshes, true)
			if (intersects.length > 0) {
				const hit = intersects[0]
				const idx = Math.floor(Math.random() * 64)
				const uvScale = 1 / 8
				const bulletTexture = this.bulletTexture.clone()
				bulletTexture.needsUpdate = true
				bulletTexture.repeat.set(uvScale, uvScale)
				bulletTexture.offset.set((idx % 8) * uvScale, Math.floor(idx / 8) * uvScale)
				const geometry = new PlaneGeometry(0.5, 0.5)
				const material = new MeshBasicMaterial({
					map: bulletTexture,
					transparent: true,
					depthWrite: false,
					side: DoubleSide,
					opacity: 1,
				})
				const plane = new Mesh(geometry, material)
				const normal = new Vector3(0, 0, 1)
				if (hit.face && hit.object) {
					const worldNormalMatrix = new Matrix4().extractRotation(hit.object.matrixWorld)
					normal.copy(hit.face.normal).applyMatrix4(worldNormalMatrix).normalize()
				}

				const alignQuat = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal)
				plane.quaternion.copy(alignQuat)
				plane.rotateZ(Math.random() * Math.PI * 2)
				plane.position.copy(hit.point).add(normal.clone().multiplyScalar(0.01))
				state.scene.add(plane)
				hit.object.attach(plane)
				this.bulletHoles.push({ mesh: plane, born: performance.now(), fade: 1 })

				// --- bullet hit logic for door controls ---
				if (hit.object.name.startsWith('Cube01')) {
					Hallway.tryTriggerDoorFromMesh(hit.object, state)
				}

				// KICKBACK: add kickback on shot
				this.gunKickbackTarget = Math.min(
					this.gunKickbackTarget + GUN_KICKBACK_AMOUNT,
					GUN_KICKBACK_MAX,
				)
			}
		}
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
			const meshes = state.staticCollisionTree.elements.map(e => e?.ref.mesh).filter(e => e !== undefined)

			// Debug: visualize the raycast
			if (state.debug) {
				// Remove previous debug ray if any
				if (this._debugRay) {
					state.scene.remove(this._debugRay)
					this._debugRay.geometry.dispose()
					if (this._debugRay.material && !Array.isArray(this._debugRay.material)) {
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

			const intersects = raycaster.intersectObjects(meshes, true)

			if (intersects.length > 0) {
				// Get distance to wall
				const distance = intersects[0].distance

				let rotatePercentage
				if (distance < 1) {
					rotatePercentage = 1
				} else {
					rotatePercentage = 2 - distance
				}

				this.gun.rotation.x = -Math.PI * (70 / 180) * rotatePercentage // rotate down 70 deg
				this.gun.position.y = GUN_OFFSET.y - 0.5
				this.gunIsDown = true
			} else {
				this.gun.rotation.x = 0
				this.gun.position.y = GUN_OFFSET.y
				this.gunIsDown = false
			}

			// --- Gun walk bob animation ---
			const isMoving = moveX !== 0 || moveZ !== 0
			if (isMoving) {
				this.walkTime += deltaTime / 1000
			} else {
				this.walkTime = 0
			}

			// Calculate bob offsets
			const walkBobX =
				Math.sin(this.walkTime * GUN_WALK_BOB_FREQ) * GUN_WALK_BOB_AMPLITUDE_X * (isMoving ? 1 : 0)
			const walkBobY =
				Math.abs(Math.sin(this.walkTime * GUN_WALK_BOB_FREQ * 0.5)) *
				GUN_WALK_BOB_AMPLITUDE_Y *
				(isMoving ? 1 : 0)
			// Apply bob to gun position (in addition to offset and kickback)
			this.gun.position.x = GUN_OFFSET.x + walkBobX
			this.gun.position.y = (this.gunIsDown ? GUN_OFFSET.y - 0.5 : GUN_OFFSET.y) + walkBobY

			// --- Gun kickback animation ---
			// Smoothly interpolate kickback value
			const dt = deltaTime / 1000
			const recovery = GUN_KICKBACK_RECOVERY * dt
			// Approach target
			if (this.gunKickback < this.gunKickbackTarget) {
				this.gunKickback = Math.min(this.gunKickback + recovery, this.gunKickbackTarget)
			} else {
				this.gunKickback = Math.max(this.gunKickback - recovery, this.gunKickbackTarget)
			}

			// Decay target
			this.gunKickbackTarget = Math.max(0, this.gunKickbackTarget - recovery * 2)
			// Apply kickback to gun position (z axis)
			this.gun.position.z = GUN_OFFSET.z + this.gunKickback

			setWireframe(this.gun, state.debug)
		}

		// --- Bullet hole fading ---
		const now = performance.now()
		const fadeCount = this.bulletHoles.length
		for (let i = this.bulletHoles.length - 1; i >= 0; --i) {
			const bh = this.bulletHoles[i]
			const fadeTime = fadeCount > BULLET_HOLE_LIMIT ? BULLET_HOLE_FADE_FAST : BULLET_HOLE_FADE_TIME
			const age = (now - bh.born) / 1000
			bh.fade = 1 - age / fadeTime
			if (Array.isArray(bh.mesh.material)) {
				throw new Error('Should not be array')
			}

			bh.mesh.material.opacity = Math.max(0, bh.fade)
			if (bh.fade <= 0) {
				state.scene.remove(bh.mesh)
				this.bulletHoles.splice(i, 1)
			}
		}

		// --- Full-auto firing logic ---
		if (this.isFiring) {
			const now = performance.now()
			if (now - this.lastFireTime >= GUN_FIRE_INTERVAL) {
				this.fire(state)
				this.lastFireTime = now
			}
		}
	}
}
