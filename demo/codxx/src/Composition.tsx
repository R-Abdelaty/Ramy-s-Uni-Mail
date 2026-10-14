import { Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  Composition,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

loadFont({
  family: "Roboto",
  url: staticFile("fonts/Roboto-Regular.woff2"),
  weight: "400",
});
loadFont({
  family: "Roboto",
  url: staticFile("fonts/Roboto-Semibold.woff2"),
  weight: "600",
});

// Source coordinates are in the original 1920 × 1080 recording. The camera
// handles surround the requested focus windows so their actions stay visible.
export const focusMoments = [
  {
    name: "Subject code translation",
    enter: 5.1,
    settled: 6.1,
    release: 8,
    end: 9.05,
    zoom: 2.05,
    sourceX: 1110,
    sourceY: 350,
    screenX: 960,
    screenY: 440,
  },
  {
    name: "Hide unwanted mail",
    enter: 12,
    settled: 13.1,
    release: 18,
    end: 19.1,
    zoom: 2.2,
    sourceX: 525,
    sourceY: 360,
    screenX: 960,
    screenY: 470,
  },
  {
    name: "Search bar and matching mail",
    enter: 23,
    settled: 24.1,
    release: 29,
    end: 30.1,
    zoom: 2.45,
    sourceX: 525,
    sourceY: 230,
    screenX: 960,
    screenY: 420,
  },
] as const;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Zero velocity AND acceleration at both ends: no snap into or out of a hold.
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const getCamera = (seconds: number) => {
  const moment = focusMoments.find(
    (item) => seconds >= item.enter && seconds <= item.end,
  );
  if (!moment) return { scale: 1, x: 0, y: 0 };
  const progress = interpolate(
    seconds,
    [moment.enter, moment.settled, moment.release, moment.end],
    [0, 1, 1, 0],
    { ...clamp, easing: smootherstep },
  );
  // Log scale gives consistent perceived speed; translation follows the same
  // fixed anchor throughout the move, preventing focal-point drift.
  const scale = Math.exp(Math.log(moment.zoom) * progress);
  const travel = (scale - 1) / (moment.zoom - 1);
  return {
    scale,
    x: (moment.screenX - moment.sourceX * moment.zoom) * travel,
    y: (moment.screenY - moment.sourceY * moment.zoom) * travel,
  };
};

type FeatureLabelProps = {
  children: string;
};

const FeatureLabel: React.FC<FeatureLabelProps> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const reveal = interpolate(frame, [0, 0.65 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exit = interpolate(
    frame,
    [durationInFrames - 0.4 * fps, durationInFrames - 1],
    [0, 1],
    { ...clamp, easing: Easing.inOut(Easing.cubic) },
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 100,
          bottom: 100,
          width: "max-content",
          boxSizing: "border-box",
          padding: "30px 38px 34px",
          overflow: "hidden",
          borderRadius: 24,
          background:
            "linear-gradient(125deg, rgba(15,31,65,0.97), rgba(24,43,80,0.96))",
          border: "1px solid rgba(197,220,255,0.28)",
          boxShadow: "0 18px 65px rgba(8,21,55,0.27)",
          opacity: reveal * (1 - exit),
          translate: `0px ${(1 - reveal) * 28 + exit * 12}px`,
        }}
      >
        <div
          style={{
            color: "#f8fbff",
            fontSize: 55,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            opacity: interpolate(frame, [0.12 * fps, 0.6 * fps], [0, 1], clamp),
            translate: `0px ${interpolate(
              frame,
              [0.12 * fps, 0.7 * fps],
              [16, 0],
              {
                ...clamp,
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              },
            )}px`,
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MyComponent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camera = getCamera(frame / fps);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#25477d",
        overflow: "hidden",
        fontFamily: "Roboto, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          transformOrigin: "0 0",
          scale: camera.scale,
          translate: `${camera.x}px ${camera.y}px`,
          willChange: "transform",
        }}
      >
        <Video
          name="Original site demo"
          src={staticFile("maildemoNoAI.mp4")}
          premountFor={fps}
          style={{ width: "100%", height: "100%" }}
        />
      </AbsoluteFill>
      <Sequence
        name="Subject Code Translation · title"
        from={Math.round(5.65 * fps)}
        durationInFrames={Math.round(2.8 * fps)}
        premountFor={fps}
      >
        <FeatureLabel>Subject Code Translation</FeatureLabel>
      </Sequence>
      <Sequence
        name="Hide unwanted mail · title"
        from={Math.round(12.65 * fps)}
        durationInFrames={Math.round(5.8 * fps)}
        premountFor={fps}
      >
        <FeatureLabel>Hide unwanted mail</FeatureLabel>
      </Sequence>
      <Sequence
        name="Search your mail · title"
        from={Math.round(23.65 * fps)}
        durationInFrames={Math.round(5.8 * fps)}
        premountFor={fps}
      >
        <FeatureLabel>Search your mail</FeatureLabel>
      </Sequence>
    </AbsoluteFill>
  );
};

export const MyComposition = () => (
  <Composition
    id="MyComp"
    component={MyComponent}
    durationInFrames={2236}
    fps={60}
    width={1920}
    height={1080}
  />
);
