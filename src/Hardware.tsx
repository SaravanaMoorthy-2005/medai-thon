import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line, ContactShadows } from "@react-three/drei";
import { Group, Vector3, MeshBasicMaterial } from "three";
import { kitParts, partPosition, type Part } from "../shared/hardware";
import type { Ward } from "../shared/types";
import { Box, Cylinder } from "./Equipment";
import { api, safely } from "./api";
import {
  RotateCcw,
  Play,
  Pause,
  Layers,
  Maximize2,
  Radio,
  Focus,
} from "lucide-react";

function PartMesh({
  part,
  progress,
  selected,
  ghost,
  onSelect,
}: {
  part: Part;
  progress: number;
  selected: boolean;
  ghost: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    ref.current?.position.lerp(
      new Vector3(...partPosition(part, progress)),
      1 - Math.exp(-dt * 7),
    );
  });
  const color = selected ? "#daaf66" : part.color;
  return (
    <group
      ref={ref}
      position={part.position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {["enclosure", "lid"].includes(part.kind) ? (
        <mesh castShadow>
          <boxGeometry args={part.size} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={ghost ? 0.2 : 0.85}
            depthWrite={!ghost}
            roughness={0.4}
          />
        </mesh>
      ) : (
        <Box
          size={part.size}
          color={color}
          metal={part.kind === "power" ? 0.8 : 0.1}
        />
      )}
      {part.kind === "board" && (
        <>
          <Box
            position={[0, 0.12, 0]}
            size={[0.55, 0.1, 0.5]}
            color="#aebabe"
            metal={0.7}
          />
          <Box
            position={[0.45, 0.09, 0]}
            size={[0.22, 0.06, 0.65]}
            color="#222f32"
          />
          {[-1, 1].flatMap((s) =>
            Array.from({ length: 9 }, (_, i) => (
              <Box
                key={`${s}-${i}`}
                position={[-0.5 + i * 0.12, 0.04, s * 0.48]}
                size={[0.04, 0.12, 0.13]}
                color="#c3af67"
                metal={0.8}
              />
            )),
          )}
        </>
      )}
      {part.kind === "reader" && (
        <>
          {[1, 0.8, 0.6].map((s) => (
            <Line
              key={s}
              points={[
                [-0.48 * s, 0.08, -0.65 * s],
                [0.48 * s, 0.08, -0.65 * s],
                [0.48 * s, 0.08, 0.65 * s],
                [-0.48 * s, 0.08, 0.65 * s],
                [-0.48 * s, 0.08, -0.65 * s],
              ]}
              color="#c6d6df"
              lineWidth={1}
            />
          ))}
          <Box
            position={[0, 0.11, -0.28]}
            size={[0.25, 0.08, 0.25]}
            color="#26343c"
          />
        </>
      )}
      {part.kind === "dispenser" && (
        <>
          <Box
            position={[0, 0.85, 0.2]}
            size={[0.95, 0.12, 0.9]}
            color="#aebfc2"
            metal={0.4}
          />
          <Box
            position={[0, 0.1, 0.405]}
            size={[0.5, 0.65, 0.01]}
            color="#a4cbc9"
          />
          <Box
            position={[0, 0.65, 0.5]}
            size={[0.1, 0.3, 0.12]}
            color="#718a94"
          />
        </>
      )}
      {part.kind === "badge" && (
        <>
          <Box
            position={[0, 0.046, -0.2]}
            size={[0.6, 0.012, 0.24]}
            color="#3679aa"
          />
          <Box
            position={[0, 0.046, 0.2]}
            size={[0.4, 0.012, 0.08]}
            color="#a1b2bc"
          />
        </>
      )}
      {part.kind === "switch" && (
        <Box
          position={[0, 0.13, 0]}
          rotation={[0, 0, 0.2]}
          size={[0.55, 0.035, 0.07]}
          color="#afbabd"
          metal={0.7}
        />
      )}
      {part.kind === "gateway" &&
        [-0.45, 0.45].map((x) => (
          <Cylinder
            key={x}
            position={[x, 0.5, -0.3]}
            radius={0.025}
            height={0.75}
            color="#6f8995"
          />
        ))}
      {part.kind === "led" && (
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial
            color="#5bc9a9"
            emissive="#226f54"
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
      {part.kind === "buzzer" && (
        <Cylinder
          position={[0, 0.17, 0]}
          radius={0.16}
          height={0.15}
          color="#16272e"
        />
      )}
    </group>
  );
}

function DiagramMode({ enabled }: { enabled: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    const material = new MeshBasicMaterial({
      wireframe: true,
      color: "#5c7f7d",
    });
    scene.overrideMaterial = enabled ? material : null;
    return () => {
      scene.overrideMaterial = null;
      material.dispose();
    };
  }, [scene, enabled]);
  return null;
}
function FitAssemblyCamera({ preset }: { preset: string }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const factor = Math.max(1, 1.15 / (size.width / Math.max(1, size.height)));
    const base =
      preset === "top"
        ? new Vector3(0, 13, 0.01)
        : preset === "side"
          ? new Vector3(12, 4, 0)
          : new Vector3(10, 9, 12);
    camera.position.copy(base.multiplyScalar(factor));
    camera.lookAt(0, 0.7, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, preset]);
  return null;
}
export function Hardware() {
  const [kit, setKit] = useState<Ward>("GENERAL");
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState("controller");
  const [isolate, setIsolate] = useState(false);
  const [ghost, setGhost] = useState(true);
  const [hideEnclosure, setHideEnclosure] = useState(false);
  const [diagram, setDiagram] = useState(false);
  const [threeNodes, setThreeNodes] = useState(false);
  const [connections, setConnections] = useState(true);
  const [orbit, setOrbit] = useState(false);
  const [preset, setPreset] = useState("isometric");
  const [signal, setSignal] = useState(0);
  const parts = useMemo(() => kitParts(kit), [kit]);
  const part = parts.find((p) => p.id === selected) || parts[1];
  const container = useRef<HTMLDivElement>(null);
  const paths =
    kit === "GENERAL"
      ? [
          ["reader", "controller", "SPI data"],
          ["switch", "controller", "GPIO input"],
          ["controller", "buzzer", "GPIO / driver"],
          ["controller", "led", "GPIO / current limiting"],
          ["power", "controller", "Power"],
          ["controller", "gateway", "Wi-Fi radio"],
          ["badge", "reader", "RFID radio"],
        ]
      : [
          ["tag", "controller", "BLE radio"],
          ["switch", "controller", "GPIO input"],
          ["controller", "buzzer", "GPIO / driver"],
          ["controller", "led", "GPIO / current limiting"],
          ["power", "controller", "Power"],
          ["controller", "gateway", "Wi-Fi radio"],
        ];
  function Animation() {
    useFrame((_, dt) => {
      if (playing)
        setProgress((v) => {
          if (v >= 1) {
            setPlaying(false);
            return 1;
          }
          return Math.min(1, v + dt * 0.25);
        });
    });
    return null;
  }
  return (
    <div className="hardware-workspace" ref={container}>
      <div className="module-toolbar">
        <div className="segmented">
          {(["GENERAL", "ICU"] as const).map((k) => (
            <button
              className={kit === k ? "active" : ""}
              key={k}
              onClick={() => {
                setKit(k);
                setSelected("controller");
                setSignal(0);
              }}
            >
              {k === "GENERAL" ? "General Ward / RFID" : "ICU / BLE"}
            </button>
          ))}
        </div>
        <span className="subtle">
          Educational assembly · pinout pending verification
        </span>
      </div>
      <div className="hardware-grid">
        <aside className="parts-list">
          <div className="eyebrow">COMPONENT INVENTORY</div>
          {parts.map((p, i) => (
            <button
              key={p.id}
              className={part.id === p.id ? "part active" : "part"}
              onClick={() => setSelected(p.id)}
            >
              <span className="part-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.optional ? "Optional · " : ""}
                  {p.connection}
                </small>
              </span>
            </button>
          ))}
        </aside>
        <div className="hardware-stage">
          <div className="canvas-wrap">
            <Canvas
              shadows
              camera={{
                position:
                  preset === "top"
                    ? [0, 13, 0.01]
                    : preset === "side"
                      ? [12, 4, 0]
                      : [10, 9, 12],
                fov: 42,
              }}
              key={`${kit}-${preset}`}
              dpr={[1, 1.5]}
            >
              <color attach="background" args={["#eaf0ef"]} />
              <ambientLight intensity={1.3} />
              <directionalLight
                position={[5, 10, 8]}
                intensity={2.5}
                castShadow
              />
              <Animation />
              <FitAssemblyCamera preset={preset} />
              <DiagramMode enabled={diagram} />
              {kit === "ICU" &&
                threeNodes &&
                [-2, 2].map((x) => (
                  <group key={x} position={[x, 0.3, -4]}>
                    <mesh>
                      <boxGeometry args={[2.1, 0.8, 1.7]} />
                      <meshStandardMaterial
                        color="#7ca89d"
                        transparent
                        opacity={0.2}
                      />
                    </mesh>
                    <Box size={[1.3, 0.13, 0.9]} color="#416b60" />
                    <mesh scale={[2.2, 0.3, 1.8]}>
                      <sphereGeometry args={[1, 24, 12]} />
                      <meshBasicMaterial
                        color="#6da99c"
                        transparent
                        opacity={0.06}
                        depthWrite={false}
                      />
                    </mesh>
                  </group>
                ))}
              {parts
                .filter(
                  (p) =>
                    (!isolate || p.id === part.id) &&
                    (!hideEnclosure || !["housing", "lid"].includes(p.id)),
                )
                .map((p) => (
                  <PartMesh
                    key={p.id}
                    part={p}
                    progress={progress}
                    selected={p.id === part.id}
                    ghost={ghost}
                    onSelect={() => setSelected(p.id)}
                  />
                ))}
              {connections &&
                !isolate &&
                paths.map(([from, to, label], i) => {
                  const p = partPosition(
                      parts.find((p) => p.id === from)!,
                      progress,
                    ),
                    q = partPosition(
                      parts.find((p) => p.id === to)!,
                      progress,
                    );
                  const wireless = label.includes("radio");
                  return (
                    <Line
                      key={label + from}
                      points={[
                        p,
                        [
                          (p[0] + q[0]) / 2,
                          Math.max(p[1], q[1]) + 0.3,
                          (p[2] + q[2]) / 2,
                        ],
                        q,
                      ]}
                      color={
                        signal % paths.length === i
                          ? "#d29335"
                          : wireless
                            ? "#658c9f"
                            : label === "Power"
                              ? "#bf685c"
                              : "#5b8d7c"
                      }
                      lineWidth={signal % paths.length === i ? 2.5 : 1.3}
                      dashed={wireless}
                      dashSize={0.14}
                      gapSize={0.12}
                    />
                  );
                })}
              <ContactShadows
                position={[0, -1.3, 0]}
                scale={22}
                opacity={0.25}
                blur={2.5}
                far={8}
              />
              <OrbitControls
                makeDefault
                target={[0, 0.7, 0]}
                autoRotate={orbit}
                autoRotateSpeed={0.65}
                minDistance={5}
                maxDistance={70}
              />
            </Canvas>
          </div>
          <div className="hardware-legend">
            <span>
              <i className="line-key" />
              SPI / GPIO
            </span>
            <span>
              <i className="line-key radio" />
              Radio observations
            </span>
            <span>
              <i className="line-key power" />
              Power
            </span>
          </div>
          <div className="viewer-controls">
            <button
              aria-label={playing ? "Pause explosion" : "Play explosion"}
              onClick={() => {
                if (progress === 1) setProgress(0);
                setPlaying(!playing);
              }}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <label className="range-label">
              Explode{" "}
              <input
                aria-label="Explosion progress"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={progress}
                onChange={(e) => {
                  setPlaying(false);
                  setProgress(Number(e.target.value));
                }}
              />
              <strong>{Math.round(progress * 100)}%</strong>
            </label>
            <button
              title="Reassemble"
              onClick={() => {
                setPlaying(false);
                setProgress(0);
              }}
            >
              <RotateCcw size={16} />
            </button>
            <button
              title="Turntable"
              className={orbit ? "active" : ""}
              onClick={() => setOrbit(!orbit)}
            >
              <Radio size={16} />
            </button>
          </div>
        </div>
        <aside className="inspector">
          <div className="eyebrow">
            PART {String(parts.indexOf(part) + 1).padStart(2, "0")} /{" "}
            {kit === "ICU" ? "BLE NODE" : "RFID KIT"}
          </div>
          <h2>{part.name}</h2>
          <span className="pill blue">{part.connection}</span>
          <p>{part.description}</p>
          <div className="info-note">{part.limitation}</div>
          <h4>Assembly controls</h4>
          <div className="control-stack">
            <button onClick={() => setIsolate(!isolate)}>
              <Focus size={16} />
              {isolate ? "Show all parts" : "Isolate selected part"}
            </button>
            <button onClick={() => setGhost(!ghost)}>
              <Layers size={16} />
              {ghost ? "Solid enclosure" : "Ghost enclosure"}
            </button>
            <button onClick={() => setHideEnclosure(!hideEnclosure)}>
              {hideEnclosure ? "Show enclosure" : "Hide enclosure"}
            </button>
            <button onClick={() => setDiagram(!diagram)}>
              {diagram ? "Material view" : "Wireframe diagram"}
            </button>
            {kit === "ICU" && (
              <button onClick={() => setThreeNodes(!threeNodes)}>
                {threeNodes ? "Show one node" : "Show three-zone deployment"}
              </button>
            )}
            <button onClick={() => setConnections(!connections)}>
              <Radio size={16} />
              {connections ? "Hide connections" : "Show connections"}
            </button>
            <select
              aria-label="Hardware camera preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              <option value="isometric">Three-quarter camera</option>
              <option value="top">Top camera</option>
              <option value="side">Side camera</option>
            </select>
            <button onClick={() => container.current?.requestFullscreen()}>
              <Maximize2 size={16} />
              Fullscreen viewer
            </button>
          </div>
          <h4>Signal walkthrough</h4>
          <p className="small">
            {paths[signal % paths.length][2]}: {paths[signal % paths.length][0]}{" "}
            → {paths[signal % paths.length][1]}
          </p>
          <button onClick={() => setSignal(signal + 1)}>
            Next connection →
          </button>
          <button
            className="primary"
            onClick={() =>
              safely(() =>
                api(
                  `/scenarios/${kit === "GENERAL" ? "GW-01" : "ICU-01"}/run`,
                  {},
                ),
              )
            }
          >
            <Play size={15} />
            Run {kit === "GENERAL" ? "RFID" : "BLE"} evidence demo
          </button>
          <div className="info-note">
            Not a validated fabrication schematic. Shared station is separate:
            camera, screen, speaker and dedicated dispenser.{" "}
            {kit === "ICU"
              ? "One reusable node is shown; three nodes are installed in the initial ICU."
              : ""}
          </div>
          <a
            href="https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32/schematic-checklist.html"
            target="_blank"
            rel="noreferrer"
          >
            ESP32 hardware guidance ↗
          </a>
        </aside>
      </div>
    </div>
  );
}
