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
        const [x, y, z] = vertsList[index];
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
        const v0 = verts[tri.vert[0]];
        const v1 = verts[tri.vert[1]];
        const v2 = verts[tri.vert[2]];
        const e1: vec3 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const e2: vec3 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        const cross: vec3 = [
            e1[1] * e2[2] - e1[2] * e2[1],
            e1[2] * e2[0] - e1[0] * e2[2],
            e1[0] * e2[1] - e1[1] * e2[0],
        ];
        const length = Math.hypot(cross[0], cross[1], cross[2]);
        const normal: vec3 = [
            cross[0] / length,
            cross[1] / length,
            cross[2] / length
        ];
        output.push({
            p0: verts[tri.vert[0]],
            p1: verts[tri.vert[1]],
            p2: verts[tri.vert[2]],
            materialIndex: tri.materialIndex,
            normal
        });
    }
    return output;
}