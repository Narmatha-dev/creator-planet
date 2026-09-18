import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class NPCSystem {
  constructor(scene, village) {
    this.scene = scene;
    this.village = village;
    this.gltfLoader = new GLTFLoader();

    this.npcs = [];
    this.activeNPC = null;
    this.dialogueIndex = 0;

    this.initNPCs();
    this.checkOfficialModels();
  }

  initNPCs() {
    // 1. Funobotz Guide NPC (Sparky) - Located near player spawn
    this.addNPC({
      id: 'guide',
      name: 'Sparky',
      role: 'FUNOBOTZ GUIDE',
      badge: 'MISSION GUIDE',
      avatar: '🤖',
      pos: new THREE.Vector3(2.8, 0, 17.5),
      rotationY: Math.PI + 0.3,
      color: 0x0284c7, // Sky Blue
      dialogues: {
        intro: [
          "Emergency! The bridge across the river has collapsed.",
          "An ambulance is waiting to take patients to the Village Hospital.",
          "We need your engineering skills! Go inspect the damaged bridge."
        ],
        reminder: [
          "The bridge is to the North! Walk forward along the road to find it."
        ],
        cleared: [
          "Incredible job! The route is repaired and the village is safe."
        ]
      }
    });

    // 2. Funobotz Engineer NPC (Geary) - Located near Bridge / Construction Area
    this.addNPC({
      id: 'engineer',
      name: 'Geary',
      role: 'FUNOBOTZ ENGINEER',
      badge: 'CHIEF BUILDER',
      avatar: '🛠️',
      pos: new THREE.Vector3(-4.2, 0, 6.5),
      rotationY: 0.5,
      color: 0xf59e0b, // Amber / Construction Yellow
      dialogues: {
        needPart: [
          "The south bridge abutment is fractured! We cannot lay decks yet.",
          "Head West to the Construction Supply Depot to collect a replacement truss component [E]."
        ],
        needRepair: [
          "You have the replacement truss! Walk right up to the broken edge and press [E] to repair the foundation."
        ],
        needBuild: [
          "The foundation is reinforced! Press [E] to enter Build Mode.",
          "Select bridge components, rotate them with [R] to align, and click TEST."
        ],
        completed: [
          "Structural test passed with 100% integrity! The bridge holds full emergency vehicle weight!"
        ]
      }
    });

    // 3. Funobotz Medic NPC (Hearty) - Located near Hospital Bay
    this.addNPC({
      id: 'medic',
      name: 'Hearty',
      role: 'FUNOBOTZ MEDIC',
      badge: 'HOSPITAL RESCUE',
      avatar: '🏥',
      pos: new THREE.Vector3(4.5, 0, -26.0),
      rotationY: Math.PI - 0.4,
      color: 0x10b981, // Emerald Green / Medical
      dialogues: {
        waiting: [
          "Please hurry with the bridge repairs! Our medical trauma team is on standby.",
          "The ambulance must cross the river to deliver patients safely."
        ],
        arrived: [
          "Hooray! The ambulance reached the hospital safely! Everyone is cared for.",
          "District 2: Windmill Valley is now unlocked through the Eastern Gate! Great work, Creator!"
        ]
      }
    });
  }

  addNPC(config) {
    const group = new THREE.Group();
    group.position.copy(config.pos);
    group.rotation.y = config.rotationY;
    group.userData = { id: config.id, config };

    // Placeholder 3D Character Model (Friendly Low-Poly Helper Robot)
    const bodyMesh = this.createRobotPlaceholder(config);
    group.add(bodyMesh);

    // Floating in-world Name & Role Badge
    const tag = this.createFloatingTag(config.role, config.name);
    tag.position.set(0, 2.35, 0);
    group.add(tag);

    // Light beacon beneath NPC
    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.75, 20),
      new THREE.MeshBasicMaterial({
        color: config.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      })
    );
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = 0.04;
    group.add(baseRing);

    this.scene.add(group);

    // Register collision cylinder in village so player doesn't clip through
    if (this.village && this.village.addCollider) {
      this.village.addCollider(group, new THREE.Vector3(1.0, 2.0, 1.0));
    }

    this.npcs.push({
      id: config.id,
      config,
      group,
      bodyMesh,
      tag,
      baseRing,
      initialPos: config.pos.clone(),
      initialRotationY: config.rotationY
    });
  }

  createRobotPlaceholder(config) {
    const group = new THREE.Group();

    const mainMat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.4,
      metalness: 0.3
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6
    });
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2
    });
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.2,
      roughness: 0.1
    });

    // Hovering Torso (Pill / Beveled Capsule)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.7, 16), mainMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    group.add(torso);

    // Belt / Trim
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.12, 16), darkMat);
    trim.position.y = 0.68;
    group.add(trim);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.48), mainMat);
    head.position.y = 1.38;
    head.castShadow = true;
    group.add(head);

    // Screen Face
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.32), screenMat);
    screen.position.set(0, 1.38, 0.245);
    group.add(screen);

    // LED Eyes
    [-0.12, 0.12].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.11), ledMat);
      eye.position.set(ex, 1.4, 0.25);
      group.add(eye);
    });

    // LED Smile / Mouth
    const smile = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.04), ledMat);
    smile.position.set(0, 1.28, 0.25);
    group.add(smile);

    // Antenna
    const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), darkMat);
    antennaStem.position.y = 1.72;
    group.add(antennaStem);

    const antennaOrb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), ledMat);
    antennaOrb.position.y = 1.86;
    group.add(antennaOrb);

    // Floating Hands
    [-0.48, 0.48].forEach(hx => {
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), darkMat);
      hand.position.set(hx, 0.82, 0.05);
      group.add(hand);
    });

    return group;
  }

  createFloatingTag(role, name) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 110;
    const ctx = canvas.getContext('2d');

    // Rounded background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 280, 90, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Line 1: Role
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🤖 ${role}`, 150, 42);

    // Line 2: Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(name, 150, 70);

    // Line 3: Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 13px Outfit, sans-serif';
    ctx.fillText('[Official Asset Placeholder]', 150, 90);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 0.88, 1.0);
    return sprite;
  }

  checkOfficialModels() {
    // Check if user placed official Funobotz .glb models in /models/
    const modelMappings = [
      { npc: 'guide', path: '/models/funobotz_guide.glb' },
      { npc: 'engineer', path: '/models/funobotz_engineer.glb' },
      { npc: 'medic', path: '/models/funobotz_medic.glb' },
      { npc: 'guide', path: '/models/funobotz_mascot.glb' }
    ];

    modelMappings.forEach(({ npc: id, path }) => {
      fetch(path, { method: 'HEAD' })
        .then(res => {
          if (res.ok) {
            this.loadOfficialGLTF(id, path);
          }
        })
        .catch(() => {
          // Official model not placed yet; placeholder active
        });
    });
  }

  loadOfficialGLTF(npcId, path) {
    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc) return;

    this.gltfLoader.load(
      path,
      (gltf) => {
        console.log(`[NPCSystem] Loaded official Funobotz asset for ${npcId}: ${path}`);
        if (npc.bodyMesh) {
          npc.group.remove(npc.bodyMesh);
        }
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.y = 0;
        npc.group.add(model);
        npc.bodyMesh = model;
      },
      undefined,
      (err) => {
        console.warn(`[NPCSystem] Could not parse official asset ${path}:`, err);
      }
    );
  }

  getClosestNPC(playerPos, maxDist = 3.5) {
    let closest = null;
    let minDist = maxDist;

    for (const npc of this.npcs) {
      const dist = playerPos.distanceTo(npc.group.position);
      if (dist < minDist) {
        minDist = dist;
        closest = npc;
      }
    }

    return closest ? { npc: closest, dist: minDist } : null;
  }

  getDialogueText(npcId, missionManager) {
    const isBridgeRepaired = missionManager.isBridgeRepaired;
    const hasBridgePart = missionManager.hasBridgePart;
    const isRouteClear = missionManager.routeValidator.validate().success;
    const isMissionComplete = missionManager.missionState === 'COMPLETE';

    if (npcId === 'guide') {
      if (isMissionComplete) {
        return "Incredible work, engineer! The ambulance is safe and District 2 is now open to explore!";
      }
      if (isRouteClear) {
        return "The route is complete! Watch the ambulance navigate across the river to the hospital!";
      }
      return "Emergency! The bridge is blocked. Please repair the route so the ambulance can reach the hospital!";
    }

    if (npcId === 'engineer') {
      if (isRouteClear) {
        return "100% Structural integrity achieved! The steel truss and road spans are perfectly aligned!";
      }
      if (isBridgeRepaired) {
        return "The foundation is solid! Press [E] to enter Build Mode, place bridge pieces, rotate with [R], and click TEST.";
      }
      if (hasBridgePart) {
        return "You have the replacement truss beam! Walk to the broken foundation edge and press [E] to repair it.";
      }
      return "The bridge connection is broken! Head West to the Supply Depot to collect a replacement truss component.";
    }

    if (npcId === 'medic') {
      if (isMissionComplete) {
        return "Hooray! The ambulance arrived safely at the hospital! The eastern gate to District 2 is open!";
      }
      if (isRouteClear) {
        return "The sirens are blaring! The ambulance is arriving at the hospital emergency bay now!";
      }
      return "Please repair the route! Our hospital emergency team is waiting for the ambulance to arrive safely.";
    }

    return "Hello Creator! Keep up the great engineering!";
  }

  update(delta, playerPos, elapsedTime, missionManager) {
    this.npcs.forEach(npc => {
      // Gentle idle hover animation
      const hoverY = Math.sin(elapsedTime * 3.0 + (npc.id.length * 1.5)) * 0.06;
      npc.group.position.y = npc.initialPos.y + hoverY;

      // Base ring pulse
      if (npc.baseRing) {
        npc.baseRing.rotation.z += delta * 1.2;
      }

      // Smooth face towards player when player is nearby (< 6m)
      const dist = playerPos.distanceTo(npc.group.position);
      if (dist < 6.0) {
        const targetAngle = Math.atan2(
          playerPos.x - npc.group.position.x,
          playerPos.z - npc.group.position.z
        );
        npc.group.rotation.y = THREE.MathUtils.lerp(npc.group.rotation.y, targetAngle, 0.1);
      } else {
        npc.group.rotation.y = THREE.MathUtils.lerp(npc.group.rotation.y, npc.initialRotationY, 0.05);
      }
    });
  }
}
