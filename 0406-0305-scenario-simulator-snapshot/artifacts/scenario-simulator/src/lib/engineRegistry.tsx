/**
 * Thin shell → engine lookup. App.tsx mounts these; do not grow this into a framework.
 */
import React from "react";
import FacilitatePage from "../pages/facilitate";
import MartFacilitate from "../pages/mart-facilitate";
import JoinScreen from "../pages/join";
import MartJoin from "../pages/mart-join";
import MartApp from "../pages/MartApp";
import SimulationApp from "../simulation/SimulationApp";
import PrintPack from "../pages/print";
import { engineOf, type ExerciseEngine } from "./engineContract";

export type EngineRouteBundle = {
  format: ExerciseEngine;
  Join: React.ComponentType;
  Play: React.ComponentType<{ mode?: "try" }>;
  Facilitate: React.ComponentType;
  Print: React.ComponentType | null;
};

const investigation: EngineRouteBundle = {
  format: "investigation",
  Join: JoinScreen,
  Play: SimulationApp,
  Facilitate: FacilitatePage,
  Print: PrintPack,
};

const branching: EngineRouteBundle = {
  format: "branching",
  Join: MartJoin,
  Play: MartApp,
  Facilitate: MartFacilitate,
  Print: null,
};

export function engineRoutes(format: string): EngineRouteBundle {
  return format === "branching" ? branching : investigation;
}

export function enginePrintPath(format: string, workshopCode: string): string | null {
  return engineOf(format).printPath(workshopCode);
}
