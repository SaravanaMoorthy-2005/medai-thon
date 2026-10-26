import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { ThreeElements } from "@react-three/fiber";
import type { Vec3 } from "../shared/hardware";
export function Box({
  size = [1, 1, 1],
  color = "#fff",
  metal = 0,
  rough = 0.7,
  ...props
}: ThreeElements["mesh"] & {
  size?: Vec3;
  color?: string;
  metal?: number;
  rough?: number;
}) {
  return (
    <mesh castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
    </mesh>
  );
}
export function Cylinder({
  radius = 0.1,
  height = 1,
  color = "#9cabb4",
  ...props
}: ThreeElements["mesh"] & {
  radius?: number;
  height?: number;
  color?: string;
}) {
  return (
    <mesh castShadow {...props}>
      <cylinderGeometry args={[radius, radius, height, 12]} />
      <meshStandardMaterial color={color} metalness={0.35} roughness={0.5} />
    </mesh>
  );
}
export function FloorLabel({
  text,
  position,
  width = 2,
  color = "#54717a",
}: {
  text: string;
  position: Vec3;
  width?: number;
  color?: string;
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.font = "600 58px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [text, color]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, width / 4]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
export function Dispenser({ active = false }: { active?: boolean }) {
  return (
    <group>
      <Box size={[0.32, 0.56, 0.25]} color="#eff2ed" />
      <Box
        position={[0, 0.02, 0.132]}
        size={[0.19, 0.24, 0.012]}
        color="#a3c8ce"
      />
      <Box
        position={[0, 0.3, 0.1]}
        size={[0.36, 0.06, 0.3]}
        color="#b6c4c9"
        metal={0.5}
      />
      <Box
        position={[0, 0.17, 0.2]}
        size={[0.04, 0.16, 0.05]}
        color="#9aaeb8"
      />
      <mesh position={[0.12, 0.17, 0.135]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color={active ? "#efb25a" : "#258c80"} />
      </mesh>
    </group>
  );
}
export function NodeDevice({ icu = false }: { icu?: boolean }) {
  return (
    <group>
      <Box size={[0.3, 0.4, 0.12]} color="#e4e9e8" />
      <Box
        position={[0, 0, 0.065]}
        size={[0.21, 0.25, 0.015]}
        color={icu ? "#2f8f86" : "#326c98"}
      />
      <mesh position={[0, 0.12, 0.08]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshBasicMaterial color="#8cdbc0" />
      </mesh>
    </group>
  );
}
