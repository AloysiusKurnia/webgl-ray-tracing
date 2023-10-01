#version 300 es
#define PI      3.1415926538
#define EPSILON 0.00000001

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

Material triMaterial(int index) {
    int materialIndex = texelFetch(integerArrayUniform, ivec2(index, 0), 0).g;
    vec3 color = texelFetch(floatArrayUniform, ivec2(materialIndex, 4), 0).rgb;
    float emission = texelFetch(floatArrayUniform, ivec2(materialIndex, 6), 0).g;
    return Material(color, emission);
}

vec3[3] getTri(int index) {
    vec3 v0 = texelFetch(floatArrayUniform, ivec2(index, 0), 0).rgb;
    vec3 v1 = texelFetch(floatArrayUniform, ivec2(index, 1), 0).rgb;
    vec3 v2 = texelFetch(floatArrayUniform, ivec2(index, 2), 0).rgb;
    return vec3[](v0, v1, v2);
}

TraceOutput singleTrace(vec3 lineOrigin, vec3 direction) {
    int nearestShapeIndex = -1;
    float distanceToNearestShape = 0.0;
    int triAmount = textureSize(floatArrayUniform, 0).x;
    for(int i = 0; i < triAmount; i++) {
        // Moeller-Trumbore intersection
        vec3[3] verts = getTri(i);

        vec3 e1 = verts[1] - verts[0];
        vec3 e2 = verts[2] - verts[0];
        vec3 h = cross(direction, e2);
        float a = dot(e1, h);

        // The ray does not intersect plane.
        // For double sided triangle, use abs(a).
        if(a < EPSILON)
            continue;

        float f = 1. / a;
        vec3 s = lineOrigin - verts[0];
        float u = f * dot(s, h);

        if(u < 0. || u > 1.)
            continue;

        vec3 q = cross(s, e1);
        float v = f * dot(direction, q);

        if(v < 0. || u + v > 1.)
            continue;

        float dist = f * dot(e2, q);
        // The triangle is behind the ray or farther than the closest shape.
        if(dist <= EPSILON)
            continue;
        if(nearestShapeIndex != -1 && dist >= distanceToNearestShape)
            continue;
        distanceToNearestShape = dist;
        nearestShapeIndex = i;
    }

    vec3 newOrigin = distanceToNearestShape * direction + lineOrigin;
    vec3 normal;
    vec3[3] verts = getTri(nearestShapeIndex);
    normal = cross(verts[1] - verts[0], verts[2] - verts[0]);
    normal /= length(normal);
    return TraceOutput(nearestShapeIndex, newOrigin, normal);
}

// PCG Randomization algorithm
float random(inout uint state) {
    state = state * 747796405u + 1u;
    uint value = (((state >> 10) ^ state) >> 12) & 0xffffu;
    uint rot = state >> 28;
    uint outputInteger = ((value >> rot) | (value << ((-rot) & 15u))) & 0xffffu;

    return float(outputInteger) / 65535.0;
}

vec3 randomDirection(inout uint randomState) {
    float z = 2.0 * random(randomState) - 1.0;
    float angle = random(randomState) * 2.0 * PI;
    float sliceRadius = sqrt(1.0 - z * z);
    return vec3(sliceRadius * sin(angle), sliceRadius * cos(angle), z);
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
    // vec3 debug = triMaterial(20).color;
    // outColor = vec4(debug, 1);
    // return;
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