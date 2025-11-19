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
  
  const cleanedCode = userCode
    .replace(/:\s*SV_Target\d*/gi, "")
    .replace(/:\s*SV_Position\d*/gi, "")
    .replace(/:\s*TEXCOORD\d*/gi, "")
    .replace(/:\s*COLOR\d*/gi, "");

  return `${HLSL_PREAMBLE}\n${cleanedCode}`;
};