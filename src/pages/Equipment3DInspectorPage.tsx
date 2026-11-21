import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ArrowLeft, ChevronDown, ChevronUp, RotateCw, Layers, Camera } from 'lucide-react';
import {
  EQUIPMENT_3D_MODELS,
  buildEquipmentModel,
  createContactShadowTexture,
  createStudioFloorTexture,
  disposeObject3D,
  type Equipment3DModelId,
} from '../three/equipmentModels';

type CameraPreset = 'studio' | 'front' | 'top' | 'detail';

export function Equipment3DInspectorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get('model') as Equipment3DModelId | null;
  const initialModel: Equipment3DModelId =
    initialParam && EQUIPMENT_3D_MODELS.some((m) => m.id === initialParam)
      ? initialParam
      : 'excavator';

  const [selectedModel, setSelectedModel] = useState<Equipment3DModelId>(initialModel);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('studio');
  const [dockExpanded, setDockExpanded] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const explodeTargetRef = useRef(0);
  const autoRotateRef = useRef(true);
  const activeGroupRef = useRef<THREE.Group | null>(null);
  const desiredCamPosRef = useRef<THREE.Vector3 | null>(null);
  const desiredTargetRef = useRef<THREE.Vector3 | null>(null);

  const activeSpec =
    EQUIPMENT_3D_MODELS.find((m) => m.id === selectedModel) || EQUIPMENT_3D_MODELS[0];

  useEffect(() => {
    explodeTargetRef.current = explodeFactor;
  }, [explodeFactor]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const applyCameraPreset = (preset: CameraPreset, spec = activeSpec) => {
    setCameraPreset(preset);
    const [dx, dy, dz] = spec.defaultCamera;
    const [tx, ty, tz] = spec.target;
    if (preset === 'studio') {
      desiredCamPosRef.current = new THREE.Vector3(dx, dy, dz);
      desiredTargetRef.current = new THREE.Vector3(tx, ty, tz);
    } else if (preset === 'front') {
      desiredCamPosRef.current = new THREE.Vector3(tx, ty + 0.4, dz * 1.15);
      desiredTargetRef.current = new THREE.Vector3(tx, ty, tz);
    } else if (preset === 'top') {
      desiredCamPosRef.current = new THREE.Vector3(tx + 0.1, dy * 2.1, tz + 1.8);
      desiredTargetRef.current = new THREE.Vector3(tx, ty * 0.6, tz);
    } else {
      desiredCamPosRef.current = new THREE.Vector3(dx * 0.62, dy * 0.72, dz * 0.58);
      desiredTargetRef.current = new THREE.Vector3(tx + 0.35, ty + 0.25, tz);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight - 64;

    const scene = new THREE.Scene();
    const bgColor = 0x111827;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 14, 38);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const spec = EQUIPMENT_3D_MODELS.find((m) => m.id === selectedModel) || EQUIPMENT_3D_MODELS[0];
    camera.position.set(...spec.defaultCamera);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Detect software WebGL renderers to maintain smooth interactive pacing
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Calibrated IBL Environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // Warm key + Cool sky/ground hemisphere + Subtle rim light
    const hemiLight = new THREE.HemisphereLight(0xbcd4f5, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(8, 12, 7);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 32;
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-7, 5, -8);
    scene.add(rimLight);

    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // Studio floor with technical grid CanvasTexture
    const floorTex = createStudioFloorTexture(maxAnisotropy);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.82,
      metalness: 0.12,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(28, 64), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Contact shadow plane directly under machine
    const contactTex = createContactShadowTexture();
    const contactPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 7.2),
      new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        depthWrite: false,
      })
    );
    contactPlane.rotation.x = -Math.PI / 2;
    contactPlane.position.y = 0.004;
    scene.add(contactPlane);

    // Build selected composite equipment assembly
    const modelGroup = buildEquipmentModel(selectedModel, maxAnisotropy);
    activeGroupRef.current = modelGroup;
    scene.add(modelGroup);

    // OrbitControls with damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(...spec.target);
    controls.minDistance = 2.6;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 0.7;

    const cancelPresetTransition = () => {
      desiredCamPosRef.current = null;
      desiredTargetRef.current = null;
    };
    controls.addEventListener('start', cancelPresetTransition);

    let currentExplode = explodeTargetRef.current;
    let rafId = 0;
    let disposed = false;
    let lastTime = performance.now();

    const afterDraw = (cb: FrameRequestCallback) => {
      if (isSoftwareGl) {
        setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(cb);
        }, 32);
      } else {
        rafId = requestAnimationFrame(cb);
      }
    };

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Damped exploded view interpolation
      currentExplode = THREE.MathUtils.damp(currentExplode, explodeTargetRef.current, 6, dt);
      if (activeGroupRef.current) {
        for (const child of activeGroupRef.current.children) {
          const base = child.userData.basePosition as THREE.Vector3 | undefined;
          const offset = child.userData.explodeOffset as THREE.Vector3 | undefined;
          if (base && offset) {
            child.position.copy(base).addScaledVector(offset, currentExplode);
          }
        }
      }

      // Smooth damped camera preset transitions
      if (desiredCamPosRef.current && desiredTargetRef.current) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredCamPosRef.current.x, 5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredCamPosRef.current.y, 5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredCamPosRef.current.z, 5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, desiredTargetRef.current.x, 5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, desiredTargetRef.current.y, 5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, desiredTargetRef.current.z, 5, dt);
        if (camera.position.distanceTo(desiredCamPosRef.current) < 0.04) {
          desiredCamPosRef.current = null;
          desiredTargetRef.current = null;
        }
      }

      controls.autoRotate = autoRotateRef.current;
      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };

    rafId = requestAnimationFrame(tick);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight - 64;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', cancelPresetTransition);
      controls.dispose();
      disposeObject3D(modelGroup);
      floor.geometry.dispose();
      floorMat.dispose();
      floorTex.dispose();
      contactPlane.geometry.dispose();
      (contactPlane.material as THREE.Material).dispose();
      contactTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, [selectedModel]);

  const handleSelectModel = (modelId: Equipment3DModelId) => {
    setSelectedModel(modelId);
    setExplodeFactor(0);
    setCameraPreset('studio');
    setSearchParams({ model: modelId });
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] min-h-[540px] bg-[#111827] overflow-hidden select-none">
      {/* Full-Bleed Interactive WebGL Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top-Left Asset Header (Solid dark slate, zero backdrop-filter) */}
      <div className="absolute top-4 left-4 z-10 max-w-sm bg-[#0F172A]/95 border border-slate-700 rounded-lg px-4 py-3 text-white shadow-lg">
        <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
          <Link to="/marketplace" className="inline-flex items-center gap-1 text-slate-300 hover:text-white">
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Marketplace</span>
          </Link>
          <span aria-hidden="true">·</span>
          <span>{activeSpec.sectorLabel}</span>
        </div>
        <h1 className="font-display text-base sm:text-lg font-bold mt-1 leading-tight">
          {activeSpec.name}
        </h1>
        <p className="text-xs text-slate-300 mt-0.5">{activeSpec.specs}</p>
      </div>

      {/* Single Collapsible Bottom Control Dock (No side cards, no backdrop-filter) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-2xl bg-[#0F172A]/95 border border-slate-700 rounded-lg text-white shadow-xl">
        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {EQUIPMENT_3D_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectModel(m.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  selectedModel === m.id
                    ? 'bg-[#0D9488] text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setDockExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            <span>{dockExpanded ? 'Hide Controls' : 'Inspect & Explode'}</span>
            {dockExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {dockExpanded && (
          <div className="px-4 pb-3.5 pt-2.5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Exploded View Slider */}
            <div className="sm:col-span-5">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Exploded Assembly</span>
                <span className="font-mono text-teal-400">{Math.round(explodeFactor * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explodeFactor}
                onChange={(e) => setExplodeFactor(Number(e.target.value))}
                aria-label="Exploded view separation"
                className="w-full accent-[#0D9488] cursor-pointer"
              />
            </div>

            {/* Camera Angle Presets */}
            <div className="sm:col-span-5 flex items-center gap-1.5 flex-wrap">
              <Camera className="w-3.5 h-3.5 text-slate-400 mr-1" aria-hidden="true" />
              {(['studio', 'front', 'top', 'detail'] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyCameraPreset(preset)}
                  className={`px-2.5 py-1 text-xs font-medium rounded capitalize ${
                    cameraPreset === preset
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Auto-Rotate Toggle */}
            <div className="sm:col-span-2 flex sm:justify-end">
              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border ${
                  autoRotate
                    ? 'bg-teal-900/60 border-teal-500 text-teal-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Orbit</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
