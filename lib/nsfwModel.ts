/** On-device explicit-content classifier: NSFWJS's MobileNetV2 model (MIT; weights from
 *  GantMan's nsfw_model, MIT), run with TensorFlow.js on the CPU. No network, no native code.
 *
 *  The model files ship inside the app (assets/nsfw-model). They are loaded by hand here,
 *  because NSFWJS's own loader uses Node's Buffer, which React Native does not provide. */
import * as tf from '@tensorflow/tfjs';
import jpeg from 'jpeg-js';
import type { NsfwScores } from './pageGate';

/* eslint-disable @typescript-eslint/no-require-imports */
const modelTopologyFile = require('../assets/nsfw-model/model.min.js');
const weightsFile = require('../assets/nsfw-model/group1-shard1of1.min.js');
/* eslint-enable @typescript-eslint/no-require-imports */

/** The model's input size. NSFWJS's MobileNetV2 uses 224×224. */
export const NSFW_INPUT_SIZE = 224;

/** Class order used by the model (NSFWJS nsfw_classes). */
const CLASS_ORDER = ['drawing', 'hentai', 'neutral', 'porn', 'sexy'] as const;

function bytesOfBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let modelPromise: Promise<tf.LayersModel> | null = null;

/** Loads the model once and keeps it for the session. */
function loadModel(): Promise<tf.LayersModel> {
  if (!modelPromise) {
    const handler: tf.io.IOHandler = {
      load: async () => ({
        modelTopology: modelTopologyFile.modelTopology,
        weightSpecs: modelTopologyFile.weightsManifest[0].weights,
        weightData: bytesOfBase64(weightsFile.default ?? weightsFile),
        format: 'layers-model',
      }),
    };
    modelPromise = tf.loadLayersModel(handler).catch((err) => {
      modelPromise = null; // allow a retry on the next photo
      throw err;
    });
  }
  return modelPromise;
}

/** Scores one JPEG (base64). Probabilities for each class, summing to about 1. */
export async function classifyNsfw(jpegBase64: string): Promise<NsfwScores> {
  const model = await loadModel();
  const decoded = jpeg.decode(new Uint8Array(bytesOfBase64(jpegBase64)), { useTArray: true });

  const rgb = new Uint8Array(decoded.width * decoded.height * 3);
  for (let i = 0, j = 0; i < decoded.data.length; i += 4, j += 3) {
    rgb[j] = decoded.data[i];
    rgb[j + 1] = decoded.data[i + 1];
    rgb[j + 2] = decoded.data[i + 2];
  }

  const output = tf.tidy(() => {
    const image = tf.tensor3d(rgb, [decoded.height, decoded.width, 3], 'int32');
    const input = tf.image
      .resizeBilinear(image.toFloat().div(255) as tf.Tensor3D, [NSFW_INPUT_SIZE, NSFW_INPUT_SIZE], true)
      .expandDims(0);
    return model.predict(input) as tf.Tensor;
  });
  const probabilities = Array.from(await output.data());
  output.dispose();

  const scores = Object.fromEntries(CLASS_ORDER.map((name, i) => [name, probabilities[i] ?? 0])) as Record<
    (typeof CLASS_ORDER)[number],
    number
  >;
  return scores;
}
