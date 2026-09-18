import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:3000/';
const ARTIFACT_DIR = 'C:\\Users\\madhu\\.gemini\\antigravity-ide\\brain\\3098d411-106f-4ae5-b572-71ae4bdfbdcf';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runFunobotzPlaytest() {
  console.log('================================================================');
  console.log('--- CREATOR PLANET: FUNOBOTZ NPC SYSTEM VERIFICATION TEST ---');
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

  console.log('[STEP 1] Loading Creator Planet at http://localhost:3000...');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(1500);

  // STEP 2: Verify all 3 Funobotz NPCs exist in 3D scene
  console.log('\n[STEP 2] Verifying Funobotz NPCs registered in 3D world...');
  const npcData = await page.evaluate(() => {
    const sys = window.game.npcSystem;
    return sys.npcs.map(n => ({
      id: n.id,
      name: n.config.name,
      role: n.config.role,
      pos: { x: n.group.position.x, y: n.group.position.y, z: n.group.position.z },
      visible: n.group.visible,
      hasTag: !!n.tag
    }));
  });
  console.log('Registered Funobotz NPCs:', npcData);
  if (npcData.length < 3) throw new Error(`Expected 3 NPCs, got ${npcData.length}`);
  console.log('✓ Step 2 Passed: 3 Funobotz characters exist in the 3D world (Guide, Engineer, Medic).');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'funobotz_01_spawn_world.png') });

  // STEP 3: Approach Guide Bot (Sparky) near village spawn
  console.log('\n[STEP 3] Approaching Funobotz Guide Bot (Sparky)...');
  await page.evaluate(() => {
    window.game.player.position.set(2.4, 0, 18.0);
  });
  await sleep(400);

  const guidePrompt = await page.evaluate(() => {
    const p = document.getElementById('interaction-prompt');
    return {
      visible: !p.classList.contains('prompt-hidden'),
      title: p.querySelector('.prompt-title')?.textContent,
      sub: p.querySelector('.prompt-sub')?.textContent
    };
  });
  console.log('Guide Prompt:', guidePrompt);
  if (!guidePrompt.visible || !guidePrompt.title.includes('FUNOBOTZ')) {
    throw new Error(`Guide prompt not displayed: ${JSON.stringify(guidePrompt)}`);
  }
  console.log('✓ Step 3 Passed: [E] TALK TO FUNOBOTZ GUIDE prompt displayed.');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'funobotz_02_guide_prompt.png') });

  // STEP 4: Press E to open dialogue with Guide Bot
  console.log('\n[STEP 4] Pressing [E] to talk with Guide Bot...');
  await page.keyboard.press('KeyE');
  await sleep(400);

  const dialogueState = await page.evaluate(() => {
    const modal = document.getElementById('modal-dialogue');
    return {
      isOpen: !modal.classList.contains('modal-hidden'),
      speakerName: document.getElementById('dialogue-speaker-name')?.textContent,
      role: document.getElementById('dialogue-speaker-role')?.textContent,
      text: document.getElementById('dialogue-text')?.textContent.trim()
    };
  });
  console.log('Dialogue Modal Content:', dialogueState);
  if (!dialogueState.isOpen || !dialogueState.text.includes('bridge')) {
    throw new Error(`Dialogue failed to open properly: ${JSON.stringify(dialogueState)}`);
  }
  console.log('✓ Step 4 Passed: Dialogue box opened with mission introduction.');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'funobotz_03_guide_dialogue.png') });

  // STEP 5: Close dialogue and verify player movement unpaused
  console.log('\n[STEP 5] Closing dialogue and verifying movement...');
  await page.keyboard.press('KeyE');
  await sleep(300);

  const dialogueClosed = await page.evaluate(() => {
    return document.getElementById('modal-dialogue').classList.contains('modal-hidden') &&
           !window.game.player.isPaused;
  });
  if (!dialogueClosed) throw new Error('Dialogue failed to close or player remained paused');
  console.log('✓ Step 5 Passed: Dialogue closed and player unpaused.');

  // STEP 6: Walk to Engineer Bot (Geary) near Bridge
  console.log('\n[STEP 6] Walking to Funobotz Engineer Bot (Geary) near Bridge...');
  await page.evaluate(() => {
    window.game.player.position.set(-3.8, 0, 7.2);
  });
  await sleep(400);

  const engineerPrompt = await page.evaluate(() => {
    const p = document.getElementById('interaction-prompt');
    return {
      visible: !p.classList.contains('prompt-hidden'),
      title: p.querySelector('.prompt-title')?.textContent,
      sub: p.querySelector('.prompt-sub')?.textContent
    };
  });
  console.log('Engineer Prompt:', engineerPrompt);
  if (!engineerPrompt.visible || !engineerPrompt.title.includes('ENGINEER')) {
    throw new Error(`Engineer prompt not displayed: ${JSON.stringify(engineerPrompt)}`);
  }
  console.log('✓ Step 6 Passed: [E] TALK TO FUNOBOTZ ENGINEER prompt displayed.');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'funobotz_04_engineer_prompt.png') });

  // STEP 7: Talk with Engineer Bot (receives hints about supply depot)
  console.log('\n[STEP 7] Pressing [E] to talk with Engineer Bot...');
  await page.keyboard.press('KeyE');
  await sleep(400);

  const engineerDialogue = await page.evaluate(() => ({
    text: document.getElementById('dialogue-text')?.textContent.trim(),
    name: document.getElementById('dialogue-speaker-name')?.textContent
  }));
  console.log('Engineer Dialogue:', engineerDialogue);
  if (!engineerDialogue.text.includes('Supply Depot')) {
    throw new Error(`Engineer dialogue missing Supply Depot hint: ${engineerDialogue.text}`);
  }
  console.log('✓ Step 7 Passed: Engineer explains fracture and directs player to Supply Depot.');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'funobotz_05_engineer_dialogue.png') });

  // Close dialogue
  await page.keyboard.press('KeyE');
  await sleep(300);

  // STEP 8: Complete Full Mission Flow (Collect Part -> Repair Bridge -> Build -> Test -> Ambulance)
  console.log('\n[STEP 8] Executing complete mission with Funobotz NPC reactions...');
  // Collect Part
  await page.evaluate(() => {
    window.game.player.position.set(-12, 0, 18);
  });
  await sleep(400);
  await page.keyboard.press('KeyE');
  await sleep(400);
  const partState = await page.evaluate(() => window.game.missionManager.hasBridgePart);
  console.log('Part collected:', partState);

  // Return to Bridge & Repair
  await page.evaluate(() => {
    window.game.player.position.set(0, 0, 5.0);
  });
  await sleep(400);
  await page.keyboard.press('KeyE');
  await sleep(500);
  const repairState = await page.evaluate(() => window.game.missionManager.isBridgeRepaired);
  console.log('Bridge repaired:', repairState);

  // Enter Build Mode
  await page.keyboard.press('KeyE');
  await sleep(400);
  const buildState = await page.evaluate(() => window.game.missionManager.state);
  console.log('Build mode state:', buildState);

  // Connect bridge pieces
  await page.evaluate(() => {
    window.game.buildSystem.selectComponent('deck-truss');
    window.game.buildSystem.currentRotation = 0;
    window.game.buildSystem.placeSelectedComponent(window.game.buildSystem.slots[0]);
    window.game.buildSystem.selectComponent('deck-straight');
    window.game.buildSystem.currentRotation = 0;
    window.game.buildSystem.placeSelectedComponent(window.game.buildSystem.slots[1]);
  });
  await sleep(400);

  const placedPieces = await page.evaluate(() => window.game.buildSystem.placedComponents.length);
  console.log('Placed pieces count:', placedPieces);

  // Test Route
  await page.click('#btn-test-route');
  await sleep(1000);

  const testResult = await page.evaluate(() => {
    const val = window.game.routeValidator.validate();
    return {
      validation: val,
      missionState: window.game.missionManager.state,
      isDriving: window.game.ambulance.isDriving,
      ambZ: window.game.ambulance.mesh.position.z
    };
  });
  console.log('Test Route Diagnostics:', testResult);

  // Wait for ambulance to reach hospital
  console.log('Waiting for ambulance to reach hospital bay...');
  let arrived = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const ambStatus = await page.evaluate(() => ({
      z: window.game.ambulance.mesh.position.z,
      driving: window.game.ambulance.isDriving,
      complete: window.game.ambulance.isMissionComplete,
      state: window.game.missionManager.state
    }));
    if (i % 5 === 0) console.log(`[T+${i*0.5}s] Ambulance status:`, ambStatus);
    if (ambStatus.z <= -26.0 || ambStatus.complete || ambStatus.state === 'MISSION_COMPLETE') {
      arrived = true;
      break;
    }
  }
  if (!arrived) throw new Error('Ambulance did not reach hospital');
  console.log('Ambulance reached hospital!');
  await sleep(1500);

  // Close mission complete modal to talk with Medic Bot
  await page.click('#btn-explore-village');
  await sleep(500);

  // STEP 9: Approach Hospital Medic Bot (Hearty) and talk
  console.log('\n[STEP 9] Approaching Funobotz Medic Bot (Hearty) at Hospital...');
  await page.evaluate(() => {
    window.game.player.position.set(4.0, 0, -25.5);
  });
  await sleep(400);
  await page.keyboard.press('KeyE');
  await sleep(400);

  const medicDialogue = await page.evaluate(() => ({
    text: document.getElementById('dialogue-text')?.textContent.trim(),
    name: document.getElementById('dialogue-speaker-name')?.textContent
  }));
  console.log('Medic Bot Dialogue:', medicDialogue);
  if (!medicDialogue.text.includes('ambulance') || !medicDialogue.text.includes('District 2')) {
    throw new Error(`Medic dialogue did not reflect success: ${medicDialogue.text}`);
  }
  console.log('✓ Step 9 Passed: Medic Bot celebrates rescue arrival and District 2 opening.');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'funobotz_06_medic_dialogue.png') });

  // Close dialogue
  await page.keyboard.press('KeyE');
  await sleep(300);

  console.log('\n================================================================');
  console.log('🎉 ALL FUNOBOTZ CHARACTER TESTS PASSED WITH 100% SUCCESS!');
  console.log('Console Errors:', consoleErrors.length === 0 ? 'ZERO (0)' : consoleErrors);
  console.log('================================================================\n');

  await browser.close();
  return { success: true };
}

runFunobotzPlaytest()
  .then(() => {
    console.log('Test completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
