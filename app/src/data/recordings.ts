import { Directory, File, Paths } from "expo-file-system";

/**
 * expo-camera saves a recording to a transient cache location that the OS
 * can reclaim at any time. Since a recorded take is meant to stick around
 * for repeated comparison (not a one-off reference to an external file,
 * the way an imported clip is), copy it into the app's own document
 * directory so it persists like everything else in the library.
 */
export function persistRecording(tempUri: string): string {
  const dir = new Directory(Paths.document, "recordings");
  dir.create({ intermediates: true, idempotent: true });

  const source = new File(tempUri);
  const dest = new File(dir, `take-${Date.now()}.mp4`);
  source.copySync(dest, { overwrite: true });

  return dest.uri;
}
