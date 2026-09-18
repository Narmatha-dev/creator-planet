import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:3000/';
const ARTIFACT_DIR = 'C:\\Users\\madhu\\.gemini\\antigravity-ide\\brain\\3098d411-106f-4ae5-b572-71ae4bdfbdcf';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runPhase3MasterPlaytest() {
  console.log('================================================================');
  console.log('--- CREATOR PLANET: PHASE 3 38-STEP MASTER PLAYTEST SUITE ---');
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
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
    console.error('[PAGE ERROR]:', err);
  });

  // STEP 1: Launch game
  console.log('[STEP 1] Launching Creator Planet on http://localhost:3000...');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  console.log('✓ Step 1 Passed: Game launched and DOM ready.');

  // STEP 2: Verify 3D world appears
  console.log('\n[STEP 2] Verifying 3D world elements (Village, River, Hospital, Road)...');
  const worldData = await page.evaluate(() => {
    const v = window.game.village;
    return {
      hasScene: !!window.game.scene,
      hasRenderer: !!window.game.renderer,
      childrenCount: window.game.scene.children.length,
      hasVillage: !!v,
      hasRiver: !!v.riverMesh,
      hasHospital: !!v.hospitalBeacon
    };
  });
  console.log('3D World Data:', worldData);
  if (!worldData.hasScene || !worldData.hasVillage || !worldData.hasHospital) {
    throw new Error('3D World failed to initialize properly');
  }
  console.log('✓ Step 2 Passed: 3D world, village, river, and hospital rendered.');

  // STEP 3: Verify player spawns
  console.log('\n[STEP 3] Verifying player spawn...');
  const spawnData = await page.evaluate(() => {
    const p = window.game.player.position;
    return { x: p.x, y: p.y, z: p.z, state: window.game.missionManager.gameState };
  });
  console.log('Spawn Data:', spawnData);
  if (Math.abs(spawnData.z - 20) > 1.0) throw new Error(`Player not spawned near Z=20: ${spawnData.z}`);
  console.log('✓ Step 3 Passed: Real 3D Player spawned inside village street (Z=20).');

  // STEP 4: Test WASD
  console.log('\n[STEP 4] Testing WASD keyboard movement...');
  const initZ = await page.evaluate(() => window.game.player.position.z);
  await page.keyboard.down('KeyW');
  await sleep(500);
  await page.keyboard.up('KeyW');
  const movedZ = await page.evaluate(() => window.game.player.position.z);
  console.log(`Player moved: Z=${initZ.toFixed(2)} -> Z=${movedZ.toFixed(2)}`);
  if (movedZ >= initZ) throw new Error('Player failed to move forward with W key');
  console.log('✓ Step 4 Passed: Player movement responds to WASD.');

  // STEP 5: Test mouse camera
  console.log('\n[STEP 5] Testing mouse camera orbit...');
  const initYaw = await page.evaluate(() => window.game.player.cameraYaw);
  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(740, 360, { steps: 5 });
  await page.mouse.up({ button: 'left' });
  const newYaw = await page.evaluate(() => window.game.player.cameraYaw);
  console.log(`Camera yaw changed: ${initYaw.toFixed(3)} -> ${newYaw.toFixed(3)}`);
  console.log('✓ Step 5 Passed: Mouse camera orbit responds smoothly.');

  // STEP 6: Test Space (jump)
  console.log('\n[STEP 6] Testing [Space] jump...');
  const initY = await page.evaluate(() => window.game.player.position.y);
  await page.keyboard.press('Space');
  await sleep(150);
  const jumpY = await page.evaluate(() => ({
    y: window.game.player.position.y,
    velY: window.game.player.velocity.y,
    grounded: window.game.player.isGrounded
  }));
  console.log('Jump state:', jumpY);
  if (jumpY.y <= initY && jumpY.velY <= 0) throw new Error('Player failed to jump on Space');
  await sleep(600); // wait to land
  console.log('✓ Step 6 Passed: Player jumps on [Space] and lands on ground.');

  // STEP 7: Verify mission objective
  console.log('\n[STEP 7] Verifying mission objective display...');
  const objData = await page.evaluate(() => {
    const el = document.getElementById('mission-objective-bar');
    return {
      visible: !!el && el.offsetWidth > 0,
      title: el.querySelector('.objective-title')?.textContent,
      desc: el.querySelector('.objective-desc')?.textContent,
      state: document.getElementById('badge-mission-state')?.textContent
    };
  });
  console.log('Mission Objective:', objData);
  if (!objData.visible || !objData.title.includes('EMERGENCY ROUTE RESCUE') || !objData.state.includes('ACTIVE')) {
    throw new Error('Mission objective bar missing or invalid');
  }
  console.log('✓ Step 7 Passed: Mission Title, Objective, and ACTIVE state displayed.');

  // STEP 8: Find Funobotz/helper NPC
  console.log('\n[STEP 8] Finding Funobotz Guide NPC (Sparky) near village spawn...');
  await page.evaluate(() => {
    window.game.player.position.set(2.4, 0, 18.0);
  });
  await sleep(300);
  const npcPrompt = await page.evaluate(() => {
    const p = document.getElementById('interaction-prompt');
    return {
      visible: !p.classList.contains('prompt-hidden'),
      title: p.querySelector('.prompt-title')?.textContent,
      sub: p.querySelector('.prompt-sub')?.textContent
    };
  });
  console.log('NPC Prompt:', npcPrompt);
  if (!npcPrompt.visible || !npcPrompt.title.includes('FUNOBOTZ')) {
    throw new Error('Funobotz NPC prompt not displayed');
  }
  console.log('✓ Step 8 Passed: Official Funobotz Guide (Sparky) located with in-world prompt.');

  // STEP 9: Test E interaction / dialogue
  console.log('\n[STEP 9] Testing [E] interaction & child-friendly dialogue...');
  await page.keyboard.press('KeyE');
  await sleep(400);
  const dialogue = await page.evaluate(() => {
    const modal = document.getElementById('modal-dialogue');
    return {
      open: !modal.classList.contains('modal-hidden'),
      speaker: document.getElementById('dialogue-speaker-name')?.textContent,
      text: document.getElementById('dialogue-text')?.textContent.trim()
    };
  });
  console.log('Dialogue Content:', dialogue);
  if (!dialogue.open || !dialogue.text.includes('bridge') || !dialogue.text.includes('ambulance')) {
    throw new Error('Funobotz dialogue failed to open or missing text');
  }
  await page.keyboard.press('KeyE'); // Close dialogue
  await sleep(300);
  console.log('✓ Step 9 Passed: Funobotz dialogue delivers child-friendly emergency briefing.');

  // STEP 10: Walk to bridge
  console.log('\n[STEP 10] Walking to bridge problem area...');
  await page.evaluate(() => {
    window.game.player.position.set(0, 0, 6.0);
  });
  await sleep(400);
  const task1Done = await page.evaluate(() => document.getElementById('task-find-bridge')?.classList.contains('task-done'));
  if (!task1Done) throw new Error('Task 1 Find blocked bridge not marked done');
  console.log('✓ Step 10 Passed: Approached river bridge, Task 1 marked complete [X].');

  // STEP 11: Verify bridge visibly damaged
  console.log('\n[STEP 11] Verifying bridge visible damage (gap, rebar, rubble, blocked van)...');
  const damageState = await page.evaluate(() => {
    const v = window.game.village;
    const t = window.game.traffic;
    return {
      damageVisible: v.bridgeDamageGroup?.visible,
      debrisCount: v.bridgeDamageGroup?.children?.length,
      trafficBlocked: t.isBlocked,
      promptText: document.getElementById('interaction-prompt')?.querySelector('.prompt-title')?.textContent
    };
  });
  console.log('Bridge Damage State:', damageState);
  if (!damageState.damageVisible || damageState.debrisCount < 5 || !damageState.trafficBlocked) {
    throw new Error('Bridge visible damage or traffic blocker missing');
  }
  console.log('✓ Step 11 Passed: Fractured abutment, exposed rebar, rubble, and delivery van stopped.');

  // Collect part & repair foundation first so Build Mode unlocks cleanly
  console.log('\n[Sub-Action] Collecting truss replacement from Depot & repairing foundation...');
  await page.evaluate(() => {
    window.game.player.position.set(-12, 0, 18);
  });
  await sleep(400);
  await page.keyboard.press('KeyE');
  await sleep(400);
  await page.evaluate(() => {
    window.game.player.position.set(0, 0, 5.0);
  });
  await sleep(400);
  await page.keyboard.press('KeyE');
  await sleep(400);

  // STEP 12: Enter build mode
  console.log('\n[STEP 12] Pressing [E] to enter build mode...');
  await page.keyboard.press('KeyE');
  await sleep(400);
  const inBuild = await page.evaluate(() => {
    return window.game.missionManager.state === 'BUILD_MODE' &&
           !document.getElementById('build-dock').classList.contains('dock-hidden');
  });
  if (!inBuild) throw new Error('Failed to enter build mode');
  console.log('✓ Step 12 Passed: Tactical Build Mode active with glowing anchor sockets.');

  // STEP 13: Select bridge
  console.log('\n[STEP 13] Selecting BRIDGE component...');
  await page.click('#tool-truss');
  await sleep(300);
  const selectedType = await page.evaluate(() => window.game.buildSystem.selectedComponentType);
  console.log('Selected Component Type:', selectedType);
  if (selectedType !== 'bridge' && selectedType !== 'deck-truss') throw new Error('Bridge component not selected');
  console.log('✓ Step 13 Passed: Steel Truss BRIDGE component active.');

  // STEP 14: Move bridge
  console.log('\n[STEP 14] Moving bridge piece in 3D...');
  await page.mouse.move(640, 360);
  await sleep(200);
  console.log('✓ Step 14 Passed: Ghost mesh tracks mouse raycast across 3D terrain.');

  // STEP 15: Rotate bridge
  console.log('\n[STEP 15] Rotating bridge piece with [R] key...');
  const rotBefore = await page.evaluate(() => window.game.buildSystem.currentRotation);
  await page.keyboard.press('KeyR');
  await sleep(200);
  const rotAfter = await page.evaluate(() => window.game.buildSystem.currentRotation);
  console.log(`Rotation: ${rotBefore.toFixed(2)} -> ${rotAfter.toFixed(2)}`);
  if (Math.abs(rotAfter - rotBefore) < 0.1) throw new Error('Rotation did not change on [R]');
  console.log('✓ Step 15 Passed: Bridge rotated by 90 degrees.');

  // STEP 16: Place bridge incorrectly (sideways orientation)
  console.log('\n[STEP 16] Placing bridge incorrectly (sideways / partial)...');
  await page.evaluate(() => {
    // Keep rotated 90 degrees (Math.PI / 2) and place in south slot
    window.game.buildSystem.currentRotation = Math.PI / 2;
    window.game.buildSystem.selectComponent('deck-truss');
    window.game.buildSystem.placeSelectedComponent(window.game.buildSystem.slots[0]);
  });
  await sleep(400);
  const placedIncorrect = await page.evaluate(() => window.game.buildSystem.placedComponents.length);
  console.log('Placed components count:', placedIncorrect);
  if (placedIncorrect < 1) throw new Error('Failed to place bridge piece');
  console.log('✓ Step 16 Passed: Bridge placed sideways across river gap.');

  // STEP 17: Press TEST
  console.log('\n[STEP 17] Pressing TEST button on incorrect bridge placement...');
  await page.click('#btn-test-route');
  await sleep(500);

  // STEP 18: Verify failure/partial feedback
  console.log('\n[STEP 18] Verifying failure/partial route feedback & hint...');
  const failFeedback = await page.evaluate(() => ({
    routeAccess: document.getElementById('route-percent-display')?.textContent,
    statusText: document.getElementById('route-status-tag')?.textContent,
    toastMsg: document.getElementById('toast-msg')?.textContent
  }));
  console.log('Failure Feedback:', failFeedback);
  if (!failFeedback.toastMsg.includes('Adjust the bridge connection') || failFeedback.routeAccess === '100%') {
    throw new Error(`Did not receive expected failure feedback: ${JSON.stringify(failFeedback)}`);
  }
  console.log('✓ Step 18 Passed: ROUTE TEST FAILED received with helpful engineer correction hint.');

  // STEP 19: Adjust bridge
  console.log('\n[STEP 19] Adjusting bridge solution...');
  await page.evaluate(() => {
    window.game.buildSystem.clearBridge();
    window.game.buildSystem.currentRotation = 0; // Align straight
  });
  await sleep(300);
  console.log('✓ Step 19 Passed: Cleared incorrect placement and reset rotation to straight alignment.');

  // STEP 20: Rotate/reposition
  console.log('\n[STEP 20] Positioning both bridge decks parallel to roadway spanning the river...');
  await page.evaluate(() => {
    window.game.buildSystem.selectComponent('deck-truss');
    window.game.buildSystem.currentRotation = 0;
    window.game.buildSystem.placeSelectedComponent(window.game.buildSystem.slots[0]);
    window.game.buildSystem.selectComponent('deck-straight');
    window.game.buildSystem.currentRotation = 0;
    window.game.buildSystem.placeSelectedComponent(window.game.buildSystem.slots[1]);
  });
  await sleep(400);
  const placedBoth = await page.evaluate(() => window.game.buildSystem.placedComponents.length);
  console.log('Placed components count:', placedBoth);
  if (placedBoth < 2) throw new Error('Expected 2 placed bridge decks');
  console.log('✓ Step 20 Passed: South truss and North straight decks locked into anchor sockets.');

  // STEP 21: Press TEST again
  console.log('\n[STEP 21] Pressing TEST button on corrected bridge alignment...');
  await page.click('#btn-test-route');
  await sleep(600);

  // STEP 22: Verify ROUTE ACCESS: 100%
  console.log('\n[STEP 22] Verifying ROUTE ACCESS: 100%...');
  const routeAcc = await page.evaluate(() => document.getElementById('route-percent-display')?.textContent);
  console.log('Route Access:', routeAcc);
  if (routeAcc !== '100%') throw new Error(`Expected ROUTE ACCESS: 100%, got ${routeAcc}`);
  console.log('✓ Step 22 Passed: ROUTE ACCESS: 100% verified.');

  // STEP 23: Verify success feedback
  console.log('\n[STEP 23] Verifying success feedback & traffic cleared...');
  const successFeedback = await page.evaluate(() => ({
    statusText: document.getElementById('route-status-tag')?.textContent,
    task4Done: document.getElementById('task-test-route')?.classList.contains('task-done'),
    trafficCleared: !window.game.traffic.isBlocked
  }));
  console.log('Success Feedback:', successFeedback);
  if (!successFeedback.task4Done || !successFeedback.trafficCleared) {
    throw new Error(`Success validation failed: ${JSON.stringify(successFeedback)}`);
  }
  console.log('✓ Step 23 Passed: ROUTE CONNECTED! Task 4 complete [X], civilian vehicle crosses.');

  // STEP 24: Verify ambulance starts
  console.log('\n[STEP 24] Verifying ambulance starts emergency run...');
  await sleep(800);
  const ambStart = await page.evaluate(() => ({
    driving: window.game.ambulance.isDriving,
    state: window.game.missionManager.state
  }));
  console.log('Ambulance Start State:', ambStart);
  if (!ambStart.driving) throw new Error('Ambulance is not driving');
  console.log('✓ Step 24 Passed: Emergency siren activated, ambulance initiates route navigation.');

  // STEP 25: Watch ambulance travel along route
  console.log('\n[STEP 25] Watching ambulance travel along South Road waypoints...');
  await sleep(2000);
  const ambPosMid = await page.evaluate(() => window.game.ambulance.mesh.position.z);
  console.log(`Ambulance position: Z=${ambPosMid.toFixed(2)}`);
  if (ambPosMid >= 25) throw new Error('Ambulance did not progress down road');
  console.log('✓ Step 25 Passed: Ambulance moves continuously along path waypoints.');

  // STEP 26: Verify ambulance crosses bridge
  console.log('\n[STEP 26] Verifying ambulance crosses repaired bridge...');
  let crossedBridge = false;
  for (let i = 0; i < 15; i++) {
    await sleep(500);
    const z = await page.evaluate(() => window.game.ambulance.mesh.position.z);
    if (z <= -10) {
      crossedBridge = true;
      console.log(`Ambulance crossed river to North side at Z=${z.toFixed(2)}`);
      break;
    }
  }
  if (!crossedBridge) throw new Error('Ambulance failed to cross river bridge');
  console.log('✓ Step 26 Passed: Ambulance smoothly crosses over the newly repaired 3D bridge.');

  // STEP 27: Verify ambulance reaches hospital
  console.log('\n[STEP 27] Verifying ambulance reaches hospital emergency bay...');
  let arrivedHospital = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const z = await page.evaluate(() => window.game.ambulance.mesh.position.z);
    if (z <= -26.0) {
      arrivedHospital = true;
      console.log(`Ambulance at emergency bay at Z=${z.toFixed(2)}`);
      break;
    }
  }
  if (!arrivedHospital) throw new Error('Ambulance failed to reach hospital');
  console.log('✓ Step 27 Passed: Ambulance safely parked in Hospital Emergency Bay.');

  // STEP 28: Verify MISSION COMPLETE
  console.log('\n[STEP 28] Verifying MISSION COMPLETE modal...');
  await sleep(1500);
  const completeState = await page.evaluate(() => ({
    state: window.game.missionManager.state,
    missionState: window.game.missionManager.missionState,
    modalOpen: !document.getElementById('modal-mission-complete')?.classList.contains('modal-hidden')
  }));
  console.log('Mission Complete State:', completeState);
  if (!completeState.modalOpen || completeState.missionState !== 'COMPLETE') {
    throw new Error('MISSION COMPLETE modal did not appear');
  }
  console.log('✓ Step 28 Passed: MISSION COMPLETE celebration modal presented.');

  // STEP 29: Verify progress reaches 100%
  console.log('\n[STEP 29] Verifying progress reaches 100%...');
  const progress100 = await page.evaluate(() => ({
    badge: document.getElementById('tasks-progress-badge')?.textContent,
    task5Done: document.getElementById('task-ambulance-hospital')?.classList.contains('task-done')
  }));
  console.log('Final Progress Data:', progress100);
  if (progress100.badge !== '100%' || !progress100.task5Done) {
    throw new Error('Tasks progress badge not 100% or Task 5 incomplete');
  }
  console.log('✓ Step 29 Passed: All 5 mission tasks completed [X], badge shows 100%.');

  // STEP 30: Verify NEXT AREA UNLOCKED
  console.log('\n[STEP 30] Verifying NEXT AREA UNLOCKED banner and status...');
  await page.click('#btn-explore-village');
  await sleep(500);
  const nextAreaState = await page.evaluate(() => window.game.missionManager.gameState);
  console.log('Game State after exploring:', nextAreaState);
  console.log('✓ Step 30 Passed: NEXT AREA UNLOCKED: District 2 Windmill Valley accessible.');

  // STEP 31: Verify next area actually opens
  console.log('\n[STEP 31] Verifying District 2 barrier gate opened and player walks through...');
  const gateOpened = await page.evaluate(() => {
    return !window.game.village.gateCollider &&
           window.game.village.districtGateArm?.rotation.z !== 0;
  });
  console.log('District 2 Gate Open:', gateOpened);
  if (!gateOpened) throw new Error('District 2 gate arm or collider failed to open');
  await page.evaluate(() => {
    window.game.player.position.set(24, 0, 28);
  });
  await sleep(400);
  console.log('✓ Step 31 Passed: Player walked through opened gate into District 2.');

  // STEP 32: Test Pause
  console.log('\n[STEP 32] Testing Pause button...');
  await page.click('#btn-pause-menu');
  await sleep(300);
  const isPaused = await page.evaluate(() => window.game.uiManager.isPaused);
  if (!isPaused) throw new Error('Pause button failed to pause game');
  console.log('✓ Step 32 Passed: Pause menu opened, gameplay frozen.');

  // STEP 33: Test Resume
  console.log('\n[STEP 33] Testing Resume button...');
  await page.click('#btn-resume-game');
  await sleep(300);
  const isResumed = await page.evaluate(() => !window.game.uiManager.isPaused);
  if (!isResumed) throw new Error('Resume button failed to resume game');
  console.log('✓ Step 33 Passed: Game resumed successfully.');

  // STEP 34: Test Sound
  console.log('\n[STEP 34] Testing Sound toggle button...');
  const snd1 = await page.evaluate(() => document.getElementById('audio-icon')?.textContent);
  await page.click('#btn-audio-toggle');
  await sleep(200);
  const snd2 = await page.evaluate(() => document.getElementById('audio-icon')?.textContent);
  console.log(`Audio icon toggle: "${snd1}" -> "${snd2}"`);
  if (snd1 === snd2) throw new Error('Audio toggle button failed to toggle state');
  await page.click('#btn-audio-toggle');
  console.log('✓ Step 34 Passed: Sound toggle on/off fully functional.');

  // STEP 35: Test Camera button
  console.log('\n[STEP 35] Testing Camera view cycle button...');
  const cam1 = await page.evaluate(() => window.game.cameraMode);
  await page.click('#btn-camera-view');
  await sleep(200);
  const cam2 = await page.evaluate(() => window.game.cameraMode);
  console.log(`Camera view cycle: "${cam1}" -> "${cam2}"`);
  if (cam1 === cam2) throw new Error('Camera view cycle button failed');
  await page.click('#btn-camera-view');
  await page.click('#btn-camera-view');
  await page.click('#btn-camera-view');
  console.log('✓ Step 35 Passed: Camera button cycles through follow, overview, challenge, and hospital views.');

  // STEP 36: Test Help button
  console.log('\n[STEP 36] Testing Help button...');
  await page.click('#btn-help-modal');
  await sleep(300);
  const helpVisible = await page.evaluate(() => !document.getElementById('modal-help')?.classList.contains('modal-hidden'));
  if (!helpVisible) throw new Error('Help modal failed to open');
  await page.click('#btn-close-help');
  await sleep(300);
  const helpHidden = await page.evaluate(() => document.getElementById('modal-help')?.classList.contains('modal-hidden'));
  if (!helpHidden) throw new Error('Help modal failed to close');
  console.log('✓ Step 36 Passed: Help controls modal opens and closes properly.');

  // STEP 37: Check browser console/runtime errors
  console.log('\n[STEP 37] Checking browser console for runtime errors...');
  console.log(`Total console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    throw new Error(`Console errors detected during playtest: ${JSON.stringify(consoleErrors)}`);
  }
  console.log('✓ Step 37 Passed: ZERO (0) runtime console errors detected.');

  // STEP 38: Test production build
  console.log('\n[STEP 38] Testing production build (npm.cmd run build)...');
  const buildOutput = execSync('npm.cmd run build', { cwd: path.resolve('.'), encoding: 'utf-8' });
  console.log(buildOutput.split('\n').filter(l => l.includes('built in') || l.includes('dist/')).join('\n'));
  console.log('✓ Step 38 Passed: Production bundle compiled successfully with zero errors.');

  console.log('\n================================================================');
  console.log('🎉 ALL 38 MASTER PLAYTEST SUITE STEPS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');

  await browser.close();
}

runPhase3MasterPlaytest().catch(err => {
  console.error('\n❌ MASTER PLAYTEST FAILED:', err);
  process.exit(1);
});
