import { GoogleGenAI } from "@google/genai";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateShaderCode = async (prompt: string, currentCode: string): Promise<string> => {
  try {
    const ai = getClient();
    
    const systemPrompt = `
      You are an expert Shader Graphics programmer. 
      Your goal is to write a single Fragment Shader function in an HLSL/GLSL hybrid style.
      
      The environment uses a wrapper that defines:
      - float2, float3, float4 (as vec2, vec3, vec4)
      - lerp (as mix), frac (as fract), atan2 (as atan)
      - mainImage(float2 uv) returning float4
      - Automatic uniforms: time (float), resolution (float2)
      
      You must output ONLY the HLSL code block. 
      Do not output the preamble.
      Do not output Markdown backticks.
      
      Define any custom uniforms using 'uniform type name;' at the top.
      Supported uniform types for UI controls: float, float2, float3.
      
      Example structure:
      
      uniform float speed;
      uniform float3 mainColor;
      
      float4 mainImage(float2 uv) {
        // ... code ...
        return float4(col, 1.0);
      }
    `;

    const userMessage = `
      Current Code:
      ${currentCode.substring(0, 1000)}...
      
      Request: ${prompt}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: userMessage }] }
      ]
    });

    const text = response.text || "";
    // Clean up markdown if present
    return text.replace(/```(glsl|hlsl|c)?/g, '').replace(/```/g, '').trim();

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate shader code.");
  }
};

export const explainShaderError = async (code: string, errorMsg: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `The following shader code failed to compile. Explain the error and suggest a fix briefly.
        
        Error: ${errorMsg}
        
        Code:
        ${code}
        `
    });
    return response.text || "Could not analyze error.";
  } catch (e) {
    return "Failed to reach AI service.";
  }
};