import * as THREE from 'three';
import { Village } from './systems/Village.js';
import { PlayerController } from './systems/PlayerController.js';
import { Ambulance } from './systems/Ambulance.js';
import { BuildSystem } from './systems/BuildSystem.js';
import { RouteValidator } from './systems/RouteValidator.js';
import { MissionManager, MissionState } from './systems/MissionManager.js';
import { VillageTraffic } from './systems/VillageTraffic.js';
import { NPCSystem } from './systems/NPCSystem.js';
import { UIManager } from './ui/UIManager.js';
import { sounds } from './audio/SoundEffects.js';

class CreatorPlanetGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.initThree();
    this.initSystems();
    this.setupInteractions();
    this.animate = this.animate.bind(this);

    // Initial render loop
    this.clock = new THREE.Clock();
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa5f3fc); // Clean friendly sky blue
    this.scene.fog = new THREE.FogExp2(0xa5f3fc, 0.012);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 38);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initSystems() {
    // Environment
    this.village = new Village(this.scene);

    // Player
    this.player = new PlayerController(this.scene, this.camera, this.canvas, this.village);

    // Ambulance
    this.ambulance = new Ambulance(this.scene);

    // Build System
    this.buildSystem = new BuildSystem(this.scene, this.camera, this.canvas, this.village);

    // Route Validator
    this.routeValidator = new RouteValidator(this.buildSystem);

    // UI Manager
    this.uiManager = new UIManager();

    // Civilian Traffic System
    this.traffic = new VillageTraffic(this.scene);

    // Funobotz NPC Characters System
    this.npcSystem = new NPCSystem(this.scene, this.village);

    // Link village buildSystem for dynamic water/bridge collision detection
    this.village.buildSystem = this.buildSystem;

    // Synchronize UI component cards with hotkey selections
    this.buildSystem.onComponentSelected = (type) => {
      this.uiManager.selectComponentCard(type);
    };

    // Mission Manager
    this.missionManager = new MissionManager(
      this.player,
      this.buildSystem,
      this.ambulance,
      this.village,
      this.routeValidator,
      this.uiManager,
      this.traffic
    );

    // Wire pause callback to player controller
    this.uiManager.onPauseChange = (paused) => {
      this.player.setPaused(paused);
    };

    this.district2Discovered = false;
    this.lastDialogueCloseTime = 0;
  }

  handleInteraction() {
    if (this.missionManager.state === 'BUILD_MODE') {
      this.missionManager.exitBuildMode();
      return;
    }

    if (Date.now() - this.lastDialogueCloseTime < 350) {
      return;
    }

    const playerPos = this.player.position;

    // 1. Check Funobotz NPC interaction first (Guide at spawn, Engineer at bridge, Medic at hospital)
    if (this.npcSystem) {
      const closestNPC = this.npcSystem.getClosestNPC(playerPos, 3.5);
      if (closestNPC) {
        const npc = closestNPC.npc;
        const text = this.npcSystem.getDialogueText(npc.id, this.missionManager);
        this.player.setPaused(true);
        this.uiManager.openDialogue({
          avatar: npc.config.avatar,
          role: npc.config.role,
          name: npc.config.name,
          text: text
        }, () => {
          this.lastDialogueCloseTime = Date.now();
          this.player.setPaused(false);
        });
        return;
      }
    }

    const depotPos = new THREE.Vector3(-12, 0, 18);
    const bridgePos = new THREE.Vector3(0, 0, 5);

    const distDepot = playerPos.distanceTo(depotPos);
    const distBridge = playerPos.distanceTo(bridgePos);

    if (distDepot < 4.5 && !this.missionManager.hasBridgePart) {
      this.missionManager.collectBridgePart();
    } else if (distBridge < 7.5) {
      if (!this.missionManager.hasBridgePart) {
        this.missionManager.onPlayerApproachBridge();
        this.uiManager.showHint("Bridge foundation is fractured! Collect a replacement part at the Supply Depot.", "incomplete");
      } else if (!this.missionManager.isBridgeRepaired) {
        this.missionManager.repairBridgeStructure();
      } else {
        this.missionManager.enterBuildMode();
      }
    }
  }

  setupInteractions() {
    // Key [E] contextual interaction
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') {
        if (this.uiManager.isDialogueOpen) {
          this.lastDialogueCloseTime = Date.now();
          this.uiManager.closeDialogue();
          return;
        }
        if (!this.uiManager.isPaused) {
          this.handleInteraction();
        }
      }
    });

    // In-world prompt click
    const promptElem = document.getElementById('interaction-prompt');
    if (promptElem) {
      promptElem.addEventListener('click', () => {
        if (!this.uiManager.isPaused) {
          this.handleInteraction();
        }
      });
    }

    // Build Dock component buttons
    this.uiManager.componentCards.forEach(card => {
      card.addEventListener('click', () => {
        const compType = card.dataset.component;
        this.uiManager.selectComponentCard(compType);
        this.buildSystem.selectComponent(compType);
      });
    });

    // Build Dock action buttons
    if (this.uiManager.btnMovePiece) {
      this.uiManager.btnMovePiece.addEventListener('click', () => {
        this.buildSystem.moveComponent();
      });
    }

    if (this.uiManager.btnRotatePiece) {
      this.uiManager.btnRotatePiece.addEventListener('click', () => {
        this.buildSystem.rotateSelected();
      });
    }

    if (this.uiManager.btnConnectPiece) {
      this.uiManager.btnConnectPiece.addEventListener('click', () => {
        this.buildSystem.confirmPlacement();
      });
    }

    if (this.uiManager.btnRemovePiece) {
      this.uiManager.btnRemovePiece.addEventListener('click', () => {
        this.buildSystem.cancelPlacement();
      });
    }

    if (this.uiManager.btnTestRoute) {
      this.uiManager.btnTestRoute.addEventListener('click', () => {
        sounds.playScan();
        this.missionManager.testRoute();
      });
    }

    if (this.uiManager.btnExitBuild) {
      this.uiManager.btnExitBuild.addEventListener('click', () => {
        this.missionManager.exitBuildMode();
      });
    }

    // Camera view presets: 'follow' -> 'overview' -> 'challenge' -> 'hospital'
    this.cameraModes = ['follow', 'overview', 'challenge', 'hospital'];
    this.cameraModeIndex = 0;
    this.cameraMode = 'follow';

    const setCameraMode = (mode) => {
      this.cameraMode = mode;
      this.player.customCameraActive = (mode !== 'follow');
      sounds.playClick();
      const labels = {
        follow: 'Third-Person View [V]',
        overview: 'Valley Drone Overview [V]',
        challenge: 'Bridge Problem Zone [V]',
        hospital: 'Hospital Complex View [V]'
      };
      this.uiManager.showBanner(`CAMERA: ${labels[mode] || mode}`);
    };

    const cycleCameraMode = () => {
      this.cameraModeIndex = (this.cameraModeIndex + 1) % this.cameraModes.length;
      setCameraMode(this.cameraModes[this.cameraModeIndex]);
    };

    this.setCameraMode = setCameraMode;

    const btnCam = document.getElementById('btn-camera-view');
    if (btnCam) {
      btnCam.addEventListener('click', cycleCameraMode);
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV') {
        cycleCameraMode();
      } else if (e.code === 'Escape') {
        if (this.missionManager.state === 'BUILD_MODE') {
          this.missionManager.exitBuildMode();
        }
      } else if (e.code === 'KeyM') {
        if (this.missionManager.state === 'BUILD_MODE') {
          this.buildSystem.moveComponent();
        }
      } else if (e.code === 'Space') {
        if (this.missionManager.state === 'BUILD_MODE') {
          this.buildSystem.confirmPlacement();
        }
      }
    });

    // Modal replay / explore buttons
    if (this.uiManager.btnExploreVillage) {
      this.uiManager.btnExploreVillage.addEventListener('click', () => {
        this.missionManager.continueExploring();
      });
    }

    if (this.uiManager.btnReplayMission) {
      this.uiManager.btnReplayMission.addEventListener('click', () => {
        if (this.traffic) this.traffic.reset();
        this.missionManager.resetMission();
      });
    }

    if (this.uiManager.btnPauseRestart) {
      this.uiManager.btnPauseRestart.addEventListener('click', () => {
        this.uiManager.closePauseModal();
        if (this.traffic) this.traffic.reset();
        this.missionManager.resetMission();
      });
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Update real-time radar minimap (always active even when paused)
    const npcPositions = this.npcSystem ? this.npcSystem.npcs.map(n => ({ pos: n.group.position })) : [];
    this.uiManager.updateMinimap(
      this.player.position,
      this.player.rotationY,
      this.missionManager.isBridgeRepaired,
      this.routeValidator.validate().success,
      npcPositions
    );

    // If game is paused or dialogue is open, render scene statically and skip delta updates
    if (this.uiManager.isPaused || this.uiManager.isDialogueOpen) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // River wave animation
    this.village.updateRiver(elapsedTime);

    // Funobotz NPC characters animation & tracking
    if (this.npcSystem) {
      this.npcSystem.update(delta, this.player.position, elapsedTime, this.missionManager);
    }

    // Civilian traffic update
    if (this.traffic) {
      const isRouteClear = this.routeValidator.validate().success;
      this.traffic.update(delta, isRouteClear);
    }

    // Player update
    this.player.update(delta);

    // Ambulance update
    this.ambulance.update(delta);

    // Build mode & Mission camera handling
    if (this.missionManager.state === 'BUILD_MODE') {
      this.buildSystem.updateBuildCamera();
    } else if (this.missionManager.state === 'AMBULANCE_RUN') {
      // Follow ambulance during emergency run
      const ambPos = this.ambulance.mesh.position;
      const targetCam = ambPos.clone().add(new THREE.Vector3(8, 7, 10));
      this.camera.position.lerp(targetCam, 0.08);
      this.camera.lookAt(ambPos.clone().add(new THREE.Vector3(0, 1.2, 0)));
    } else if (this.missionManager.state === 'MISSION_COMPLETE') {
      // Celebrate around the Hospital with smooth cinematic camera orbit
      const hospCenter = new THREE.Vector3(0, 3.5, -30);
      const orbitAngle = elapsedTime * 0.25;
      const camX = Math.sin(orbitAngle) * 20;
      const camZ = -30 + Math.cos(orbitAngle) * 20;
      this.camera.position.lerp(new THREE.Vector3(camX, 10, camZ), 0.05);
      this.camera.lookAt(hospCenter);
    } else if (this.cameraMode === 'overview') {
      this.camera.position.lerp(new THREE.Vector3(0, 38, 22), 0.08);
      this.camera.lookAt(new THREE.Vector3(0, 0, -8));
    } else if (this.cameraMode === 'challenge') {
      this.camera.position.lerp(new THREE.Vector3(4, 5.5, 13), 0.08);
      this.camera.lookAt(new THREE.Vector3(0, 1.0, -2.5));
    } else if (this.cameraMode === 'hospital') {
      this.camera.position.lerp(new THREE.Vector3(14, 8, -16), 0.08);
      this.camera.lookAt(new THREE.Vector3(0, 3.5, -32));
    }

    // Proximity prompt visibility & contextual state
    if (this.missionManager.state === 'EXPLORING') {
      const playerPos = this.player.position;
      const closestNPC = this.npcSystem ? this.npcSystem.getClosestNPC(playerPos, 3.5) : null;
      const depotPos = new THREE.Vector3(-12, 0, 18);
      const bridgePos = new THREE.Vector3(0, 0, 5);
      const distDepot = playerPos.distanceTo(depotPos);
      const distBridge = playerPos.distanceTo(bridgePos);

      if (closestNPC) {
        this.player.bridgeProximity = false;
        this.uiManager.setPromptVisible(true, closestNPC.npc.config.role, `Press [E] to Talk with ${closestNPC.npc.config.name}`);
      } else if (distDepot < 4.5 && !this.missionManager.hasBridgePart) {
        this.player.bridgeProximity = false;
        this.uiManager.setPromptVisible(true, "SUPPLY DEPOT", "Press [E] to Collect Bridge Part");
      } else if (distBridge < 7.5) {
        this.player.bridgeProximity = true;
        this.missionManager.onPlayerApproachBridge();
        this.uiManager.setTaskCompleted(1); // Reached bridge

        if (!this.missionManager.hasBridgePart) {
          this.uiManager.setPromptVisible(true, "DAMAGED BRIDGE FOUNDATION", "Collect Part at Supply Depot [W]");
        } else if (!this.missionManager.isBridgeRepaired) {
          this.uiManager.setPromptVisible(true, "REPAIR BRIDGE FOUNDATION", "Press [E] to Repair Concrete Abutment");
        } else {
          this.uiManager.setPromptVisible(true, "BROKEN BRIDGE GAP", "Press [E] to Enter Build Mode");
        }
      } else {
        this.player.bridgeProximity = false;
        this.uiManager.setPromptVisible(false);
      }
    } else {
      this.uiManager.setPromptVisible(false);
    }

    // District 2 exploration trigger
    if (this.missionManager.missionState === MissionState.COMPLETE && !this.district2Discovered) {
      if (this.player.position.x > 21 && Math.abs(this.player.position.z - 28) < 4) {
        this.district2Discovered = true;
        this.uiManager.showBanner("🎉 ENTERING DISTRICT 2: WINDMILL VALLEY!");
        sounds.playSuccess();
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new CreatorPlanetGame();
});
