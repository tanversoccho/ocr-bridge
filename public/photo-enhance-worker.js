importScripts('/photo-filters.js');
self.onmessage = (event) => {
  try {
    const { rgba, width, height, filter, straighten } = event.data;
    if (width * height > 3240000 || width < 1 || height < 1)
      throw Error('Crop dimensions exceed enhancement limit.');
    const data = new Uint8ClampedArray(rgba);
    let gray = PhotoFilters.gray(data);
    const angle = straighten ? PhotoFilters.tilt(PhotoFilters.stretch(gray), width, height) : null;
    if (filter === 'auto') gray = PhotoFilters.stretch(gray);
    else if (filter === 'sharp')
      gray = PhotoFilters.sharpen(PhotoFilters.stretch(gray), width, height);
    else if (filter === 'bw') gray = PhotoFilters.threshold(PhotoFilters.stretch(gray));
    else if (filter === 'adaptive')
      gray = PhotoFilters.adaptive(PhotoFilters.stretch(gray), width, height);
    else if (filter === 'invert') gray = Uint8ClampedArray.from(gray, (v) => 255 - v);
    else if (filter !== 'gray' && filter !== 'original') throw Error('Unknown filter.');
    if (filter !== 'original')
      for (let i = 0; i < gray.length; i++) {
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = gray[i];
        data[i * 4 + 3] = 255;
      }
    self.postMessage({ rgba: data.buffer, width, height, angle }, [data.buffer]);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
