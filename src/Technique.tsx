import { useEffect, useRef, useState } from "react";
import {
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import {
  Camera,
  CameraOff,
  Hand,
  Play,
  Volume2,
  VolumeX,
  Check,
} from "lucide-react";
import { api, sendEvent, safely, useApp } from "./api";
import type { Technique as Session } from "../shared/types";

export function Technique() {
  const { state } = useApp();
  const [id, setId] = useState("");
  const [camera, setCamera] = useState("OFF");
  const [hands, setHands] = useState(0);
  const [muted, setMuted] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const model = useRef<HandLandmarker | null>(null);
  const frame = useRef(0);
  const cancelled = useRef(false);
  const session = state?.techniques.find((t) => t.id === id);
  const index = session?.steps.length || 0;
  function stopCamera() {
    cancelled.current = true;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    model.current?.close();
    model.current = null;
    setCamera("OFF");
    setHands(0);
  }
  useEffect(
    () => () => {
      cancelled.current = true;
      cancelAnimationFrame(frame.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      model.current?.close();
      speechSynthesis.cancel();
    },
    [],
  );
  async function startCamera() {
    cancelled.current = false;
    setCamera("REQUESTING");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      if (cancelled.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
      if (video.current) {
        video.current.srcObject = stream.current;
        await video.current.play();
      }
      setCamera("LOADING LANDMARK MODEL");
      // Model and WASM are served locally; guided-only mode remains available offline.
      const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      model.current = await HandLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: "/mediapipe/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
      if (cancelled.current) {
        model.current.close();
        return;
      }
      setCamera("LOCAL LANDMARKS");
      let lastInference = 0;
      const detect = () => {
        if (cancelled.current) return;
        const now = performance.now();
        if (
          now - lastInference >= 100 &&
          video.current &&
          video.current.readyState >= 2 &&
          model.current
        ) {
          try {
            lastInference = now;
            const result = model.current.detectForVideo(
              video.current,
              performance.now(),
            );
            setHands(result.landmarks.length);
            const context = overlay.current?.getContext("2d");
            if (context) {
              context.clearRect(0, 0, 640, 480);
              const draw = new DrawingUtils(context);
              for (const landmarks of result.landmarks) {
                draw.drawConnectors(
                  landmarks,
                  HandLandmarker.HAND_CONNECTIONS,
                  { color: "#4fba9e", lineWidth: 2 },
                );
                draw.drawLandmarks(landmarks, { color: "#e3ba6c", radius: 3 });
              }
            }
          } catch {
            setCamera("UNABLE TO ASSESS");
            return;
          }
        }
        frame.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (e) {
      setCamera(
        e instanceof Error && e.name === "NotAllowedError"
          ? "CAMERA DENIED"
          : "CAMERA / MODEL UNAVAILABLE",
      );
      stream.current?.getTracks().forEach((t) => t.stop());
      setHands(0);
    }
  }
  useEffect(() => {
    if (id && !muted && index < 8) {
      speechSynthesis.cancel();
      speechSynthesis.speak(
        new SpeechSynthesisUtterance(
          `Demo step ${index + 1}. ${state?.policy.steps[index]}`,
        ),
      );
    }
  }, [id, index, muted, state?.policy.steps]);
  if (!state) return null;
  return (
    <div className="technique-grid">
      <section className="panel">
        <div className="eyebrow">ONE SHARED STATION</div>
        <h2>Eight moments of guidance.</h2>
        <p className="subtle">
          Editable demonstration protocol · hospital approval required
        </p>
        <ol className="steps">
          {state.policy.steps.map((step, i) => (
            <li
              key={i}
              className={i === index ? "current" : i < index ? "done" : ""}
            >
              <span>
                {i < index ? (
                  <Check size={15} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                {step}
                <small>
                  {i < index
                    ? session?.steps[i].result
                    : i === index
                      ? "Current guidance step"
                      : "Awaiting guidance"}
                </small>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel camera-panel">
        <div className="section-heading">
          <span className="pill">LOCAL PROCESSING ONLY</span>
          <button aria-label="Toggle voice" onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>
        <div className="camera-frame">
          <video ref={video} playsInline muted />
          <canvas
            ref={overlay}
            className="landmark-overlay"
            width={640}
            height={480}
            aria-label="Local hand landmarks"
          />
          <div
            className="camera-empty"
            style={{ display: camera === "LOCAL LANDMARKS" ? "none" : "flex" }}
          >
            <Hand size={58} strokeWidth={1} />
            <h3>Guidance starts with your hands.</h3>
            <p>No camera is required for the guided-only path.</p>
            <span className="pill amber">
              {camera === "OFF" ? "CAMERA OFF" : camera}
            </span>
          </div>
        </div>
        <div className="camera-stats">
          <span>{hands} hands observed</span>
          <span>No raw video stored</span>
        </div>
        <div className="button-row">
          <button
            onClick={() =>
              camera === "OFF" ||
              camera.includes("DENIED") ||
              camera.includes("UNAVAILABLE")
                ? startCamera()
                : stopCamera()
            }
          >
            {camera === "LOCAL LANDMARKS" ? (
              <CameraOff size={16} />
            ) : (
              <Camera size={16} />
            )}{" "}
            {camera === "LOCAL LANDMARKS" ? "Stop camera" : "Enable camera"}
          </button>
          <button
            onClick={() =>
              safely(async () => {
                const s = await api<Session>("/technique", {});
                setId(s.id);
              })
            }
          >
            <Play size={16} />
            {id ? "Restart session" : "Start guided session"}
          </button>
        </div>
        <div className="info-note">
          Hand landmarks estimate visibility and motion only. They do not
          establish complete surface coverage or validate this demonstration
          protocol.
        </div>
      </section>
      <section className="panel">
        <div className="eyebrow">SESSION EVIDENCE</div>
        <h2>
          {session?.result === "IN_PROGRESS"
            ? `Step ${index + 1} of 8`
            : session
              ? session.result.replaceAll("_", " ")
              : "Ready when you are"}
        </h2>
        <p>{state.policy.steps[Math.min(index, 7)]}</p>
        <button
          className="primary"
          disabled={!session || index >= 8}
          onClick={() =>
            safely(() =>
              api(`/technique/${id}/step`, {
                index: index + 1,
                result: hands === 2 ? "OBSERVED" : "UNKNOWN",
                confidence: hands === 2 ? 0.6 : 0,
              }),
            )
          }
        >
          Record step & continue →
        </button>
        <button
          onClick={() =>
            safely(() =>
              sendEvent({
                type: "DISPENSER_ACTIVATE",
                deviceId: "STATION-DISP",
                bedId: "STATION",
              }),
            )
          }
        >
          Simulate station dispenser
        </button>
        <dl>
          <dt>Protocol</dt>
          <dd>{session?.protocolVersion || state.policy.protocolVersion}</dd>
          <dt>Staff association</dt>
          <dd>Anonymous</dd>
          <dt>Camera evidence</dt>
          <dd>
            {hands === 2
              ? "Landmarks visible; technique unvalidated"
              : "UNABLE_TO_ASSESS"}
          </dd>
          <dt>Approval</dt>
          <dd>Demo only · pending hospital approval</dd>
        </dl>
        <div className="info-note">
          Station activation remains separate from every bedside opportunity.
          Unknown steps produce UNABLE_TO_ASSESS.
        </div>
        <h4>Saved sessions</h4>
        {state.techniques
          .slice(-5)
          .reverse()
          .map((s) => (
            <p key={s.id} className="small">
              {new Date(s.startedAt).toLocaleTimeString()} · {s.steps.length}/8
              · {s.result}
            </p>
          ))}
      </section>
    </div>
  );
}
