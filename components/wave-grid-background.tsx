'use client';

import { useEffect, useRef } from 'react';

export function WaveGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const projectY = (depth: number, wave: number) => {
      const horizon = height * -0.1;
      const perspective = (depth / 8) ** 1.45;
      const base = horizon + perspective * (height * 0.9);
      return base + wave;
    };

    const draw = (timeMs: number) => {
      const t = timeMs * 0.0011;
      ctx.clearRect(0, 0, width, height);

      const gridColor = '#7dd3fc';
      const glowColor = '#22d3ee';
      const rows = 18;
      const cols = 44;
      const xStep = width / cols;

      ctx.lineWidth = 1;
      ctx.strokeStyle = `${gridColor}66`;

      for (let z = 1; z <= rows; z += 1) {
        ctx.beginPath();
        for (let x = 0; x <= cols; x += 1) {
          const wx = x * 0.42;
          const wz = z * 0.7;
          const wave =
            Math.sin(wx + t * 1.6) * 6 +
            Math.cos(wz + t * 1.2) * 4 +
            Math.sin((wx + wz) * 0.6 - t * 0.9) * 3;
          const px = x * xStep;
          const py = projectY(z, wave * (z / rows));
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.globalAlpha = 0.25 + (z / rows) * 0.55;
        ctx.stroke();
      }

      for (let x = 0; x <= cols; x += 2) {
        ctx.beginPath();
        for (let z = 1; z <= rows; z += 1) {
          const wx = x * 0.42;
          const wz = z * 0.7;
          const wave =
            Math.sin(wx + t * 1.6) * 6 +
            Math.cos(wz + t * 1.2) * 4 +
            Math.sin((wx + wz) * 0.6 - t * 0.9) * 3;
          const px = x * xStep;
          const py = projectY(z, wave * (z / rows));
          if (z === 1) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.globalAlpha = 0.08 + (x / cols) * 0.2;
        ctx.stroke();
      }

      ctx.globalAlpha = 0.28;
      const glow = ctx.createRadialGradient(width * 0.5, height * 0.62, 0, width * 0.5, height * 0.62, width * 0.55);
      glow.addColorStop(0, `${glowColor}4d`);
      glow.addColorStop(1, '#00000000');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      raf = window.requestAnimationFrame(draw);
    };

    resize();
    raf = window.requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed left-0 top-0 -z-10 h-screen w-screen" aria-hidden="true" />;
}
