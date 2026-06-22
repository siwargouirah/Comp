import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html, ContactShadows, Sparkles } from '@react-three/drei';

function CartoonBoyCompanion({ isSpeaking, speechText, purchases = [], equippedItems = [] }) {
  const group = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const leftEye = useRef();
  const rightEye = useRef();
  const mouth = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      // Gentle bobbing and rotating mimicking a floating game character, shifted down slightly to prevent head clipping
      group.current.position.y = -0.35 + Math.sin(t * 1.5) * 0.12;
      group.current.rotation.y = Math.sin(t * 0.8) * 0.15;
    }
    
    // Animate arms in a cheerful, raised waving posture (ADHD-friendly active posture)
    if (leftArm.current && rightArm.current) {
      leftArm.current.rotation.z = -Math.PI / 4.5 + Math.sin(t * 3) * 0.12;
      rightArm.current.rotation.z = Math.PI / 4.5 + Math.cos(t * 3) * 0.12;
    }

    // Mouth wiggling when talking
    if (mouth.current) {
      mouth.current.scale.y = isSpeaking ? 1 + Math.sin(t * 12) * 0.6 : 0.2;
    }
  });

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={1}>
        
        {/* Head (Skin Tone) */}
        <mesh position={[0, 1.1, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#fecb9e" roughness={0.6} />
          
          {/* Cute Ears */}
          <mesh position={[-0.51, 0, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#fecb9e" roughness={0.6} />
          </mesh>
          <mesh position={[0.51, 0, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#fecb9e" roughness={0.6} />
          </mesh>

          {/* Cute Blushing Cheeks */}
          <mesh position={[-0.26, -0.14, 0.41]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#ffa8a8" transparent opacity={0.6} roughness={0.8} />
          </mesh>
          <mesh position={[0.26, -0.14, 0.41]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#ffa8a8" transparent opacity={0.6} roughness={0.8} />
          </mesh>

          {/* Large spiky brown cartoon hair */}
          <group position={[0, 0.28, -0.05]}>
            {/* Hair base */}
            <mesh>
              <sphereGeometry args={[0.52, 16, 16]} />
              <meshStandardMaterial color="#451a03" roughness={0.8} />
            </mesh>
            {/* Spikes on top/front */}
            <mesh position={[0, 0.35, 0.1]} rotation={[0.2, 0, 0]}>
              <coneGeometry args={[0.2, 0.5, 4]} />
              <meshStandardMaterial color="#451a03" roughness={0.8} />
            </mesh>
            <mesh position={[-0.18, 0.3, 0.2]} rotation={[0.3, 0, -0.2]}>
              <coneGeometry args={[0.15, 0.4, 4]} />
              <meshStandardMaterial color="#451a03" roughness={0.8} />
            </mesh>
            <mesh position={[0.18, 0.3, 0.2]} rotation={[0.3, 0, 0.2]}>
              <coneGeometry args={[0.15, 0.4, 4]} />
              <meshStandardMaterial color="#451a03" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.2, -0.3]} rotation={[-0.3, 0, 0]}>
              <coneGeometry args={[0.2, 0.4, 4]} />
              <meshStandardMaterial color="#451a03" roughness={0.8} />
            </mesh>
          </group>

          {/* Hair Bangs on Forehead */}
          <mesh position={[-0.15, 0.25, 0.35]} rotation={[0.5, -0.2, -0.3]}>
            <coneGeometry args={[0.08, 0.25, 4]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
          <mesh position={[0.15, 0.25, 0.35]} rotation={[0.5, 0.2, 0.3]}>
            <coneGeometry args={[0.08, 0.25, 4]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.28, 0.38]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[0.09, 0.28, 4]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>

          {/* Visor Screen / Accessory - Cool Visor */}
          {equippedItems.includes('cool_visor') && (
            <mesh position={[0, 0.08, 0.45]}>
              <boxGeometry args={[0.58, 0.14, 0.1]} />
              <meshStandardMaterial color="#d946ef" emissive="#d946ef" emissiveIntensity={2.5} transparent opacity={0.85} />
            </mesh>
          )}

          {/* Large Cartoon Eyes */}
          {/* Left eyeball */}
          <mesh position={[-0.18, 0.08, 0.42]}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color="white" roughness={0.2} />
          </mesh>
          {/* Left pupil (Green) */}
          <mesh ref={leftEye} position={[-0.18, 0.08, 0.51]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#22c55e" roughness={0.2} />
          </mesh>
          {/* Left Glossy Highlight */}
          <mesh position={[-0.14, 0.12, 0.53]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="white" roughness={0.1} />
          </mesh>
          
          {/* Right eyeball */}
          <mesh position={[0.18, 0.08, 0.42]}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color="white" roughness={0.2} />
          </mesh>
          {/* Right pupil (Green) */}
          <mesh ref={rightEye} position={[0.18, 0.08, 0.51]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#22c55e" roughness={0.2} />
          </mesh>
          {/* Right Glossy Highlight */}
          <mesh position={[0.22, 0.12, 0.53]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="white" roughness={0.1} />
          </mesh>

          {/* Nose */}
          <mesh position={[0, -0.02, 0.48]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#fda4af" />
          </mesh>

          {/* Smiling Torus Mouth */}
          <mesh ref={mouth} position={[0, -0.16, 0.46]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.08, 0.02, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.5} />
          </mesh>

          {/* Wizard Hat Accessory */}
          {equippedItems.includes('wizard_hat') && (
            <group position={[0, 0.45, -0.05]} rotation={[-0.1, 0, 0]}>
              {/* Brim */}
              <mesh>
                <cylinderGeometry args={[0.62, 0.62, 0.04, 32]} />
                <meshStandardMaterial color="#6d28d9" roughness={0.5} />
              </mesh>
              {/* Cone */}
              <mesh position={[0, 0.5, -0.03]} rotation={[-0.1, 0, 0]}>
                <coneGeometry args={[0.38, 0.9, 32]} />
                <meshStandardMaterial color="#6d28d9" roughness={0.5} />
              </mesh>
            </group>
          )}

        </mesh>

        {/* Hoodie Collar */}
        <mesh position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25, 0.04, 8, 24]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
        </mesh>

        {/* Torso / Jacket (Blue Hoodie Jacket) */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.28, 0.33, 0.6, 16]} />
          <meshStandardMaterial color="#2563eb" roughness={0.5} />
        </mesh>

        {/* Hoodie Fold (Back) */}
        <mesh position={[0, 0.68, -0.15]}>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color="#2563eb" roughness={0.5} />
        </mesh>

        {/* Dangling Hoodie Strings */}
        <mesh position={[-0.08, 0.55, 0.22]} rotation={[0.08, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>
        <mesh position={[-0.08, 0.46, 0.23]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#d946ef" />
        </mesh>

        <mesh position={[0.08, 0.55, 0.22]} rotation={[0.08, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>
        <mesh position={[0.08, 0.46, 0.23]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#d946ef" />
        </mesh>
        
        {/* Inner Shirt (White) */}
        <mesh position={[0, 0.5, 0.17]}>
          <boxGeometry args={[0.15, 0.3, 0.1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Backpack (Brown) */}
        <mesh position={[0, 0.35, -0.25]}>
          <boxGeometry args={[0.35, 0.42, 0.16]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.7} />
        </mesh>

        {/* Raised cheeering arms (bobbing in waves) */}
        {/* Left Arm */}
        <group ref={leftArm} position={[-0.35, 0.5, 0]}>
          <mesh position={[-0.15, 0.22, 0]} rotation={[0, 0, 0.35]}>
            <cylinderGeometry args={[0.07, 0.07, 0.42, 8]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
          <mesh position={[-0.22, 0.43, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#fecb9e" />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArm} position={[0.35, 0.5, 0]}>
          <mesh position={[0.15, 0.22, 0]} rotation={[0, 0, -0.35]}>
            <cylinderGeometry args={[0.07, 0.07, 0.42, 8]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
          <mesh position={[0.22, 0.43, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#fecb9e" />
          </mesh>
        </group>

        {/* Legs (Brown Pants) */}
        {/* Left Leg */}
        <mesh position={[-0.15, -0.15, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.4, 8]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        {/* Right Leg */}
        <mesh position={[0.15, -0.15, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.4, 8]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>

        {/* Sneakers (Blue) */}
        {/* Left Shoe */}
        <mesh position={[-0.15, -0.4, 0.06]}>
          <boxGeometry args={[0.14, 0.12, 0.26]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
        </mesh>
        {/* Right Shoe */}
        <mesh position={[0.15, -0.4, 0.06]}>
          <boxGeometry args={[0.14, 0.12, 0.26]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
        </mesh>

        {/* Jetpack sparkles upgrade */}
        {equippedItems.includes('jetpack_sparkles') && (
          <group position={[0, -0.5, -0.2]}>
            <pointLight distance={1.5} intensity={4} color="#ec4899" />
          </group>
        )}
      </Float>
    </group>
  );
}

export function Companion3D({ isSpeaking = false, speechText = "", purchases = [], equippedItems = [], isAR = false, onToggleAR }) {
  const [videoElement, setVideoElement] = useState(null);

  useEffect(() => {
    if (isAR) {
      // Use 'user' facingMode so that the child/user sees themselves in the box
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          const video = document.createElement('video');
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.play();
          video.style.position = 'absolute';
          video.style.top = '0';
          video.style.left = '0';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'cover';
          video.style.zIndex = '5'; // Placed on top of background
          video.style.borderRadius = '20px';
          
          const container = document.getElementById('ar-container');
          if (container) {
            container.appendChild(video);
          }
          setVideoElement(video);
        })
        .catch(err => console.error("AR camera access denied:", err));
    } else if (videoElement) {
      const stream = videoElement.srcObject;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
      videoElement.remove();
      setVideoElement(null);
    }

    return () => {
      if (videoElement) {
        const stream = videoElement.srcObject;
        if (stream) {
          const tracks = stream.getTracks();
          tracks.forEach(track => track.stop());
        }
        videoElement.remove();
      }
    };
  }, [isAR]);

  return (
    <div id="ar-container" className={`companion-viewport ${isAR ? 'ar-mode' : ''}`} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'visible' }}>
      
      {/* Speech bubble rendered in standard HTML outside the Canvas to prevent clipping and overlap with tasks */}
      {speechText && !isAR && (
        <div className="game-speech-bubble">
          <div className="bubble-arrow" />
          {speechText}
        </div>
      )}
      
      {/* Centered Webcam Feed displays directly here when AR is on, hiding the 3D model */}
      {!isAR ? (
        <Canvas 
          camera={{ position: [0, 0.25, 3.8], fov: 45 }} 
          style={{ background: 'transparent', width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} />
            <directionalLight position={[-5, 5, -2]} intensity={0.5} />
            <Sparkles count={30} scale={3.5} size={2.5} speed={0.5} color="#38bdf8" />
            
            <CartoonBoyCompanion 
              isSpeaking={isSpeaking} 
              speechText={speechText} 
              purchases={purchases} 
              equippedItems={equippedItems} 
            />
            
            <ContactShadows position={[0, -0.65, 0]} opacity={0.5} scale={3} blur={2.5} />
          </Suspense>
        </Canvas>
      ) : (
        /* Futuristic overlay visor when webcam is active in the box */
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          bottom: '12px',
          border: '2px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '16px',
          zIndex: '10',
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            top: 0,
            left: 0,
            borderTop: '4px solid var(--neon-blue)',
            borderLeft: '4px solid var(--neon-blue)'
          }} />
          <div style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            top: 0,
            right: 0,
            borderTop: '4px solid var(--neon-blue)',
            borderRight: '4px solid var(--neon-blue)'
          }} />
          <div style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            bottom: 0,
            left: 0,
            borderBottom: '4px solid var(--neon-blue)',
            borderLeft: '4px solid var(--neon-blue)'
          }} />
          <div style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            bottom: 0,
            right: 0,
            borderBottom: '4px solid var(--neon-blue)',
            borderRight: '4px solid var(--neon-blue)'
          }} />
          <span style={{
            color: 'var(--neon-blue)',
            fontSize: '0.8rem',
            fontWeight: '900',
            background: 'rgba(7, 11, 25, 0.7)',
            padding: '4px 10px',
            borderRadius: '99px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            AR Mirror Active
          </span>
        </div>
      )}
      
      {/* AR Toggle Button Overlay */}
      <button 
        onClick={onToggleAR}
        className="ar-toggle-btn"
        style={{ zIndex: '100' }}
      >
        {isAR ? '📡 Standard View' : '🚀 Portal to AR'}
      </button>
    </div>
  );
}
