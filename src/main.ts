import * as THREE from 'three'

import { window_init } from './engine/window.js'

export type State = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  instances: THREE.Object3D[]
  last_time_ms: number
}

function nextframe(time_ms: number, state: State) {
  // handle controls

  // update state
  state.instances.forEach(cube => {
    cube.rotation.x += 0.01
    cube.rotation.y += 0.01
  })

  // render and swap
  renderer.render(state.scene, state.camera)
  renderer.state.reset()
  state.last_time_ms = time_ms
}

function main(renderer: THREE.WebGLRenderer) {
  window_init(renderer)
  console.log('initizalized')

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  )
  camera.position.z = 5

  const state: State = {
    scene,
    camera,
    instances: [],
    last_time_ms: 0.0,
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  const cube = new THREE.Mesh(geometry, material)
  state.instances.push(cube)
  state.scene.add(cube)

  console.log('starting loop')
  renderer.setAnimationLoop(time_ms => {
    nextframe(time_ms, state)
  })

  // TODO(...): figure out where this needs to go and wether it is
  // necessary in the first place.
  // window_die(renderer);
}

const renderer = new THREE.WebGLRenderer()
document.body.appendChild(renderer.domElement)
renderer.setSize(window.innerWidth, window.innerHeight)

main(renderer)
