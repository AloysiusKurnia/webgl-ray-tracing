#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D currentFrame;
uniform sampler2D previousFrame;
uniform float iteration;

out vec4 outColor;

void main() {
    vec4 currentFrameColor = texture(currentFrame, texCoord);
    vec4 previousFrameColor = texture(previousFrame, texCoord);
    outColor = (previousFrameColor * (iteration - 1.) + currentFrameColor) / iteration;
}