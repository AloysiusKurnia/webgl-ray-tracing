import { buildEncodedBVHTree } from "raytracing/geometry/bvh";
import { Geometry, compileGeometry, createBBoxFromTri } from "raytracing/geometry/geometry";
import { raytrace } from "raytracing/raytracing";


const octahedron = {
    verts: [
        [0.4 + .4, -0.5 + 0, 0],
        [0.4 - .4, -0.5 + 0, 0],
        [0.4 + 0, -0.5 + 0, -.4],
        [0.4 + 0, -0.5 + 0, +.4],
        [0.4 + 0, -0.5 + .4, 0],
        [0.4 + 0, -0.5 - .4, 0],

        [+2, -1, +2],
        [+2, -1, -2],
        [-2, -1, +2],
        [-2, -1, -2],
        [+2, +1, +2],
        [+2, +1, -2],
        [-2, +1, +2],
        [-2, +1, -2],

        [+.3, .99, +.3],
        [+.3, .99, -.3],
        [-.3, .99, +.3],
        [-.3, .99, -.3],
    ],
    materials: [
        { color: [1, 0, 0], emissionStrength: -1, roughness: 1 },
        { color: [0, 1, 0], emissionStrength: -1, roughness: 1 },
        { color: [0, 0, 1], emissionStrength: -1, roughness: 1 },
        { color: [1, 1, 0], emissionStrength: -1, roughness: 1 },
        { color: [1, 1, 1], emissionStrength: -1, roughness: 1 },
        { color: [1, 1, 1], emissionStrength: 100, roughness: 0 },
    ],
    tris: [
        // Octahedron
        { vert: [5, 1, 3], materialIndex: 0 },
        { vert: [5, 3, 2], materialIndex: 1 },
        { vert: [5, 2, 4], materialIndex: 4 },
        { vert: [5, 4, 1], materialIndex: 4 },
        { vert: [6, 3, 1], materialIndex: 2 },
        { vert: [6, 2, 3], materialIndex: 3 },
        { vert: [6, 4, 2], materialIndex: 4 },
        { vert: [6, 1, 4], materialIndex: 4 },
        // Room
        { vert: [7, 8, 9], materialIndex: 4 },
        { vert: [10, 9, 8], materialIndex: 4 },
        { vert: [7, 9, 13], materialIndex: 4 },
        { vert: [7, 13, 11], materialIndex: 4 },
        { vert: [10, 14, 13], materialIndex: 0 },
        { vert: [10, 13, 9], materialIndex: 0 },
        { vert: [8, 7, 11], materialIndex: 1 },
        { vert: [12, 8, 11], materialIndex: 1 },
        { vert: [14, 10, 8], materialIndex: 4 },
        { vert: [8, 12, 14], materialIndex: 4 },
        { vert: [12, 11, 13], materialIndex: 4 },
        { vert: [13, 14, 12], materialIndex: 4 },
        // Lamp
        { vert: [16, 15, 17], materialIndex: 5 },
        { vert: [17, 18, 16], materialIndex: 5 },
    ]
} as Geometry;

const bounceLimit = 3, raysPerPixel = 50, maxIteration = 100;

async function main() {
    const wrapper = document.createElement('div');
    const canvas = document.createElement('canvas');
    const statusBar = document.createElement('div');
    statusBar.innerText = 'Tap the canvas to start rendering.';
    wrapper.id = 'wrapper';
    function updateStatusBar(msg: string) { statusBar.innerText = msg; }
    canvas.height = 200;
    canvas.width = 300;

    wrapper.appendChild(canvas);
    wrapper.appendChild(statusBar);
    document.body.appendChild(wrapper);

    const bbox = octahedron.tris.map(
        (tri, i) => {
            console.log(`Triangle ${i}:`);
            return createBBoxFromTri(octahedron.verts, tri.vert)
        }
    );
    const boundingBoxData = buildEncodedBVHTree(bbox);
    const triangles = compileGeometry(octahedron);

    let resolver: () => void;
    await new Promise<void>((res) => {
        resolver = () => res();
        canvas.addEventListener('mousedown', resolver);
    });

    canvas.removeEventListener('mousedown', resolver!);

    raytrace(canvas, {
        triangles,
        materials: octahedron.materials,
        boundingBoxData
    }, {
        bounceLimit,
        raysPerPixel,
        maxIteration
    }, updateStatusBar);
}

window.onload = main;