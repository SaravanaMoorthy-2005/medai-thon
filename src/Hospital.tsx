import { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, RoundedBox } from "@react-three/drei";
import { Group, Vector3 } from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { Box, Cylinder, Dispenser, NodeDevice, FloorLabel } from "./Equipment";
import { useApp } from "./api";
import type { Bed, Snapshot, Staff } from "../shared/types";
import type { Vec3 } from "../shared/hardware";

function Person({
  color = "#438995",
  patient = false,
  action = "idle",
}: {
  color?: string;
  patient?: boolean;
  action?: string;
}) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const legs = useRef<Group>(null);
  const body = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const walking = action === "walk";
    if (left.current)
      left.current.rotation.x = walking
        ? Math.sin(t * 6) * 0.35
        : ["tap", "press", "care", "rub"].includes(action)
          ? -0.9 + Math.sin(t * 4) * 0.08
          : 0.06;
    if (right.current)
      right.current.rotation.x = walking
        ? -Math.sin(t * 6) * 0.35
        : action === "rub"
          ? -1
          : 0.08;
    if (legs.current)
      legs.current.rotation.x = walking ? Math.sin(t * 6) * 0.12 : 0;
    if (body.current && patient)
      body.current.scale.z = 1 + Math.sin(t * 1.7) * 0.012;
  });
  return (
    <group ref={body} scale={patient ? 0.88 : 1}>
      <mesh position={[0, 1.58, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial color="#c68e6a" />
      </mesh>
      <mesh position={[0, 1.67, -0.015]} castShadow>
        <sphereGeometry args={[0.152, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a302d" />
      </mesh>
      <mesh position={[0, 1.15, 0]} scale={[1, 1, 0.68]} castShadow>
        <capsuleGeometry args={[0.21, 0.25, 4, 12]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <Box
        position={[0, 0.84, 0]}
        size={[0.36, 0.16, 0.24]}
        color={patient ? "#cdd5d6" : "#344e61"}
      />
      <Box
        position={[0.12, 1.25, 0.13]}
        size={[0.07, 0.12, 0.012]}
        color="#eef3ef"
      />
      <group ref={legs}>
        {[-0.11, 0.11].map((x) => (
          <group key={x}>
            <Cylinder
              position={[x, 0.48, 0]}
              radius={0.095}
              height={0.64}
              color={patient ? "#cdd5d6" : "#344e61"}
            />
            <Box
              position={[x, 0.13, 0.06]}
              size={[0.19, 0.12, 0.32]}
              color="#e8edeb"
            />
          </group>
        ))}
      </group>
      {[-1, 1].map((sign, i) => (
        <group
          ref={i ? right : left}
          key={sign}
          position={[sign * 0.27, 1.4, 0]}
        >
          <Cylinder
            position={[0, -0.22, 0]}
            radius={0.085}
            height={0.42}
            color={color}
          />
          <Cylinder
            position={[0, -0.48, 0]}
            radius={0.061}
            height={0.2}
            color="#c68e6a"
          />
          <mesh position={[0, -0.6, 0]}>
            <sphereGeometry args={[0.068, 10, 8]} />
            <meshStandardMaterial color="#c68e6a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function BedModel({
  bed,
  selected,
  status,
  onSelect,
}: {
  bed: Bed;
  selected: boolean;
  status: string;
  onSelect: (id: string) => void;
}) {
  const icu = bed.ward === "ICU";
  const color =
    status === "EVENT_NOT_DETECTED"
      ? "#d19957"
      : status === "DATA_GAP"
        ? "#8f9ba4"
        : icu
          ? "#77aba4"
          : "#7fa5c3";
  return (
    <group position={bed.position}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0.05]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(bed.id);
        }}
      >
        <planeGeometry args={[3.35, 4.3]} />
        <meshStandardMaterial
          color={
            selected
              ? icu
                ? "#c1dfd6"
                : "#c9dfea"
              : icu
                ? "#e3eeea"
                : "#e4edf2"
          }
          roughness={1}
        />
      </mesh>
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect(bed.id);
        }}
      >
        <Box
          position={[0, 0.42, 0]}
          size={[1.2, 0.15, 2.2]}
          color="#a9b6bd"
          metal={0.6}
        />
        <RoundedBox
          position={[0, 0.65, -0.05]}
          args={[1.16, 0.24, 2.1]}
          radius={0.08}
          smoothness={2}
          castShadow
        >
          <meshStandardMaterial color="#f3f1e8" />
        </RoundedBox>
        <RoundedBox
          position={[0, 0.82, -0.76]}
          args={[0.86, 0.18, 0.44]}
          radius={0.08}
          smoothness={2}
          castShadow
        >
          <meshStandardMaterial color="#fffdfa" />
        </RoundedBox>
        <Box
          position={[0, 0.9, -1.17]}
          size={[1.28, 0.75, 0.1]}
          color={color}
        />
        <Box
          position={[0, 0.72, 1.12]}
          size={[1.28, 0.49, 0.1]}
          color="#e3e9e9"
        />
        <Box
          position={[0, 0.8, 0.4]}
          size={[1.18, 0.14, 1.25]}
          color={icu ? "#8fbfb5" : "#a6c4db"}
        />
        <group
          position={[0, 0.85, 0.7]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={0.95}
        >
          <Person patient color="#d3dfe1" />
        </group>
        {[-0.68, 0.68].map((x) => (
          <group key={x}>
            <Cylinder
              position={[x, 0.94, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              radius={0.035}
              height={1.6}
            />
            {[-0.65, 0, 0.65].map((z) => (
              <Cylinder
                key={z}
                position={[x, 0.78, z]}
                radius={0.027}
                height={0.32}
              />
            ))}
            {[-0.84, 0.84].map((z) => (
              <group key={z}>
                <Cylinder
                  position={[x * 0.8, 0.25, z]}
                  radius={0.035}
                  height={0.25}
                />
                <Cylinder
                  position={[x * 0.8, 0.12, z]}
                  rotation={[0, 0, Math.PI / 2]}
                  radius={0.11}
                  height={0.08}
                  color="#4d5e67"
                />
              </group>
            ))}
          </group>
        ))}
      </group>
      <group
        position={[-1.3, 1, -1.0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(`${bed.id}-${icu ? "BLE" : "RFID"}`);
        }}
      >
        <NodeDevice icu />
      </group>
      <group
        position={[1.35, 1.08, 0.3]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(`${bed.id}-DISP`);
        }}
      >
        <Dispenser active={status === "EVENT_ASSOCIATED"} />
        <Cylinder position={[0, -0.6, 0]} radius={0.035} height={0.65} />
        <Box
          position={[0, -0.95, 0]}
          size={[0.5, 0.06, 0.45]}
          color="#8a9da7"
        />
      </group>
      <Box
        position={[-1.14, 0.5, -0.6]}
        size={[0.55, 0.8, 0.55]}
        color="#e9e6dd"
      />
      <Box
        position={[-1.14, 0.73, -0.31]}
        size={[0.12, 0.025, 0.025]}
        color="#80919a"
      />
      <group position={[1.1, 0, -0.9]}>
        <Cylinder position={[0, 1.15, 0]} radius={0.022} height={2.2} />
        <Box
          position={[0, 2.15, 0]}
          size={[0.43, 0.025, 0.025]}
          color="#9baeb8"
        />
        <Box
          position={[0.16, 1.92, 0]}
          size={[0.17, 0.3, 0.08]}
          color="#c5dfe0"
        />
        {[-1, 1].map((s) => (
          <Box
            key={s}
            position={[0, 0.05, 0]}
            rotation={[0, (s * Math.PI) / 4, 0]}
            size={[0.65, 0.035, 0.04]}
            color="#a6b3bb"
          />
        ))}
      </group>
      {icu && (
        <group position={[-1.12, 1.3, -0.6]}>
          <Box size={[0.64, 0.46, 0.12]} color="#273e49" />
          <Box
            position={[0, 0, 0.07]}
            size={[0.55, 0.35, 0.01]}
            color="#122e34"
          />
          <Box
            position={[0, 0, 0.08]}
            size={[0.42, 0.012, 0.01]}
            color="#75b7a5"
          />
          <Cylinder position={[0, -0.4, 0]} radius={0.035} height={0.4} />
        </group>
      )}
      <FloorLabel text={bed.id} position={[0, 0.025, 1.87]} width={1.6} />
      {selected && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.78, 1.82, 64]} />
          <meshBasicMaterial
            color={icu ? "#308d7b" : "#3d7cae"}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}
function Actor({
  staff,
  state,
  beds,
  follow,
}: {
  staff: Staff;
  state: Snapshot["actors"];
  beds: Bed[];
  follow: boolean;
}) {
  const ref = useRef<Group>(null);
  const current = state.find((a) => a.id === staff.id);
  const bed = beds.find((b) => b.id === current?.bedId);
  const index = ["D01", "D02", "N01", "N02", "V01", "V02"].indexOf(staff.id);
  const target = new Vector3(
    ...((bed
      ? [bed.position[0] + 0.95, 0, bed.position[2] + 1.65]
      : [-7 + index * 3, 0, 5.3]) as Vec3),
  );
  const [moving, setMoving] = useState(false);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const distance = ref.current.position.distanceTo(target);
    if (distance > 0.04) {
      ref.current.position.lerp(target, 1 - Math.exp(-delta * 1.5));
      ref.current.rotation.y = Math.atan2(
        target.x - ref.current.position.x,
        target.z - ref.current.position.z,
      );
      if (!moving) setMoving(true);
    } else if (moving) setMoving(false);
  });
  return (
    <group ref={ref} position={[-7 + index * 3, 0, 5.3]}>
      <Person
        color={staff.color}
        action={moving ? "walk" : current?.action || "idle"}
      />
      {follow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.4, 0.45, 32]} />
          <meshBasicMaterial color="#b98336" />
        </mesh>
      )}
    </group>
  );
}
function CameraRig({
  focus,
  plan,
  reset,
  scale = 1,
}: {
  focus: Vec3;
  plan: boolean;
  reset: number;
  scale?: number;
}) {
  const controls = useRef<OrbitImpl>(null);
  const destination = useRef(new Vector3());
  const look = useRef(new Vector3());
  const active = useRef(true);
  useEffect(() => {
    look.current.set(...focus);
    destination.current.set(
      focus[0] + (plan ? 0 : 18 * scale),
      (plan ? 31 : 21) * scale,
      focus[2] + (plan ? 0.01 : 22 * scale),
    );
    active.current = true;
  }, [focus[0], focus[1], focus[2], plan, reset, scale]);
  useFrame(({ camera }, dt) => {
    if (active.current && controls.current) {
      const alpha = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? 1
        : 1 - Math.exp(-dt * 4);
      camera.position.lerp(destination.current, alpha);
      controls.current.target.lerp(look.current, alpha);
      controls.current.update();
      if (camera.position.distanceTo(destination.current) < 0.05)
        active.current = false;
    }
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={55}
      maxPolarAngle={Math.PI / 2.12}
      onStart={() => {
        active.current = false;
      }}
    />
  );
}
export function Hospital({
  plan = false,
  focusWard = "ALL",
  reset = 0,
  follow = "",
}: {
  plan?: boolean;
  focusWard?: string;
  reset?: number;
  follow?: string;
}) {
  const { state, selected, set } = useApp();
  const previousSelected = useRef(selected);
  const [detail, setDetail] = useState(false);
  useEffect(() => {
    if (previousSelected.current !== selected) {
      setDetail(true);
      previousSelected.current = selected;
    }
  }, [selected]);
  useEffect(() => {
    setDetail(false);
  }, [focusWard, reset]);
  if (!state) return null;
  const bed = state.beds.find((b) => selected.startsWith(b.id));
  const actor = state.actors.find((a) => a.id === follow);
  const actorBed = state.beds.find((b) => b.id === actor?.bedId);
  const focus: Vec3 = actorBed
    ? actorBed.position
    : detail && bed
      ? bed.position
      : detail && selected === "STATION"
        ? [0, 0, 6.7]
        : focusWard === "GENERAL"
          ? [-5, 0, -0.5]
          : focusWard === "ICU"
            ? [7.5, 0, -1]
            : [1, 0, 0];
  const scale = actorBed || detail ? 0.43 : focusWard === "ALL" ? 1 : 0.7;
  const maxZ = Math.max(
    8,
    ...state.beds.filter((b) => b.active).map((b) => b.position[2] + 4),
  );
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [21, 24, 26], fov: 40, near: 0.1, far: 140 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => {}}
      aria-label="Interactive architectural hospital cutaway"
    >
      <color attach="background" args={["#eaf0ef"]} />
      <fog attach="fog" args={["#eaf0ef", 55, 110]} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#eef4ff", "#b8b5a1", 1.5]} />
      <directionalLight
        castShadow
        position={[5, 18, 10]}
        intensity={2.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0003}
      />
      <Suspense fallback={null}>
        <Box
          position={[1, -0.32, (maxZ - 7) / 2]}
          size={[26, 0.55, maxZ + 7]}
          color="#d2dcd9"
        />
        <Box
          position={[1, -0.015, (maxZ - 7) / 2]}
          size={[25.6, 0.08, maxZ + 6.6]}
          color="#eeeee7"
        />
        <Box
          position={[-5.4, 0.035, -0.5]}
          size={[10.3, 0.035, 11.8]}
          color="#e0e8e9"
        />
        <Box
          position={[7.2, 0.035, -2.4]}
          size={[12.3, 0.035, 7.8]}
          color="#dce8e3"
        />
        {!plan && (
          <>
            <Box
              position={[1, 1.45, -6.7]}
              size={[26, 2.9, 0.22]}
              color="#f4f3ed"
            />
            <Box
              position={[-11.85, 1.3, -0.5]}
              size={[0.22, 2.6, 12.4]}
              color="#f4f3ed"
            />
            <Box
              position={[13.85, 0.42, -0.5]}
              size={[0.22, 0.85, 12.4]}
              color="#e8ece6"
            />
            {Array.from({ length: 10 }, (_, i) => (
              <group key={i} position={[-10.5 + i * 2.5, 1.85, -6.56]}>
                <Box size={[1.8, 1.3, 0.06]} color="#aec7cd" rough={0.2} />
                <Box
                  position={[0, 0, 0.04]}
                  size={[0.045, 1.3, 0.04]}
                  color="#f9faf4"
                />
                <Box
                  position={[0, -0.68, 0.06]}
                  size={[2, 0.07, 0.2]}
                  color="#d2d8d5"
                />
              </group>
            ))}
            <Box
              position={[0.4, 1.25, -3.6]}
              size={[0.18, 2.5, 6.2]}
              color="#f4f3ed"
            />
            {[5.95, 9.75].map((x) => (
              <group key={x}>
                <Box
                  position={[x, 0.48, -2.3]}
                  size={[0.12, 0.95, 7]}
                  color="#dbe5df"
                />
                <mesh position={[x, 1.48, -3.4]}>
                  <boxGeometry args={[0.06, 1.05, 4.8]} />
                  <meshStandardMaterial
                    color="#b5d5d0"
                    transparent
                    opacity={0.22}
                    roughness={0.15}
                  />
                </mesh>
              </group>
            ))}
            {[-5.5].map((x) => (
              <group key={x}>
                <Cylinder
                  position={[x, 2.45, -1.8]}
                  rotation={[Math.PI / 2, 0, 0]}
                  radius={0.025}
                  height={8.9}
                />
                {[-4, 1].map((z) => (
                  <Box
                    key={z}
                    position={[x, 1.6, z - 0.7]}
                    size={[0.05, 1.5, 1.2]}
                    color="#bdd3d4"
                  />
                ))}
              </group>
            ))}
          </>
        )}
        <FloorLabel
          text="GENERAL WARD"
          position={[-5.7, 0.09, 3.85]}
          width={4.5}
          color="#557f9c"
        />
        <FloorLabel
          text="INTENSIVE CARE"
          position={[7.8, 0.09, 2.2]}
          width={4.4}
          color="#4c8172"
        />
        <Box
          position={[1, 0.06, 4.4]}
          size={[25, 0.025, 0.06]}
          color="#cbd8d5"
        />
        {state.beds
          .filter((b) => b.active)
          .map((b) => (
            <BedModel
              key={b.id}
              bed={b}
              selected={bed?.id === b.id}
              status={
                state.opportunities.filter((o) => o.bedId === b.id).at(-1)
                  ?.status || "READY"
              }
              onSelect={(id) => set({ selected: id })}
            />
          ))}
        <group
          position={[0, 0, 6.7]}
          onClick={(e) => {
            e.stopPropagation();
            set({ selected: "STATION" });
          }}
        >
          <Box
            position={[0, 0.95, 0]}
            size={[2.6, 0.15, 1.1]}
            color="#cbd6cf"
          />
          {[-1.1, 1.1].map((x) => (
            <Box
              key={x}
              position={[x, 0.45, 0]}
              size={[0.12, 0.9, 0.85]}
              color="#dce3df"
            />
          ))}
          <Box position={[0, 1.55, 0]} size={[0.9, 0.6, 0.1]} color="#324c57" />
          <Box
            position={[0, 1.55, -0.06]}
            size={[0.8, 0.48, 0.02]}
            color="#8fbcb8"
          />
          <Cylinder position={[0, 1.25, 0]} radius={0.04} height={0.4} />
          <Box
            position={[0, 1.89, 0]}
            size={[0.13, 0.065, 0.08]}
            color="#273f4d"
          />
          <group position={[-0.9, 1.3, 0]}>
            <Dispenser />
          </group>
          <FloorLabel
            text="SHARED STATION"
            position={[0, 0.09, 7.65]}
            width={2.8}
          />
        </group>
        <group position={[8.4, 0, 6.6]}>
          <Box position={[0, 0.55, 0]} size={[4.2, 1.1, 1.1]} color="#e1ded2" />
          <Box position={[0, 1.12, 0]} size={[4.4, 0.1, 1.3]} color="#f2f3ec" />
          {[-1.1, 1.1].map((x) => (
            <group key={x}>
              <Box
                position={[x, 1.48, 0]}
                size={[0.75, 0.48, 0.09]}
                color="#354c56"
              />
              <Cylinder position={[x, 1.22, 0]} radius={0.03} height={0.3} />
            </group>
          ))}
          <FloorLabel
            text="NURSES’ STATION"
            position={[0, 0.09, 1.25]}
            width={3}
          />
        </group>
        {[-10.6, 12.7].map((x) => (
          <group key={x} position={[x, 0, 6.6]}>
            <Cylinder
              position={[0, 0.25, 0]}
              radius={0.3}
              height={0.5}
              color="#c3c5b6"
            />
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh
                key={i}
                position={[
                  Math.sin(i * 2) * 0.18,
                  0.75 + i * 0.08,
                  Math.cos(i * 2) * 0.18,
                ]}
                rotation={[0, 0, i * 0.5]}
              >
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshStandardMaterial color="#7c9575" />
              </mesh>
            ))}
          </group>
        ))}
        {state.staff.map((s) => (
          <Actor
            key={s.id}
            staff={s}
            state={state.actors}
            beds={state.beds}
            follow={follow === s.id}
          />
        ))}
        <ContactShadows
          position={[1, -0.61, 0]}
          opacity={0.25}
          scale={50}
          blur={2.5}
          far={8}
          resolution={512}
          frames={1}
        />
        <CameraRig focus={focus} plan={plan} reset={reset} scale={scale} />
      </Suspense>
    </Canvas>
  );
}
