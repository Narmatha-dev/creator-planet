import * as THREE from 'three';

export class RouteValidator {
  constructor(buildSystem) {
    this.buildSystem = buildSystem;
  }

  validate() {
    const southSlot = this.buildSystem.slots[0];
    const northSlot = this.buildSystem.slots[1];

    const southOccupied = southSlot.occupied;
    const northOccupied = northSlot.occupied;

    // Check alignment helper: rotation should be 0 or Math.PI (allow small epsilon)
    const isAligned = (comp) => {
      if (!comp) return false;
      const rot = Math.abs(comp.rotation % Math.PI);
      return rot < 0.1 || Math.abs(rot - Math.PI) < 0.1;
    };

    const southAligned = southOccupied ? isAligned(southOccupied) : false;
    const northAligned = northOccupied ? isAligned(northOccupied) : false;

    // Segments breakdown: START -> ROAD -> BRIDGE -> ROAD -> HOSPITAL
    const segments = {
      start: true,
      road1: true,
      southSpan: southOccupied && southAligned,
      midPier: southOccupied && northOccupied && southAligned && northAligned,
      northSpan: northOccupied && northAligned,
      road2: true,
      hospital: true
    };

    let percentage = 0;
    let hint = "";
    let success = false;

    // Case 1: Completely empty
    if (!southOccupied && !northOccupied) {
      percentage = 0;
      hint = "Adjust the bridge connection. The river gap is completely open! Choose ROAD or BRIDGE and snap it across the sockets.";
    }
    // Case 2: Only south span placed
    else if (southOccupied && !northOccupied) {
      if (!southAligned) {
        percentage = 35;
        hint = "Adjust the bridge connection. The south bridge deck is facing sideways! Press [R] to rotate it parallel to the road, and span the remaining river gap.";
      } else {
        percentage = 60;
        hint = "Adjust the bridge connection. The south span is placed, but the ambulance still faces open water before reaching the hospital.";
      }
    }
    // Case 3: Only north span placed
    else if (!southOccupied && northOccupied) {
      if (!northAligned) {
        percentage = 35;
        hint = "Adjust the bridge connection. The north deck is facing sideways! Rotate it with [R], and place a southern deck to connect with the town road.";
      } else {
        percentage = 60;
        hint = "Adjust the bridge connection. The north section is placed, but there is a gap on the south side. Place another deck to complete the bridge.";
      }
    }
    // Case 4: Both spans placed
    else if (southOccupied && northOccupied) {
      if (!southAligned && !northAligned) {
        percentage = 50;
        hint = "Adjust the bridge connection. Both bridge decks are placed sideways! Use [R] to rotate them so traffic can drive straight through.";
      } else if (!southAligned && northAligned) {
        percentage = 70;
        hint = "Adjust the bridge connection. The south deck is rotated 90 degrees across the roadway. Select it and press [R] to straighten the approach.";
      } else if (southAligned && !northAligned) {
        percentage = 70;
        hint = "Adjust the bridge connection. The north bridge segment is facing sideways! Rotate it [R] to align with the hospital access road.";
      } else {
        // 100% Connected!
        percentage = 100;
        success = true;
        hint = "ROUTE TEST SUCCESS: All bridge decks are structurally aligned and locked to anchor piers! Route connected!";
      }
    }

    const routeAccessText = success ? "ROUTE ACCESS: 100%" : (percentage > 0 ? "ROUTE ACCESS: PARTIAL" : "ROUTE ACCESS: 0%");
    const statusText = success ? "ROUTE CONNECTED!" : "Bridge connection is incomplete.";
    const testStatus = success ? "ROUTE TEST SUCCESS" : "ROUTE TEST FAILED";

    return {
      success,
      percentage,
      routeAccessText,
      statusText,
      testStatus,
      segments,
      hint
    };
  }
}
