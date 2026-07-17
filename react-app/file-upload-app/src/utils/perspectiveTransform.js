// Solve an 8x8 linear system Ax = b using Gaussian elimination with partial pivoting.
function solveLinear(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pivotVal = M[col][col];
    if (Math.abs(pivotVal) < 1e-12) continue; // singular-ish, best effort
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / pivotVal;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

// Computes a 3x3 homography H such that dstPts[i] ~ H * srcPts[i] (homogeneous).
// Returns [h11,h12,h13,h21,h22,h23,h31,h32,1] flattened row-major.
export function computeHomography(srcPts, dstPts) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = srcPts[i];
    const [X, Y] = dstPts[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  const h = solveLinear(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

// Applies homography H to point (x,y), returns [X,Y] after perspective divide.
export function applyHomography(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  const X = (H[0] * x + H[1] * y + H[2]) / w;
  const Y = (H[3] * x + H[4] * y + H[5]) / w;
  return [X, Y];
}

// Bilinear sample from a flat RGBA buffer.
function sampleBilinear(data, width, height, x, y) {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return [255, 255, 255, 0];
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
  const fx = x - x0, fy = y - y0;
  const idx = (xx, yy) => (yy * width + xx) * 4;
  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const v00 = data[idx(x0, y0) + c], v10 = data[idx(x1, y0) + c];
    const v01 = data[idx(x0, y1) + c], v11 = data[idx(x1, y1) + c];
    const top = v00 * (1 - fx) + v10 * fx;
    const bot = v01 * (1 - fx) + v11 * fx;
    out[c] = top * (1 - fy) + bot * fy;
  }
  return out;
}

// Warps sourceImageData (a {data,width,height} object, e.g. from canvas getImageData)
// so that the quadrilateral srcQuadPts becomes a flat outWidth x outHeight rectangle.
// srcQuadPts order: [topLeft, topRight, bottomRight, bottomLeft].
export function warpQuadToRect(sourceImageData, srcQuadPts, outWidth, outHeight) {
  const dstRectPts = [[0, 0], [outWidth, 0], [outWidth, outHeight], [0, outHeight]];
  // H maps rectangle coords -> source quad coords (so we can inverse-sample per output pixel)
  const H = computeHomography(dstRectPts, srcQuadPts);
  const { data, width: sw, height: sh } = sourceImageData;
  const outData = new Uint8ClampedArray(outWidth * outHeight * 4);

  for (let Y = 0; Y < outHeight; Y++) {
    for (let X = 0; X < outWidth; X++) {
      const [x, y] = applyHomography(H, X, Y);
      const [r, g, bch, a] = sampleBilinear(data, sw, sh, x, y);
      const outIdx = (Y * outWidth + X) * 4;
      outData[outIdx] = r; outData[outIdx + 1] = g; outData[outIdx + 2] = bch; outData[outIdx + 3] = a === 0 ? 255 : a;
    }
  }
  return { data: outData, width: outWidth, height: outHeight };
}