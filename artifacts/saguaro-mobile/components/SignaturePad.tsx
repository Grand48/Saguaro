import React, { useRef, useState, useCallback } from "react";
import {
  View,
  PanResponder,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from "react-native";
import Svg, { Path, G } from "react-native-svg";

type Point = { x: number; y: number };

function pointsToSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

export function pathsToSvgString(paths: string[], width: number, height: number): string {
  const pathElements = paths.map((d) => `<path d="${d}" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${pathElements}</svg>`;
}

type Props = {
  onSignatureChange: (paths: string[], isEmpty: boolean) => void;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  borderColor?: string;
  label?: string;
};

export default function SignaturePad({
  onSignatureChange,
  strokeColor = "#1a1a1a",
  strokeWidth = 2.5,
  backgroundColor = "#fafafa",
  borderColor = "#d1d5db",
  label = "Sign here",
}: Props) {
  const [completedPaths, setCompletedPaths] = useState<string[]>([]);
  const [currentPathStr, setCurrentPathStr] = useState<string>("");
  const currentPoints = useRef<Point[]>([]);
  const [padSize, setPadSize] = useState({ width: 300, height: 160 });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPadSize({ width, height });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPoints.current = [{ x: locationX, y: locationY }];
        setCurrentPathStr(`M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPoints.current.push({ x: locationX, y: locationY });
        const d = pointsToSmoothPath(currentPoints.current);
        setCurrentPathStr(d);
      },
      onPanResponderRelease: () => {
        const d = pointsToSmoothPath(currentPoints.current);
        if (d && currentPoints.current.length >= 2) {
          setCompletedPaths((prev) => {
            const next = [...prev, d];
            onSignatureChange(next, false);
            return next;
          });
        }
        setCurrentPathStr("");
        currentPoints.current = [];
      },
    })
  ).current;

  const handleClear = () => {
    setCompletedPaths([]);
    setCurrentPathStr("");
    currentPoints.current = [];
    onSignatureChange([], true);
  };

  const isEmpty = completedPaths.length === 0 && !currentPathStr;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.padContainer, { backgroundColor, borderColor }]} onLayout={handleLayout}>
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          <Svg
            width={padSize.width}
            height={padSize.height}
            style={StyleSheet.absoluteFill}
          >
            {completedPaths.map((d, i) => (
              <Path
                key={i}
                d={d}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPathStr ? (
              <Path
                d={currentPathStr}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>

        {isEmpty && (
          <View style={styles.placeholder} pointerEvents="none">
            <Text style={styles.placeholderText}>{label}</Text>
          </View>
        )}

        {/* Baseline */}
        <View style={[styles.baseline, { backgroundColor: borderColor }]} pointerEvents="none" />
      </View>

      {!isEmpty && (
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", gap: 6 },
  padContainer: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#9ca3af",
    fontStyle: "italic",
  },
  baseline: {
    position: "absolute",
    bottom: 36,
    left: 20,
    right: 20,
    height: 1,
    opacity: 0.5,
  },
  clearBtn: { alignSelf: "flex-end" },
  clearBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#ef4444",
  },
});
