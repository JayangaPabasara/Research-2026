import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import {
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Float32BufferAttribute,
  Vector3,
} from 'three'
import type { Group } from 'three'

function makeLeaf(side: number, height: number) {
  const vertices: number[] = [],
    indices: number[] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16,
      width = Math.sin(Math.PI * t) * 0.11
    const x = side * t * 1.12,
      y = height + Math.sin(t * 2.2) * 0.95,
      z = t * t * 0.18
    vertices.push(x, y, z - width, x, y + width * 0.3, z + width)
    if (i < 16) {
      const p = i * 2
      indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function Plant({ index }: { index: number }) {
  const group = useRef<Group>(null)
  const leaves = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) =>
        makeLeaf(i % 2 ? 1 : -1, 0.3 + i * 0.36)
      ),
    []
  )
  const curve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0, 0, 0),
        new Vector3(-0.04, 1.2, 0),
        new Vector3(0.03, 2.4, 0),
        new Vector3(0.34, 2.78, 0),
        new Vector3(0.65, 2.55, 0),
      ]),
    []
  )
  useEffect(() => () => leaves.forEach((leaf) => leaf.dispose()), [leaves])
  useFrame(({ clock, pointer }, delta) => {
    if (!group.current) return
    const target =
      Math.sin(clock.elapsedTime * 0.8 + index) * 0.025 + pointer.x * 0.035
    group.current.rotation.z +=
      (target - group.current.rotation.z) * Math.min(delta * 3, 1)
  })
  return (
    <group
      ref={group}
      position={[(index - 1) * 0.38, -1.6, index === 1 ? 0.15 : -0.15]}
      rotation={[0, index * 1.9, (index - 1) * -0.13]}
      scale={index === 1 ? 1.1 : 0.93}
    >
      <mesh>
        <tubeGeometry args={[curve, 28, 0.018, 5, false]} />
        <meshStandardMaterial color="#8ca65d" roughness={0.8} />
      </mesh>
      {leaves.map((geometry, i) => (
        <mesh key={i} geometry={geometry} rotation={[0, i * 0.65, 0]}>
          <meshStandardMaterial
            color={i % 2 ? '#79b86a' : '#439761'}
            side={DoubleSide}
            roughness={0.65}
          />
        </mesh>
      ))}
      {Array.from({ length: 26 }, (_, i) => {
        const t = i / 25
        return (
          <mesh
            key={i}
            position={[
              0.04 + t * 0.62 + (i % 2 ? 0.045 : -0.045),
              2.4 + Math.sin(t * Math.PI) * 0.32 - t * 0.03,
              i % 2 ? 0.05 : -0.05,
            ]}
            rotation={[0.2, 0, -0.45 + t]}
            scale={[0.036, 0.085, 0.033]}
          >
            <sphereGeometry args={[1, 7, 5]} />
            <meshStandardMaterial
              color={i % 3 ? '#e6c477' : '#c6a355'}
              roughness={0.7}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function ContextGuard({
  onFailure,
  onReady,
}: {
  onFailure: () => void
  onReady: () => void
}) {
  const { gl } = useThree()
  const reported = useRef(false)
  useFrame(() => {
    if (!reported.current) {
      reported.current = true
      onReady()
    }
  })
  useEffect(() => {
    const canvas = gl.domElement
    const fail = (event: Event) => {
      event.preventDefault()
      onFailure()
    }
    canvas.addEventListener('webglcontextlost', fail)
    return () => canvas.removeEventListener('webglcontextlost', fail)
  }, [gl, onFailure])
  return null
}

export default function RiceScene({
  onFailure,
  onReady,
}: {
  onFailure: () => void
  onReady: () => void
}) {
  return (
    <div className="pg-canvas">
      <Canvas
        dpr={[1, 1.35]}
        camera={{ position: [0, 0.2, 5.5], fov: 42 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
        fallback={<span />}
        onCreated={({ gl }) => gl.setClearColor('#173c29')}
      >
        <ContextGuard onFailure={onFailure} onReady={onReady} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 4, 3]} intensity={3} color="#ffe4a0" />
        <directionalLight
          position={[-3, 1, 1]}
          intensity={1.3}
          color="#a4d8b2"
        />
        {[0, 1, 2].map((i) => (
          <Plant key={i} index={i} />
        ))}
        <Sparkles
          count={18}
          scale={[3.5, 3.5, 2]}
          size={2}
          speed={0.2}
          color="#efd290"
        />
      </Canvas>
    </div>
  )
}
