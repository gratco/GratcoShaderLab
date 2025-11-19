import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { assembleShader } from '../utils/shaderUtils';
import * as THREE from 'three';
import { UniformDefinition, UniformType } from '../types';

interface PreviewProps {
  code: string;
  uniforms: UniformDefinition[];
  onError: (error: string) => void;
  onSuccess: () => void;
}

// Inner component to handle the mesh and material
const ScreenQuad: React.FC<{ 
  code: string; 
  uniforms: UniformDefinition[];
  onError: (err: string) => void;
  onSuccess: () => void;
}> = ({ code, uniforms, onError, onSuccess }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Combine automatic uniforms and user uniforms
  const uniformData = useMemo(() => {
    const baseUniforms = {
      // Shadertoy style
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2() },
      iMouse: { value: new THREE.Vector2() },
      // HLSL Generic style
      time: { value: 0 },
      resolution: { value: new THREE.Vector2() },
      mouse: { value: new THREE.Vector2() },
    };

    const userUniforms: Record<string, { value: any }> = {};
    uniforms.forEach(u => {
      let val = u.value;
      if (u.type === UniformType.VEC2) val = new THREE.Vector2(u.value[0], u.value[1]);
      if (u.type === UniformType.VEC3 || u.type === UniformType.COLOR) val = new THREE.Vector3(u.value[0], u.value[1], u.value[2]);
      userUniforms[u.name] = { value: val };
    });

    return { ...baseUniforms, ...userUniforms };
  }, [uniforms]);

  // Assemble the full fragment shader
  const fragmentShader = useMemo(() => {
    try {
      return assembleShader(code);
    } catch (e: any) {
      onError(e.message);
      return `void main() { gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }`; // Fallback error pink
    }
  }, [code, onError]);

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  useFrame((state) => {
    if (materialRef.current) {
      const time = state.clock.elapsedTime;
      const width = state.size.width;
      const height = state.size.height;
      const mouseX = state.pointer.x * 0.5 + 0.5;
      const mouseY = state.pointer.y * 0.5 + 0.5;

      // Update standard iTime style
      if(materialRef.current.uniforms.iTime) materialRef.current.uniforms.iTime.value = time;
      if(materialRef.current.uniforms.iResolution) materialRef.current.uniforms.iResolution.value.set(width, height);
      if(materialRef.current.uniforms.iMouse) materialRef.current.uniforms.iMouse.value.set(mouseX, mouseY);

      // Update HLSL generic style
      if(materialRef.current.uniforms.time) materialRef.current.uniforms.time.value = time;
      if(materialRef.current.uniforms.resolution) materialRef.current.uniforms.resolution.value.set(width, height);
      if(materialRef.current.uniforms.mouse) materialRef.current.uniforms.mouse.value.set(mouseX, mouseY);
    }
  });

  // Effect to detect compilation errors
  // Note: Three.js doesn't easily expose compilation errors in the main thread synchronously.
  // We rely on the fact that if it crashes, it logs. 
  // A robust implementation might use a separate WebGLContext to pre-compile.
  // For this demo, we reset error on code change.
  React.useEffect(() => {
      onSuccess();
  }, [code, onSuccess]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniformData}
        // Ensure we don't crash on missing uniforms, Three.js handles this gracefully usually
      />
    </mesh>
  );
};

const Preview: React.FC<PreviewProps> = (props) => {
  return (
    <div className="w-full h-full bg-black relative">
       <Canvas
         dpr={[1, 2]}
         gl={{ preserveDrawingBuffer: true, antialias: true }}
         onCreated={({ gl }) => {
             // Optional: Clean up or settings
         }}
       >
         <ScreenQuad {...props} />
       </Canvas>
    </div>
  );
};

export default Preview;