import { BB } from "./bvh";
import { vec3 } from "./structs";

export interface TriData {
    verts: vec3[],
    colors: vec3[],
    tris: { vert: vec3; color: number; emissionStrength: number; }[];
}

const { min, max } = Math;
export function createBBoxFromTri(vertsList: vec3[], indices: vec3): BB {
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
    colors: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 1, 0],
        [1, 1, 1]
    ],
    tris: [
        { vert: [5, 1, 3], color: 1, emissionStrength: -1 },
        { vert: [5, 3, 2], color: 2, emissionStrength: -1 },
        { vert: [5, 2, 4], color: 5, emissionStrength: -1 },
        { vert: [5, 4, 1], color: 5, emissionStrength: -1 },
        { vert: [6, 3, 1], color: 3, emissionStrength: -1 },
        { vert: [6, 2, 3], color: 4, emissionStrength: -1 },
        { vert: [6, 4, 2], color: 5, emissionStrength: -1 },
        { vert: [6, 1, 4], color: 5, emissionStrength: -1 },

        { vert: [7, 8, 9], color: 5, emissionStrength: -1 },
        { vert: [10, 9, 8], color: 5, emissionStrength: -1 },
        { vert: [7, 9, 13], color: 5, emissionStrength: -1 },
        { vert: [7, 13, 11], color: 5, emissionStrength: -1 },
        { vert: [10, 14, 13], color: 1, emissionStrength: -1 },
        { vert: [10, 13, 9], color: 1, emissionStrength: -1 },
        { vert: [8, 7, 11], color: 2, emissionStrength: -1 },
        { vert: [12, 8, 11], color: 2, emissionStrength: -1 },
        { vert: [14, 10, 8], color: 5, emissionStrength: -1 },
        { vert: [8, 12, 14], color: 5, emissionStrength: -1 },

        { vert: [12, 11, 13], color: 5, emissionStrength: -1 },
        { vert: [13, 14, 12], color: 5, emissionStrength: -1 },
        { vert: [16, 15, 17], color: 5, emissionStrength: 30 },
        { vert: [17, 18, 16], color: 5, emissionStrength: 30 },
        // 12 left
    ]
} as TriData;