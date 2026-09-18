import { sounds } from '../audio/SoundEffects.js';

export const MissionState = {
  NOT_STARTED: 'NOT_STARTED',
  ACTIVE: 'ACTIVE',
  COMPLETE: 'COMPLETE',
  // Backward compatibility aliases:
  EXPLORING: 'ACTIVE',
  BUILD_MODE: 'ACTIVE',
  AMBULANCE_RUN: 'ACTIVE',
  MISSION_COMPLETE: 'COMPLETE'
};

export const GameState = {
  START: 'START',
  MISSION_ACTIVE: 'MISSION_ACTIVE',
  BRIDGE_BLOCKED: 'BRIDGE_BLOCKED',
  BUILD_MODE: 'BUILD_MODE',
  ROUTE_PARTIAL: 'ROUTE_PARTIAL',
  ROUTE_CONNECTED: 'ROUTE_CONNECTED',
  AMBULANCE_MOVING: 'AMBULANCE_MOVING',
  HOSPITAL_REACHED: 'HOSPITAL_REACHED',
  MISSION_COMPLETE: 'MISSION_COMPLETE',
  NEXT_AREA_UNLOCKED: 'NEXT_AREA_UNLOCKED'
};

export class MissionManager {
  constructor(player, buildSystem, ambulance, village, routeValidator, uiManager, traffic = null) {
    this.player = player;
    this.buildSystem = buildSystem;
    this.ambulance = ambulance;
    this.village = village;
    this.routeValidator = routeValidator;
    this.uiManager = uiManager;
    this.traffic = traffic;

    // Internal execution mode for main.js camera / loop compatibility
    this.state = 'EXPLORING';
    this.missionState = MissionState.ACTIVE;
    this.gameState = GameState.START;
    this.hasFailedBefore = false;

    // Bridge Damage & Repair State
    this.foundBridge = false;
    this.hasBridgePart = false;
    this.isBridgeRepaired = false;

    this.missionStartTime = Date.now();
    this.elapsedSeconds = 0;
    this.timerInterval = null;

    // Wire build system component placed listener
    if (this.buildSystem) {
      this.buildSystem.onComponentPlaced = () => {
        this.onBridgeComponentPlaced();
      };
    }

    this.startTimer();

    // Trigger START -> MISSION_ACTIVE progression
    setTimeout(() => {
      if (this.gameState === GameState.START) {
        this.setGameState(GameState.MISSION_ACTIVE);
      }
    }, 600);
  }

  setGameState(newState) {
    this.gameState = newState;
    if (this.uiManager && this.uiManager.updateGameState) {
      this.uiManager.updateGameState(this.gameState, this.missionState);
    }
  }

  startTimer() {
    this.missionStartTime = Date.now();
    this.timerInterval = setInterval(() => {
      if (this.missionState !== MissionState.COMPLETE) {
        this.elapsedSeconds = Math.floor((Date.now() - this.missionStartTime) / 1000);
        this.uiManager.updateTimer(this.elapsedSeconds);
      }
    }, 1000);
  }

  onPlayerApproachBridge() {
    this.foundBridge = true;
    if (this.uiManager && this.uiManager.setMissionTaskCompleted) {
      this.uiManager.setMissionTaskCompleted('task-find-bridge');
    }
    if (this.gameState === GameState.START || this.gameState === GameState.MISSION_ACTIVE) {
      this.setGameState(GameState.BRIDGE_BLOCKED);
    }
  }

  onBridgeComponentPlaced() {
    if (!this.isBridgeRepaired) {
      this.isBridgeRepaired = true;
      if (this.village && this.village.repairBridgeDamage) {
        this.village.repairBridgeDamage();
      }
    }
    if (this.uiManager && this.uiManager.setMissionTaskCompleted) {
      this.uiManager.setMissionTaskCompleted('task-repair-bridge');
    }
    this.uiManager.setTaskCompleted(3);
  }

  collectBridgePart() {
    if (this.hasBridgePart) return;
    this.hasBridgePart = true;
    if (this.village && this.village.collectSupplyPart) {
      this.village.collectSupplyPart();
    }
    if (this.uiManager) {
      this.uiManager.showBanner("BRIDGE PART COLLECTED! Return to the damaged bridge.");
      if (this.uiManager.setMissionTaskCompleted) {
        this.uiManager.setMissionTaskCompleted('task-collect-part');
        this.uiManager.setMissionTaskCompleted('task-interact-bridge');
      }
    }
    sounds.playSnap();
  }

  repairBridgeStructure() {
    this.onBridgeComponentPlaced();
    if (this.uiManager) {
      this.uiManager.showBanner("BRIDGE STRUCTURE REPAIRED! Enter Build Mode [E] to connect road decks.");
    }
    sounds.playSuccess();
  }

  enterBuildMode() {
    if (this.state === 'AMBULANCE_RUN' || this.missionState === MissionState.COMPLETE) {
      return;
    }
    this.state = 'BUILD_MODE';
    this.setGameState(GameState.BUILD_MODE);
    this.player.setBuildMode(true);
    this.buildSystem.setActive(true);
    this.uiManager.setBuildModeVisible(true);
    this.uiManager.setTaskCompleted(1);
    this.uiManager.setTaskCompleted(2);
    if (this.uiManager && this.uiManager.setMissionTaskCompleted) {
      this.uiManager.setMissionTaskCompleted('task-find-bridge');
      this.uiManager.setMissionTaskCompleted('task-interact-bridge');
    }
    this.uiManager.showHint("BUILD MODE: Select ROAD or BRIDGE, rotate with [R], and place onto glowing sockets.", "info");
  }

  exitBuildMode() {
    if (this.state !== 'BUILD_MODE') return;
    this.state = 'EXPLORING';
    this.player.setBuildMode(false);
    this.buildSystem.setActive(false);
    this.uiManager.setBuildModeVisible(false);
    if (this.missionState === MissionState.ACTIVE) {
      this.setGameState(GameState.BRIDGE_BLOCKED);
    }
  }

  toggleBuildMode() {
    if (this.state === 'BUILD_MODE') {
      this.exitBuildMode();
    } else if (this.player.bridgeProximity || this.state === 'EXPLORING') {
      this.enterBuildMode();
    }
  }

  testRoute() {
    if (this.state === 'AMBULANCE_RUN' || this.missionState === MissionState.COMPLETE) {
      return;
    }

    const result = this.routeValidator.validate();
    this.uiManager.updateRouteProgress(result.percentage, result.statusText, result.routeAccessText, result.segments);

    if (result.percentage > 0) {
      this.onBridgeComponentPlaced();
    }

    if (!result.success) {
      // Failed or partial test
      this.setGameState(GameState.ROUTE_PARTIAL);
      this.uiManager.showHint(`${result.testStatus}: ${result.hint}`, 'incomplete');
    } else {
      // 100% Passed!
      this.setGameState(GameState.ROUTE_CONNECTED);
      this.uiManager.setTaskCompleted(4); // Structural test passed
      if (this.uiManager.setMissionTaskCompleted) {
        this.uiManager.setMissionTaskCompleted('task-test-route');
      }
      this.uiManager.showHint(`${result.testStatus}: ${result.routeAccessText}! ${result.statusText}`, 'success');
      setTimeout(() => {
        this.startAmbulanceRescue();
      }, 500);
    }

    return result;
  }

  startAmbulanceRescue() {
    if (this.state === 'AMBULANCE_RUN' || this.missionState === MissionState.COMPLETE) return;
    this.exitBuildMode();
    this.state = 'AMBULANCE_RUN';
    this.setGameState(GameState.AMBULANCE_MOVING);
    this.village.clearWarningBarriers();
    this.uiManager.showBanner("AMBULANCE DISPATCHED! CLEARING ROUTE...");

    this.ambulance.startEmergencyRun(() => {
      this.onAmbulanceArrived();
    });
  }

  onAmbulanceArrived() {
    this.setGameState(GameState.HOSPITAL_REACHED);
    
    setTimeout(() => {
      this.state = 'MISSION_COMPLETE';
      this.missionState = MissionState.COMPLETE;
      this.setGameState(GameState.MISSION_COMPLETE);
      this.uiManager.setTaskCompleted(5); // Guided ambulance to hospital
      if (this.uiManager.setMissionTaskCompleted) {
        this.uiManager.setMissionTaskCompleted('task-ambulance-hospital');
      }
      this.village.openDistrictGate();
      
      // Trigger celebration UI & District 2 unlock
      this.uiManager.showMissionComplete({
        integrity: '100%',
        elapsedSeconds: this.elapsedSeconds
      });

      setTimeout(() => {
        this.setGameState(GameState.NEXT_AREA_UNLOCKED);
      }, 1200);
    }, 400);
  }

  continueExploring() {
    this.state = 'EXPLORING';
    this.player.customCameraActive = false;
    this.setGameState(GameState.NEXT_AREA_UNLOCKED);
    if (this.uiManager && this.uiManager.modalMissionComplete) {
      this.uiManager.modalMissionComplete.classList.add('modal-hidden');
    }
    this.uiManager.showBanner("NEXT AREA UNLOCKED! Explore across the bridge or through the Eastern Gate.");
  }

  resetMission() {
    this.state = 'EXPLORING';
    this.missionState = MissionState.ACTIVE;
    this.gameState = GameState.START;
    this.hasFailedBefore = false;
    this.foundBridge = false;
    this.hasBridgePart = false;
    this.isBridgeRepaired = false;
    if (this.village && this.village.resetBridgeAndDepot) {
      this.village.resetBridgeAndDepot();
    }
    if (this.traffic) {
      this.traffic.reset();
    }
    this.buildSystem.clearBridge();
    this.ambulance.reset();
    this.player.position.set(0, 0, 20);
    this.player.rotationY = Math.PI;
    this.player.cameraYaw = 0;
    this.player.setBuildMode(false);
    this.buildSystem.setActive(false);
    this.uiManager.resetUI();
    this.missionStartTime = Date.now();
    this.elapsedSeconds = 0;
    this.setGameState(GameState.MISSION_ACTIVE);
  }
}
