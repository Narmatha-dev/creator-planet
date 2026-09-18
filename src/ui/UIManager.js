import confetti from 'canvas-confetti';
import { sounds } from '../audio/SoundEffects.js';

export class UIManager {
  constructor() {
    // Top bar & HUD elements
    this.routePercentDisplay = document.getElementById('route-percent-display');
    this.routeAccessLabel = document.getElementById('route-access-label');
    this.routeProgressFill = document.getElementById('route-progress-fill');
    this.routeStatusTag = document.getElementById('route-status-tag');
    this.missionTimer = document.getElementById('mission-timer');
    this.badgeMissionState = document.getElementById('badge-mission-state');
    this.badgeGameState = document.getElementById('badge-game-state');
    this.nodeBridge = document.getElementById('node-bridge');

    // Controls
    this.btnAudioToggle = document.getElementById('btn-audio-toggle');
    this.audioIcon = document.getElementById('audio-icon');
    this.btnHelpModal = document.getElementById('btn-help-modal');
    this.btnPauseMenu = document.getElementById('btn-pause-menu');

    // In-world & Feedback
    this.interactionPrompt = document.getElementById('interaction-prompt');
    this.feedbackToast = document.getElementById('feedback-toast');
    this.toastMsg = document.getElementById('toast-msg');
    this.toastIcon = document.getElementById('toast-icon');
    this.toastCloseBtn = document.getElementById('toast-close-btn');

    // Build Dock
    this.buildDock = document.getElementById('build-dock');
    this.componentCards = document.querySelectorAll('.component-card');
    this.btnMovePiece = document.getElementById('btn-move-piece');
    this.btnRotatePiece = document.getElementById('btn-rotate-piece');
    this.btnConnectPiece = document.getElementById('btn-connect-piece');
    this.btnRemovePiece = document.getElementById('btn-remove-piece');
    this.btnTestRoute = document.getElementById('btn-test-route');
    this.btnExitBuild = document.getElementById('btn-exit-build');

    // Modals
    this.modalMissionComplete = document.getElementById('modal-mission-complete');
    this.modalHelp = document.getElementById('modal-help');
    this.modalPause = document.getElementById('modal-pause');
    this.btnCloseHelp = document.getElementById('btn-close-help');
    this.btnResumeGame = document.getElementById('btn-resume-game');
    this.btnPauseHowToPlay = document.getElementById('btn-pause-howtoplay');
    this.btnPauseRestart = document.getElementById('btn-pause-restart');
    this.btnExploreVillage = document.getElementById('btn-explore-village');
    this.btnReplayMission = document.getElementById('btn-replay-mission');

    // Stats
    this.statIntegrity = document.getElementById('stat-integrity');
    this.statTime = document.getElementById('stat-time');

    // Minimap
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // Mission Tasks Checklist
    this.tasksProgressBadge = document.getElementById('tasks-progress-badge');
    this.tasksProgressFill = document.getElementById('tasks-progress-fill');
    this.completedTasks = new Set();

    // Pause state
    this.isPaused = false;
    this.onPauseChange = null;

    // Dialogue Modal
    this.modalDialogue = document.getElementById('modal-dialogue');
    this.dialogueAvatar = document.getElementById('dialogue-avatar');
    this.dialogueSpeakerRole = document.getElementById('dialogue-speaker-role');
    this.dialogueSpeakerName = document.getElementById('dialogue-speaker-name');
    this.dialogueText = document.getElementById('dialogue-text');
    this.btnCloseDialogue = document.getElementById('btn-close-dialogue');
    this.isDialogueOpen = false;
    this.onDialogueClose = null;

    this.toastTimeout = null;
    this.setupListeners();
  }

  setupListeners() {
    // Audio toggle
    if (this.btnAudioToggle) {
      this.btnAudioToggle.addEventListener('click', () => {
        const isMuted = sounds.toggleMute();
        this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    // Help modal (click to show/hide)
    if (this.btnHelpModal) {
      this.btnHelpModal.addEventListener('click', () => {
        if (this.modalHelp && !this.modalHelp.classList.contains('modal-hidden')) {
          this.closeHelpModal();
        } else {
          this.openHelpModal();
        }
      });
    }

    if (this.btnCloseHelp) {
      this.btnCloseHelp.addEventListener('click', () => {
        this.closeHelpModal();
      });
    }

    // Pause menu modal
    if (this.btnPauseMenu) {
      this.btnPauseMenu.addEventListener('click', () => {
        this.togglePauseModal();
      });
    }

    if (this.btnResumeGame) {
      this.btnResumeGame.addEventListener('click', () => {
        this.closePauseModal();
      });
    }

    if (this.btnPauseHowToPlay) {
      this.btnPauseHowToPlay.addEventListener('click', () => {
        this.closePauseModal();
        this.openHelpModal();
      });
    }

    // Feedback toast close
    if (this.toastCloseBtn) {
      this.toastCloseBtn.addEventListener('click', () => {
        this.hideHint();
      });
    }

    // Dialogue modal continue button
    if (this.btnCloseDialogue) {
      this.btnCloseDialogue.addEventListener('click', () => {
        this.closeDialogue();
      });
    }

    // Modal background dismiss
    [this.modalHelp, this.modalPause, this.modalDialogue].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            if (modal === this.modalDialogue) {
              this.closeDialogue();
            } else {
              modal.classList.add('modal-hidden');
            }
          }
        });
      }
    });

    // Keydown for ESC, H, M, and Dialogue advances
    window.addEventListener('keydown', (e) => {
      if (this.isDialogueOpen) {
        if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
          this.closeDialogue();
          e.preventDefault();
          return;
        }
      }

      if (e.code === 'KeyH') {
        if (this.modalHelp.classList.contains('modal-hidden')) {
          this.openHelpModal();
        } else {
          this.closeHelpModal();
        }
      } else if (e.code === 'Escape') {
        // If help modal open, close it
        if (!this.modalHelp.classList.contains('modal-hidden')) {
          this.closeHelpModal();
        }
        // If build mode active, exit button handles it in main.js
        else if (!this.buildDock.classList.contains('dock-hidden')) {
          // let main.js handle build exit
        }
        // Otherwise toggle pause menu
        else {
          this.togglePauseModal();
        }
      } else if (e.code === 'KeyM') {
        const isMuted = sounds.toggleMute();
        this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
      }
    });
  }

  openDialogue({ avatar, role, name, text }, onClose = null) {
    if (!this.modalDialogue) return;
    this.isDialogueOpen = true;
    this.onDialogueClose = onClose;

    if (this.dialogueAvatar && avatar) this.dialogueAvatar.textContent = avatar;
    if (this.dialogueSpeakerRole && role) this.dialogueSpeakerRole.textContent = role;
    if (this.dialogueSpeakerName && name) this.dialogueSpeakerName.textContent = name;
    if (this.dialogueText && text) this.dialogueText.textContent = text;

    this.modalDialogue.classList.remove('modal-hidden');
    sounds.playClick();
  }

  closeDialogue() {
    if (!this.modalDialogue || !this.isDialogueOpen) return;
    this.isDialogueOpen = false;
    this.modalDialogue.classList.add('modal-hidden');
    sounds.playClick();

    if (this.onDialogueClose) {
      const cb = this.onDialogueClose;
      this.onDialogueClose = null;
      cb();
    }
  }

  updateGameState(gameState, missionState) {
    if (this.badgeGameState) {
      this.badgeGameState.textContent = `STATE: ${gameState}`;
    }
    if (this.badgeMissionState) {
      this.badgeMissionState.textContent = `MISSION: ${missionState}`;
      if (missionState === 'COMPLETE') {
        this.badgeMissionState.className = 'state-pill mission-complete';
      } else {
        this.badgeMissionState.className = 'state-pill mission-active';
      }
    }
  }

  openPauseModal() {
    this.isPaused = true;
    if (this.modalPause) {
      this.modalPause.classList.remove('modal-hidden');
      sounds.playClick();
    }
    if (this.onPauseChange) {
      this.onPauseChange(true);
    }
  }

  closePauseModal() {
    this.isPaused = false;
    if (this.modalPause) {
      this.modalPause.classList.add('modal-hidden');
      sounds.playClick();
    }
    if (this.onPauseChange) {
      this.onPauseChange(false);
    }
  }

  togglePauseModal() {
    if (this.modalPause) {
      if (this.modalPause.classList.contains('modal-hidden')) {
        this.openPauseModal();
      } else {
        this.closePauseModal();
      }
    }
  }

  setMissionTaskCompleted(taskId) {
    this.completedTasks.add(taskId);
    const item = document.getElementById(taskId);
    if (item) {
      item.classList.add('completed', 'task-done');
      const chk = item.querySelector('.task-check');
      if (chk) chk.textContent = '[X]';
    }
    if (taskId === 'task-collect-part' || taskId === 'task-interact-bridge') {
      const alias1 = document.getElementById('task-interact-bridge');
      const alias2 = document.getElementById('task-collect-part');
      if (alias1) {
        alias1.classList.add('completed', 'task-done');
        const chk1 = alias1.querySelector('.task-check');
        if (chk1) chk1.textContent = '[X]';
      }
      if (alias2) {
        alias2.classList.add('completed', 'task-done');
        const chk2 = alias2.querySelector('.task-check');
        if (chk2) chk2.textContent = '[X]';
      }
    }
    const totalTasks = 5;
    const pct = Math.min(100, Math.round((this.completedTasks.size / totalTasks) * 100));
    if (this.tasksProgressBadge) this.tasksProgressBadge.textContent = `${pct}%`;
    if (this.tasksProgressFill) this.tasksProgressFill.style.width = `${pct}%`;
  }

  updateMinimap(playerPos, playerYaw, isBridgeRepaired, isRoute100, npcs = []) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    // Coordinate mapping:
    // Game world: X from -32 to +32 -> canvas 0 to w
    // Game world: Z from -42 to +42 -> canvas 0 to h
    const mapX = (gx) => ((gx + 32) / 64) * w;
    const mapZ = (gz) => ((gz + 42) / 84) * h;

    // Background grass
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, w, h);

    // River band between Z = -9 and Z = 4
    const riverTop = mapZ(-9);
    const riverBottom = mapZ(4);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, riverTop, w, riverBottom - riverTop);

    // Shorelines
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, riverTop - 1, w, 2);
    ctx.fillRect(0, riverBottom - 1, w, 2);

    // Roads
    ctx.fillStyle = '#1e293b';
    // Main South road (X: -2.6 to +2.6, Z: 4 to 42)
    ctx.fillRect(mapX(-2.6), mapZ(4), mapX(2.6) - mapX(-2.6), mapZ(42) - mapZ(4));
    // Main North road (X: -2.6 to +2.6, Z: -36 to -9)
    ctx.fillRect(mapX(-2.6), mapZ(-36), mapX(2.6) - mapX(-2.6), mapZ(-9) - mapZ(-36));
    // Cross street at Z = 28 (X: -27 to +27)
    ctx.fillRect(mapX(-27), mapZ(26), mapX(27) - mapX(-27), mapZ(30) - mapZ(26));

    // Hospital building & icon (X=0, Z=-32)
    ctx.fillStyle = '#ef4444';
    const hX = mapX(0);
    const hZ = mapZ(-32);
    ctx.fillRect(hX - 6, hZ - 6, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', hX, hZ);

    // Build Area at south bridgehead (X=0, Z=4.2)
    const baX = mapX(0);
    const baZ = mapZ(4.2);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(baX - 5, baZ - 2, 10, 4);

    // Bridge Area spanning river (X=0, Z=-2.5)
    const bX = mapX(0);
    ctx.fillStyle = isRoute100 ? '#10b981' : (isBridgeRepaired ? '#fbbf24' : '#f97316');
    ctx.fillRect(bX - 4, riverTop, 8, riverBottom - riverTop);

    // NPC indicators (Funobotz Helper Bots)
    if (npcs && npcs.length) {
      npcs.forEach(npc => {
        const nx = mapX(npc.pos.x);
        const nz = mapZ(npc.pos.z);
        ctx.beginPath();
        ctx.arc(nx, nz, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // Player indicator
    if (playerPos) {
      const pX = mapX(playerPos.x);
      const pZ = mapZ(playerPos.z);

      // View cone pointing North/along player orientation
      ctx.beginPath();
      ctx.moveTo(pX, pZ);
      const heading = (playerYaw || 0) + Math.PI / 2;
      const coneDist = 14;
      ctx.arc(pX, pZ, coneDist, heading - 0.5, heading + 0.5);
      ctx.closePath();
      ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.fill();

      // Glowing player dot
      ctx.beginPath();
      ctx.arc(pX, pZ, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  updateTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (this.missionTimer) {
      this.missionTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }

  setPromptVisible(visible, title = null, sub = null) {
    if (visible) {
      if (title) {
        const titleEl = this.interactionPrompt.querySelector('.prompt-title');
        if (titleEl) titleEl.textContent = title;
      }
      if (sub) {
        const subEl = this.interactionPrompt.querySelector('.prompt-sub');
        if (subEl) subEl.textContent = sub;
      }
      this.interactionPrompt.classList.remove('prompt-hidden');
    } else {
      this.interactionPrompt.classList.add('prompt-hidden');
    }
  }

  setBuildModeVisible(visible) {
    if (visible) {
      this.buildDock.classList.remove('dock-hidden');
      document.body.classList.add('build-mode-active');
      this.setPromptVisible(false);
    } else {
      this.buildDock.classList.add('dock-hidden');
      document.body.classList.remove('build-mode-active');
    }
  }

  selectComponentCard(componentType) {
    // Normalize type string
    let norm = componentType;
    if (norm === 'deck-straight') norm = 'road';
    if (norm === 'deck-truss') norm = 'bridge';
    if (norm === 'deck-arch') norm = 'arch';

    this.componentCards.forEach(card => {
      const cardComp = card.dataset.component;
      if (cardComp === componentType || cardComp === norm) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  updateRouteProgress(percentage, statusText, routeAccessText, segments) {
    if (this.routePercentDisplay) {
      this.routePercentDisplay.textContent = `${percentage}%`;
    } else if (this.routeAccessLabel) {
      this.routeAccessLabel.textContent = `ROUTE ACCESS: ${percentage}%`;
    }
    if (this.routeProgressFill) {
      this.routeProgressFill.style.width = `${percentage}%`;
    }
    if (this.routeStatusTag) {
      this.routeStatusTag.textContent = statusText || (percentage === 100 ? 'Route connected!' : 'Bridge connection is incomplete.');
    }

    // Topological route diagram update
    if (this.nodeBridge) {
      if (percentage === 100) {
        this.nodeBridge.className = 'node connected';
      } else {
        this.nodeBridge.className = 'node severed';
      }
    }

    if (percentage === 100) {
      if (this.routeStatusTag) this.routeStatusTag.className = 'status-tag ready';
      if (this.routeProgressFill) this.routeProgressFill.style.background = 'linear-gradient(90deg, #10b981, #38bdf8)';
    } else {
      if (this.routeStatusTag) this.routeStatusTag.className = 'status-tag incomplete';
      if (this.routeProgressFill) this.routeProgressFill.style.background = 'linear-gradient(90deg, #f59e0b, #10b981)';
    }
  }

  setTaskCompleted(taskNumber) {
    const taskItem = document.getElementById(`task-${taskNumber}`);
    if (taskItem) {
      taskItem.classList.add('done');
      const box = taskItem.querySelector('.check-box');
      if (box) box.textContent = '✅';
    }

    // Activate next task
    const nextItem = document.getElementById(`task-${taskNumber + 1}`);
    if (nextItem) {
      nextItem.classList.add('active');
    }
  }

  showHint(message, type = 'info') {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    this.toastMsg.textContent = message;
    if (type === 'success') {
      this.toastIcon.textContent = '🎉';
      this.feedbackToast.style.borderColor = 'var(--accent-emerald)';
    } else if (type === 'incomplete') {
      this.toastIcon.textContent = '⚠️';
      this.feedbackToast.style.borderColor = 'var(--accent-amber)';
      sounds.playIncomplete();
    } else {
      this.toastIcon.textContent = '💡';
      this.feedbackToast.style.borderColor = 'var(--accent-cyan)';
    }

    this.feedbackToast.classList.remove('toast-hidden');
    this.toastTimeout = setTimeout(() => {
      this.hideHint();
    }, 6500);
  }

  hideHint() {
    this.feedbackToast.classList.add('toast-hidden');
  }

  showBanner(msg) {
    this.showHint(msg, 'info');
  }

  showMissionComplete({ integrity, elapsedSeconds }) {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    this.statTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    this.statIntegrity.textContent = integrity;

    this.modalMissionComplete.classList.remove('modal-hidden');

    // Confetti celebration burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 400);
  }

  openHelpModal() {
    this.modalHelp.classList.remove('modal-hidden');
    sounds.playClick();
  }

  closeHelpModal() {
    this.modalHelp.classList.add('modal-hidden');
    sounds.playClick();
  }

  resetUI() {
    this.modalMissionComplete.classList.add('modal-hidden');
    this.updateRouteProgress(0, 'BRIDGE BLOCKED');
    for (let i = 1; i <= 5; i++) {
      const task = document.getElementById(`task-${i}`);
      if (task) {
        task.className = (i === 1) ? 'active' : '';
        const box = task.querySelector('.check-box');
        if (box) box.textContent = '⚪';
      }
    }
    this.completedTasks.clear();
    if (this.tasksProgressBadge) this.tasksProgressBadge.textContent = '0%';
    if (this.tasksProgressFill) this.tasksProgressFill.style.width = '0%';
    ['task-find-bridge', 'task-interact-bridge', 'task-repair-bridge', 'task-test-route', 'task-ambulance-hospital'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('completed', 'task-done');
        const chk = el.querySelector('.task-check');
        if (chk) chk.textContent = '[ ]';
      }
    });
    this.setBuildModeVisible(false);
  }
}
