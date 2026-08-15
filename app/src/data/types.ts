export type Slot = "L" | "R";

export type Clip = {
  id: string;
  uri: string;
  title: string;
  tags: string[];
  createdAt: number;
  durationSec?: number;
};
