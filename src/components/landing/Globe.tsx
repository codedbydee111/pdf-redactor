import { useEffect, useRef } from "react";
import * as THREE from "three";

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Globe group
    const globe = new THREE.Group();
    scene.add(globe);

    // Wireframe sphere
    const sphereGeo = new THREE.SphereGeometry(1, 48, 48);
    const wireframe = new THREE.WireframeGeometry(sphereGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x4f46e5,
      opacity: 0.12,
      transparent: true,
    });
    const wireLines = new THREE.LineSegments(wireframe, wireMat);
    globe.add(wireLines);

    // Latitude rings (more visible)
    for (let lat = -60; lat <= 60; lat += 30) {
      const phi = (90 - lat) * (Math.PI / 180);
      const radius = Math.sin(phi);
      const y = Math.cos(phi);
      const ringGeo = new THREE.RingGeometry(radius - 0.002, radius + 0.002, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        opacity: 0.2,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = y;
      ring.rotation.x = Math.PI / 2;
      globe.add(ring);
    }

    // Dot grid on sphere surface
    const dotCount = 1200;
    const dotPositions = new Float32Array(dotCount * 3);
    const dotSizes = new Float32Array(dotCount);

    for (let i = 0; i < dotCount; i++) {
      // Fibonacci sphere distribution
      const phi = Math.acos(1 - 2 * (i + 0.5) / dotCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.005;

      dotPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      dotPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      dotPositions[i * 3 + 2] = r * Math.cos(phi);
      dotSizes[i] = 1.5 + Math.random() * 1.5;
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    dotGeo.setAttribute("size", new THREE.BufferAttribute(dotSizes, 1));

    const dotMat = new THREE.PointsMaterial({
      color: 0x8b8fa2,
      size: 0.012,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });
    const dots = new THREE.Points(dotGeo, dotMat);
    globe.add(dots);

    // Outer glow ring
    const glowGeo = new THREE.RingGeometry(1.02, 1.06, 96);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      opacity: 0.08,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.lookAt(camera.position);
    scene.add(glow);

    // Subtle tilt
    globe.rotation.x = 0.3;
    globe.rotation.z = -0.1;

    // Animate
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      globe.rotation.y += 0.0015;
      glow.lookAt(camera.position);
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    cleanupRef.current = () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", opacity: 0.7,
      }}
    />
  );
}
