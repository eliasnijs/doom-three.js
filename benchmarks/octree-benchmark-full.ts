/***************************************************************************************************************
 * Octree Benchmark Full CSV Generator
 ***************************************************************************************************************/

import { Vector3 } from 'three'

import { OctTree, octTreeGet, octTreeInitialize, octTreeInsert, octTreeRebuild } from '../src/engine/octtree'
import { BoxCollider } from '../src/engine/physics'

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Helper Functions

// Create a mock object with a mesh for the BoxCollider
function createMockObject(position: Vector3): { mesh: { position: Vector3 } } {
  return {
    mesh: {
      position: position.clone(),
    },
  }
}

// Create a random box collider for benchmarking
function createRandomBoxCollider(worldSize: number): BoxCollider {
  // Random position within the world bounds
  const position = new Vector3(
    Math.random() * worldSize - worldSize / 2,
    Math.random() * worldSize - worldSize / 2,
    Math.random() * worldSize - worldSize / 2
  )

  // Random size between 1 and 5 units
  const size = 1 + Math.random() * 4
  const halfSize = size / 2

  // Create mock object
  const mockObject = createMockObject(position)

  // Return a BoxCollider with relative bounding box coordinates
  return {
    ref: mockObject as any,
    bbl_rel: new Vector3(-halfSize, -halfSize, -halfSize),
    ftr_rel: new Vector3(halfSize, halfSize, halfSize),
  }
}

// Create an array of n random box colliders
function createRandomColliders(count: number, worldSize: number): BoxCollider[] {
  const colliders: BoxCollider[] = []
  for (let i = 0; i < count; i++) {
    colliders.push(createRandomBoxCollider(worldSize))
  }
  return colliders
}

// Time a function execution
function timeExecution(func: () => void): number {
  const start = performance.now()
  func()
  return performance.now() - start
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// CSV Generation

async function generateFullCSV() {
  // CSV Header
  console.log("test_type,elements,param1,param2,time_ms,speedup")

  const worldSize = 1000
  const origin = new Vector3(-worldSize / 2, -worldSize / 2, -worldSize / 2)
  const elementCounts = [10, 100, 1000, 10000]

  // Initialization Results
  const worldSizes = [100, 1000, 10000]
  const capacities = [4, 8, 16]
  const maxDepths = [4, 8, 12]

  for (const worldSize of worldSizes) {
    for (const capacity of capacities) {
      for (const maxDepth of maxDepths) {
        const time = timeExecution(() => {
          octTreeInitialize(
            new Vector3(-worldSize / 2, -worldSize / 2, -worldSize / 2),
            worldSize,
            capacity,
            maxDepth
          )
        })
        console.log(`initialization,0,${worldSize},capacity_${capacity}_maxDepth_${maxDepth},${time},0`)
      }
    }
  }

  // Insertion Results
  for (const count of elementCounts) {
    const colliders = createRandomColliders(count, worldSize)

    for (const capacity of [4, 8, 16]) {
      for (const maxDepth of [4, 8, 12]) {
        const time = timeExecution(() => {
          const tree = octTreeInitialize(origin, worldSize, capacity, maxDepth)
          for (const collider of colliders) {
            octTreeInsert(tree, collider)
          }
        })
        console.log(`insertion,${count},capacity_${capacity},maxDepth_${maxDepth},${time},0`)
      }
    }
  }

  // Query Results
  for (const count of elementCounts) {
    const colliders = createRandomColliders(count, worldSize)

    const tree = octTreeInitialize(origin, worldSize, 8, 8)
    for (const collider of colliders) {
      octTreeInsert(tree, collider)
    }

    const queryPoints = []
    for (let i = 0; i < 100; i++) {
      const center = new Vector3(
        Math.random() * worldSize - worldSize / 2,
        Math.random() * worldSize - worldSize / 2,
        Math.random() * worldSize - worldSize / 2
      )
      const querySize = 10 + Math.random() * 50

      queryPoints.push({
        bbl: center.clone().sub(new Vector3(querySize, querySize, querySize)),
        ftr: center.clone().add(new Vector3(querySize, querySize, querySize))
      })
    }

    const time = timeExecution(() => {
      for (const query of queryPoints) {
        octTreeGet(tree, query.bbl, query.ftr)
      }
    })
    console.log(`query,${count},100_queries,capacity_8_maxDepth_8,${time},0`)
  }

  // Rebuild Results
  for (const count of elementCounts) {
    const colliders = createRandomColliders(count, worldSize)

    for (const deadPercentage of [0, 25, 50, 75]) {
      const tree = octTreeInitialize(origin, worldSize, 8, 8)

      for (const collider of colliders) {
        octTreeInsert(tree, collider)
      }

      const deadCount = Math.floor(count * deadPercentage / 100)
      for (let i = 0; i < deadCount; i++) {
        tree.elements[i] = undefined
      }

      const time = timeExecution(() => {
        octTreeRebuild(tree)
      })
      console.log(`rebuild,${count},${deadPercentage}percent_dead,capacity_8_maxDepth_8,${time},0`)
    }
  }

  // Octree vs Linear
  for (const count of elementCounts) {
    const colliders = createRandomColliders(count, worldSize)

    const tree = octTreeInitialize(origin, worldSize, 8, 8)
    for (const collider of colliders) {
      octTreeInsert(tree, collider)
    }

    const queryPoints = []
    for (let i = 0; i < 100; i++) {
      const center = new Vector3(
        Math.random() * worldSize - worldSize / 2,
        Math.random() * worldSize - worldSize / 2,
        Math.random() * worldSize - worldSize / 2
      )
      const querySize = 20 + Math.random() * 30

      queryPoints.push({
        bbl: center.clone().sub(new Vector3(querySize, querySize, querySize)),
        ftr: center.clone().add(new Vector3(querySize, querySize, querySize))
      })
    }

    const octreeTime = timeExecution(() => {
      for (const query of queryPoints) {
        octTreeGet(tree, query.bbl, query.ftr)
      }
    })

    const linearTime = timeExecution(() => {
      for (const query of queryPoints) {
        colliders.filter(collider => {
          const pos = collider.ref.mesh.position
          const bbl = pos.clone().add(collider.bbl_rel)
          const ftr = pos.clone().add(collider.ftr_rel)

          return !(
            bbl.x > query.ftr.x ||
            ftr.x < query.bbl.x ||
            bbl.y > query.ftr.y ||
            ftr.y < query.bbl.y ||
            bbl.z > query.ftr.z ||
            ftr.z < query.bbl.z
          )
        })
      }
    })

    const speedup = linearTime / octreeTime
    console.log(`comparison,${count},octree,100_queries,${octreeTime},0`)
    console.log(`comparison,${count},linear,100_queries,${linearTime},0`)
    console.log(`comparison,${count},speedup,100_queries,0,${speedup}`)
  }
}

// Run the CSV generator
generateFullCSV().catch(console.error)
