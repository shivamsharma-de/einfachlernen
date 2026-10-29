# Third-party components and licences

Status: working notes for legal review. Not for publication until reviewed.

| Component | Used for | Licence | Notes |
|---|---|---|---|
| nsfwjs 4.4.0 (infinitered/nsfwjs) | loading and running the explicit-content model | MIT | Package licence checked in node_modules (LICENSE). |
| NSFW model weights (GantMan/nsfw_model, MobileNetV2, bundled in nsfwjs) | explicit-content classification on the phone | MIT (repository LICENSE) | The repository's LICENSE says the project is MIT, and notes that third-party material may carry other terms. Confirm the release assets before commercial release. |
| Training data for the NSFW model (Alexander Kim's nsfw_data_scraper) | upstream of the model | not verified | The model was trained on scraped data. Its licence and terms are not confirmed here. Flag for legal review. |
| TensorFlow.js (@tensorflow/tfjs 4.22.0) | running the model | Apache-2.0 | |
| jpeg-js 0.4.4 | decoding the 224px image for the model | BSD-3-Clause | |
| @react-native-ml-kit/text-recognition 2.0.0 | on-device text detection (page check) | MIT | Native: needs a new development build. |
| @react-native-ml-kit/face-detection 2.0.1 | on-device face detection (people check) | MIT | Native: needs a new development build. |

Development-only tooling (Expo CLI and its dependencies) is not shipped in the app.
