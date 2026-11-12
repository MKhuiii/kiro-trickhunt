# Third-Party Notices

TrickHunt serves the components below from its own origin so that the browser
never contacts a third-party host to run OCR or QR decoding. They are copied
into `public/tesseract/` and `public/zxing/` by `scripts/copy-client-assets.mjs`
before `dev` and `build`. The source and destination of every file are listed in
`src/client/ingest/assets.manifest.json`.

## Shipped components

| Component | Version | License | Source |
|---|---|---|---|
| tesseract.js | 7.0.0 | Apache-2.0 | https://github.com/naptha/tesseract.js |
| tesseract.js-core (WebAssembly build of Tesseract and its dependencies) | 7.0.0 | Apache-2.0 | https://github.com/naptha/tesseract.js-core |
| Tesseract trained data `eng` (from `@tesseract.js-data/eng`, set `4.0.0_best_int`) | 1.0.0 (package) | Apache-2.0 | https://github.com/tesseract-ocr/tessdata_best |
| Tesseract trained data `vie` (from `@tesseract.js-data/vie`, set `4.0.0_best_int`) | 1.0.0 (package) | Apache-2.0 | https://github.com/tesseract-ocr/tessdata_best |
| buffer (bundled in `worker.min.js`) | see note 1 | MIT | https://github.com/feross/buffer |
| ieee754 (bundled in `worker.min.js`) | see note 1 | BSD-3-Clause | https://github.com/feross/ieee754 |
| regenerator-runtime (bundled in `worker.min.js`) | see note 1 | MIT | https://github.com/facebook/regenerator |
| zlib.js (bundled in `worker.min.js`) | see note 1 | MIT | https://github.com/imaya/zlib.js |
| zxing-wasm | 3.1.6 | MIT | https://github.com/Sec-ant/zxing-wasm |
| zxing-cpp (compiled into the zxing-wasm reader) | see note 2 | Apache-2.0 | https://github.com/zxing-cpp/zxing-cpp |

Notes:

1. The bundled libraries are listed in `worker.min.js.LICENSE.txt`, which does
   not state their versions.
2. The zxing-wasm README names the zxing-cpp license; the bundled zxing-cpp
   version was not determined. The README also lists `zint` (BSD-3-Clause) for
   barcode writing. Only the reader build is shipped, and the wasm was not
   inspected for it.
3. The trained data comes from `tessdata_best`, whose `LICENSE` is Apache-2.0.
   The npm packages `@tesseract.js-data/*` declare MIT for the package itself.

## License files

License files are copied next to the assets (destinations from
`src/client/ingest/assets.manifest.json`):

| License file | Copied to |
|---|---|
| tesseract.js `LICENSE.md` | `public/tesseract/LICENSE.tesseract.js.md` |
| tesseract.js `worker.min.js.LICENSE.txt` | `public/tesseract/worker.min.js.LICENSE.txt` |
| tesseract.js-core `LICENSE` | `public/tesseract/core/LICENSE.tesseract.js-core` |
| zxing-wasm `LICENSE` | `public/zxing/LICENSE.zxing-wasm` |

## Development only

`qrcode-generator` (2.0.4, MIT, https://github.com/kazuhikoarase/qrcode-generator)
is a dev dependency used to build test QR images. It is not shipped to users.
