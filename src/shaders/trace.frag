#version 300 es

// UNIFORMS ===================================================================

precision highp float;
precision highp isampler2D;

in vec2 tracingCoordinates;
in vec2 pixelMap;

uniform sampler2D floatArrayUniform;
uniform isampler2D integerArrayUniform;

uniform float raySourceDistance;
uniform vec2 screenSize;
uniform float seed;

uniform uint bounceLimit;
uniform uint raysPerPixel;

out vec4 outColor;

// STRUCTS ====================================================================

struct Material {
    vec3 color;
    float emissionStrength;
};

struct TraceOutput {
    int hitGeometryIndex;
    vec3 newOrigin;
    vec3 normal;
};

// DATA FETCHER ===============================================================

// Floats
// 0-2 | Triangle vertices
// 3   | Triangle normal [unused]
// 4   | Material color
// 5   | Material specular color [unused]
// 6   | [Material roughness, Material emission strength, -]
// 7-8 | Bounding box min and max points respectively
// Ints
// 0   | [Box structure data, triangle material index, -]

ivec4 fetchIntegerArray(int index, int signifier) {
    return texelFetch(integerArrayUniform, ivec2(index, signifier), 0);
}

vec4 fetchFloatArray(int index, int signifier) {
    return texelFetch(floatArrayUniform, ivec2(index, signifier), 0);
}

Material triMaterial(int index) {
    int materialIndex = fetchIntegerArray(index, 0).g;

    vec3 color = fetchFloatArray(materialIndex, 4).rgb;
    float emission = fetchFloatArray(materialIndex, 6).g;
    return Material(color, emission);
}

vec3[3] getTri(int index) {
    vec3 v0 = fetchFloatArray(index, 0).rgb;
    vec3 v1 = fetchFloatArray(index, 1).rgb;
    vec3 v2 = fetchFloatArray(index, 2).rgb;
    return vec3[](v0, v1, v2);
}

// RANDOMIZATION ==============================================================

// PCG Randomization algorithm
float random(inout uint state) {
    state = state * 747796405u + 1u;
    uint value = (((state >> 10) ^ state) >> 12) & 0xffffu;
    uint rot = state >> 28;
    uint outputInteger = ((value >> rot) | (value << ((-rot) & 15u))) & 0xffffu;

    return float(outputInteger) / 65535.0;
}

const float PI = 3.1415926538;
vec3 randomDirection(inout uint randomState) {
    float z = 2.0 * random(randomState) - 1.0;
    float angle = random(randomState) * 2.0 * PI;
    float sliceRadius = sqrt(1.0 - z * z);
    return vec3(sliceRadius * sin(angle), sliceRadius * cos(angle), z);
}

// INTERSECTION ===============================================================
const float INFINITY = 1. / 0.;
float intersectBox(vec3 minVert, vec3 maxVert, vec3 direction, vec3 rayOrigin) {
    float tMin = -INFINITY, tMax = INFINITY;
    vec3 rayDirInv = 1. / direction;
    if(rayDirInv.x != 0.0) {
        float t1 = (minVert.x - rayOrigin.x) / rayDirInv.x;
        float t2 = (maxVert.x - rayOrigin.x) / rayDirInv.x;

        tMin = max(tMin, min(t1, t2));
        tMax = min(tMax, max(t1, t2));
    }

    if(rayDirInv.y != 0.0) {
        float t1 = (minVert.y - rayOrigin.y) / rayDirInv.y;
        float t2 = (maxVert.y - rayOrigin.y) / rayDirInv.y;

        tMin = max(tMin, min(t1, t2));
        tMax = min(tMax, max(t1, t2));
    }

    if(rayDirInv.z != 0.0) {
        float t1 = (minVert.z - rayOrigin.z) / rayDirInv.z;
        float t2 = (maxVert.z - rayOrigin.z) / rayDirInv.z;

        tMin = max(tMin, min(t1, t2));
        tMax = min(tMax, max(t1, t2));
    }
    if (tMax < tMin || tMax < 0.) {
        return -1.;
    }
    return tMax;
}

// Moeller-Trumbore intersection
float intersectTriangle(vec3[3] verts, vec3 direction, vec3 rayOrigin) {
    vec3 e1 = verts[1] - verts[0];
    vec3 e2 = verts[2] - verts[0];
    vec3 h = cross(direction, e2);
    float a = dot(e1, h);

        // The ray does not intersect plane.
        // For double sided triangle, use abs(a).
    if(a < 0.0001)
        return -1.;

    float f = 1. / a;
    vec3 s = rayOrigin - verts[0];
    float u = f * dot(s, h);

    if(u < 0. || u > 1.)
        return -1.;

    vec3 q = cross(s, e1);
    float v = f * dot(direction, q);

    if(v < 0. || u + v > 1.)
        return -1.;

    float dist = f * dot(e2, q);
    return dist;
}

// RAY TRACING ================================================================

TraceOutput singleTrace(vec3 rayOrigin, vec3 direction) {
    int nearestShapeIndex = -1;
    float distanceToNearestShape = 0.0;
    int triAmount = textureSize(floatArrayUniform, 0).x;
    for(int i = 0; i < triAmount; i++) {
        vec3[3] verts = getTri(i);
        float dist = intersectTriangle(verts, direction, rayOrigin);
        if (dist < 0.01) continue;
        if (nearestShapeIndex != -1 && dist >= distanceToNearestShape) continue;
        distanceToNearestShape = dist;
        nearestShapeIndex = i;
    }

    vec3 newOrigin = distanceToNearestShape * direction + rayOrigin;
    vec3 normal;
    vec3[3] verts = getTri(nearestShapeIndex);
    normal = cross(verts[1] - verts[0], verts[2] - verts[0]);
    normal /= length(normal);
    return TraceOutput(nearestShapeIndex, newOrigin, normal);
}

vec3 runRayTracing(inout uint randomState, uint maxBounces) {
    vec3 raySource = vec3(0, 0, -raySourceDistance);
    vec3 direction = normalize(vec3(tracingCoordinates, 0) - raySource);
    vec3 rayColor = vec3(1);
    vec3 incomingLight = vec3(0);
    for(uint i = 0u; i < maxBounces; i++) {
        TraceOutput traceResult = singleTrace(raySource, direction);

        if(traceResult.hitGeometryIndex == -1) {
            outColor = vec4(0, 0, 0, 1);
            return incomingLight;
            break;
        }
        Material material = triMaterial(traceResult.hitGeometryIndex);

        // assuming emission and diffusive materials are two completely different things
        if(material.emissionStrength > 0.) {
            vec3 emittedLight = material.color * material.emissionStrength;
            incomingLight += emittedLight * rayColor;
            break;
        }
        direction = normalize(traceResult.normal + randomDirection(randomState));
        rayColor *= material.color;

        raySource = traceResult.newOrigin;
    }
    return incomingLight;
}

void main() {
    uvec2 castPixelMap = uvec2(pixelMap);
    uint index = castPixelMap.y * uint(screenSize.x) + castPixelMap.x;
    uint randomState = uint(seed) + index;
    random(randomState);
    vec3 color = vec3(0);

    for(uint i = 0u; i < raysPerPixel; i++) {
        color += runRayTracing(randomState, bounceLimit);
    }
    outColor = vec4(color / float(raysPerPixel), 1);
}