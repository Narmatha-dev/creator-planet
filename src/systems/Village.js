import * as THREE from 'three';

export class Village {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Array of { box: THREE.Box3, mesh: THREE.Mesh }
    this.riverMesh = null;
    this.foamMesh = null;
    this.districtGateArm = null;
    this.streetLamps = [];
    this.barriers = [];
    this.cones = [];
    this.clouds = [];
    this.chimneySmokes = [];
    this.hospitalBeacon = null;
    this.buildSystem = null;

    // Bridge damage & Supply depot state
    this.bridgeDamageGroup = null;
    this.supplyDepotGroup = null;
    this.supplyPartMesh = null;
    this.supplyBeaconRing = null;
    this.isBridgeDamageRepaired = false;
    this.isPartCollected = false;
    this.districtGateOpen = false;

    // Fixed bridge site socket anchors (world coordinates)
    this.southSocket = new THREE.Vector3(0, 0.4, 4);   // South road connection
    this.midSocket = new THREE.Vector3(0, 0.4, -2.5);  // River center pier connection
    this.northSocket = new THREE.Vector3(0, 0.4, -9);  // North hospital road connection

    this.init();
  }

  init() {
    this.createAtmosphere();
    this.createTerrain();
    this.createRiver();
    this.createRoads();
    this.createHouses();
    this.createHospital();
    this.createAmbulanceDepot();
    this.createBridgeAbutments();
    this.createBridgeDamage();
    this.createSupplyDepot();
    this.createVegetationAndProps();
    this.createMountainBackdrop();
    this.createClouds();
    this.createDistrictGate();
    this.createLighting();
  }

  createAtmosphere() {
    // Sky gradient effect via large hemisphere dome
    const skyGeo = new THREE.SphereGeometry(180, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      side: THREE.BackSide
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);
  }

  createTerrain() {
    // Main terrain ground (stylized lush green meadow)
    const groundGeo = new THREE.PlaneGeometry(160, 160, 48, 48);
    const pos = groundGeo.attributes.position;

    // Add rolling hills at perimeter to create a valley bowl
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      if (dist > 30) {
        const hill = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 3.5 + ((dist - 30) / 40) * 4.0;
        pos.setZ(i, hill);
      }
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80, // Vibrant friendly emerald lawn
      roughness: 0.85,
      flatShading: true
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // River bed depression (rocky gravel channel)
    const riverBedGeo = new THREE.BoxGeometry(150, 1.4, 14);
    const riverBedMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark river rock bed
      roughness: 0.9,
      flatShading: true
    });
    const riverBed = new THREE.Mesh(riverBedGeo, riverBedMat);
    riverBed.position.set(0, -0.7, -2.5);
    riverBed.receiveShadow = true;
    this.scene.add(riverBed);

    // Stone retaining riverbank walls
    const bankMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.85,
      flatShading: true
    });

    // South riverbank wall
    const southBank = new THREE.Mesh(new THREE.BoxGeometry(140, 0.8, 0.8), bankMat);
    southBank.position.set(0, 0.1, 4.3);
    southBank.receiveShadow = true;
    southBank.castShadow = true;
    this.scene.add(southBank);

    // North riverbank wall
    const northBank = new THREE.Mesh(new THREE.BoxGeometry(140, 0.8, 0.8), bankMat);
    northBank.position.set(0, 0.1, -9.3);
    northBank.receiveShadow = true;
    northBank.castShadow = true;
    this.scene.add(northBank);
  }

  createRiver() {
    // Stylized river surface with translucent blue water and soft glow
    const riverGeo = new THREE.PlaneGeometry(150, 13.2, 50, 8);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Tropical clear azure
      roughness: 0.05,
      metalness: 0.15,
      transparent: true,
      opacity: 0.82,
      flatShading: true
    });

    this.riverMesh = new THREE.Mesh(riverGeo, riverMat);
    this.riverMesh.rotation.x = -Math.PI / 2;
    this.riverMesh.position.set(0, -0.04, -2.5);
    this.riverMesh.receiveShadow = true;
    this.scene.add(this.riverMesh);

    // White water shoreline foam ribbons
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });

    // South shoreline foam
    const foamSouth = new THREE.Mesh(new THREE.PlaneGeometry(140, 0.4), foamMat);
    foamSouth.rotation.x = -Math.PI / 2;
    foamSouth.position.set(0, 0.01, 3.8);
    this.scene.add(foamSouth);

    // North shoreline foam
    const foamNorth = new THREE.Mesh(new THREE.PlaneGeometry(140, 0.4), foamMat);
    foamNorth.rotation.x = -Math.PI / 2;
    foamNorth.position.set(0, 0.01, -8.8);
    this.scene.add(foamNorth);

    // Center pier foam ring
    const pierFoam = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 16), foamMat);
    pierFoam.rotation.x = -Math.PI / 2;
    pierFoam.position.set(0, 0.01, -2.5);
    this.scene.add(pierFoam);
    this.foamMesh = pierFoam;

    // Lilypads in calm water pockets
    this.createLilyPad(-12, -2.0, 0.8);
    this.createLilyPad(-14, -3.2, 1.1);
    this.createLilyPad(14, -1.8, 0.9);
    this.createLilyPad(16, -2.8, 1.2);
  }

  createLilyPad(x, z, scale) {
    const group = new THREE.Group();
    group.position.set(x, 0.02, z);
    group.scale.set(scale, scale, scale);

    const padMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12, 0.4, Math.PI * 1.8), padMat);
    pad.rotation.x = -Math.PI / 2;
    group.add(pad);

    // Lotus flower on top
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3 });
    const flower = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.25, 6), flowerMat);
    flower.position.set(0.1, 0.12, 0.1);
    group.add(flower);

    this.scene.add(group);
  }

  updateRiver(time) {
    if (!this.riverMesh) return;
    const pos = this.riverMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const v = pos.getY(i);
      const wave = Math.sin(u * 0.35 + time * 2.2) * 0.08 + Math.cos(v * 0.6 + time * 1.7) * 0.04;
      pos.setZ(i, wave);
    }
    this.riverMesh.geometry.computeVertexNormals();
    this.riverMesh.geometry.attributes.position.needsUpdate = true;

    // Pulse center foam ring
    if (this.foamMesh) {
      const s = 1.0 + Math.sin(time * 2.5) * 0.08;
      this.foamMesh.scale.set(s, s, 1);
    }

    // Drift clouds
    this.clouds.forEach(cloud => {
      cloud.position.x += 0.8 * 0.016;
      if (cloud.position.x > 80) cloud.position.x = -80;
    });

    // Chimney smoke bobbing
    this.chimneySmokes.forEach(puff => {
      puff.position.y += 0.008;
      puff.scale.multiplyScalar(1.002);
      if (puff.position.y > puff.userData.baseY + 1.6) {
        puff.position.y = puff.userData.baseY;
        puff.scale.set(0.3, 0.3, 0.3);
      }
    });

    // Blinking hospital roof beacon
    if (this.hospitalBeacon) {
      this.hospitalBeacon.material.emissiveIntensity = Math.sin(time * 4.0) > 0 ? 2.0 : 0.2;
    }
  }

  createRoads() {
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Premium dark slate asphalt
      roughness: 0.8
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1, // Clean concrete sidewalk curb
      roughness: 0.7
    });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Vivid golden safety dashes
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Solid white edge borders

    // South Road (Town & Ambulance Starting Area -> Bridge)
    const southRoadGeo = new THREE.BoxGeometry(5.2, 0.15, 38);
    const southRoad = new THREE.Mesh(southRoadGeo, roadMat);
    southRoad.position.set(0, 0.075, 23);
    southRoad.receiveShadow = true;
    this.scene.add(southRoad);

    // Concrete Sidewalks with curbs
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });

    // Left Sidewalk
    const sidewalkLeft = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 38), sidewalkMat);
    sidewalkLeft.position.set(-3.4, 0.11, 23);
    sidewalkLeft.receiveShadow = true;
    this.scene.add(sidewalkLeft);

    // Right Sidewalk
    const sidewalkRight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 38), sidewalkMat);
    sidewalkRight.position.set(3.4, 0.11, 23);
    sidewalkRight.receiveShadow = true;
    this.scene.add(sidewalkRight);

    // Solid white edge lines along road
    const edgeL = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 38), whiteLineMat);
    edgeL.rotation.x = -Math.PI / 2;
    edgeL.position.set(-2.4, 0.16, 23);
    this.scene.add(edgeL);

    const edgeR = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 38), whiteLineMat);
    edgeR.rotation.x = -Math.PI / 2;
    edgeR.position.set(2.4, 0.16, 23);
    this.scene.add(edgeR);

    // Center dashed yellow lane markings
    for (let z = 6; z <= 38; z += 4) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 2.0), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.16, z);
      this.scene.add(stripe);
    }

    // Pedestrian Zebra Crosswalk near village center (z = 18)
    for (let x = -2.0; x <= 2.0; x += 0.8) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 2.6), whiteLineMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(x, 0.165, 18);
      this.scene.add(bar);
    }

    // Painted Road Directional Arrow pointing North towards the bridge
    this.createRoadArrow(0, 0.165, 12);

    // North Road (Bridge -> Hospital Entrance & Ramp)
    const northRoadGeo = new THREE.BoxGeometry(5.2, 0.15, 23);
    const northRoad = new THREE.Mesh(northRoadGeo, roadMat);
    northRoad.position.set(0, 0.075, -20.5);
    northRoad.receiveShadow = true;
    this.scene.add(northRoad);

    // North Sidewalks
    const northWalkL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 23), sidewalkMat);
    northWalkL.position.set(-3.4, 0.11, -20.5);
    northWalkL.receiveShadow = true;
    this.scene.add(northWalkL);

    const northWalkR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 23), sidewalkMat);
    northWalkR.position.set(3.4, 0.11, -20.5);
    northWalkR.receiveShadow = true;
    this.scene.add(northWalkR);

    // Hospital Roundabout / Turnaround bay
    const roundBayGeo = new THREE.CylinderGeometry(8.5, 8.5, 0.15, 32);
    const roundBay = new THREE.Mesh(roundBayGeo, roadMat);
    roundBay.position.set(0, 0.075, -34);
    roundBay.receiveShadow = true;
    this.scene.add(roundBay);

    // Red Cross Hospital Road Marking on Roundabout
    const redCrossV = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4.2), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redCrossV.rotation.x = -Math.PI / 2;
    redCrossV.position.set(0, 0.165, -34);
    this.scene.add(redCrossV);

    const redCrossH = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.2), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redCrossH.rotation.x = -Math.PI / 2;
    redCrossH.position.set(0, 0.165, -34);
    this.scene.add(redCrossH);

    // Residential Cross street in village leading to District 2 gate
    const crossRoadGeo = new THREE.BoxGeometry(54, 0.14, 4.8);
    const crossRoad = new THREE.Mesh(crossRoadGeo, roadMat);
    crossRoad.position.set(0, 0.07, 28);
    crossRoad.receiveShadow = true;
    this.scene.add(crossRoad);
  }

  createRoadArrow(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Stem
    const stem = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.8), mat);
    stem.rotation.x = -Math.PI / 2;
    stem.position.set(0, 0, 0);
    group.add(stem);

    // Head
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.9, 3), mat);
    head.rotation.x = -Math.PI / 2;
    head.rotation.z = Math.PI;
    head.position.set(0, 0, -1.2);
    group.add(head);

    this.scene.add(group);
  }

  createBridgeAbutments() {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      flatShading: true
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.7
    });

    // South Bridge Abutment
    const southPier = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.0, 2.8), stoneMat);
    southPier.position.set(0, -0.4, 4.2);
    southPier.receiveShadow = true;
    southPier.castShadow = true;
    this.scene.add(southPier);

    const southCap = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.3, 3.0), capMat);
    southCap.position.set(0, 0.45, 4.2);
    southCap.receiveShadow = true;
    this.scene.add(southCap);

    // North Bridge Abutment
    const northPier = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.0, 2.8), stoneMat);
    northPier.position.set(0, -0.4, -9.2);
    northPier.receiveShadow = true;
    northPier.castShadow = true;
    this.scene.add(northPier);

    const northCap = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.3, 3.0), capMat);
    northCap.position.set(0, 0.45, -9.2);
    northCap.receiveShadow = true;
    this.scene.add(northCap);

    // Center River Support Pier (Heavyweight hexagonal pylon)
    const midPier = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.3, 3.2, 8), stoneMat);
    midPier.position.set(0, -0.6, -2.5);
    midPier.receiveShadow = true;
    midPier.castShadow = true;
    this.scene.add(midPier);

    const midCap = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.35, 8), capMat);
    midCap.position.set(0, 0.45, -2.5);
    midCap.receiveShadow = true;
    this.scene.add(midCap);

    // Road closed warning barriers
    this.createBarrier(-1.8, 0.4, 3.6);
    this.createBarrier(1.8, 0.4, 3.6);

    // Construction hazard cones
    this.createCone(-2.5, 0.15, 4.5);
    this.createCone(2.5, 0.15, 4.5);
    this.createCone(0, 0.15, 5.0);

    // Holographic anchor socket docking brackets
    this.createSocketMarker(this.southSocket, 0xfbbf24, 'southSocket');
    this.createSocketMarker(this.midSocket, 0xfbbf24, 'midSocket');
    this.createSocketMarker(this.northSocket, 0xfbbf24, 'northSocket');
  }

  createBridgeDamage() {
    this.bridgeDamageGroup = new THREE.Group();

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.95,
      flatShading: true
    });
    const rebarMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.6,
      metalness: 0.7
    });
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8
    });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8
    });

    // 1. Broken, cracked road lip at south abutment (Z = 3.8)
    const fracturedLip = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.28, 0.6), concreteMat);
    fracturedLip.position.set(0, 0.28, 3.8);
    fracturedLip.rotation.z = 0.04;
    fracturedLip.castShadow = true;
    this.bridgeDamageGroup.add(fracturedLip);

    // 2. Protruding bent rebar steel rods exposed at the fracture edge
    const rebarCoords = [
      { x: -1.8, y: 0.35, z: 4.0, rx: 0.3, rz: -0.15 },
      { x: -0.9, y: 0.32, z: 4.1, rx: 0.45, rz: 0.1 },
      { x: 0, y: 0.38, z: 4.05, rx: 0.2, rz: 0.05 },
      { x: 0.9, y: 0.33, z: 4.15, rx: 0.5, rz: -0.2 },
      { x: 1.8, y: 0.36, z: 4.0, rx: 0.35, rz: 0.18 }
    ];
    rebarCoords.forEach(rc => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 6), rebarMat);
      rod.position.set(rc.x, rc.y, rc.z);
      rod.rotation.x = rc.rx;
      rod.rotation.z = rc.rz;
      rod.castShadow = true;
      this.bridgeDamageGroup.add(rod);
    });

    // 3. Fallen rubble concrete blocks and asphalt chunks scattered at edge
    const rubbleCoords = [
      { x: -1.4, y: 0.15, z: 4.2, s: 0.45, rot: 0.3 },
      { x: -0.4, y: 0.12, z: 4.4, s: 0.35, rot: -0.5 },
      { x: 0.6, y: 0.14, z: 4.3, s: 0.5, rot: 0.8 },
      { x: 1.5, y: 0.16, z: 4.15, s: 0.4, rot: -0.2 },
      // Submerged sunken bridge debris blocks in river
      { x: -0.8, y: -0.4, z: 1.5, s: 0.8, rot: 0.4 },
      { x: 1.0, y: -0.35, z: -0.5, s: 0.9, rot: -0.6 }
    ];
    rubbleCoords.forEach(rb => {
      const rockGeo = new THREE.DodecahedronGeometry(rb.s, 0);
      const rubbleMesh = new THREE.Mesh(rockGeo, concreteMat);
      rubbleMesh.position.set(rb.x, rb.y, rb.z);
      rubbleMesh.rotation.set(rb.rot, rb.rot * 1.5, rb.rot * 0.7);
      rubbleMesh.castShadow = true;
      rubbleMesh.receiveShadow = true;
      this.bridgeDamageGroup.add(rubbleMesh);
    });

    // 4. Warning Signboard: "DANGER: BRIDGE COLLAPSED - REPAIR REQUIRED"
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 0, 4.8);

    // Sign posts
    [-1.2, 1.2].forEach(px => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), postMat);
      p.position.set(px, 0.9, 0);
      p.castShadow = true;
      signGroup.add(p);

      // Flashing amber beacon atop posts
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), beaconMat);
      beacon.position.set(px, 1.85, 0);
      signGroup.add(beacon);
    });

    // Sign board
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 0.08), signMat);
    board.position.set(0, 1.4, 0);
    board.castShadow = true;
    signGroup.add(board);

    // Hazard stripes across board
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    for (let sx = -1.1; sx <= 1.1; sx += 0.45) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.8), stripeMat);
      st.position.set(sx, 1.4, 0.045);
      st.rotation.z = Math.PI / 4;
      signGroup.add(st);
    }

    this.bridgeDamageGroup.add(signGroup);
    this.scene.add(this.bridgeDamageGroup);
  }

  createSupplyDepot() {
    this.supplyDepotGroup = new THREE.Group();
    this.supplyDepotGroup.position.set(-12, 0, 18);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const steelIBeamMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.7, roughness: 0.3 }); // Vivid industrial orange
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, side: THREE.DoubleSide });

    // Wooden Pallets
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 4.0), woodMat);
    pallet.position.y = 0.1;
    pallet.receiveShadow = true;
    this.supplyDepotGroup.add(pallet);

    // Construction equipment crates
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), crateMat);
    crate1.position.set(-1.1, 0.55, -0.9);
    crate1.castShadow = true;
    this.supplyDepotGroup.add(crate1);

    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), crateMat);
    crate2.position.set(-1.1, 0.45, 0.8);
    crate2.castShadow = true;
    this.supplyDepotGroup.add(crate2);

    // The Bridge Repair Component (Structural Steel I-Beam & Truss Section)
    this.supplyPartMesh = new THREE.Group();

    // Horizontal top flange
    const topFlange = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 3.2), steelIBeamMat);
    topFlange.position.y = 0.65;
    this.supplyPartMesh.add(topFlange);

    // Vertical web
    const web = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 3.2), steelIBeamMat);
    web.position.y = 0.4;
    this.supplyPartMesh.add(web);

    // Bottom flange
    const botFlange = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 3.2), steelIBeamMat);
    botFlange.position.y = 0.15;
    this.supplyPartMesh.add(botFlange);

    // Diagonal reinforcement braces
    for (let bz = -1.2; bz <= 1.2; bz += 0.8) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), steelIBeamMat);
      brace.position.set(0, 0.4, bz);
      brace.rotation.x = Math.PI / 4;
      this.supplyPartMesh.add(brace);
    }

    this.supplyPartMesh.position.set(0.6, 0.1, 0);
    this.supplyPartMesh.castShadow = true;
    this.supplyDepotGroup.add(this.supplyPartMesh);

    // Rotating holographic beacon ring on ground
    const ringGeo = new THREE.RingGeometry(1.8, 2.1, 24);
    this.supplyBeaconRing = new THREE.Mesh(ringGeo, beaconMat);
    this.supplyBeaconRing.rotation.x = -Math.PI / 2;
    this.supplyBeaconRing.position.y = 0.02;
    this.supplyDepotGroup.add(this.supplyBeaconRing);

    // Vertical guidance light beam
    const beamGeo = new THREE.CylinderGeometry(0.4, 0.8, 4.5, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 2.25;
    this.supplyDepotGroup.add(beam);

    // Signboard: "SUPPLY DEPOT - BRIDGE PARTS"
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.1), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    signBoard.position.set(0, 1.8, 2.0);
    this.supplyDepotGroup.add(signBoard);

    const signTextMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const signTrim = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.12), signTextMat);
    signTrim.position.set(0, 2.1, 2.0);
    this.supplyDepotGroup.add(signTrim);

    this.scene.add(this.supplyDepotGroup);
  }

  collectSupplyPart() {
    this.isPartCollected = true;
    if (this.supplyPartMesh) {
      this.supplyPartMesh.visible = false;
    }
    if (this.supplyBeaconRing) {
      this.supplyBeaconRing.material.color.setHex(0x10b981);
    }
  }

  repairBridgeDamage() {
    this.isBridgeDamageRepaired = true;
    if (this.bridgeDamageGroup) {
      this.bridgeDamageGroup.visible = false;
    }
    // Clean, reinforced anchor plate appears at south socket
    const anchorPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.3, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 })
    );
    anchorPlate.position.set(0, 0.35, 3.8);
    this.scene.add(anchorPlate);

    this.setSocketColor('southSocket', 0x10b981);
  }

  resetBridgeAndDepot() {
    this.isBridgeDamageRepaired = false;
    this.isPartCollected = false;
    this.districtGateOpen = false;
    if (this.bridgeDamageGroup) this.bridgeDamageGroup.visible = true;
    if (this.supplyPartMesh) this.supplyPartMesh.visible = true;
    if (this.supplyBeaconRing) this.supplyBeaconRing.material.color.setHex(0x38bdf8);
    this.setSocketColor('southSocket', 0xfbbf24);
  }

  createSocketMarker(position, colorHex, id) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Outer rotating holographic ring
    const ringGeo = new THREE.RingGeometry(0.65, 0.95, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    // Inner docking beacon orb
    const orbGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 0.22;
    group.add(orb);

    // Upward guidance light beam (soft vertical cylinder)
    const beamGeo = new THREE.CylinderGeometry(0.3, 0.5, 2.5, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.25;
    group.add(beam);

    group.name = id;
    this.scene.add(group);
    return group;
  }

  setSocketColor(id, colorHex) {
    const group = this.scene.getObjectByName(id);
    if (group) {
      group.traverse(child => {
        if (child.isMesh && child.material && child.material.color) {
          child.material.color.setHex(colorHex);
          if (child.material.emissive) {
            child.material.emissive.setHex(colorHex);
          }
        }
      });
    }
  }

  createBarrier(x, y, z) {
    const group = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.2, 0.14), postMat);
    post1.position.set(-0.7, 0.6, 0);
    group.add(post1);

    const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.2, 0.14), postMat);
    post2.position.set(0.7, 0.6, 0);
    group.add(post2);

    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.38, 0.08), stripeMat);
    plank.position.set(0, 0.8, 0);
    group.add(plank);

    // Hazard stripes
    for (let ox of [-0.5, -0.1, 0.3]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.09), whiteMat);
      stripe.position.set(ox, 0.8, 0);
      group.add(stripe);
    }

    group.position.set(x, y, z);
    group.castShadow = true;
    this.scene.add(group);
    const collider = this.addCollider(group, new THREE.Vector3(1.7, 1.2, 0.5));
    this.barriers.push({ group, collider });
  }

  createCone(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Square base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), baseMat);
    base.position.y = 0.03;
    group.add(base);

    // Orange cone
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 12), coneMat);
    cone.position.y = 0.35;
    cone.castShadow = true;
    group.add(cone);

    // White reflective stripe collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.14, 12), whiteMat);
    collar.position.y = 0.35;
    group.add(collar);

    this.scene.add(group);
    this.cones.push(group);
  }

  clearWarningBarriers() {
    this.barriers.forEach((b, idx) => {
      const targetX = idx === 0 ? -4.5 : 4.5;
      b.group.position.x = targetX;
      if (b.collider) {
        const half = new THREE.Vector3(1.7, 1.2, 0.5).multiplyScalar(0.5);
        b.collider.box.min.copy(b.group.position).sub(half);
        b.collider.box.max.copy(b.group.position).add(half);
      }
    });

    this.cones.forEach(c => {
      c.position.y = -10; // lowered below ground
    });
  }

  createHouses() {
    // Architectural village cottages with gardens and porches
    const houseConfigs = [
      // Left side village street
      { x: -10, z: 24, rot: 0.15, color: 0x38bdf8, roof: 0xe11d48, scale: 1.1, style: 'cottage' },
      { x: -11, z: 34, rot: 0, color: 0xfacc15, roof: 0x7c3aed, scale: 1.0, style: 'villa' },
      { x: -10, z: 14, rot: -0.1, color: 0x4ade80, roof: 0xe11d48, scale: 0.95, style: 'cottage' },

      // Right side village street
      { x: 10, z: 23, rot: -0.12, color: 0xf472b6, roof: 0x0284c7, scale: 1.1, style: 'villa' },
      { x: 11, z: 33, rot: 0, color: 0xa78bfa, roof: 0xf59e0b, scale: 1.0, style: 'cottage' },
      { x: 10, z: 13, rot: 0.15, color: 0x34d399, roof: 0xd97706, scale: 0.9, style: 'cottage' },

      // Riverside chalets
      { x: -18, z: 8, rot: 0.35, color: 0xfbbf24, roof: 0x9333ea, scale: 1.05, style: 'chalet' },
      { x: 18, z: 8, rot: -0.35, color: 0x60a5fa, roof: 0xd97706, scale: 1.05, style: 'chalet' }
    ];

    houseConfigs.forEach(cfg => this.buildHouse(cfg));
  }

  buildHouse({ x, z, rot, color, roof, scale, style }) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rot;
    group.scale.set(scale, scale, scale);

    const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });

    // Stone Foundation Plinth
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.4, 4.3), stoneMat);
    foundation.position.y = 0.2;
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    group.add(foundation);

    // Main House Body
    const walls = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 4.0), wallMat);
    walls.position.y = 1.8;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Pitched Roof
    const roofGeo = new THREE.ConeGeometry(3.7, 2.2, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: roof, roughness: 0.5, flatShading: true });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.y = 4.4;
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.castShadow = true;
    group.add(roofMesh);

    // Roof Trim Eaves
    const eave = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 4.2), trimMat);
    eave.position.y = 3.4;
    group.add(eave);

    // Chimney with Smoke Puff
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.6, 0.65), stoneMat);
    chimney.position.set(1.2, 4.6, 0.6);
    chimney.castShadow = true;
    group.add(chimney);

    // Animated chimney smoke puff
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      roughness: 1.0
    });
    const smokePuff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 1), smokeMat);
    smokePuff.position.set(1.2, 5.5, 0.6);
    smokePuff.userData = { baseY: 5.5 };
    group.add(smokePuff);
    this.chimneySmokes.push(smokePuff);

    // Front Porch & Door
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.15), trimMat);
    doorFrame.position.set(0, 1.1, 2.08);
    group.add(doorFrame);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.1), woodMat);
    door.position.set(0, 1.1, 2.12);
    group.add(door);

    // Brass Doorknob
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8 })
    );
    knob.position.set(0.3, 1.1, 2.18);
    group.add(knob);

    // Glowing Windows with cross mullions
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.35,
      roughness: 0.2
    });

    [-1.3, 1.3].forEach(wx => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.12), winMat);
      win.position.set(wx, 2.0, 2.06);
      group.add(win);

      // Window flower box
      const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.3), woodMat);
      flowerBox.position.set(wx, 1.4, 2.2);
      group.add(flowerBox);

      // Colorful flowers in window box
      const flowerGeo = new THREE.DodecahedronGeometry(0.12, 1);
      const flw1 = new THREE.Mesh(flowerGeo, new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      flw1.position.set(wx - 0.25, 1.55, 2.2);
      group.add(flw1);
      const flw2 = new THREE.Mesh(flowerGeo, new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
      flw2.position.set(wx + 0.25, 1.55, 2.2);
      group.add(flw2);
    });

    this.scene.add(group);
    this.addCollider(group, new THREE.Vector3(5.0 * scale, 4.0 * scale, 4.6 * scale));
  }

  createHospital() {
    // Village Hospital - imposing, child-friendly high-tech medical clinic
    const group = new THREE.Group();
    group.position.set(0, 0, -36);

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const blueTrimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const greyMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      roughness: 0.1
    });

    // Tier 1 Base Building
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(18, 8.5, 11), whiteMat);
    mainBody.position.y = 4.25;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    group.add(mainBody);

    // Blue architectural accent bands
    const bandLower = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.4, 11.2), blueTrimMat);
    bandLower.position.y = 4.5;
    group.add(bandLower);

    const bandUpper = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.4, 11.2), blueTrimMat);
    bandUpper.position.y = 8.5;
    group.add(bandUpper);

    // Tier 2 Upper Clinic
    const topTier = new THREE.Mesh(new THREE.BoxGeometry(11, 4.0, 9), whiteMat);
    topTier.position.set(0, 10.5, 0);
    topTier.castShadow = true;
    group.add(topTier);

    // Rooftop Helipad
    const helipad = new THREE.Mesh(
      new THREE.CylinderGeometry(4.0, 4.0, 0.35, 32),
      greyMat
    );
    helipad.position.set(0, 12.65, 0);
    group.add(helipad);

    // Helipad Yellow Circle & Letter 'H'
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 3.2, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(0, 12.85, 0);
    group.add(padRing);

    // Rooftop Communications Antenna Tower
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.12, 3.5, 8),
      greyMat
    );
    antenna.position.set(4.2, 14.2, 3.2);
    group.add(antenna);

    // Blinking red aviation warning beacon
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1.5
    });
    this.hospitalBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), beaconMat);
    this.hospitalBeacon.position.set(4.2, 16.0, 3.2);
    group.add(this.hospitalBeacon);

    // Illuminated 3D Red Cross on Upper Facade
    const crossGroup = new THREE.Group();
    crossGroup.position.set(0, 10.6, 4.6);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.8, 0.25), redMat);
    crossGroup.add(crossV);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.25), redMat);
    crossGroup.add(crossH);

    group.add(crossGroup);

    // Emergency ER Entrance Canopy with illuminated sign
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.5, 4.5), redMat);
    canopy.position.set(0, 2.8, 6.5);
    canopy.castShadow = true;
    group.add(canopy);

    // Canopy Pillars
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.8), greyMat);
    pillarL.position.set(-3.2, 1.4, 8.4);
    group.add(pillarL);

    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.8), greyMat);
    pillarR.position.set(3.2, 1.4, 8.4);
    group.add(pillarR);

    // Emergency Room double glass sliding doors
    const erDoors = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 0.18), glassMat);
    erDoors.position.set(0, 1.2, 5.55);
    group.add(erDoors);

    // Hospital Windows Grid
    for (let floor = 0; floor < 2; floor++) {
      const y = 2.4 + floor * 3.6;
      for (let xOffset of [-6.2, -3.8, 3.8, 6.2]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 0.15), glassMat);
        win.position.set(xOffset, y, 5.55);
        group.add(win);
      }
    }

    // Emergency ambulance dropoff bay marking
    const bayMarker = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 5.8),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.65 })
    );
    bayMarker.rotation.x = -Math.PI / 2;
    bayMarker.position.set(0, 0.17, 7.5);
    group.add(bayMarker);

    this.scene.add(group);
    this.addCollider(group, new THREE.Vector3(18.5, 12, 11.5));

    this.hospitalDropoffPoint = new THREE.Vector3(0, 0.5, -28.5);
  }

  createAmbulanceDepot() {
    // Village Emergency Ambulance Station at start point (z = 32)
    const group = new THREE.Group();
    group.position.set(-5.5, 0, 32);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const rollerDoorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.3 });

    // Station building
    const depot = new THREE.Mesh(new THREE.BoxGeometry(5.0, 4.0, 7.0), wallMat);
    depot.position.y = 2.0;
    depot.castShadow = true;
    depot.receiveShadow = true;
    group.add(depot);

    // Roof trim
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.4, 7.4), redMat);
    roof.position.y = 4.2;
    group.add(roof);

    // Garage roller door
    const rollerDoor = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.2), rollerDoorMat);
    rollerDoor.position.set(2.51, 1.6, 0);
    rollerDoor.rotation.y = Math.PI / 2;
    group.add(rollerDoor);

    this.scene.add(group);
    this.addCollider(group, new THREE.Vector3(5.2, 4.2, 7.2));
  }

  createVegetationAndProps() {
    // Trees around village and riverside
    const treeCoords = [
      // South river bank
      { x: -7, z: 2, type: 'pine', scale: 1.2 },
      { x: -14, z: 3, type: 'oak', scale: 1.1 },
      { x: -22, z: 2, type: 'pine', scale: 1.4 },
      { x: 8, z: 2, type: 'oak', scale: 1.0 },
      { x: 15, z: 3, type: 'pine', scale: 1.3 },
      { x: 23, z: 2, type: 'pine', scale: 1.2 },

      // North river bank
      { x: -6, z: -8, type: 'oak', scale: 1.0 },
      { x: -14, z: -7, type: 'pine', scale: 1.3 },
      { x: 7, z: -8, type: 'pine', scale: 1.1 },
      { x: 16, z: -8, type: 'oak', scale: 1.2 },

      // Village neighborhood
      { x: -16, z: 20, type: 'oak', scale: 1.2 },
      { x: -16, z: 30, type: 'pine', scale: 1.3 },
      { x: 16, z: 18, type: 'pine', scale: 1.1 },
      { x: 17, z: 35, type: 'oak', scale: 1.3 },
      { x: 4.5, z: 42, type: 'pine', scale: 1.0 },
      { x: -4.5, z: 42, type: 'oak', scale: 1.1 }
    ];

    treeCoords.forEach(t => {
      if (t.type === 'pine') {
        this.createPineTree(t.x, 0, t.z, t.scale);
      } else {
        this.createOakTree(t.x, 0, t.z, t.scale);
      }
    });

    // Decorative boulders along the riverbanks
    const rockCoords = [
      { x: -3.8, z: 2.5, s: 1.1 },
      { x: 4.2, z: 2.7, s: 0.9 },
      { x: -4.5, z: -7.5, s: 1.2 },
      { x: 3.8, z: -7.8, s: 1.0 },
      { x: -10, z: -1, s: 1.4 },
      { x: 12, z: -1, s: 1.3 }
    ];
    rockCoords.forEach(r => this.createRock(r.x, 0, r.z, r.s));

    // Street lamps along the village avenue
    for (let z of [10, 20, 30]) {
      this.createStreetLamp(-4.2, 0, z);
      this.createStreetLamp(4.2, 0, z);
    }

    // Wooden park benches
    this.createParkBench(-4.4, 0, 16, Math.PI / 2);
    this.createParkBench(4.4, 0, 24, -Math.PI / 2);

    // Fire hydrants
    this.createHydrant(-4.0, 0, 22);

    // Meadow flower patches
    this.createFlowerPatch(-6, 26, 0xf43f5e);
    this.createFlowerPatch(6, 16, 0xfbbf24);
    this.createFlowerPatch(-14, 18, 0x38bdf8);
    this.createFlowerPatch(14, 30, 0xa855f7);
  }

  createPineTree(x, y, z, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.set(scale, scale, scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7, flatShading: true });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.5, 8), trunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);

    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.2, 7), leafMat);
    cone1.position.y = 2.2;
    cone1.castShadow = true;
    group.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.8, 7), leafMat);
    cone2.position.y = 3.2;
    cone2.castShadow = true;
    group.add(cone2);

    const cone3 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.4, 7), leafMat);
    cone3.position.y = 4.2;
    cone3.castShadow = true;
    group.add(cone3);

    this.scene.add(group);
    this.addCollider(group, new THREE.Vector3(0.9 * scale, 4 * scale, 0.9 * scale));
  }

  createOakTree(x, y, z, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.set(scale, scale, scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a2d0c, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7, flatShading: true });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.8, 8), trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    group.add(trunk);

    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), leafMat);
    foliage.position.y = 2.8;
    foliage.castShadow = true;
    group.add(foliage);

    this.scene.add(group);
    this.addCollider(group, new THREE.Vector3(1.1 * scale, 3.5 * scale, 1.1 * scale));
  }

  createRock(x, y, z, scale = 1.0) {
    const geo = new THREE.DodecahedronGeometry(0.95 * scale, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, y + 0.45 * scale, z);
    rock.rotation.set(Math.random() * 2, Math.random() * 2, 0);
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.scene.add(rock);
    this.addCollider(rock, new THREE.Vector3(1.2 * scale, 0.9 * scale, 1.2 * scale));
  }

  createStreetLamp(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8), poleMat);
    base.position.y = 0.15;
    group.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2), poleMat);
    pole.position.y = 1.75;
    pole.castShadow = true;
    group.add(pole);

    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), lampMat);
    globe.position.y = 3.35;
    group.add(globe);

    // Warm pointlight for nighttime ambiance
    const light = new THREE.PointLight(0xfef08a, 0.4, 8);
    light.position.y = 3.3;
    group.add(light);

    this.scene.add(group);
    this.streetLamps.push(globe);
  }

  createParkBench(x, y, z, rotY) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.6), woodMat);
    seat.position.y = 0.45;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), woodMat);
    back.position.set(0, 0.75, -0.25);
    group.add(back);

    [-0.7, 0.7].forEach(lx => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.5), ironMat);
      leg.position.set(lx, 0.225, 0);
      group.add(leg);
    });

    this.scene.add(group);
  }

  createHydrant(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.65, 8), redMat);
    body.position.y = 0.32;
    group.add(body);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), redMat);
    cap.position.y = 0.65;
    group.add(cap);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8), silverMat);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.y = 0.4;
    group.add(nozzle);

    this.scene.add(group);
  }

  createFlowerPatch(x, z, colorHex) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const flowerMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
    const flowerGeo = new THREE.DodecahedronGeometry(0.12, 1);

    for (let i = 0; i < 7; i++) {
      const flw = new THREE.Mesh(flowerGeo, flowerMat);
      const angle = (i / 7) * Math.PI * 2;
      const r = 0.35 + Math.random() * 0.4;
      flw.position.set(Math.cos(angle) * r, 0.1 + Math.random() * 0.08, Math.sin(angle) * r);
      group.add(flw);
    }

    this.scene.add(group);
  }

  createMountainBackdrop() {
    // Majestic low-poly mountain ranges on the northern and southern horizons
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Blue-slate atmospheric mountains
      roughness: 0.95,
      flatShading: true
    });

    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.8,
      flatShading: true
    });

    const mountainConfigs = [
      { x: -45, z: -55, r: 24, h: 28 },
      { x: 0, z: -65, r: 30, h: 36 },
      { x: 45, z: -55, r: 24, h: 26 },
      { x: -50, z: 50, r: 26, h: 30 },
      { x: 45, z: 50, r: 26, h: 28 }
    ];

    mountainConfigs.forEach(m => {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(m.r, m.h, 7), mountainMat);
      peak.position.set(m.x, m.h * 0.5 - 2, m.z);
      this.scene.add(peak);

      // Snowcap
      const snow = new THREE.Mesh(new THREE.ConeGeometry(m.r * 0.35, m.h * 0.35, 7), snowMat);
      snow.position.set(m.x, m.h * 0.825 - 2, m.z);
      this.scene.add(snow);
    });
  }

  createClouds() {
    // Fluffy procedural low-poly clouds drifting in sky
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      flatShading: true
    });

    const cloudPositions = [
      { x: -35, y: 28, z: -20, s: 1.2 },
      { x: 10, y: 32, z: -35, s: 1.4 },
      { x: 30, y: 26, z: 15, s: 1.1 },
      { x: -20, y: 34, z: 30, s: 1.3 }
    ];

    cloudPositions.forEach(cp => {
      const group = new THREE.Group();
      group.position.set(cp.x, cp.y, cp.z);
      group.scale.set(cp.s, cp.s, cp.s);

      // Cloud clustered puffs
      for (let i = 0; i < 5; i++) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + Math.random() * 1.0, 1), cloudMat);
        puff.position.set(
          (i - 2) * 2.2,
          Math.sin(i) * 0.8,
          Math.cos(i) * 1.2
        );
        group.add(puff);
      }

      this.scene.add(group);
      this.clouds.push(group);
    });
  }

  createDistrictGate() {
    const group = new THREE.Group();
    group.position.set(24, 0, 28);
    group.rotation.y = -Math.PI / 2;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const signMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });

    // Gate Posts
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), woodMat);
    postL.position.set(-2.8, 2.25, 0);
    group.add(postL);

    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), woodMat);
    postR.position.set(2.8, 2.25, 0);
    group.add(postR);

    // Archway Header Sign
    const header = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.8, 0.3), signMat);
    header.position.set(0, 4.2, 0);
    group.add(header);

    // Movable barrier arm
    this.districtGateArm = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.2, 0.15), barrierMat);
    this.districtGateArm.position.set(0, 1.4, 0);
    group.add(this.districtGateArm);

    this.scene.add(group);
    this.districtGate = group;

    // Physical barrier collider for closed district gate
    this.gateCollider = this.addCollider(group, new THREE.Vector3(1.0, 3.0, 6.0));
  }

  openDistrictGate() {
    this.districtGateOpen = true;
    // Remove physical gate collider so player can walk freely into District 2!
    if (this.gateCollider) {
      const idx = this.colliders.indexOf(this.gateCollider);
      if (idx !== -1) {
        this.colliders.splice(idx, 1);
      }
      this.gateCollider = null;
    }

    if (this.districtGateArm) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.05;
        this.districtGateArm.rotation.z = Math.min(Math.PI / 2.2, progress);
        if (progress >= Math.PI / 2.2) {
          clearInterval(interval);
        }
      }, 30);
    }
  }

  createLighting() {
    // Ambient / Hemisphere light for vibrant outdoor warmth
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x4ade80, 0.72);
    this.scene.add(hemiLight);

    // Main Directional Sun with calibrated soft shadows
    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.25);
    dirLight.position.set(32, 48, 28);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 140;
    const d = 42;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0001;
    dirLight.shadow.normalBias = 0.04;
    this.scene.add(dirLight);

    // Fill light from river side
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(-25, 25, -25);
    this.scene.add(fillLight);
  }

  addCollider(mesh, size) {
    const box = new THREE.Box3();
    const half = size.clone().multiplyScalar(0.5);
    box.min.copy(mesh.position).sub(half);
    box.max.copy(mesh.position).add(half);
    const record = { box, mesh };
    this.colliders.push(record);
    return record;
  }

  checkCollision(position, radius = 0.4) {
    const playerSphere = new THREE.Sphere(position, radius);

    // Boundary walls of village area
    if (Math.abs(position.x) > 36 || position.z > 45 || position.z < -42) {
      return true;
    }

    // River water obstacle check
    // River spans between z = -9.0 to z = 3.8
    if (position.z > -9.0 && position.z < 3.8) {
      // If outside bridge lane (x < -2.4 or x > 2.4):
      if (Math.abs(position.x) > 2.4) {
        return true; // River water barrier
      }

      // Inside bridge lane: check if bridge spans are placed!
      if (this.buildSystem) {
        const inSouthSpan = position.z >= -2.5;
        const inNorthSpan = position.z < -2.5;
        const southPlaced = this.buildSystem.slots[0].occupied;
        const northPlaced = this.buildSystem.slots[1].occupied;

        if (inSouthSpan && !southPlaced) return true; // Open river gap
        if (inNorthSpan && !northPlaced) return true; // Open river gap
      }
    }

    // Check props colliders
    for (let col of this.colliders) {
      if (col.box.intersectsSphere(playerSphere)) {
        return true;
      }
    }
    return false;
  }
}
