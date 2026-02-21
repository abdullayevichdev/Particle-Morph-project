/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

// --- Constants ---
const PARTICLE_COUNT = 2800; // Optimized for performance and density
const HEART_SCALE = 14;
const BASE_TEXT_SIZE = 150;
const MOUSE_RADIUS = 100;
const COLORS = ['#ff2d55', '#ff375f', '#ff1744', '#f50057', '#d500f9'];

// --- Types ---
interface Point {
  x: number;
  y: number;
}

class Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  friction: number;
  ease: number;
  color: string;
  opacity: number;
  twinkleSpeed: number;

  constructor(x: number, y: number) {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    this.targetX = x;
    this.targetY = y;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10;
    this.baseSize = Math.random() * 1.5 + 0.8; // Slightly larger to fill gaps without shadows
    this.size = this.baseSize;
    this.friction = 0.9;
    this.ease = 0.05 + Math.random() * 0.05;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.opacity = Math.random();
    this.twinkleSpeed = 0.01 + Math.random() * 0.02;
  }

  update(mouseX: number, mouseY: number) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    
    this.vx += dx * this.ease;
    this.vy += dy * this.ease;

    // Mouse interaction
    const mdx = this.x - mouseX;
    const mdy = this.y - mouseY;
    const distSq = mdx * mdx + mdy * mdy; // Use squared distance for performance
    const radiusSq = MOUSE_RADIUS * MOUSE_RADIUS;
    
    if (distSq < radiusSq) {
      const dist = Math.sqrt(distSq);
      const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
      const angle = Math.atan2(mdy, mdx);
      const push = force * 15;
      this.vx += Math.cos(angle) * push;
      this.vy += Math.sin(angle) * push;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;
    
    this.x += this.vx;
    this.y += this.vy;

    this.opacity += this.twinkleSpeed;
    if (this.opacity > 1 || this.opacity < 0.4) {
      this.twinkleSpeed *= -1;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -1000, y: -1000 });
  const animationFrameId = useRef<number>(0);

  const getHeartPoints = (width: number, height: number): Point[] => {
    const points: Point[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = Math.random() * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      points.push({
        x: width / 2 + x * HEART_SCALE,
        y: height / 2 + y * HEART_SCALE
      });
    }
    return points;
  };

  const getTextPoints = (text: string, width: number, height: number): Point[] => {
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return [];

    offscreenCanvas.width = width;
    offscreenCanvas.height = height;

    const fontSize = Math.min(BASE_TEXT_SIZE, (width / (text.length || 1)) * 1.4);
    
    offscreenCtx.fillStyle = '#fff';
    offscreenCtx.font = `900 ${fontSize}px "Inter", sans-serif`;
    offscreenCtx.textAlign = 'center';
    offscreenCtx.textBaseline = 'middle';
    
    offscreenCtx.clearRect(0, 0, width, height);
    offscreenCtx.fillText(text.toUpperCase(), width / 2, height / 2);

    const imageData = offscreenCtx.getImageData(0, 0, width, height).data;
    const sampledPoints: Point[] = [];

    const step = 2; // Increased step for better performance while sampling
    let minX = width, maxX = 0, minY = height, maxY = 0;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        if (imageData[index + 3] > 128) {
          sampledPoints.push({ x, y });
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (sampledPoints.length === 0) return getHeartPoints(width, height);

    const textWidth = maxX - minX;
    const textHeight = maxY - minY;
    const offsetX = (width - textWidth) / 2 - minX;
    const offsetY = (height - textHeight) / 2 - minY;

    const result: Point[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const randomIndex = Math.floor(Math.random() * sampledPoints.length);
      const p = sampledPoints[randomIndex];
      result.push({
        x: p.x + offsetX + (Math.random() - 0.5) * 1.5,
        y: p.y + offsetY + (Math.random() - 0.5) * 1.5
      });
    }
    return result;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particles.current.length === 0) {
        const initialPoints = getHeartPoints(canvas.width, canvas.height);
        particles.current = initialPoints.map(p => new Particle(p.x, p.y));
      } else {
        updateTargets();
      }
    };

    const updateTargets = () => {
      if (!canvasRef.current) return;
      const newPoints = text.trim() === '' 
        ? getHeartPoints(canvasRef.current.width, canvasRef.current.height)
        : getTextPoints(text, canvasRef.current.width, canvasRef.current.height);
      
      particles.current.forEach((p, i) => {
        p.targetX = newPoints[i].x;
        p.targetY = newPoints[i].y;
      });
    };

    const animate = () => {
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach(p => {
        p.update(mouse.current.x, mouse.current.y);
        p.draw(ctx);
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [text]);

  return (
    <div 
      className="relative w-full h-screen bg-[#000] overflow-hidden flex flex-col items-center justify-center font-sans"
      onMouseMove={(e) => mouse.current = { x: e.clientX, y: e.clientY }}
      onMouseLeave={() => mouse.current = { x: -1000, y: -1000 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-10 flex flex-col items-center gap-1 pointer-events-none"
      >
        <span className="text-[9px] uppercase tracking-[0.6em] text-white/20 font-bold">Interactive</span>
        <h1 className="text-xl font-light tracking-tight text-white/60">Particle <span className="text-pink-500/80 font-medium">Morph</span></h1>
      </motion.div>

      <div className="absolute bottom-20 w-full max-w-sm px-6 z-20">
        <motion.div 
          animate={{ scale: isFocused ? 1.02 : 1 }}
          className="relative"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl blur opacity-30" />
          
          <div className="relative bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <input
              type="text"
              value={text}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text..."
              className="w-full bg-transparent px-6 py-3.5 text-white text-base font-light tracking-[0.2em] focus:outline-none placeholder:text-white/5 text-center"
            />
            
            <motion.div 
              className="absolute bottom-0 left-0 h-[1px] bg-pink-500/50"
              initial={{ width: 0, left: '50%' }}
              animate={{ 
                width: isFocused ? '100%' : '0%',
                left: isFocused ? '0%' : '50%'
              }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </motion.div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-[0.01] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
}
