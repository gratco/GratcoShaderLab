
export enum UniformType {
  FLOAT = 'float',
  VEC2 = 'vec2',
  VEC3 = 'vec3',
  COLOR = 'color', // vec3 interpreted as color
  BOOL = 'bool'
}

export interface UniformDefinition {
  name: string;
  type: UniformType;
  value: any;
  min?: number;
  max?: number;
}

export interface ShaderState {
  code: string;
  uniforms: UniformDefinition[];
  error: string | null;
}

export const DEFAULT_SHADER_CODE = `// HLSL-style syntax is supported via macros!
// Try changing variables or ask AI to generate a new effect.

uniform float time;
uniform float2 resolution;
uniform float3 colorAccent;
uniform float intensity;

float4 mainImage(float2 uv) {
    // Normalize coordinates to center
    float2 p = (uv - 0.5) * 2.0;
    p.x *= resolution.x / resolution.y;

    // Simple animation
    float len = length(p);
    float angle = atan2(p.y, p.x);
    
    float wave = sin(len * 10.0 - time * 2.0) * 0.5 + 0.5;
    float spiral = sin(angle * 5.0 + time) * 0.5 + 0.5;
    
    float3 col = lerp(float3(0.0, 0.0, 0.0), colorAccent, wave * spiral * intensity);
    
    // Add a glow center
    col += (1.0 / (len * 5.0)) * float3(0.1, 0.5, 1.0);

    return float4(col, 1.0);
}
`;

export const HLSL_PREAMBLE = `
// --- HLSL Compatibility Macros ---
#define float2 vec2
#define float3 vec3
#define float4 vec4
#define float2x2 mat2
#define float3x3 mat3
#define float4x4 mat4
#define lerp mix
#define frac fract
#define atan2 atan
#define fmod mod
#define tex2D texture
#define static 

// Standard inputs
varying vec2 vUv;
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

// HLSL Standard aliases (Ensures auto-generated code works without explicit declaration)
uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

// User Uniforms will be injected here automatically by Three.js
// We map mainImage to standard GLSL main()

// Forward declaration of user function if needed, but we assume user writes mainImage
float4 mainImage(float2 uv);

void main() {
  // Call user function
  gl_FragColor = mainImage(vUv);
}
`;