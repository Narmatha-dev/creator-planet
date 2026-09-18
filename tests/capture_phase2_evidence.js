import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:3000/';

async function captureEvidence() {
  console.log('=== Capturing Phase 2 Evidence for Creator Planet ===');

  const evidenceDir = path.resolve('public', 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,720']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));

  console.log('Opening game...');
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // 1. Player Start and Mission (Cinematic 3rd Person View)
  console.log('1. Capturing Player Start and Mission...');
  await page.evaluate(() => {
    window.game.setCameraMode('follow');
    const p = window.game.player;
    p.cameraYaw = 0; // Behind player looking north towards bridge
    p.cameraPitch = 0.16;
    p.cameraDistance = 5.2;
    p.cameraHeight = 1.8;
    p.updateCamera();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_02_player_start_mission.png') });

  // 1b. Player Character Detail
  console.log('1b. Capturing Player Character Detail...');
  await page.evaluate(() => {
    const p = window.game.player;
    p.customCameraActive = true;
    window.game.camera.position.set(0.8, 1.3, 17.6);
    window.game.camera.lookAt(0, 1.1, 20);
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_02b_player_detail.png') });
  await page.evaluate(() => {
    window.game.player.customCameraActive = false;
  });

  // 2. 3D World Overview
  console.log('2. Capturing 3D World Overview...');
  await page.evaluate(() => {
    window.game.setCameraMode('overview');
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_01_world_overview.png') });

  // 3. Challenge / Problem Zone
  console.log('3. Capturing Challenge / Problem Zone...');
  await page.evaluate(() => {
    window.game.setCameraMode('challenge');
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_03_challenge_problem_zone.png') });

  // 4. Engineering Interaction (Build Mode Active with Ghost & Dock)
  console.log('4. Capturing Engineering Interaction...');
  await page.evaluate(() => {
    window.game.missionManager.enterBuildMode();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_04_engineering_interaction.png') });

  // 5. Gameplay Feedback (Incorrect Setup & Hint Toast)
  console.log('5. Capturing Gameplay Feedback (Misalignment & Hint)...');
  await page.evaluate(() => {
    const buildSys = window.game.buildSystem;
    buildSys.selectComponent('deck-straight');
    buildSys.currentRotation = Math.PI / 2; // Sideways!
    buildSys.hoveredSlot = buildSys.slots[0];
    buildSys.placeSelectedComponent();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.click('#btn-test-route');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_05_gameplay_feedback.png') });

  // 6. Completion / Ambulance Rescue Run
  console.log('6. Capturing Completion / Ambulance Rescue Run...');
  await page.evaluate(() => {
    const buildSys = window.game.buildSystem;
    // Straighten south span
    buildSys.hoveredSlot = buildSys.slots[0];
    buildSys.currentRotation = 0;
    buildSys.placeSelectedComponent();

    // Snap north truss span
    buildSys.selectComponent('deck-truss');
    buildSys.currentRotation = 0;
    buildSys.hoveredSlot = buildSys.slots[1];
    buildSys.placeSelectedComponent();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.click('#btn-test-route');
  // Wait 3.5 seconds so ambulance is driving across the bridge!
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_06_completion_ambulance_run.png') });

  // 7. Completion / Progression Modal & Gate
  console.log('7. Capturing Completion Modal & Progression...');
  // Wait for ambulance to arrive and modal to pop up
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const isModalOpen = await page.evaluate(() => {
      const m = document.getElementById('modal-mission-complete');
      return m && !m.classList.contains('modal-hidden');
    });
    if (isModalOpen) break;
  }
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_07_completion_modal_progression.png') });

  // 8. Essential UI (Help & Guide Modal)
  console.log('8. Capturing Essential UI (Help & Controls Guide)...');
  await page.evaluate(() => {
    document.getElementById('modal-mission-complete').classList.add('modal-hidden');
    window.game.uiManager.openHelpModal();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_08_essential_ui_guide.png') });

  // 9. Progression - Hospital & Unlocked District 2 Gate
  console.log('9. Capturing Progression - Hospital & Unlocked District 2 Gate...');
  await page.evaluate(() => {
    document.getElementById('modal-help').classList.add('modal-hidden');
    window.game.setCameraMode('hospital');
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(evidenceDir, 'evidence_09_progression_hospital_gate.png') });

  console.log('\n--- Checking Console Errors ---');
  if (errors.length === 0) {
    console.log('SUCCESS: 0 console errors during entire evidence capture session!');
  } else {
    console.error('Errors encountered:', errors);
  }

  await browser.close();
  console.log('=== All Phase 2 Evidence Screenshots Captured Successfully! ===');
}

captureEvidence().catch(err => {
  console.error('Evidence Capture Failed:', err);
  process.exit(1);
});
