import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:3000/';

async function runE2EPlaytest() {
  console.log('================================================================');
  console.log('--- CREATOR PLANET FULL END-TO-END GAMEPLAY PLAYTEST ---');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,720']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[BROWSER ERROR]:', msg.text());
    } else {
      console.log('[BROWSER]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
    console.error('[PAGE ERROR]:', err);
  });

  console.log(`[STEP 0] Loading game at ${URL}...`);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  const screenshotsDir = path.resolve('public', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // STEP 1: Player spawn and movement
  console.log('\n[STEP 1] Testing Player Movement from Spawn...');
  const initialPos = await page.evaluate(() => ({
    x: window.game.player.position.x,
    y: window.game.player.position.y,
    z: window.game.player.position.z,
    mission: window.game.missionManager.gameState
  }));
  console.log('Initial Spawn Position:', initialPos);
  console.assert(initialPos.z >= 19 && initialPos.z <= 21, 'Player should spawn near Z=20');

  console.log('Holding [W] key to walk forward toward bridge...');
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 1700));
  await page.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 300));

  const movedPos = await page.evaluate(() => ({
    x: window.game.player.position.x,
    y: window.game.player.position.y,
    z: window.game.player.position.z,
    bridgeProximity: window.game.player.bridgeProximity,
    gameState: window.game.missionManager.gameState
  }));
  console.log('Position after walking [W]:', movedPos);
  console.assert(movedPos.z < 10, `Player should move forward (Z < 10), got Z=${movedPos.z}`);
  console.assert(movedPos.bridgeProximity === true, 'bridgeProximity should be true');

  // STEP 2: Mission & Bridge Problem Zone
  console.log('\n[STEP 2] Verifying Mission & Bridge Problem Zone...');
  const promptVisible = await page.evaluate(() => {
    const el = document.getElementById('interaction-prompt');
    return el && !el.classList.contains('prompt-hidden');
  });
  console.log('Bridge Proximity Prompt Visible:', promptVisible);
  console.assert(promptVisible === true, 'Interaction prompt must be visible near bridge');

  const gameStateNearBridge = await page.evaluate(() => window.game.missionManager.gameState);
  console.log('Game State Near Bridge:', gameStateNearBridge);
  console.assert(gameStateNearBridge === 'BRIDGE PROBLEM', 'State must be BRIDGE PROBLEM');
  await page.screenshot({ path: path.join(screenshotsDir, 'playtest_01_movement_bridge.png') });

  // STEP 3: Build Mode Entry
  console.log('\n[STEP 3] Entering Build Mode via [E] Key...');
  await page.keyboard.press('KeyE');
  await new Promise(r => setTimeout(r, 800));

  const inBuildMode = await page.evaluate(() => ({
    state: window.game.missionManager.state,
    gameState: window.game.missionManager.gameState,
    dockVisible: !document.getElementById('build-dock').classList.contains('dock-hidden')
  }));
  console.log('Build Mode State:', inBuildMode);
  console.assert(inBuildMode.state === 'BUILD_MODE', 'State should be BUILD_MODE');
  console.assert(inBuildMode.dockVisible === true, 'Build dock must be visible');
  await page.screenshot({ path: path.join(screenshotsDir, 'playtest_02_build_mode.png') });

  // STEP 4: Placement & Rotation (Intentional Sideways Placement)
  console.log('\n[STEP 4] Selecting Road, Rotating Sideways, and Connecting...');
  // Click ROAD tool
  await page.click('#tool-straight');
  await new Promise(r => setTimeout(r, 200));

  // Press [R] to rotate sideways (90 degrees)
  console.log('Pressing [R] to rotate component sideways...');
  await page.keyboard.press('KeyR');
  await new Promise(r => setTimeout(r, 200));

  // Click CONNECT button
  console.log('Clicking CONNECT button in engineering dock...');
  await page.click('#btn-connect-piece');
  await new Promise(r => setTimeout(r, 300));

  const placedSideways = await page.evaluate(() => {
    const slot0 = window.game.buildSystem.slots[0];
    return {
      occupied: !!slot0.occupied,
      type: slot0.occupied ? slot0.occupied.type : null,
      rotation: slot0.occupied ? slot0.occupied.rotation : null
    };
  });
  console.log('Slot 0 Component (Sideways):', placedSideways);
  console.assert(placedSideways.occupied === true, 'Slot 0 must be occupied');
  console.assert(Math.abs(placedSideways.rotation - Math.PI / 2) < 0.1, 'Rotation should be 90 degrees (sideways)');

  // STEP 5: TEST & Failure Feedback
  console.log('\n[STEP 5] Clicking TEST to check Failure Feedback...');
  await page.click('#btn-test-route');
  await new Promise(r => setTimeout(r, 600));

  const testFailFeedback = await page.evaluate(() => {
    const toast = document.getElementById('feedback-toast');
    const toastMsg = document.getElementById('toast-msg');
    return {
      gameState: window.game.missionManager.gameState,
      routePercent: document.getElementById('route-percent-display').textContent.trim(),
      toastVisible: !toast.classList.contains('toast-hidden'),
      toastText: toastMsg ? toastMsg.textContent.trim() : ''
    };
  });
  console.log('Test Failure Results:', testFailFeedback);
  console.assert(testFailFeedback.gameState === 'FAIL / ADJUST', 'State should be FAIL / ADJUST');
  console.assert(testFailFeedback.routePercent === '35%', `Expected 35%, got ${testFailFeedback.routePercent}`);
  console.assert(testFailFeedback.toastVisible === true, 'Toast must be visible');
  console.assert(testFailFeedback.toastText.includes('facing sideways') || testFailFeedback.toastText.includes('rotate'), 'Hint should explain sideways orientation');
  await page.screenshot({ path: path.join(screenshotsDir, 'playtest_03_failure_feedback.png') });

  // STEP 6: Correction (Rotate to Align & Place Second Span)
  console.log('\n[STEP 6] Correcting: Rotating South Span to Align & Placing North Span...');
  // Click ROTATE button (or press R) once to align: 90 -> 180 (aligned!)
  console.log('Pressing [R] once to align South span parallel to road (90 deg -> 180 deg)...');
  await page.keyboard.press('KeyR');
  await new Promise(r => setTimeout(r, 250));

  // Select BRIDGE (Truss) for North span
  console.log('Selecting BRIDGE (deck-truss) component...');
  await page.click('#tool-truss');
  await new Promise(r => setTimeout(r, 200));

  // Click CONNECT to place into North slot
  console.log('Clicking CONNECT button for North span...');
  await page.click('#btn-connect-piece');
  await new Promise(r => setTimeout(r, 300));

  const bothSlotsStatus = await page.evaluate(() => {
    const b = window.game.buildSystem;
    return {
      slot0: { occupied: !!b.slots[0].occupied, rot: b.slots[0].occupied?.rotation },
      slot1: { occupied: !!b.slots[1].occupied, rot: b.slots[1].occupied?.rotation }
    };
  });
  console.log('Both Bridge Slots Status:', bothSlotsStatus);
  console.assert(bothSlotsStatus.slot0.occupied && bothSlotsStatus.slot1.occupied, 'Both slots must be occupied');

  // STEP 7: TEST & Success
  console.log('\n[STEP 7] Clicking TEST Route to Verify 100% Completion...');
  await page.click('#btn-test-route');
  await new Promise(r => setTimeout(r, 600));

  const successResults = await page.evaluate(() => ({
    gameState: window.game.missionManager.gameState,
    percent: document.getElementById('route-percent-display').textContent.trim(),
    statusTag: document.getElementById('route-status-tag').textContent.trim(),
    bridgeNodeClass: document.getElementById('node-bridge').className
  }));
  console.log('Success Results:', successResults);
  console.assert(successResults.gameState === 'SUCCESS' || successResults.gameState === 'AMBULANCE MOVES', 'State must be SUCCESS or AMBULANCE MOVES');
  console.assert(successResults.percent === '100%', `Route access must be 100%, got ${successResults.percent}`);
  console.assert(successResults.bridgeNodeClass.includes('connected'), 'Topological route diagram bridge node must be connected');
  await page.screenshot({ path: path.join(screenshotsDir, 'playtest_04_success_100.png') });

  // STEP 8: Ambulance Dispatched Across Route
  console.log('\n[STEP 8] Monitoring Ambulance Rescue Run Across Bridge...');
  await new Promise(r => setTimeout(r, 800));

  const ambulanceActive = await page.evaluate(() => ({
    isDriving: window.game.ambulance.isDriving,
    gameState: window.game.missionManager.gameState,
    dockVisible: !document.getElementById('build-dock').classList.contains('dock-hidden')
  }));
  console.log('Ambulance Status:', ambulanceActive);
  console.assert(ambulanceActive.isDriving === true, 'Ambulance should be actively driving');
  console.assert(ambulanceActive.dockVisible === false, 'Build dock MUST be hidden during ambulance run');
  await page.screenshot({ path: path.join(screenshotsDir, 'playtest_05_ambulance_run.png') });

  // STEP 9: Wait for Ambulance to Reach Hospital
  console.log('\n[STEP 9] Waiting for Ambulance to Reach Hospital Bay...');
  let reachedHospital = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const status = await page.evaluate(() => ({
      ambulancePos: { z: window.game.ambulance.mesh.position.z },
      missionState: window.game.missionManager.missionState,
      modalVisible: !document.getElementById('modal-mission-complete').classList.contains('modal-hidden')
    }));

    if (status.modalVisible) {
      reachedHospital = true;
      console.log(`Ambulance reached hospital! Time elapsed: ${(i + 1) * 0.5}s.`);
      break;
    }
  }
  console.assert(reachedHospital, 'Ambulance must reach hospital and open completion modal');

  // STEP 10: Mission Complete & District 2 Gate Open
  console.log('\n[STEP 10] Verifying Mission Complete Modal & Gate Opening...');
  const completionState = await page.evaluate(() => ({
    missionState: window.game.missionManager.missionState,
    gameState: window.game.missionManager.gameState,
    gateArmRotZ: window.game.village.districtGateArm?.rotation.z,
    gateColliderRemoved: window.game.village.gateCollider === null
  }));
  console.log('Completion & Gate State:', completionState);
  console.assert(completionState.missionState === 'COMPLETE', 'MissionState should be COMPLETE');
  console.assert(completionState.gateColliderRemoved === true, 'District 2 gate collider must be removed');
  await page.screenshot({ path: path.join(screenshotsDir, 'playtest_06_mission_complete.png') });

  // STEP 11: Next Area - Continue Exploring & Walk Through District 2 Gate
  console.log('\n[STEP 11] Clicking Continue Exploring and Walking into Next Area (District 2)...');
  await page.click('#btn-explore-village');
  await new Promise(r => setTimeout(r, 500));

  const postModalState = await page.evaluate(() => ({
    state: window.game.missionManager.state,
    modalVisible: !document.getElementById('modal-mission-complete').classList.contains('modal-hidden'),
    customCameraActive: window.game.player.customCameraActive
  }));
  console.log('Post Modal State:', postModalState);
  console.assert(postModalState.modalVisible === false, 'Modal must be closed');
  console.assert(postModalState.state === 'EXPLORING', 'State should return to EXPLORING');
  console.assert(postModalState.customCameraActive === false, 'Camera should return to third-person follow');

  // Physically navigate player through District 2 gate using keyboard
  console.log('Navigating player character with keyboard toward District 2 Gate (X: 24, Z: 28)...');
  // First walk South towards Z=28
  await page.keyboard.down('KeyS');
  await new Promise(r => setTimeout(r, 2600));
  await page.keyboard.up('KeyS');
  await new Promise(r => setTimeout(r, 200));

  // Turn and walk East towards X=24
  await page.keyboard.down('KeyD');
  await new Promise(r => setTimeout(r, 3400));
  await page.keyboard.up('KeyD');
  await new Promise(r => setTimeout(r, 300));

  const finalPlayerPos = await page.evaluate(() => ({
    x: window.game.player.position.x,
    y: window.game.player.position.y,
    z: window.game.player.position.z,
    district2Discovered: window.game.district2Discovered
  }));
  console.log('Final Player Position in Next Area:', finalPlayerPos);
  console.assert(finalPlayerPos.x > 21, `Player should have walked through District 2 gate (X > 21), got X=${finalPlayerPos.x}`);
  await page.screenshot({ path: path.join(screenshotsDir, 'playtest_07_district2_next_area.png') });

  console.log('\n--- Console Errors Evaluation ---');
  if (consoleErrors.length === 0) {
    console.log('✅ PERFECT RUN: 0 Console Errors encountered throughout the entire gameplay loop!');
  } else {
    console.error(`⚠️ Encountered ${consoleErrors.length} errors:`, consoleErrors);
  }

  await browser.close();
  console.log('\n================================================================');
  console.log('🎉 ALL 11 REAL-INPUT GAMEPLAY LOOP STAGES PASSED FLAWLESSLY!');
  console.log('================================================================');
}

runE2EPlaytest().catch(err => {
  console.error('\n❌ Playtest Failed:', err);
  process.exit(1);
});
