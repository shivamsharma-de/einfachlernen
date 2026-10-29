/** Measures a photo for the page gate, entirely on the device.
 *
 *  Text: ML Kit text recognition (MIT). Faces: ML Kit face detection (MIT), used as the people
 *  check. Explicit content: the on-device classifier in nsfwModel.ts. Any failure returns null,
 *  which the gate treats as unavailable and blocks. */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { classifyNsfw, NSFW_INPUT_SIZE } from './nsfwModel';
import type { PageMeasurement } from './pageGate';
import { coverageOf, type Box } from './coverage';

export type { Box };

export interface PhotoFile { uri: string; width: number; height: number }

/** The reason the last check failed, for development builds. Null after a successful check. */
let lastError: string | null = null;
export function getLastMeasureError(): string | null {
  return lastError;
}

/** Runs all three checks. Returns null when any of them fails, so the gate blocks the photo. */
export async function measurePage(photo: PhotoFile): Promise<PageMeasurement | null> {
  try {
    const [text, faces, small] = await Promise.all([
      TextRecognition.recognize(photo.uri),
      FaceDetection.detect(photo.uri, { performanceMode: 'fast' }),
      manipulateAsync(photo.uri, [{ resize: { width: NSFW_INPUT_SIZE, height: NSFW_INPUT_SIZE } }], {
        compress: 0.9,
        format: SaveFormat.JPEG,
        base64: true,
      }),
    ]);
    if (!small.base64) {
      lastError = 'resize produced no image';
      return null;
    }

    lastError = null;
    const lines = text.blocks.flatMap((b) => b.lines);
    const textBoxes = lines.flatMap((l) => (l.frame ? [l.frame] : []));
    const faceBoxes = faces.map((f) => f.frame);
    const nsfw = await classifyNsfw(small.base64);

    return {
      textCoverage: coverageOf(textBoxes, photo.width, photo.height),
      wordCount: lines.reduce((n, l) => n + l.elements.length, 0),
      humanCoverage: coverageOf(faceBoxes, photo.width, photo.height),
      nsfw,
    };
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.warn('measurePage failed:', lastError);
    return null;
  }
}
