import { Material, vec3 } from '../types';
import { Geometry } from './geometry';

export function readObj(
    objSource: string,
    materialData: Record<string, Material>
): Geometry {
    const lines = objSource.split('\n');

    const verts: vec3[] = [];
    const tris: { vert: vec3; materialIndex: number; }[] = [];
    const materials: Material[] = [];
    const materialMap: Record<string, number> = {};

    for (const materialName in materialData) {
        materialMap[materialName] = materials.length;
        materials.push(materialData[materialName]);
    }

    let materialIndex = 0;
    for (const line of lines) {
        if (line.startsWith('v ')) {
            const vert = line.substring(2).split(' ').map(s => Number(s));
            const [x, y, z] = vert;
            verts.push([x, y, -z]);
        } else if (line.startsWith('usemtl ')) {
            materialIndex = materialMap[line.substring(7)];
        } else if (line.startsWith('f ')) {
            const verts = line
                .substring(2)
                .split(' ')
                .map(s => Number(s.split('/')[0]));
            if (verts.length === 3) {
                const [a, b, c] = verts;
                tris.push({ vert: [a - 1, c - 1, b - 1], materialIndex });
            } else {
                const [a, b, c, d] = verts;
                tris.push({ vert: [a - 1, c - 1, b - 1], materialIndex });
                tris.push({ vert: [a - 1, d - 1, c - 1], materialIndex });
            }
        }
    }
    return { verts, tris, materials };
}