/* Paint whole square cells at one sample per cell, independent of device pixel ratio. */
(() => {
  const canvas = document.querySelector('.intro');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!canvas || motion.matches) { canvas?.remove(); return; }
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const size = innerWidth < 640 ? 22 : 32;
  const cols = Math.ceil(innerWidth / size);
  const rows = Math.ceil(innerHeight / size);
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const tiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wave = (rows - row - 1) / rows;
      tiles.push({ x: col * size, y: row * size, time: 130 + 640 * wave + Math.random() * 280 });
    }
  }
  tiles.sort((a, b) => a.time - b.time);
  ctx.fillStyle = '#080808';
  const start = performance.now();
  let next = 0;
  function paint(now) {
    const elapsed = now - start;
    if (motion.matches || elapsed > 1120 || document.activeElement?.matches('button, a')) {
      canvas.remove();
      return;
    }
    while (next < tiles.length && tiles[next].time <= elapsed) {
      const tile = tiles[next++];
      ctx.fillRect(tile.x, tile.y, size, size);
    }
    requestAnimationFrame(paint);
  }
  requestAnimationFrame(paint);
})();
