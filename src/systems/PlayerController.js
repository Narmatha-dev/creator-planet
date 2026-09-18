import * as THREE from 'three';
import { sounds } from '../audio/SoundEffects.js';

export class PlayerController {
  constructor(scene, camera, domElement, village) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.village = village;

    // Movement state
    this.position = new THREE.Vector3(0, 0, 20); // Starts inside the village street with clear view of bridge
    this.velocity = new THREE.Vector3();
    this.moveSpeed = 7.5;
    this.jumpForce = 7.0;
    this.gravity = -20.0;
    this.isGrounded = true;
    this.rotationY = Math.PI; // Face towards North (towards bridge)

    // Camera orbit parameters
    this.cameraDistance = 6.8;
    this.cameraHeight = 3.2;
    this.cameraPitch = 0.28; // radians
    this.cameraYaw = 0; // Behind player facing North towards bridge
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };

    // Input flags
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false
    };

    this.isBuildMode = false;
    this.bridgeProximity = false;
    this.footstepTimer = 0;
    this.isPaused = false;

    this.createCharacterMesh();
    this.setupInputs();
  }

  setPaused(paused) {
    this.isPaused = paused;
    if (paused) {
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
      this.isDragging = false;
    }
  }

  createCharacterMesh() {
    this.mesh = new THREE.Group();

    // Body materials (Friendly stylized low-poly kid engineer)
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 }); // High-vis orange safety vest
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.5 }); // Reflective silver stripe
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }); // Glossy yellow hardhat
    const backpackMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.6 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const toolMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const shoeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Torso / Jacket
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.36), shirtMat);
    torso.position.y = 0.96;
    torso.castShadow = true;
    this.mesh.add(torso);

    // High-Vis Safety Vest
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.55, 0.38), vestMat);
    vest.position.y = 0.96;
    this.mesh.add(vest);

    // Reflective Silver Stripe on Vest
    const vestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.59, 0.1, 0.39), stripeMat);
    vestStripe.position.y = 0.95;
    this.mesh.add(vestStripe);

    // Toolbelt with buckle
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.4), beltMat);
    belt.position.y = 0.64;
    this.mesh.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.42), toolMat);
    buckle.position.y = 0.64;
    this.mesh.add(buckle);

    // Hanging wrench on side of belt
    const wrenchHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.04), toolMat);
    wrenchHandle.position.set(0.32, 0.54, 0);
    wrenchHandle.rotation.z = -0.2;
    this.mesh.add(wrenchHandle);

    // Engineer Backpack / Tool pouch
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.22), backpackMat);
    backpack.position.set(0, 0.98, -0.26);
    backpack.castShadow = true;
    this.mesh.add(backpack);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.42), skinMat);
    head.position.y = 1.58;
    head.castShadow = true;
    this.mesh.add(head);

    // Expressive Cartoon Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    [-0.11, 0.11].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.09), eyeMat);
      eye.position.set(ex, 1.58, 0.22);
      this.mesh.add(eye);
    });

    // Hardhat helmet
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.54), helmetMat);
    helmet.position.y = 1.82;
    helmet.castShadow = true;
    this.mesh.add(helmet);

    // Hardhat visor/brim
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.22), helmetMat);
    brim.position.set(0, 1.74, 0.34);
    this.mesh.add(brim);

    // Safety Goggles rested on helmet
    const goggleMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.8
    });
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.12), goggleMat);
    goggles.position.set(0, 1.86, 0.28);
    this.mesh.add(goggles);

    // Legs with sneakers
    const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.22);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0.35, 0);
    const lLeg = new THREE.Mesh(legGeo, pantsMat);
    lLeg.position.y = -0.05;
    lLeg.castShadow = true;
    this.leftLeg.add(lLeg);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), shoeWhite);
    lShoe.position.set(0, -0.3, 0.04);
    this.leftLeg.add(lShoe);
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0.35, 0);
    const rLeg = new THREE.Mesh(legGeo, pantsMat);
    rLeg.position.y = -0.05;
    rLeg.castShadow = true;
    this.rightLeg.add(rLeg);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), shoeWhite);
    rShoe.position.set(0, -0.3, 0.04);
    this.rightLeg.add(rShoe);
    this.mesh.add(this.rightLeg);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
    this.leftArm = new THREE.Mesh(armGeo, shirtMat);
    this.leftArm.position.set(-0.4, 0.92, 0);
    this.leftArm.castShadow = true;
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, shirtMat);
    this.rightArm.position.set(0.4, 0.92, 0);
    this.rightArm.castShadow = true;
    this.mesh.add(this.rightArm);

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  setupInputs() {
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      if (this.isPaused) return;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'Space':
          if (!this.isBuildMode && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            sounds.playSnap();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
      }
    });

    // Mouse camera rotation
    this.domElement.addEventListener('mousedown', (e) => {
      if (this.isBuildMode || this.isPaused) return;
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isBuildMode || this.isPaused) return;
      if (this.isDragging) {
        const deltaX = e.clientX - this.prevMouse.x;
        const deltaY = e.clientY - this.prevMouse.y;
        this.prevMouse = { x: e.clientX, y: e.clientY };

        const sensitivity = 0.005;
        this.cameraYaw -= deltaX * sensitivity;
        this.cameraPitch = Math.max(0.05, Math.min(Math.PI / 2.3, this.cameraPitch + deltaY * sensitivity));
      }
    });

    // Zoom on wheel
    this.domElement.addEventListener('wheel', (e) => {
      if (this.isPaused) return;
      this.cameraDistance = Math.max(3.5, Math.min(18.0, this.cameraDistance + e.deltaY * 0.01));
    });
  }

  update(delta) {
    if (this.isPaused || this.isBuildMode) {
      return;
    }

    // Calculate movement vector relative to camera yaw
    const inputDir = new THREE.Vector3();
    if (this.keys.forward) inputDir.z -= 1;
    if (this.keys.backward) inputDir.z += 1;
    if (this.keys.left) inputDir.x -= 1;
    if (this.keys.right) inputDir.x += 1;

    const isMoving = inputDir.lengthSq() > 0.01;

    if (isMoving) {
      inputDir.normalize();

      // Transform direction according to camera horizontal yaw
      const moveAngle = Math.atan2(inputDir.x, inputDir.z) + this.cameraYaw;
      const moveX = Math.sin(moveAngle) * this.moveSpeed;
      const moveZ = Math.cos(moveAngle) * this.moveSpeed;

      const newPos = this.position.clone();
      newPos.x += moveX * delta;
      newPos.z += moveZ * delta;

      // Check collision
      if (!this.village.checkCollision(newPos, 0.45)) {
        this.position.x = newPos.x;
        this.position.z = newPos.z;
      } else {
        // Try slide along X
        const slideX = this.position.clone();
        slideX.x += moveX * delta;
        if (!this.village.checkCollision(slideX, 0.45)) {
          this.position.x = slideX.x;
        } else {
          // Try slide along Z
          const slideZ = this.position.clone();
          slideZ.z += moveZ * delta;
          if (!this.village.checkCollision(slideZ, 0.45)) {
            this.position.z = slideZ.z;
          }
        }
      }

      // Smooth character rotation towards movement direction
      this.rotationY = moveAngle;

      // Leg / Arm walking animation
      const walkCycle = Date.now() * 0.012;
      this.leftLeg.rotation.x = Math.sin(walkCycle) * 0.65;
      this.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.65;
      this.leftArm.rotation.x = -Math.sin(walkCycle) * 0.55;
      this.rightArm.rotation.x = Math.sin(walkCycle) * 0.55;

      // Footstep sounds
      this.footstepTimer += delta;
      if (this.footstepTimer > 0.32 && this.isGrounded) {
        this.footstepTimer = 0;
        sounds.playClick();
      }
    } else {
      // Idle leg stance
      this.leftLeg.rotation.x *= 0.8;
      this.rightLeg.rotation.x *= 0.8;
      this.leftArm.rotation.x *= 0.8;
      this.rightArm.rotation.x *= 0.8;
    }

    // Gravity & Grounding
    this.velocity.y += this.gravity * delta;
    this.position.y += this.velocity.y * delta;

    let floorHeight = 0;
    // If player is on bridge corridor, check if bridge decks are present
    if (this.position.z <= 4.2 && this.position.z >= -9.2 && Math.abs(this.position.x) <= 2.4) {
      const buildSys = this.village.buildSystem;
      if (buildSys) {
        const inSouth = this.position.z >= -2.5;
        const inNorth = this.position.z < -2.5;
        const southPlaced = buildSys.slots[0].occupied;
        const northPlaced = buildSys.slots[1].occupied;
        if ((inSouth && southPlaced) || (inNorth && northPlaced)) {
          floorHeight = 0.52;
        }
      }
    }

    if (this.position.y <= floorHeight) {
      this.position.y = floorHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Sync 3D mesh
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotationY;

    // Third-Person Camera Follow (unless a cinematic camera mode is active)
    if (!this.customCameraActive) {
      this.updateCamera();
    }

    // Check distance to broken bridge site
    const distToBridge = this.position.distanceTo(new THREE.Vector3(0, 0, 5));
    this.bridgeProximity = distToBridge < 7.5;
  }

  updateCamera() {
    const target = this.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    
    // Spherical offset from target based on yaw and pitch
    const x = this.cameraDistance * Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch);
    const z = this.cameraDistance * Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch);
    const y = this.cameraDistance * Math.sin(this.cameraPitch) + this.cameraHeight;

    const desiredCamPos = target.clone().add(new THREE.Vector3(x, y, z));
    this.camera.position.lerp(desiredCamPos, 0.12);
    this.camera.lookAt(target);
  }

  setBuildMode(active) {
    this.isBuildMode = active;
  }
}
