import type { Ward } from "./types";
export type Vec3 = [number, number, number];
export interface Part {
  id: string;
  name: string;
  kind: string;
  position: Vec3;
  offset: Vec3;
  size: Vec3;
  color: string;
  connection: string;
  description: string;
  limitation: string;
  optional?: boolean;
}
export function kitParts(kit: Ward): Part[] {
  const common: Part[] = [
    {
      id: "housing",
      name: "Protected enclosure",
      kind: "enclosure",
      position: [0, 0.45, 0],
      offset: [0, -0.7, 0],
      size: [2.1, 0.8, 1.7],
      color: "#e3e9e9",
      connection: "Mechanical mounting",
      description:
        "Protected low-voltage controller housing with mounting points and a separate lid.",
      limitation:
        "Illustrative enclosure; cleaning compatibility and ingress rating are not validated.",
    },
    {
      id: "controller",
      name:
        kit === "GENERAL" ? "ESP32 Wi-Fi controller" : "ESP32 BLE / Wi-Fi node",
      kind: "board",
      position: [0, 0.55, 0],
      offset: [0, 0.75, 0],
      size: [1.3, 0.13, 0.9],
      color: "#244f46",
      connection:
        kit === "GENERAL"
          ? "SPI · GPIO · Wi-Fi"
          : "BLE radio observations · GPIO · Wi-Fi",
      description:
        kit === "GENERAL"
          ? "Collects the reader and dispenser observations and forwards timestamped events."
          : "Uses the ESP32’s integrated BLE scanner; no separate mandatory receiver PCB.",
      limitation:
        "Board-specific pinout pending hardware verification. 3.3 V logic; USB supply depends on board.",
    },
    {
      id: "lid",
      name: "Removable protective lid",
      kind: "lid",
      position: [0, 0.85, 0],
      offset: [0, 2.1, 0],
      size: [2.1, 0.12, 1.7],
      color: "#edf2f2",
      connection: "Mechanical attachment",
      description:
        "Closes the controller enclosure. Ghost mode reveals the protected electronics.",
      limitation: "No claim of a certified medical enclosure.",
    },
    {
      id: "dispenser",
      name: "Bedside pump dispenser",
      kind: "dispenser",
      position: [3.2, 0.7, 0],
      offset: [0.9, 0, 0],
      size: [0.9, 1.5, 0.8],
      color: "#eff2ef",
      connection: "Mechanical actuation",
      description:
        "A separate bedside dispenser with a pump and protected actuation sensing point.",
      limitation:
        "An activation does not prove product delivery, hand coverage, or hygiene quality.",
    },
    {
      id: "switch",
      name: "Activation microswitch",
      kind: "switch",
      position: [3.2, 1.5, 0],
      offset: [0.9, 1.1, 0],
      size: [0.45, 0.12, 0.25],
      color: "#2f3742",
      connection: "GPIO input",
      description:
        "Illustrative switch beneath the pump actuation path sends a digital input.",
      limitation:
        "Mounting must be adapted to the selected dispenser and reviewed for fluid isolation.",
    },
    {
      id: "led",
      name: "Status LED + resistor",
      kind: "led",
      position: [0.65, 0.94, 0.52],
      offset: [1.0, 1.4, 0.6],
      size: [0.17, 0.17, 0.17],
      color: "#38b5a0",
      connection: "GPIO / current limiting",
      description:
        "Provides a local visual prompt with current limiting support.",
      limitation: "Indicator state is advisory and never blocks care.",
    },
    {
      id: "buzzer",
      name: "Buzzer + driver stage",
      kind: "buzzer",
      position: [-0.63, 0.59, 0.45],
      offset: [-1.3, 1.35, 0.6],
      size: [0.32, 0.23, 0.32],
      color: "#29333d",
      connection: "GPIO / buffered driver",
      description:
        "A local audible prompt through an appropriate driver/interface.",
      limitation:
        "GPIO cannot be assumed to power an arbitrary buzzer directly.",
    },
    {
      id: "power",
      name: "Protected power input",
      kind: "power",
      position: [0, 0.45, 0.9],
      offset: [0, 0.2, 1.5],
      size: [0.55, 0.2, 0.3],
      color: "#8c999e",
      connection: "Power",
      description:
        "Board-appropriate protected USB / low-voltage input and regulated logic supply.",
      limitation:
        "Do not connect 5 V logic to ESP32 GPIO. No finalized electrical design.",
    },
    {
      id: "mount",
      name: "Mounting bracket",
      kind: "mount",
      position: [0, -0.12, 0],
      offset: [0, -0.9, 0],
      size: [2.25, 0.12, 1.9],
      color: "#a6b3bb",
      connection: "Mechanical mounting",
      description: "Wall mounting support and protected connector routing.",
      limitation: "Placement and cleaning clearance need site review.",
    },
    {
      id: "optional",
      name: "Optional proximity sensor",
      kind: "sensor",
      position: [-1.7, 0.2, 1.6],
      offset: [-1, 0, 0.5],
      size: [0.6, 0.2, 0.4],
      color: "#47695a",
      connection: "Optional GPIO input",
      description:
        "Additional anonymous presence evidence if configured by the hospital.",
      limitation: "Optional. Does not identify staff or prove patient contact.",
      optional: true,
    },
    {
      id: "gateway",
      name: "External Wi-Fi gateway",
      kind: "gateway",
      position: [-3.5, 0.2, -2.2],
      offset: [-0.4, 0, 0],
      size: [1.2, 0.28, 0.8],
      color: "#c5d2d6",
      connection: "Wi-Fi network · dashed radio",
      description:
        "External shared network; forwards observations to the local backend.",
      limitation:
        "Wireless connectivity is simulated. Not wired to the wearable.",
    },
  ];
  if (kit === "GENERAL")
    common.splice(
      3,
      0,
      {
        id: "reader",
        name: "RC522 short-range reader",
        kind: "reader",
        position: [-2.4, 0.35, 0],
        offset: [-0.8, 0.7, 0],
        size: [1.1, 0.12, 1.5],
        color: "#326c98",
        connection: "SPI data · 3.3 V-rated module",
        description:
          "Deliberate registered badge tap at the bed entry. Reader and controller are separate components.",
        limitation:
          "Not long-range person detection. SPI pin mapping is board-specific TBD.",
      },
      {
        id: "badge",
        name: "Detachable staff badge",
        kind: "badge",
        position: [-3.6, 0.2, 1.6],
        offset: [-0.4, 1.1, 0.5],
        size: [0.75, 0.08, 1.1],
        color: "#f0eee6",
        connection: "Short-range RFID radio",
        description:
          "Carried staff identity token mapped on the backend. No patient data on card.",
        limitation:
          "The badge is a separate accessory, never soldered or wired to the enclosure.",
      },
    );
  else
    common.splice(
      3,
      0,
      {
        id: "tag",
        name: "Independent BLE wearable",
        kind: "tag",
        position: [-2.6, 0.3, 0.6],
        offset: [-1.0, 1.0, 0.6],
        size: [0.65, 0.2, 0.8],
        color: "#41a69b",
        connection: "BLE radio observations · dashed",
        description:
          "Separate battery-powered tag broadcasts an identity reference to nearby ESP32 nodes.",
        limitation:
          "RSSI estimates are uncertain. No precise distance or hard zone boundary.",
      },
      {
        id: "battery",
        name: "Wearable battery detail",
        kind: "battery",
        position: [-2.6, 0.22, 0.6],
        offset: [-1, -0.6, 0.6],
        size: [0.35, 0.07, 0.35],
        color: "#aab3b9",
        connection: "Wearable-local power",
        description:
          "Independent battery inside the wearable; electrically separate from the node.",
        limitation:
          "Battery model, monitoring capability, and lifetime remain unverified.",
      },
    );
  return common;
}
export function partPosition(p: Part, progress: number): Vec3 {
  return p.position.map((v, i) => v + p.offset[i] * progress) as Vec3;
}
export function equipmentMetadata(kind: string, ward: Ward): Part | undefined {
  const id =
    kind === "RFID"
      ? "reader"
      : kind === "BLE"
        ? "controller"
        : kind === "DISPENSER"
          ? "dispenser"
          : undefined;
  return kitParts(ward).find((p) => p.id === id);
}
