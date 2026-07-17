// src/utils/imageEnhance.js
// Simple canvas-based "scanner look" filter: grayscale + contrast stretch.
// Pure pixel math, no external libraries — cheap enough to run on a phone.

/**
 * Applies an in-place scanner-style enhancement to an ImageData object.
 * @param {ImageData} imageData
 * @param {number} contrast - 1.0 = no change, >1 = more contrast (try 1.35–1.6)
 * @param {number} brightness - -255..255, added after contrast (try 10–25 for scans)
 */
export function enhanceScanImageData(imageData, contrast = 1.4, brightness = 15) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    // Luminance-weighted grayscale — looks closer to a real scanned document
    // than a plain average of R/G/B.
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let v = (gray - 128) * contrast + 128 + brightness;
    v = Math.max(0, Math.min(255, v));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    // alpha (data[i+3]) left untouched
  }
  return imageData;
}

/**
 * Runs the enhance filter on a canvas in place.
 * @param {HTMLCanvasElement} canvas
 */
export function enhanceCanvas(canvas, contrast, brightness) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  enhanceScanImageData(imageData, contrast, brightness);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}