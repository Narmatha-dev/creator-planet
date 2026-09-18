import * as THREE from 'three';
import { sounds } from '../audio/SoundEffects.js';

export class VillageTraffic {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.wheels = [];
    this.statusBubble = null;
    this.bubbleCanvas = null;
    this.bubbleTexture = null;

    // Movement state
    this.isBlocked = true;
    this.hasCrossed = false;
    this.speed = 6.2;
    this.heading = Math.PI; // Face North

    // Waypoints for civilian vehicle
    this.startPos = new THREE.Vector3(0, 0.45, 26);
    this.stopPos = new THREE.Vector3(0, 0.45, 7.2); // Stops right before bridge hazard zone
    this.currentPos = this.startPos.clone();

    this.postRepairWaypoints = [
      new THREE.Vector3(0, 0.55, 5.0),
      new THREE.Vector3(0, 0.55, 0.75),
      new THREE.Vector3(0, 0.55, -2.5),
      new THREE.Vector3(0, 0.55, -5.75),
      new THREE.Vector3(0, 0.55, -9.0),
      new THREE.Vector3(0, 0.45, -18.0),
      new THREE.Vector3(-10, 0.45, -24.0)
    ];
    this.waypointIndex = 0;

    this.createCarMesh();
    this.createStatusBubble();
  }

  createCarMesh() {
    this.mesh = new THREE.Group();

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }); // Vibrant delivery blue
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.85 });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Lower Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 3.8), bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    this.mesh.add(chassis);

    // Front Bumper
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.25, 0.25), bumperMat);
    frontBumper.position.set(0, 0.35, -1.9);
    this.mesh.add(frontBumper);

    // Cabin / Roof
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.75, 2.2), roofMat);
    cabin.position.set(0, 1.15, 0.2);
    cabin.castShadow = true;
    this.mesh.add(cabin);

    // Windshield (tilted forward)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 0.15), glassMat);
    windshield.position.set(0, 1.1, -0.85);
    windshield.rotation.x = 0.25;
    this.mesh.add(windshield);

    // Side windows
    [-0.93, 0.93].forEach(wx => {
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 1.8), glassMat);
      sideWin.position.set(wx, 1.18, 0.2);
      this.mesh.add(sideWin);
    });

    // Headlights
    [-0.7, 0.7].forEach(hx => {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
      head.position.set(hx, 0.58, -1.92);
      this.mesh.add(head);
    });

    // Taillights
    [-0.75, 0.75].forEach(tx => {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.1), redLightMat);
      tail.position.set(tx, 0.6, 1.92);
      this.mesh.add(tail);
    });

    // 4 Wheels
    const wheelCoords = [
      [-1.02, 0.32, -1.1],
      [1.02, 0.32, -1.1],
      [-1.02, 0.32, 1.1],
      [1.02, 0.32, 1.1]
    ];
    wheelCoords.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.26, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      this.mesh.add(wheel);
      this.wheels.push(wheel);
    });

    this.mesh.position.copy(this.currentPos);
    this.mesh.rotation.y = this.heading;
    this.scene.add(this.mesh);
  }

  createStatusBubble() {
    this.bubbleCanvas = document.createElement('canvas');
    this.bubbleCanvas.width = 256;
    this.bubbleCanvas.height = 100;
    this.bubbleTexture = new THREE.CanvasTexture(this.bubbleCanvas);
    this.updateBubbleVisual("⚠️ ROUTE BLOCKED", "#f59e0b", "#78350f");

    const spriteMat = new THREE.SpriteMaterial({
      map: this.bubbleTexture,
      transparent: true,
      depthTest: false
    });
    this.statusBubble = new THREE.Sprite(spriteMat);
    this.statusBubble.scale.set(3.2, 1.25, 1.0);
    this.statusBubble.position.set(0, 2.4, 0);
    this.mesh.add(this.statusBubble);
  }

  updateBubbleVisual(text, bgColor, textColor) {
    if (!this.bubbleCanvas) return;
    const ctx = this.bubbleCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 100);

    // Rounded speech bubble
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(10, 10, 236, 68, 14);
    ctx.fill();

    // Bubble pointer beak
    ctx.beginPath();
    ctx.moveTo(118, 78);
    ctx.lineTo(128, 94);
    ctx.lineTo(138, 78);
    ctx.fill();

    // Bubble border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 44);

    if (this.bubbleTexture) {
      this.bubbleTexture.needsUpdate = true;
    }
  }

  setRouteClear() {
    if (this.isBlocked) {
      this.isBlocked = false;
      this.updateBubbleVisual("✅ ROUTE CLEAR!", "#10b981", "#064e3b");
      sounds.playSuccess();
    }
  }

  update(delta, isRouteConnected) {
    if (isRouteConnected && this.isBlocked) {
      this.setRouteClear();
    }

    const time = Date.now() * 0.003;
    if (this.statusBubble) {
      // Gentle floating bob
      this.statusBubble.position.y = 2.4 + Math.sin(time) * 0.12;
    }

    if (this.isBlocked) {
      // Drive towards stop position before the damaged bridge
      const distToStop = this.currentPos.distanceTo(this.stopPos);
      if (distToStop > 0.3) {
        const dir = new THREE.Vector3().subVectors(this.stopPos, this.currentPos).normalize();
        const move = dir.multiplyScalar(Math.min(distToStop, this.speed * delta));
        this.currentPos.add(move);
        this.mesh.position.copy(this.currentPos);

        // Spin wheels
        this.wheels.forEach(w => {
          w.rotation.x -= move.length() * 3.0;
        });
      }
    } else {
      // Route is cleared: drive across bridge along post-repair waypoints!
      if (this.waypointIndex < this.postRepairWaypoints.length) {
        const target = this.postRepairWaypoints[this.waypointIndex];
        const dir = new THREE.Vector3().subVectors(target, this.currentPos);
        const dist = dir.length();
        const step = this.speed * delta;

        if (dist <= Math.max(0.6, step)) {
          this.waypointIndex++;
        } else {
          dir.normalize();
          const targetHeading = Math.atan2(-dir.x, -dir.z);
          this.heading = THREE.MathUtils.lerp(this.heading, targetHeading, 0.12);
          this.mesh.rotation.y = this.heading;

          const move = dir.multiplyScalar(Math.min(dist, step));
          this.currentPos.add(move);
          this.mesh.position.copy(this.currentPos);

          this.wheels.forEach(w => {
            w.rotation.x -= move.length() * 3.0;
          });
        }
      } else {
        this.hasCrossed = true;
      }
    }
  }

  reset() {
    this.isBlocked = true;
    this.hasCrossed = false;
    this.waypointIndex = 0;
    this.currentPos.copy(this.startPos);
    this.heading = Math.PI;
    this.mesh.position.copy(this.currentPos);
    this.mesh.rotation.y = this.heading;
    this.updateBubbleVisual("⚠️ ROUTE BLOCKED", "#f59e0b", "#78350f");
  }
}
