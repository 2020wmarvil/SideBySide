/* eslint-disable react-hooks/refs --
 * react-native-gesture-handler's Gesture.Pan().onBegin(fn)... builder just
 * registers callbacks during render — it doesn't call them. They run later,
 * asynchronously, from the native gesture responder, so reading/writing a
 * ref inside them doesn't have the render-time hazard this rule guards
 * against; the compiler's static analysis can't tell the difference. */
import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { VideoView, type VideoPlayer } from "expo-video";
import type { Slot } from "@/data/types";
import type { DisplayMode, SlotState } from "@/state/PlaybackSessionContext";
import { color, radius, withAlpha } from "@/theme";

type StageProps = {
  playerL: VideoPlayer;
  playerR: VideoPlayer;
  clips: Record<Slot, SlotState>;
  display: DisplayMode;
  top: Slot;
  opacity: number;
  sel: Slot;
  locked: boolean;
  onTapStage: () => void;
  onPan: (dx: number, dy: number) => void;
  onPinchBegin: () => void;
  onPinchChange: (scale: number) => void;
};

export function Stage({
  playerL,
  playerR,
  clips,
  display,
  top,
  opacity,
  sel,
  locked,
  onTapStage,
  onPan,
  onPinchBegin,
  onPinchChange,
}: StageProps) {
  const moved = useRef(false);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      moved.current = false;
    })
    .onChange((e) => {
      moved.current = moved.current || Math.abs(e.changeX) + Math.abs(e.changeY) > 5;
      onPan(e.changeX, e.changeY);
    })
    .onEnd(() => {
      if (!moved.current) onTapStage();
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => onPinchBegin())
    .onChange((e) => onPinchChange(e.scale));

  const stageGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const side = display === "side";
  const showSelection = side && !locked;

  const paneStyle = (slot: Slot) => {
    if (side) {
      return {
        left: slot === "L" ? "0%" : "50%",
        width: "50%",
        zIndex: 1,
        opacity: 1,
      } as const;
    }
    const isTop = top === slot;
    return {
      left: "0%",
      width: "100%",
      zIndex: isTop ? 2 : 1,
      opacity: isTop ? opacity : 1,
    } as const;
  };

  const videoTransform = (slot: Slot) => {
    const c = clips[slot];
    return { transform: [{ scale: c.zoom }, { translateX: c.px }, { translateY: c.py }] };
  };

  return (
    <View style={styles.stage}>
      {(["L", "R"] as Slot[]).map((slot) => (
        <View
          key={slot}
          style={[
            styles.pane,
            paneStyle(slot),
            showSelection && sel === slot ? styles.paneSelected : null,
          ]}
        >
          <VideoView
            player={slot === "L" ? playerL : playerR}
            style={[StyleSheet.absoluteFill, videoTransform(slot)]}
            contentFit="contain"
            nativeControls={false}
          />
          <View style={styles.slotTag}>
            <Text style={styles.slotTagText}>{slot}</Text>
          </View>
        </View>
      ))}

      {side && <View style={styles.divider} />}

      <GestureDetector gesture={stageGesture}>
        <View style={styles.tapLayer} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  pane: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  paneSelected: {
    borderWidth: 2,
    borderColor: color.accent,
  },
  slotTag: {
    position: "absolute",
    left: 8,
    top: 8,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: withAlpha(color.stageBg, 0.65),
  },
  slotTagText: {
    fontSize: 10,
    letterSpacing: 1,
    color: color.neutral300,
  },
  divider: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: withAlpha(color.text, 0.22),
    pointerEvents: "none",
  },
  tapLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
});
