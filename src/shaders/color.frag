#version 300 es
precision highp float;

uniform vec3 color;

out vec4 outColor;

void main() {
    outColor = vec4(color, 1);
}