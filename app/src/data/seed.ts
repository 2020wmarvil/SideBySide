import { Asset } from "expo-asset";
import type { Clip } from "./types";

const referenceAsset = require("../../assets/videos/reference.mp4");
const trainingAsset = require("../../assets/videos/training.mp4");

export async function buildSeedClips(): Promise<Clip[]> {
  const [reference, training] = await Asset.loadAsync([referenceAsset, trainingAsset]);
  const now = Date.now();
  return [
    {
      id: "seed-reference",
      uri: reference.localUri ?? reference.uri,
      title: "Backflip — coach demo",
      tags: ["backflip", "reference"],
      createdAt: now - 1000,
    },
    {
      id: "seed-training",
      uri: training.localUri ?? training.uri,
      title: "Backflip — try 04",
      tags: ["backflip", "ethan turner", "take charge gymnastics"],
      createdAt: now,
    },
  ];
}
