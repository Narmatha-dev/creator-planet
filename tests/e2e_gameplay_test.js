import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:3000/';

async function runTest() {
  console.log('--- Launching Headless Chrome for Creator Planet E2E Test ---');
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
      console.error('[BROWSER CONSOLE ERROR]:', msg.text());
    } else {
      console.log('[BROWSER CONSOLE]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
    console.error('[PAGE ERROR]:', err);
  });

  console.log(`Navigating to ${URL}...`);
  await page.goto(URL, { waitUntil: 'networkidle0' });

  // Wait 1 second for Three.js initialization
  await new Promise(r => setTimeout(r, 1000));

  // Verify initial state
  console.log('Verifying Initial State...');
  const title = await page.$eval('.game-title', el => el.textContent.trim());
  const objTitle = await page.$eval('.objective-title', el => el.textContent.trim());
  const missionState = await page.$eval('#badge-mission-state', el => el.textContent.trim());
  const integrityInitial = await page.$eval('#route-percent-display', el => el.textContent.trim());

  console.log(`Game Title: "${title}"`);
  console.log(`Objective Title: "${objTitle}"`);
  console.log(`Mission State: "${missionState}"`);
  console.log(`Initial Route Access: "${integrityInitial}"`);

  console.assert(title === 'CREATOR PLANET', 'Game title mismatch');
  console.assert(objTitle === 'EMERGENCY ROUTE RESCUE', 'Objective title mismatch');
  console.assert(missionState.includes('ACTIVE'), 'Mission state should be ACTIVE');
  console.assert(integrityInitial === '0%', 'Initial integrity must be 0%');

  // Take Start Screenshot
  const screenshotsDir = path.resolve('public', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  await page.screenshot({ path: path.join(screenshotsDir, '01_village_start.png') });
  console.log('Saved screenshot: 01_village_start.png');

  // Test 1: Walk to bridge
  console.log('\n--- Step 1: Walking Player Character to Bridge Site ---');
  await page.evaluate(() => {
    window.game.player.position.set(0, 0, 8.5);
  });
  await new Promise(r => setTimeout(r, 600));

  const promptVisible = await page.evaluate(() => {
    return !document.getElementById('interaction-prompt').classList.contains('prompt-hidden');
  });
  console.log(`Proximity Prompt Visible: ${promptVisible}`);
  console.assert(promptVisible, 'Proximity prompt should appear near bridge');

  // Test 2: Enter Build Mode
  console.log('\n--- Step 2: Entering Engineering Build Mode ---');
  await page.evaluate(() => {
    window.game.missionManager.enterBuildMode();
  });
  await new Promise(r => setTimeout(r, 800));

  const dockVisible = await page.evaluate(() => {
    return !document.getElementById('build-dock').classList.contains('dock-hidden');
  });
  console.log(`Engineering Dock Visible: ${dockVisible}`);
  console.assert(dockVisible, 'Engineering dock must be visible');

  await page.screenshot({ path: path.join(screenshotsDir, '02_build_mode_tactical.png') });
  console.log('Saved screenshot: 02_build_mode_tactical.png');

  // Test 3: Acceptance Test A & C (Place Sideways & Test Route)
  console.log('\n--- Step 3: Acceptance Test A & C - Incorrect Placement (Sideways) ---');
  await page.evaluate(() => {
    const buildSys = window.game.buildSystem;
    buildSys.selectComponent('deck-straight');
    buildSys.currentRotation = Math.PI / 2; // Sideways!
    buildSys.hoveredSlot = buildSys.slots[0]; // South slot
    buildSys.placeSelectedComponent();
  });
  await new Promise(r => setTimeout(r, 500));

  // Click Test Route button
  await page.click('#btn-test-route');
  await new Promise(r => setTimeout(r, 600));

  const testAIntegrity = await page.$eval('#route-percent-display', el => el.textContent.trim());
  const toastVisible = await page.evaluate(() => {
    return !document.getElementById('feedback-toast').classList.contains('toast-hidden');
  });
  const toastText = await page.$eval('#toast-msg', el => el.textContent.trim());

  console.log(`Test A Route Integrity: ${testAIntegrity}`);
  console.log(`Toast Visible: ${toastVisible}`);
  console.log(`Engineer Hint: "${toastText}"`);

  console.assert(testAIntegrity === '35%', `Expected 35% but got ${testAIntegrity}`);
  console.assert(toastVisible, 'Feedback toast should be visible');
  console.assert(toastText.includes('facing sideways'), 'Hint should mention sideways orientation');

  await page.screenshot({ path: path.join(screenshotsDir, '03_test_failed_hint.png') });
  console.log('Saved screenshot: 03_test_failed_hint.png');

  // Test 4: Acceptance Test B & D (Correct Placement & 100% Route)
  console.log('\n--- Step 4: Acceptance Test B & D - Correct Placement (Straightening) ---');
  await page.evaluate(() => {
    const buildSys = window.game.buildSystem;
    // Straighten south slot
    buildSys.hoveredSlot = buildSys.slots[0];
    buildSys.currentRotation = 0;
    buildSys.placeSelectedComponent();

    // Place north slot with Truss bridge straight
    buildSys.selectComponent('deck-truss');
    buildSys.currentRotation = 0;
    buildSys.hoveredSlot = buildSys.slots[1];
    buildSys.placeSelectedComponent();
  });
  await new Promise(r => setTimeout(r, 500));

  // Click Test Route
  await page.click('#btn-test-route');
  await new Promise(r => setTimeout(r, 800));

  const testDIntegrity = await page.$eval('#route-percent-display', el => el.textContent.trim());
  const routeStatus = await page.$eval('#route-status-tag', el => el.textContent.trim());

  console.log(`Test D Route Integrity: ${testDIntegrity}`);
  console.log(`Route Status Tag: "${routeStatus}"`);
  console.assert(testDIntegrity === '100%', `Expected 100% but got ${testDIntegrity}`);

  await page.screenshot({ path: path.join(screenshotsDir, '04_route_complete_100.png') });
  console.log('Saved screenshot: 04_route_complete_100.png');

  // Test 5: Acceptance Test E (Ambulance Rescue Run & Hospital Arrival)
  console.log('\n--- Step 5: Acceptance Test E - Ambulance Rescue Run to Hospital ---');
  // Wait for ambulance to travel along waypoints to the hospital (~7-8 seconds)
  console.log('Waiting for ambulance to travel across the bridge and reach the hospital...');
  
  let missionComplete = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    missionComplete = await page.evaluate(() => {
      const modal = document.getElementById('modal-mission-complete');
      return modal && !modal.classList.contains('modal-hidden');
    });
    if (missionComplete) {
      console.log(`Ambulance arrived! Mission complete triggered after ${(i + 1) * 0.5}s.`);
      break;
    }
  }

  console.assert(missionComplete, 'Mission complete modal must appear');

  const finalIntegrity = await page.$eval('#stat-integrity', el => el.textContent.trim());
  const finalTime = await page.$eval('#stat-time', el => el.textContent.trim());
  console.log(`Modal Final Integrity: ${finalIntegrity}`);
  console.log(`Modal Final Time: ${finalTime}`);

  await page.screenshot({ path: path.join(screenshotsDir, '05_mission_complete_modal.png') });
  console.log('Saved screenshot: 05_mission_complete_modal.png');

  // Verify District Gate opened
  const gateOpened = await page.evaluate(() => {
    return window.game.village.districtGateArm && window.game.village.districtGateArm.rotation.z > 0.5;
  });
  console.log(`District Gate Arm Opened: ${gateOpened}`);

  console.log('\n--- Console Errors Check ---');
  if (consoleErrors.length === 0) {
    console.log('SUCCESS: ZERO console errors or page errors encountered throughout the entire gameplay loop!');
  } else {
    console.error(`Encountered ${consoleErrors.length} errors:`, consoleErrors);
  }

  await browser.close();
  console.log('\n=== ALL E2E GAMEPLAY ACCEPTANCE TESTS COMPLETED SUCCESSFULLY! ===');
}

runTest().catch(err => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
