
import { UniformDefinition, UniformType, HLSL_PREAMBLE } from '../types';

/**
 * Parses shader code to find uniform definitions.
 * Looks for: uniform type name;
 */
export const parseUniforms = (code: string): UniformDefinition[] => {
  const regex = /uniform\s+(\w+)\s+(\w+)(\s*=\s*([^;]+))?;/g;
  const uniforms: UniformDefinition[] = [];
  let match;

  while ((match = regex.exec(code)) !== null) {
    const typeStr = match[1];
    const name = match[2];
    
    // Ignore built-ins
    if (['time', 'resolution', 'mouse', 'iTime', 'iResolution', 'iMouse'].includes(name)) continue;

    let type = UniformType.FLOAT;
    let value: any = 0.5;
    let min = 0;
    let max = 1;

    if (typeStr === 'float') {
      type = UniformType.FLOAT;
      value = 0.5;
      min = 0; 
      max = 5; // Default range, heuristics can improve this
    } else if (typeStr === 'float2' || typeStr === 'vec2') {
      type = UniformType.VEC2;
      value = [0.5, 0.5];
    } else if (typeStr === 'float3' || typeStr === 'vec3') {
       // heuristic: if name contains "color", treat as color
       if (name.toLowerCase().includes('color') || name.toLowerCase().includes('col')) {
         type = UniformType.COLOR;
         value = [1.0, 0.5, 0.2]; // nice orange default
       } else {
         type = UniformType.VEC3;
         value = [0.5, 0.5, 0.5];
       }
    }

    uniforms.push({ name, type, value, min, max });
  }

  return uniforms;
};

export const assembleShader = (userCode: string): string => {
  // Remove HLSL semantics commonly found in pixel shaders to prevent GLSL compiler errors
  // e.g. float4 main(float2 uv : TEXCOORD) : SV_Target
  
  let cleanedCode = userCode
    .replace(/:\s*SV_Target\d*/gi, "")
    .replace(/:\s*SV_Position\d*/gi, "")
    .replace(/:\s*TEXCOORD\d*/gi, "")
    .replace(/:\s*COLOR\d*/gi, "");

  // Remove standard uniforms if user declared them (to avoid redefinition error with preamble)
  // Matches: uniform float time; or uniform float2 resolution;
  cleanedCode = cleanedCode
    .replace(/^\s*uniform\s+\w+\s+time\s*;?/gm, "// [Built-in] uniform float time;")
    .replace(/^\s*uniform\s+\w+\s+resolution\s*;?/gm, "// [Built-in] uniform float2 resolution;")
    .replace(/^\s*uniform\s+\w+\s+mouse\s*;?/gm, "// [Built-in] uniform float2 mouse;");

  // Auto-fix: float3 x = 0; -> float3 x = float3(0.0);
  // Matches: float3 name = 0;
  cleanedCode = cleanedCode.replace(/\b(float[234])\s+(\w+)\s*=\s*0\s*;/g, "$1 $2 = $1(0.0);");

  // Auto-fix: float x = 0; -> float x = 0.0;
  // Matches: float name = 0;
  cleanedCode = cleanedCode.replace(/\bfloat\s+(\w+)\s*=\s*0\s*;/g, "float $1 = 0.0;");

  return `${HLSL_PREAMBLE}\n${cleanedCode}`;
};
