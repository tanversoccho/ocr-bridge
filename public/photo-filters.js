/* Pure grayscale filters shared by photo enhancement worker and tests. */
(function (root) {
  function gray(rgba) {
    const out = new Uint8ClampedArray(rgba.length / 4);
    for (let i = 0; i < out.length; i++)
      out[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8;
    return out;
  }
  function stretch(src) {
    let lo = 255,
      hi = 0;
    for (const v of src) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    if (hi - lo < 8) return src.slice();
    return Uint8ClampedArray.from(src, (v) => ((v - lo) * 255) / (hi - lo));
  }
  function threshold(src) {
    const hist = new Uint32Array(256);
    let sum = 0;
    for (const v of src) {
      hist[v]++;
      sum += v;
    }
    let count = 0,
      partial = 0,
      best = -1,
      t = 128;
    for (let i = 0; i < 256; i++) {
      count += hist[i];
      if (!count) continue;
      const rest = src.length - count;
      if (!rest) break;
      partial += i * hist[i];
      const d = partial / count - (sum - partial) / rest;
      const score = count * rest * d * d;
      if (score > best) {
        best = score;
        t = i;
      }
    }
    return Uint8ClampedArray.from(src, (v) => (v <= t ? 0 : 255));
  }
  function adaptive(src, w, h) {
    const stride = w + 1,
      integral = new Float64Array((w + 1) * (h + 1));
    for (let y = 1; y <= h; y++) {
      let row = 0;
      for (let x = 1; x <= w; x++) {
        row += src[(y - 1) * w + x - 1];
        integral[y * stride + x] = integral[(y - 1) * stride + x] + row;
      }
    }
    const out = new Uint8ClampedArray(src.length),
      r = 12;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r),
          x1 = Math.min(w, x + r + 1),
          y0 = Math.max(0, y - r),
          y1 = Math.min(h, y + r + 1);
        const mean =
          (integral[y1 * stride + x1] -
            integral[y0 * stride + x1] -
            integral[y1 * stride + x0] +
            integral[y0 * stride + x0]) /
          ((x1 - x0) * (y1 - y0));
        out[y * w + x] = src[y * w + x] < mean - 7 ? 0 : 255;
      }
    return out;
  }
  function sharpen(src, w, h) {
    const out = src.slice();
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        out[i] = src[i] * 2 - (src[i - 1] + src[i + 1] + src[i - w] + src[i + w]) / 4;
      }
    return out;
  }
  function tilt(src, w, h) {
    const step = Math.max(2, Math.ceil(Math.sqrt((w * h) / 12000))),
      points = [];
    for (let y = 0; y < h; y += step)
      for (let x = 0; x < w; x += step)
        if (src[y * w + x] < 100) points.push([x - w / 2, y - h / 2]);
    if (points.length < 20) return 0;
    let best = 0,
      max = -1;
    for (let a = -12; a <= 12; a += 3) {
      const rad = (a * Math.PI) / 180,
        bins = new Uint32Array(Math.ceil(Math.hypot(w, h)) + 2),
        offset = Math.floor(bins.length / 2);
      for (const [x, y] of points) {
        const i = Math.round(x * Math.sin(rad) + y * Math.cos(rad)) + offset;
        if (i >= 0 && i < bins.length) bins[i]++;
      }
      let score = 0;
      for (const b of bins) score += b * b;
      if (score > max) {
        max = score;
        best = a;
      }
    }
    return best;
  }
  const api = { gray, stretch, threshold, adaptive, sharpen, tilt };
  if (typeof module !== 'undefined') module.exports = api;
  else root.PhotoFilters = api;
})(typeof self !== 'undefined' ? self : globalThis);
