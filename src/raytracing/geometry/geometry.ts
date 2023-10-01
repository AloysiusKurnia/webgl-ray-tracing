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