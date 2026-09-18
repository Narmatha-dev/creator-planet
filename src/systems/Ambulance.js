import * as THREE from 'three';
import { sounds } from '../audio/SoundEffects.js';

export class Ambulance {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.wheels = [];
    this.isDriving = false;
    this.isMissionComplete = false;

    // Starting location at village emergency depot (South Road)
    this.startPos = new THREE.Vector3(0, 0.45, 32);
    this.currentPos = this.startPos.clone();

    // Calibrated waypoints for bridge clearance & hospital entry
    this.waypoints = [
      new THREE.Vector3(0, 0.45, 32),
      new THREE.Vector3(0, 0.45, 18),
      new THREE.Vector3(0, 0.55, 5),    // Entering south bridgehead
      new THREE.Vector3(0, 0.55, 0.75), // South bridge span
      new THREE.Vector3(0, 0.55, -2.5), // Center pier
      new THREE.Vector3(0, 0.55, -5.75),// North bridge span
      new THREE.Vector3(0, 0.55, -9),   // Leaving north bridgehead
      new THREE.Vector3(0, 0.45, -20),  // North hospital approach
      new THREE.Vector3(0, 0.45, -28.5) // Hospital emergency room bay
    ];

    this.currentWaypointIndex = 0;
    this.speed = 10.5; // units per second
    this.heading = Math.PI; // Face north

    this.createAmbulanceMesh();
  }

  createAmbulanceMesh() {
    this.mesh = new THREE.Group();

    // Premium Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const redStripeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      roughness: 0.1
    });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });

    // Lower Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 4.8), bodyMat);
    chassis.position.y = 0.75;
    chassis.castShadow = true;
    this.mesh.add(chassis);

    // Front Bumper with chrome radiator grille
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.35, 0.3), bumperMat);
    frontBumper.position.set(0, 0.5, -2.4);
    this.mesh.add(frontBumper);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.05), chromeMat);
    grille.position.set(0, 0.72, -2.42);
    this.mesh.add(grille);

    // Emergency Red Side Racing Stripes
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 4.4), redStripeMat);
    stripeL.position.set(-1.21, 0.75, 0);
    this.mesh.add(stripeL);

    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 4.4), redStripeMat);
    stripeR.position.set(1.21, 0.75, 0);
    this.mesh.add(stripeR);

    // Aerodynamic Windshield & Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.95, 2.0), glassMat);
    cabin.position.set(0, 1.45, -0.7);
    this.mesh.add(cabin);

    // Side Mirrors
    [-1.3, 1.3].forEach(mx => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.15), bumperMat);
      mirror.position.set(mx, 1.3, -1.2);
      this.mesh.add(mirror);
    });

    // Rear Medical Equipment Box
    const medBox = new THREE.Mesh(new THREE.BoxGeometry(2.38, 1.25, 2.7), bodyMat);
    medBox.position.set(0, 1.45, 0.95);
    medBox.castShadow = true;
    this.mesh.add(medBox);

    // 3D Red Cross Emblems on both sides of medical box
    [-1.21, 1.21].forEach(cx => {
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.22), redStripeMat);
      crossV.position.set(cx, 1.5, 0.95);
      this.mesh.add(crossV);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.75), redStripeMat);
      crossH.position.set(cx, 1.5, 0.95);
      this.mesh.add(crossH);
    });

    // Rear Doors outline & Red Cross
    const rearCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.05), redStripeMat);
    rearCrossV.position.set(0, 1.45, 2.31);
    this.mesh.add(rearCrossV);

    const rearCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.05), redStripeMat);
    rearCrossH.position.set(0, 1.45, 2.31);
    this.mesh.add(rearCrossH);

    // Roof Emergency Lightbar Assembly
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.35), bumperMat);
    barBase.position.set(0, 2.18, -0.3);
    this.mesh.add(barBase);

    // Red Emergency Beacon
    this.beaconRedMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.8,
      roughness: 0.1
    });
    const beaconRed = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.24, 16), this.beaconRedMat);
    beaconRed.position.set(-0.52, 2.32, -0.3);
    this.mesh.add(beaconRed);

    // Blue Emergency Beacon
    this.beaconBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      emissive: 0x0066ff,
      emissiveIntensity: 0.8,
      roughness: 0.1
    });
    const beaconBlue = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.24, 16), this.beaconBlueMat);
    beaconBlue.position.set(0.52, 2.32, -0.3);
    this.mesh.add(beaconBlue);

    // Dynamic flashing pointlight
    this.beaconLight = new THREE.PointLight(0x38bdf8, 0, 16);
    this.beaconLight.position.set(0, 2.6, -0.3);
    this.mesh.add(this.beaconLight);

    // Headlights (Warm high-beam glow)
    [-0.8, 0.8].forEach(hx => {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.12), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      head.position.set(hx, 0.75, -2.42);
      this.mesh.add(head);
    });

    // Tail lights
    [-0.9, 0.9].forEach(tx => {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tail.position.set(tx, 0.8, 2.32);
      this.mesh.add(tail);
    });

    // 4 Wheels with Chrome Hubcaps
    const wheelPositions = [
      [-1.18, 0.38, -1.35],
      [1.18, 0.38, -1.35],
      [-1.18, 0.38, 1.35],
      [1.18, 0.38, 1.35]
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, y, z);

      // Rubber Tire
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16), wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Chrome Rim & Hubcap
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 12), chromeMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      this.mesh.add(wheelGroup);
      this.wheels.push(wheelGroup);
    });

    this.mesh.position.copy(this.currentPos);
    this.mesh.rotation.y = this.heading;
    this.scene.add(this.mesh);
  }

  startEmergencyRun(onComplete) {
    this.isDriving = true;
    this.currentWaypointIndex = 1;
    this.onCompleteCallback = onComplete;
    sounds.startSiren();
  }

  update(delta) {
    // Rotating / Flashing siren beacons
    const flash = Math.sin(Date.now() * 0.018);
    if (this.isDriving) {
      if (flash > 0) {
        this.beaconRedMat.emissiveIntensity = 2.5;
        this.beaconBlueMat.emissiveIntensity = 0.2;
        this.beaconLight.color.setHex(0xef4444);
        this.beaconLight.intensity = 3.0;
      } else {
        this.beaconRedMat.emissiveIntensity = 0.2;
        this.beaconBlueMat.emissiveIntensity = 2.5;
        this.beaconLight.color.setHex(0x38bdf8);
        this.beaconLight.intensity = 3.0;
      }
    } else {
      this.beaconRedMat.emissiveIntensity = 0.4;
      this.beaconBlueMat.emissiveIntensity = 0.4;
      this.beaconLight.intensity = 0;
    }

    if (!this.isDriving) return;

    // Follow waypoint path smoothly
    if (this.currentWaypointIndex < this.waypoints.length) {
      const targetWaypoint = this.waypoints[this.currentWaypointIndex];
      const dir = new THREE.Vector3().subVectors(targetWaypoint, this.currentPos);
      const distance = dir.length();

      const stepDist = this.speed * delta;
      if (distance <= Math.max(0.65, stepDist)) {
        this.currentWaypointIndex++;
        if (this.currentWaypointIndex >= this.waypoints.length) {
          // Reached Hospital Emergency Room!
          this.currentPos.copy(targetWaypoint);
          this.mesh.position.copy(this.currentPos);
          this.isDriving = false;
          this.isMissionComplete = true;
          sounds.stopSiren();
          sounds.playSuccess();
          if (this.onCompleteCallback) {
            this.onCompleteCallback();
          }
          return;
        }
      } else {
        dir.normalize();

        // Smooth vehicle steering
        const targetHeading = Math.atan2(-dir.x, -dir.z);
        this.heading = THREE.MathUtils.lerp(this.heading, targetHeading, 0.15);
        this.mesh.rotation.y = this.heading;

        // Move position cleanly clamped to waypoint distance
        const moveStep = dir.multiplyScalar(Math.min(distance, stepDist));
        this.currentPos.add(moveStep);
        this.mesh.position.copy(this.currentPos);

        // Spin wheels
        this.wheels.forEach(w => {
          w.rotation.x -= stepDist * 2.5;
        });
      }
    }
  }

  reset() {
    this.isDriving = false;
    this.isMissionComplete = false;
    sounds.stopSiren();
    this.currentWaypointIndex = 0;
    this.currentPos.copy(this.startPos);
    this.heading = Math.PI;
    this.mesh.position.copy(this.currentPos);
    this.mesh.rotation.y = this.heading;
  }
}
