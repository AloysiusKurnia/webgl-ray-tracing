import { BoundingBox, Material, PrecomputedTriangle, vec3 } from "../types";

export interface Geometry {
    verts: vec3[],
    materials: Material[],
    tris: { vert: vec3; materialIndex: number; }[];
}

const { min, max } = Math;
export function createBBoxFromTri(vertsList: vec3[], indices: vec3): BoundingBox {
    let x0 = Infinity; let x1 = -Infinity;
    let y0 = Infinity; let y1 = -Infinity;
    let z0 = Infinity; let z1 = -Infinity;

    for (const index of indices) {
        const [x, y, z] = vertsList[index - 1];
        x0 = min(x0, x); x1 = max(x1, x);
        y0 = min(y0, y); y1 = max(y1, y);
        z0 = min(z0, z); z1 = max(z1, z);
    }

    return { x0, y0, z0, x1, y1, z1 };
}


export const octahedron = {
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
        { color: [1, 1, 1], emissionStrength: 25, roughness: 0 },
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

export function compileGeometry(geometry: Geometry): PrecomputedTriangle[] {
    const { tris, verts } = geometry;
    const output: PrecomputedTriangle[] = [];
    for (const tri of tris) {
        output.push({
            p0: verts[tri.vert[0] - 1],
            p1: verts[tri.vert[1] - 1],
            p2: verts[tri.vert[2] - 1],
            materialIndex: tri.materialIndex,
            normal: [0, 0, 0]
        });
    }
    return output;
}