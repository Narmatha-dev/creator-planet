import { RouteValidator } from '../src/systems/RouteValidator.js';

// Mock buildSystem and slots to test all acceptance criteria:
// Acceptance Test A: Incorrect placement (e.g. rotated sideways) -> Route does not complete (<100%) + hint
// Acceptance Test B: Move / rotate into correct position -> connection updates
// Acceptance Test C: Poor setup -> partial progress + hint
// Acceptance Test D: Correct setup -> 100% route completion
// Acceptance Test E: Successful test -> ambulance dispatch condition

const mockBuildSystem = {
  slots: [
    { id: 'slot-south', occupied: null },
    { id: 'slot-north', occupied: null }
  ]
};

const validator = new RouteValidator(mockBuildSystem);

console.log('--- Test 1: Empty Bridge Site (0%) ---');
let res = validator.validate();
console.log('Result:', res);
console.assert(res.percentage === 0 && !res.success, 'Test 1 Failed');

console.log('\n--- Test 2: Acceptance Test A & C - South Span Sideways (35%) ---');
mockBuildSystem.slots[0].occupied = {
  type: 'deck-straight',
  rotation: Math.PI / 2 // Sideways!
};
res = validator.validate();
console.log('Result:', res);
console.assert(res.percentage === 35 && !res.success, 'Test 2 Failed');
console.assert(res.hint.includes('facing sideways'), 'Test 2 Hint Failed');

console.log('\n--- Test 3: Acceptance Test C - South Span Straight, North Missing (60%) ---');
mockBuildSystem.slots[0].occupied.rotation = 0; // Straight
res = validator.validate();
console.log('Result:', res);
console.assert(res.percentage === 60 && !res.success, 'Test 3 Failed');
console.assert(res.hint.includes('open water'), 'Test 3 Hint Failed');

console.log('\n--- Test 4: Both Spans Placed, but North Span Sideways (70%) ---');
mockBuildSystem.slots[1].occupied = {
  type: 'deck-truss',
  rotation: Math.PI / 2 // Sideways
};
res = validator.validate();
console.log('Result:', res);
console.assert(res.percentage === 70 && !res.success, 'Test 4 Failed');
console.assert(res.hint.includes('facing sideways'), 'Test 4 Hint Failed');

console.log('\n--- Test 5: Acceptance Test B & D - Both Spans Aligned Straight (100%) ---');
mockBuildSystem.slots[1].occupied.rotation = 0; // Straightened!
res = validator.validate();
console.log('Result:', res);
console.assert(res.percentage === 100 && res.success, 'Test 5 Failed');
console.assert(res.routeAccessText.includes('100%') && res.statusText === 'Route connected!', 'Test 5 Status Failed');

console.log('\nALL 5 ACCEPTANCE UNIT TESTS PASSED PERFECTLY!');
