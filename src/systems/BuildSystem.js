import * as THREE from 'three';
import { sounds } from '../audio/SoundEffects.js';

export class BuildSystem {
  constructor(scene, camera, domElement, village) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.village = village;

    this.isActive = false;
    this.selectedComponentType = 'deck-straight';
    this.currentRotation = 0; // in radians: 0, Math.PI/2, Math.PI, 3*Math.PI/2

    // Sockets and Slots:
    // Slot 1: South span (between z=4 and z=-2.5), center = (0, 0.4, 0.75)
    // Slot 2: North span (between z=-2.5 and z=-9), center = (0, 0.4, -5.75)
    this.slots = [
      {
        id: 'slot-south',
        center: new THREE.Vector3(0, 0.4, 0.75),
        occupied: null,
        length: 6.5,
        width: 4.8
      },
      {
        id: 'slot-north',
        center: new THREE.Vector3(0, 0.4, -5.75),
        occupied: null,
        length: 6.5,
        width: 4.8
      }
    ];

    // Placed components list: { mesh, type, rotation, slotIndex }
    this.placedComponents = [];

    // Raycasting & Ghost preview
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.ghostMesh = null;
    this.hoveredSlot = null;

    // Tactical Build Camera Target
    this.buildCameraPos = new THREE.Vector3(12, 14, -2.5);
    this.buildCameraLookAt = new THREE.Vector3(0, 0, -2.5);

    this.initGhost();
    this.setupEvents();
  }

  initGhost() {
    this.ghostGroup = new THREE.Group();
    this.createGhostMesh();
    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);

    // Invisible ground plane for raycasting in build mode (must have transparent=true and visible=true for Three.js raycasting)
    const planeGeo = new THREE.PlaneGeometry(80, 60);
    const planeMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.raycastPlane = new THREE.Mesh(planeGeo, planeMat);
    this.raycastPlane.rotation.x = -Math.PI / 2;
    this.raycastPlane.position.set(0, 0.4, -2.5);
    this.scene.add(this.raycastPlane);
  }

  createGhostMesh() {
    // Clear previous ghost
    while (this.ghostGroup.children.length > 0) {
      this.ghostGroup.remove(this.ghostGroup.children[0]);
    }

    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      roughness: 0.3
    });

    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2
    });

    // Holographic body
    const bodyGeo = new THREE.BoxGeometry(4.8, 0.45, 6.5);
    const body = new THREE.Mesh(bodyGeo, ghostMat);
    body.position.y = 0.225;
    this.ghostGroup.add(body);

    // Clean outer outline edges
    const bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), edgeMat);
    bodyEdges.position.y = 0.225;
    this.ghostGroup.add(bodyEdges);

    // Railing ghosts
    const railGeo = new THREE.BoxGeometry(0.25, 0.7, 6.5);
    const railL = new THREE.Mesh(railGeo, ghostMat);
    railL.position.set(-2.25, 0.6, 0);
    this.ghostGroup.add(railL);

    const railEdgesL = new THREE.LineSegments(new THREE.EdgesGeometry(railGeo), edgeMat);
    railEdgesL.position.set(-2.25, 0.6, 0);
    this.ghostGroup.add(railEdgesL);

    const railR = new THREE.Mesh(railGeo, ghostMat);
    railR.position.set(2.25, 0.6, 0);
    this.ghostGroup.add(railR);

    const railEdgesR = new THREE.LineSegments(new THREE.EdgesGeometry(railGeo), edgeMat);
    railEdgesR.position.set(2.25, 0.6, 0);
    this.ghostGroup.add(railEdgesR);
  }

  setupEvents() {
    // Mouse movement inside build mode
    this.domElement.addEventListener('mousemove', (e) => {
      if (!this.isActive) return;

      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.updateGhostPosition();
    });

    // Left click to place
    this.domElement.addEventListener('click', (e) => {
      if (!this.isActive) return;
      // If clicked on an interactive UI element, ignore
      if (e.target.closest('#build-dock') || e.target.closest('header') || e.target.closest('.modal-backdrop') || e.target.closest('#feedback-toast')) {
        return;
      }
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.updateGhostPosition();
      this.placeSelectedComponent();
    });

    // Keyboard shortcuts in build mode
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      if (e.code === 'KeyR') {
        this.rotateSelected();
      } else if (e.code === 'KeyX' || e.code === 'Delete') {
        this.clearBridge();
      } else if (e.code === 'Digit1') {
        this.selectComponent('deck-straight');
      } else if (e.code === 'Digit2') {
        this.selectComponent('deck-truss');
      } else if (e.code === 'Digit3') {
        this.selectComponent('deck-arch');
      }
    });
  }

  setActive(active) {
    this.isActive = active;
    if (active) {
      this.ghostGroup.visible = true;
      sounds.playSnap();
    } else {
      this.ghostGroup.visible = false;
    }
  }

  selectComponent(type) {
    this.selectedComponentType = type;
    if (this.onComponentSelected) {
      this.onComponentSelected(type);
    }
    sounds.playClick();
  }

  rotateSelected() {
    this.currentRotation = (this.currentRotation + Math.PI / 2) % (Math.PI * 2);
    if (this.ghostGroup) {
      this.ghostGroup.rotation.y = this.currentRotation;
    }

    // If hovering over an occupied slot, also rotate that piece directly and update visuals!
    if (this.hoveredSlot && this.hoveredSlot.occupied) {
      this.hoveredSlot.occupied.rotation = this.currentRotation;
      this.hoveredSlot.occupied.mesh.rotation.y = this.currentRotation;
      this.updateSocketVisuals();
    } else if (this.placedComponents.length > 0) {
      // Rotate the last placed component if no slot is actively hovered
      const lastComp = this.placedComponents[this.placedComponents.length - 1];
      lastComp.rotation = this.currentRotation;
      lastComp.mesh.rotation.y = this.currentRotation;
      this.updateSocketVisuals();
    }

    sounds.playRotate();
  }

  updateGhostPosition() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.raycastPlane);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;

      // Find closest slot
      let closestSlot = null;
      let minDistance = Infinity;

      for (let slot of this.slots) {
        const dist = hitPoint.distanceTo(slot.center);
        if (dist < minDistance) {
          minDistance = dist;
          closestSlot = slot;
        }
      }

      // Magnetic snap radius: within 6 units of slot center
      if (closestSlot && minDistance < 6.0) {
        this.hoveredSlot = closestSlot;
        this.ghostGroup.position.copy(closestSlot.center);
        this.ghostGroup.visible = true;

        // Visual indicator: Green wireframe if slot empty, Amber if occupied
        this.setGhostColor(closestSlot.occupied ? 0xf59e0b : 0x10b981);
      } else {
        this.hoveredSlot = null;
        this.ghostGroup.position.set(hitPoint.x, 0.4, hitPoint.z);
        this.setGhostColor(0x38bdf8);
      }
    }
  }

  setGhostColor(hex) {
    this.ghostGroup.traverse((child) => {
      if ((child.isMesh || child.isLineSegments) && child.material) {
        child.material.color.setHex(hex);
      }
    });
  }

  confirmPlacement() {
    this.placeSelectedComponent();
  }

  moveComponent() {
    // Pick up component from hovered slot or last placed slot to reposition it
    if (this.hoveredSlot && this.hoveredSlot.occupied) {
      const comp = this.hoveredSlot.occupied;
      this.selectedComponentType = comp.type;
      this.currentRotation = comp.rotation;
      if (this.ghostGroup) this.ghostGroup.rotation.y = this.currentRotation;
      this.removeComponent(comp);
      sounds.playClick();
      return true;
    } else if (this.placedComponents.length > 0) {
      const comp = this.placedComponents[this.placedComponents.length - 1];
      this.selectedComponentType = comp.type;
      this.currentRotation = comp.rotation;
      if (this.ghostGroup) this.ghostGroup.rotation.y = this.currentRotation;
      this.removeComponent(comp);
      sounds.playClick();
      return true;
    }
    return false;
  }

  cancelPlacement() {
    if (this.hoveredSlot && this.hoveredSlot.occupied) {
      this.removeComponent(this.hoveredSlot.occupied);
      sounds.playRotate();
    } else if (this.placedComponents.length > 0) {
      this.removeComponent(this.placedComponents[this.placedComponents.length - 1]);
      sounds.playRotate();
    }
  }

  placeSelectedComponent(targetSlot = null) {
    if (targetSlot) {
      this.hoveredSlot = targetSlot;
    }

    if (!this.hoveredSlot) {
      // Find first empty slot or fallback to slot 0
      const emptySlot = this.slots.find(s => !s.occupied);
      this.hoveredSlot = emptySlot || this.slots[0];
    } else if (this.hoveredSlot.occupied && !targetSlot) {
      // If currently hovered slot is already occupied, check if there's an unoccupied slot to fill
      const emptySlot = this.slots.find(s => !s.occupied);
      if (emptySlot) {
        this.hoveredSlot = emptySlot;
      }
    }

    if (!this.hoveredSlot) {
      sounds.playIncomplete();
      return;
    }

    // If slot is occupied, remove existing mesh from slot first
    if (this.hoveredSlot.occupied) {
      this.removeComponent(this.hoveredSlot.occupied);
    }

    // Normalize type identifier
    let normType = this.selectedComponentType;
    if (normType === 'road') normType = 'deck-straight';
    if (normType === 'bridge') normType = 'deck-truss';
    if (normType === 'arch') normType = 'deck-arch';

    // Build real 3D mesh based on selected type
    const bridgeMesh = this.buildBridgeMesh(normType);
    bridgeMesh.position.copy(this.hoveredSlot.center);
    bridgeMesh.rotation.y = this.currentRotation;

    this.scene.add(bridgeMesh);

    const compRecord = {
      mesh: bridgeMesh,
      type: normType,
      rotation: this.currentRotation,
      slot: this.hoveredSlot
    };

    this.hoveredSlot.occupied = compRecord;
    this.placedComponents.push(compRecord);

    sounds.playSnap();
    this.updateSocketVisuals();
    if (this.onComponentPlaced) {
      this.onComponentPlaced(compRecord);
    }
  }

  buildBridgeMesh(type) {
    const group = new THREE.Group();
    const isStraight = (type === 'deck-straight' || type === 'road');
    const isTruss = (type === 'deck-truss' || type === 'bridge');
    const isArch = (type === 'deck-arch' || type === 'arch');

    // Materials
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.65 });
    const yellowStripe = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const whiteStripe = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const reflectorMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const orangeSteel = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.7, roughness: 0.3 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });

    // Road Deck Slab (Length 6.5, Width 4.8)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 6.5), deckMat);
    deck.position.y = 0.175;
    deck.receiveShadow = true;
    deck.castShadow = true;
    group.add(deck);

    // Dark Asphalt Overlay
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 6.5), roadMat);
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.y = 0.355;
    asphalt.receiveShadow = true;
    group.add(asphalt);

    // Center Dashed Yellow Line
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 5.8), yellowStripe);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.y = 0.36;
    group.add(stripe);

    // White Edge Lines
    [-2.1, 2.1].forEach(wx => {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 6.5), whiteStripe);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(wx, 0.36, 0);
      group.add(edge);
    });

    if (isStraight) {
      // Concrete safety curbs & guardrails with safety reflectors
      [-2.25, 2.25].forEach(rx => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.75, 6.5), deckMat);
        rail.position.set(rx, 0.65, 0);
        rail.castShadow = true;
        group.add(rail);

        // Amber hazard reflectors along railing
        for (let rz = -2.6; rz <= 2.6; rz += 1.3) {
          const refl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.2), reflectorMat);
          refl.position.set(rx + (rx > 0 ? -0.14 : 0.14), 0.7, rz);
          group.add(refl);
        }
      });
    } else if (isTruss) {
      // High-strength lattice steel truss girders
      [-2.3, 2.3].forEach(x => {
        const trussGroup = new THREE.Group();
        trussGroup.position.set(x, 0, 0);

        // Top horizontal steel beam
        const topChord = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 6.5), orangeSteel);
        topChord.position.y = 2.6;
        topChord.castShadow = true;
        trussGroup.add(topChord);

        // Bottom horizontal tie
        const botChord = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 6.5), orangeSteel);
        botChord.position.y = 0.45;
        trussGroup.add(botChord);

        // Triangular Warren truss struts
        for (let i = -2.5; i <= 2.5; i += 1.25) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), orangeSteel);
          post.position.set(0, 1.5, i);
          post.castShadow = true;
          trussGroup.add(post);

          if (i < 2.5) {
            const diag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), orangeSteel);
            diag.position.set(0, 1.5, i + 0.625);
            diag.rotation.x = Math.PI / 4.5 * ((i / 1.25) % 2 === 0 ? 1 : -1);
            diag.castShadow = true;
            trussGroup.add(diag);
          }
        }

        group.add(trussGroup);
      });

      // Overhead portal cross-braces linking the two trusses
      [-2.5, 0, 2.5].forEach(pz => {
        const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 0.18), orangeSteel);
        crossBeam.position.set(0, 2.6, pz);
        group.add(crossBeam);
      });
    } else if (isArch) {
      // Classical stone arch span underneath
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 4.6, 20, 1, false, 0, Math.PI), stoneMat);
      arch.rotation.z = Math.PI / 2;
      arch.rotation.y = Math.PI / 2;
      arch.position.y = -0.55;
      arch.castShadow = true;
      group.add(arch);

      // Keystone detail in center
      const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 4.7), stoneMat);
      keystone.position.set(0, 0.4, 0);
      group.add(keystone);

      // Classical balustrade railings
      [-2.25, 2.25].forEach(rx => {
        const balustrade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 6.5), stoneMat);
        balustrade.position.set(rx, 0.7, 0);
        balustrade.castShadow = true;
        group.add(balustrade);

        // Baluster pillars
        for (let bz = -2.8; bz <= 2.8; bz += 0.7) {
          const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.15, 0.36), stoneMat);
          cap.position.set(rx, 1.15, bz);
          group.add(cap);
        }
      });
    }

    return group;
  }

  removeComponent(comp) {
    this.scene.remove(comp.mesh);
    if (comp.slot) {
      comp.slot.occupied = null;
    }
    const idx = this.placedComponents.indexOf(comp);
    if (idx !== -1) {
      this.placedComponents.splice(idx, 1);
    }
    this.updateSocketVisuals();
  }

  clearBridge() {
    while (this.placedComponents.length > 0) {
      this.removeComponent(this.placedComponents[0]);
    }
    sounds.playRotate();
  }

  updateSocketVisuals() {
    // Sockets glow green if occupied and aligned, yellow if empty, red if rotated sideways
    const southSlot = this.slots[0];
    const northSlot = this.slots[1];

    const getSocketColor = (slot) => {
      if (!slot.occupied) return 0xfbbf24; // Yellow / unlinked
      const isAligned = Math.abs(slot.occupied.rotation % Math.PI) < 0.05;
      return isAligned ? 0x10b981 : 0xef4444; // Green if aligned, Red if rotated sideways
    };

    this.setSocketColor('southSocket', getSocketColor(southSlot));
    this.setSocketColor('midSocket', (southSlot.occupied && northSlot.occupied) ? 0x10b981 : 0xfbbf24);
    this.setSocketColor('northSocket', getSocketColor(northSlot));
  }

  setSocketColor(socketName, hex) {
    const socketGroup = this.scene.getObjectByName(socketName);
    if (socketGroup) {
      socketGroup.traverse(child => {
        if (child.isMesh && child.material) {
          if (child.material.emissive) {
            child.material.emissive.setHex(hex);
          }
          child.material.color.setHex(hex);
        }
      });
    }
  }

  updateBuildCamera() {
    if (!this.isActive) return;
    this.camera.position.lerp(this.buildCameraPos, 0.08);
    this.camera.lookAt(this.buildCameraLookAt);
  }
}
