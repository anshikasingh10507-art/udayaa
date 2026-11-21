import * as THREE from 'three';

export type Equipment3DModelId = 'excavator' | 'hplc' | 'cnc';

export interface Equipment3DModelSpec {
  id: Equipment3DModelId;
  name: string;
  subtitle: string;
  sectorLabel: string;
  specs: string;
  defaultCamera: [number, number, number];
  target: [number, number, number];
}

export const EQUIPMENT_3D_MODELS: Equipment3DModelSpec[] = [
  {
    id: 'excavator',
    name: 'Hydraulic Excavator 20T',
    subtitle: 'Heavy Earthmoving · Verified Fleet Class',
    sectorLabel: 'Construction',
    specs: 'Operating Weight: 20.5T · Bucket: 1.05 m³ · Boom Reach: 9.8 m',
    defaultCamera: [6.4, 4.1, 6.8],
    target: [0.3, 1.4, 0],
  },
  {
    id: 'hplc',
    name: 'LC-MS / HPLC Analytical Bench',
    subtitle: 'High-Capex Rent-Only Scientific Instrument',
    sectorLabel: 'Lab Equipment',
    specs: 'Pressure: 1,300 bar · Mass Accuracy: <1 ppm · NABL Calibrated',
    defaultCamera: [5.2, 3.3, 5.4],
    target: [0, 1.35, 0],
  },
  {
    id: 'cnc',
    name: '5-Axis CNC Machining Center',
    subtitle: 'Precision Aerospace & Tooling Production',
    sectorLabel: 'Industrial CNC',
    specs: 'Spindle: 18,000 RPM · Positioning: ±0.002 mm · 40-Tool ATC',
    defaultCamera: [5.8, 3.8, 6.0],
    target: [0, 1.55, 0],
  },
];

function createHazardStripeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111827';
  for (let x = -128; x < 640; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x - 16, 128);
    ctx.lineTo(x - 48, 128);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createBrushedMetalTexture(maxAnisotropy: number, baseHex = '#d5dce4'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const alpha = (Math.sin(y * 1.7) * 0.5 + 0.5) * 0.06;
    ctx.fillStyle = y % 4 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(15,23,42,${alpha})`;
    ctx.fillRect(0, y, 512, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createScreenTexture(
  title: string,
  lines: string[],
  accent: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.fillStyle = accent;
  ctx.font = 'bold 26px monospace';
  ctx.fillText(title, 28, 52);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '20px monospace';
  lines.forEach((line, idx) => {
    ctx.fillText(line, 28, 98 + idx * 34);
  });

  // Mini waveform graphic
  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const px = 28 + i * 11.4;
    const peak = Math.exp(-Math.pow((i - 14) / 3.2, 2)) * 42 + Math.exp(-Math.pow((i - 28) / 2.2, 2)) * 56;
    const py = 224 - peak - Math.sin(i * 0.9) * 3;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createStudioFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b2434';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle industrial grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  const step = 64;
  for (let i = 0; i <= 1024; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Major crosshairs
  ctx.strokeStyle = 'rgba(20, 184, 166, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(512, 0);
  ctx.lineTo(512, 1024);
  ctx.moveTo(0, 512);
  ctx.lineTo(1024, 512);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
  grad.addColorStop(0, 'rgba(3, 7, 18, 0.65)');
  grad.addColorStop(0.55, 'rgba(3, 7, 18, 0.28)');
  grad.addColorStop(1, 'rgba(3, 7, 18, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function registerPart(
  parent: THREE.Group,
  part: THREE.Object3D,
  explodeOffset: [number, number, number]
) {
  part.userData.basePosition = part.position.clone();
  part.userData.explodeOffset = new THREE.Vector3(...explodeOffset);
  part.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  parent.add(part);
}

function buildExcavator(maxAnisotropy: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'excavator_assembly';

  const yellowPaint = new THREE.MeshPhysicalMaterial({
    color: 0xe5a214,
    metalness: 0.25,
    roughness: 0.34,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
  });
  const darkChassis = new THREE.MeshStandardMaterial({
    color: 0x1e2530,
    metalness: 0.65,
    roughness: 0.48,
  });
  const trackRubber = new THREE.MeshStandardMaterial({
    color: 0x14181f,
    metalness: 0.2,
    roughness: 0.85,
  });
  const chromeSteel = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.96,
    roughness: 0.14,
  });
  const cabGlass = new THREE.MeshPhysicalMaterial({
    color: 0x94c5d4,
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.72,
    transparent: true,
    opacity: 0.78,
    ior: 1.5,
  });
  const hazardTex = createHazardStripeTexture(maxAnisotropy);
  const hazardMat = new THREE.MeshStandardMaterial({
    map: hazardTex,
    metalness: 0.15,
    roughness: 0.45,
  });

  // 1. Undercarriage & Dual Tracks
  const undercarriage = new THREE.Group();
  const carbody = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.36, 1.5), darkChassis);
  carbody.position.set(0, 0.48, 0);
  undercarriage.add(carbody);

  [-0.95, 0.95].forEach((zOff) => {
    const trackBeam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.46, 0.52), darkChassis);
    trackBeam.position.set(0, 0.36, zOff);
    undercarriage.add(trackBeam);

    // Front & rear sprockets
    [-1.45, 1.45].forEach((xEnd) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.56, 20), trackRubber);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(xEnd, 0.34, zOff);
      undercarriage.add(wheel);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 12), chromeSteel);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(xEnd, 0.34, zOff);
      undercarriage.add(hub);
    });

    // Top & bottom track belts
    const topBelt = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 0.56), trackRubber);
    topBelt.position.set(0, 0.66, zOff);
    undercarriage.add(topBelt);

    const bottomBelt = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 0.56), trackRubber);
    bottomBelt.position.set(0, 0.04, zOff);
    undercarriage.add(bottomBelt);
  });
  registerPart(root, undercarriage, [0, -0.35, 0]);

  // 2. Slew Ring Bearing
  const slewRing = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.24, 28), darkChassis);
  slewRing.position.set(0, 0.78, 0);
  registerPart(root, slewRing, [0, 0.15, 0]);

  // 3. Upper House & Engine Deck
  const upperHouse = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.62, 1.95), yellowPaint);
  deck.position.set(-0.25, 1.22, 0);
  upperHouse.add(deck);

  const engineHood = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.52, 1.35), yellowPaint);
  engineHood.position.set(-0.75, 1.74, -0.1);
  upperHouse.add(engineHood);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.72, 12), darkChassis);
  exhaust.position.set(-1.1, 2.24, -0.45);
  upperHouse.add(exhaust);

  const safetyRail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.05), darkChassis);
  safetyRail.position.set(-0.7, 2.22, 0.55);
  upperHouse.add(safetyRail);
  registerPart(root, upperHouse, [-0.2, 0.65, 0]);

  // 4. Counterweight with Hazard Stripes
  const counterweight = new THREE.Group();
  const cwBody = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.88, 1.92), darkChassis);
  cwBody.position.set(-1.78, 1.34, 0);
  counterweight.add(cwBody);
  const cwStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 1.78), hazardMat);
  cwStripe.position.set(-2.13, 1.3, 0);
  counterweight.add(cwStripe);
  registerPart(root, counterweight, [-1.15, 0.55, 0]);

  // 5. Operator Cab with Glazing & Beacon
  const cabGroup = new THREE.Group();
  const cabFrame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.26, 0.92), darkChassis);
  cabFrame.position.set(0.32, 2.08, 0.44);
  cabGroup.add(cabFrame);

  const cabGlassMesh = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.96, 0.96), cabGlass);
  cabGlassMesh.position.set(0.35, 2.12, 0.44);
  cabGroup.add(cabGlassMesh);

  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.1, 0.98), yellowPaint);
  cabRoof.position.set(0.32, 2.74, 0.44);
  cabGroup.add(cabRoof);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.14, 14),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.7, roughness: 0.2 })
  );
  beacon.position.set(0.05, 2.86, 0.44);
  cabGroup.add(beacon);
  registerPart(root, cabGroup, [0.1, 1.2, 0.85]);

  // 6. Articulated Hydraulic Boom + Cylinders
  const boomGroup = new THREE.Group();
  const boomLower = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.4, 0.34), yellowPaint);
  boomLower.position.set(1.5, 2.05, -0.3);
  boomLower.rotation.z = 0.62;
  boomGroup.add(boomLower);

  const boomUpper = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.34, 0.32), yellowPaint);
  boomUpper.position.set(3.05, 2.82, -0.3);
  boomUpper.rotation.z = -0.18;
  boomGroup.add(boomUpper);

  // Hydraulic piston rods
  const pistonBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.15, 14), darkChassis);
  pistonBarrel.position.set(1.22, 1.65, -0.3);
  pistonBarrel.rotation.z = -0.82;
  boomGroup.add(pistonBarrel);

  const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 1.1, 14), chromeSteel);
  pistonRod.position.set(1.75, 2.05, -0.3);
  pistonRod.rotation.z = -0.82;
  boomGroup.add(pistonRod);
  registerPart(root, boomGroup, [0.95, 0.95, -0.45]);

  // 7. Dipper Stick & Toothed Bucket
  const bucketGroup = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.05, 0.26), yellowPaint);
  stick.position.set(3.85, 1.85, -0.3);
  stick.rotation.z = 0.22;
  bucketGroup.add(stick);

  const stickPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 12), chromeSteel);
  stickPiston.position.set(3.45, 2.48, -0.3);
  stickPiston.rotation.z = 0.52;
  bucketGroup.add(stickPiston);

  const bucketShell = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.62, 0.78), darkChassis);
  bucketShell.position.set(3.52, 0.72, -0.3);
  bucketShell.rotation.z = 0.42;
  bucketGroup.add(bucketShell);

  for (let t = -0.28; t <= 0.29; t += 0.18) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 6), chromeSteel);
    tooth.position.set(3.16, 0.48, -0.3 + t);
    tooth.rotation.z = 1.25;
    bucketGroup.add(tooth);
  }
  registerPart(root, bucketGroup, [1.65, 0.45, -0.5]);

  return root;
}

function buildHplcLabSystem(maxAnisotropy: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'hplc_lab_system';

  const steelTex = createBrushedMetalTexture(maxAnisotropy, '#cbd5e1');
  const brushedSteel = new THREE.MeshStandardMaterial({
    map: steelTex,
    metalness: 0.78,
    roughness: 0.28,
  });
  const labWhite = new THREE.MeshPhysicalMaterial({
    color: 0xf1f5f9,
    metalness: 0.08,
    roughness: 0.28,
    clearcoat: 0.35,
  });
  const slateTrim = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.35,
    roughness: 0.42,
  });
  const tealAccent = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    metalness: 0.2,
    roughness: 0.35,
  });
  const glassBottleMat = new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    metalness: 0,
    roughness: 0.06,
    transmission: 0.85,
    transparent: true,
    opacity: 0.82,
    ior: 1.48,
  });
  const oledTex = createScreenTexture(
    'LC-MS 6470 TRIPLE QUAD',
    ['PRESSURE: 842.4 bar', 'FLOW: 0.45 mL/min', 'OVEN: 40.0 C · NABL OK'],
    '#14b8a6',
    maxAnisotropy
  );
  const oledMat = new THREE.MeshStandardMaterial({
    map: oledTex,
    emissive: 0x0f766e,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });

  // 1. Vibration-Isolated Optical Bench
  const bench = new THREE.Group();
  const tabletop = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 2.2), brushedSteel);
  tabletop.position.set(0, 0.92, 0);
  bench.add(tabletop);

  const apron = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.14, 1.9), slateTrim);
  apron.position.set(0, 0.78, 0);
  bench.add(apron);

  [
    [-1.95, -0.88],
    [1.95, -0.88],
    [-1.95, 0.88],
    [1.95, 0.88],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.84, 16), slateTrim);
    leg.position.set(lx, 0.46, lz);
    bench.add(leg);
    const isolator = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.08, 16), tealAccent);
    isolator.position.set(lx, 0.04, lz);
    bench.add(isolator);
  });
  registerPart(root, bench, [0, -0.35, 0]);

  // 2. Left HPLC Stack: Quaternary Pump + Autosampler + Column Oven
  const pumpModule = new THREE.Group();
  const pumpBody = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.44, 1.48), labWhite);
  pumpBody.position.set(-1.12, 1.22, 0);
  pumpModule.add(pumpBody);
  const pumpFace = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.36, 0.06), slateTrim);
  pumpFace.position.set(-1.12, 1.22, 0.74);
  pumpModule.add(pumpFace);
  const pumpStrip = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.05, 0.08), tealAccent);
  pumpStrip.position.set(-1.12, 1.38, 0.75);
  pumpModule.add(pumpStrip);
  registerPart(root, pumpModule, [-0.85, 0.25, 0]);

  const autosampler = new THREE.Group();
  const asBody = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.52, 1.48), labWhite);
  asBody.position.set(-1.12, 1.72, 0);
  autosampler.add(asBody);
  const vialBay = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.34, 0.08), glassBottleMat);
  vialBay.position.set(-1.12, 1.72, 0.74);
  autosampler.add(vialBay);
  // Mini sample vials visible behind door
  for (let v = 0; v < 5; v++) {
    const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 10), tealAccent);
    vial.position.set(-1.42 + v * 0.15, 1.66, 0.68);
    autosampler.add(vial);
  }
  registerPart(root, autosampler, [-0.85, 0.75, 0.35]);

  const degasser = new THREE.Group();
  const degBody = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.34, 1.48), labWhite);
  degBody.position.set(-1.12, 2.18, 0);
  degasser.add(degBody);
  const screenPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.28), oledMat);
  screenPanel.position.set(-1.12, 2.18, 0.748);
  degasser.add(screenPanel);
  registerPart(root, degasser, [-0.85, 1.25, 0]);

  // 3. Solvent Tray & 4 Borosilicate Bottles on top
  const solventTray = new THREE.Group();
  const trayBase = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 1.25), slateTrim);
  trayBase.position.set(-1.12, 2.4, 0);
  solventTray.add(trayBase);

  const liquidColors = [0x38bdf8, 0x14b8a6, 0xf59e0b, 0x818cf8];
  liquidColors.forEach((col, i) => {
    const bx = -1.52 + (i % 2) * 0.78;
    const bz = i < 2 ? -0.28 : 0.28;
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.46, 18), glassBottleMat);
    bottle.position.set(bx, 2.68, bz);
    solventTray.add(bottle);

    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.145, 0.28, 16),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.05 })
    );
    liquid.position.set(bx, 2.59, bz);
    solventTray.add(liquid);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 14), tealAccent);
    cap.position.set(bx, 2.95, bz);
    solventTray.add(cap);
  });
  registerPart(root, solventTray, [-0.85, 1.85, 0]);

  // 4. Right Quadrupole Mass Spectrometer Detector Chamber
  const massSpec = new THREE.Group();
  const msHousing = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.32, 1.56), labWhite);
  msHousing.position.set(0.95, 1.66, 0);
  massSpec.add(msHousing);

  const ionSource = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.46, 24), brushedSteel);
  ionSource.rotation.z = Math.PI / 2;
  ionSource.position.set(0.05, 1.65, 0.1);
  massSpec.add(ionSource);

  const msFrontBezel = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.05, 0.06), slateTrim);
  msFrontBezel.position.set(0.95, 1.68, 0.78);
  massSpec.add(msFrontBezel);

  const msScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.56), oledMat);
  msScreen.position.set(0.95, 1.82, 0.815);
  massSpec.add(msScreen);
  registerPart(root, massSpec, [1.0, 0.65, 0]);

  // 5. PEEK Capillary Transfer Tubing (TubeGeometry)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, 2.2, 0.2),
    new THREE.Vector3(-0.18, 2.38, 0.32),
    new THREE.Vector3(-0.08, 1.98, 0.24),
    new THREE.Vector3(0.06, 1.68, 0.12),
  ]);
  const tubing = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.024, 8, false), tealAccent);
  registerPart(root, tubing, [0, 1.25, 0.55]);

  return root;
}

function buildCncMachine(maxAnisotropy: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'cnc_machining_center';

  const castIron = new THREE.MeshStandardMaterial({
    color: 0x262f3d,
    metalness: 0.72,
    roughness: 0.44,
  });
  const enclosureWhite = new THREE.MeshPhysicalMaterial({
    color: 0xe2e8f0,
    metalness: 0.2,
    roughness: 0.32,
    clearcoat: 0.4,
  });
  const tealBrand = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    metalness: 0.32,
    roughness: 0.36,
  });
  const steelTex = createBrushedMetalTexture(maxAnisotropy, '#cbd5e1');
  const machinedSteel = new THREE.MeshStandardMaterial({
    map: steelTex,
    metalness: 0.9,
    roughness: 0.2,
  });
  const safetyGlass = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.75,
    transparent: true,
    opacity: 0.45,
    ior: 1.5,
  });
  const cncScreenTex = createScreenTexture(
    '5-AXIS VMC CONTROLLER',
    ['X: +142.400  Y: -088.120', 'Z: +064.000  A: 22.5°', 'SPINDLE: 14,500 RPM'],
    '#38bdf8',
    maxAnisotropy
  );
  const cncScreenMat = new THREE.MeshStandardMaterial({
    map: cncScreenTex,
    emissive: 0x0284c7,
    emissiveIntensity: 0.32,
    roughness: 0.2,
  });

  // 1. Cast-Iron Machine Bed & Leveling Pads
  const bed = new THREE.Group();
  const baseBlock = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.56, 2.6), castIron);
  baseBlock.position.set(0, 0.34, 0);
  bed.add(baseBlock);
  [-1.45, 1.45].forEach((px) => {
    [-1.05, 1.05].forEach((pz) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 14), tealBrand);
      pad.position.set(px, 0.04, pz);
      bed.add(pad);
    });
  });
  registerPart(root, bed, [0, -0.35, 0]);

  // 2. Dual-Axis Trunnion Rotary Worktable
  const trunnion = new THREE.Group();
  const railL = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.12), machinedSteel);
  railL.position.set(0, 0.66, -0.52);
  trunnion.add(railL);
  const railR = railL.clone();
  railR.position.set(0, 0.66, 0.52);
  trunnion.add(railR);

  const cradle = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.05), castIron);
  cradle.position.set(0, 0.88, 0);
  trunnion.add(cradle);

  const rotaryPlatter = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.16, 28), machinedSteel);
  rotaryPlatter.position.set(0, 1.08, 0);
  trunnion.add(rotaryPlatter);

  // Aerospace billet workpiece clamped on platter
  const workpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 6), tealBrand);
  workpiece.position.set(0, 1.26, 0);
  trunnion.add(workpiece);
  registerPart(root, trunnion, [0, 0.3, 0.75]);

  // 3. Vertical Column & High-Speed Spindle Head
  const spindleGroup = new THREE.Group();
  const column = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.35, 0.82), castIron);
  column.position.set(0, 1.78, -0.78);
  spindleGroup.add(column);

  const headHousing = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.92), tealBrand);
  headHousing.position.set(0, 2.38, -0.05);
  spindleGroup.add(headHousing);

  const spindleNose = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.42, 20), machinedSteel);
  spindleNose.position.set(0, 1.84, 0.05);
  spindleGroup.add(spindleNose);

  const endMill = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.025, 0.28, 12), machinedSteel);
  endMill.position.set(0, 1.54, 0.05);
  spindleGroup.add(endMill);
  registerPart(root, spindleGroup, [0, 1.0, -0.75]);

  // 4. Sheet Metal Safety Enclosure & Sliding Viewing Window
  const enclosure = new THREE.Group();
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.42, 2.52), enclosureWhite);
  leftWall.position.set(-1.62, 1.82, 0);
  enclosure.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.42, 2.52), enclosureWhite);
  rightWall.position.set(1.62, 1.82, 0);
  enclosure.add(rightWall);

  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(3.46, 0.34, 2.56), tealBrand);
  topHeader.position.set(0, 3.12, 0);
  enclosure.add(topHeader);

  const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.85, 0.06), safetyGlass);
  frontWindow.position.set(0, 1.88, 1.24);
  enclosure.add(frontWindow);
  registerPart(root, enclosure, [0, 0.8, 0]);

  // 5. Side Chip Conveyor & Tool Magazine Carousel
  const toolMag = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.24, 24), castIron);
  drum.rotation.x = Math.PI / 2;
  drum.position.set(-2.02, 2.1, -0.3);
  toolMag.add(drum);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.18, 10), machinedSteel);
    holder.position.set(-2.02, 2.1 + Math.sin(angle) * 0.34, -0.14 + Math.cos(angle) * 0.02);
    holder.rotation.x = Math.PI / 2;
    toolMag.add(holder);
  }
  registerPart(root, toolMag, [-1.25, 0.65, -0.3]);

  // 6. Articulated Operator Control Pendant
  const pendant = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.1), castIron);
  arm.position.set(1.96, 2.02, 0.82);
  pendant.add(arm);

  const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.02, 0.22), castIron);
  consoleBox.position.set(2.22, 1.86, 1.02);
  consoleBox.rotation.y = -0.28;
  pendant.add(consoleBox);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), cncScreenMat);
  screen.position.set(2.19, 2.08, 1.138);
  screen.rotation.y = -0.28;
  pendant.add(screen);
  registerPart(root, pendant, [1.15, 0.4, 0.75]);

  return root;
}

export function buildEquipmentModel(
  modelId: Equipment3DModelId,
  maxAnisotropy: number
): THREE.Group {
  if (modelId === 'hplc') return buildHplcLabSystem(maxAnisotropy);
  if (modelId === 'cnc') return buildCncMachine(maxAnisotropy);
  return buildExcavator(maxAnisotropy);
}

export function disposeObject3D(root: THREE.Object3D): void {
  const textures = new Set<THREE.Texture>();
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (!mat) return;
        const m = mat as unknown as Record<string, unknown>;
        for (const key of ['map', 'roughnessMap', 'metalnessMap', 'normalMap', 'emissiveMap']) {
          const val = m[key];
          if (val instanceof THREE.Texture) {
            textures.add(val);
          }
        }
        mat.dispose();
      });
    }
  });
  textures.forEach((t) => t.dispose());
}
