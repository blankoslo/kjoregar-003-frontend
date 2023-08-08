"use client"

import { useEffect, useRef, useState } from "react";
import WebGLApp from './3d/WebGLApp'
import { BufferGeometry, NormalBufferAttributes, Texture, Vector3 } from 'three'
import { TextureLoader } from 'three/src/loaders/TextureLoader.js'
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js'
import { Mesh } from 'three/src/objects/Mesh.js'
import { ProjectedMaterial } from '@lume/three-projected-material/dist/ProjectedMaterial.js'
import { Object3D } from 'three/src/core/Object3D.js'
import { DirectionalLight } from 'three/src/lights/DirectionalLight.js'
import { AmbientLight } from 'three/src/lights/AmbientLight.js'
import { loadGltf, extractGeometry } from './3d/utils'
import styles from './avatar.module.css'

export const Avatar = ({ texture }: { texture: string | undefined }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    const [webglapp, setWebglapp] = useState<WebGLApp | undefined>();
    const [geometry, setGeometry] = useState<BufferGeometry<NormalBufferAttributes> | undefined>();

    useEffect(() => {
        if (!webglapp) return
        if (!geometry) return

        const projectionCam = new PerspectiveCamera(45, 1, 0.01, 100)
        projectionCam.position.z = 3

        // create the mesh with the projected material
        geometry.clearGroups()

        const materials = [
            new ProjectedMaterial({
                camera: projectionCam,
                texture: texture ? new TextureLoader().load(`data:image/png;base64,${texture}`) : undefined,
                color: '#fff',
                textureScale: 1,
                transparent: true,
                frontFacesOnly: false,
            })
        ]
        geometry.addGroup(0, Infinity, 0)

        const mesh = new Mesh(geometry, materials)
        webglapp.scene.add(mesh)
        mesh.material.forEach((material, i) => {
            if (i === 0) {
                return
            }

            material.uniforms.backgroundOpacity.value = 0
        })

        mesh.material[0].project(mesh)
    }, [webglapp, geometry, texture])

    useEffect(() => {
        const { current: container } = ref;

        async function load() {
            const webgl = new WebGLApp({
                canvas: container,
                // set the scene background color
                background: '#272D2A',
                backgroundAlpha: 0,
                // show the fps counter from stats.js
                showFps: false,
                // enable orbit-controls
                orbitControls: true,

                // UI to toggle camera helper
                hideControls: true,
                controls: {
                    showProjector: false,
                },
                height: 256,
                width: 256,
                cameraPosition: new Vector3(0, 0, 3),
            })
            setWebglapp(webgl)

            const gltf = await loadGltf('./models/suzanne.gltf')
            setGeometry(extractGeometry(gltf.scene))
            //texture = 
            //new TextureLoader().load('./textures/test.jpg'),


            // add lights
            const lightContainer = new Object3D()
            webgl.scene.add(lightContainer)
            const directionalLight = new DirectionalLight(0xffffff, 0.6)
            directionalLight.position.set(10, 10, 10)
            lightContainer.add(directionalLight)

            const ambientLight = new AmbientLight(0xffffff, 0.6)
            webgl.scene.add(ambientLight)

            // start animation loop
            webgl.start()
        }

        if (container) {
            load();
        }
    }, []);

    return <canvas ref={ref} id="scene" className={styles.scene}>Scene</canvas>
}
