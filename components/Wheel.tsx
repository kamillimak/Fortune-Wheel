
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player } from '../types';
import { audioService } from '../services/audioService';

interface WheelProps {
  players: Player[];
  isSpinning: boolean;
  onSpinEnd: (winner: Player) => void;
  onSpinStart: () => void;
}

const COLORS = [
  '#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', 
  '#f59e0b', '#ec4899', '#3b82f6', '#d946ef'
];

export const Wheel: React.FC<WheelProps> = ({ players, isSpinning, onSpinEnd, onSpinStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const lastTickAngle = useRef(0);
  
  // Dragging state
  const isDragging = useRef(false);
  const dragStartAngle = useRef(0);
  const lastDragTime = useRef(0);
  const lastDragAngle = useRef(0);
  const dragVelocity = useRef(0);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || players.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const sliceAngle = (2 * Math.PI) / players.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.stroke();

    players.forEach((player, i) => {
      const startAngle = i * sliceAngle + rotationRef.current;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Inter';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(player.name, radius - 30, 6);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#6366f1';
    ctx.fill();
  }, [players]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel, rotation]);

  const triggerSpin = (initialVel: number = 0) => {
    if (isSpinning || players.length === 0) return;

    onSpinStart();
    audioService.playSpin();

    const startTime = Date.now();
    const minSpinTime = 3000;
    const extraSpinTime = Math.random() * 2000;
    const totalSpinTime = minSpinTime + extraSpinTime;
    
    const startRotation = rotationRef.current;
    // If no flick velocity, use a random one
    const baseRotations = initialVel > 1 ? initialVel * 2 : (5 + Math.random() * 5);
    const endRotation = startRotation + baseRotations * 2 * Math.PI;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalSpinTime, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      
      rotationRef.current = startRotation + (endRotation - startRotation) * easeProgress;
      setRotation(rotationRef.current);

      const sliceAngle = (2 * Math.PI) / players.length;
      const currentTickAngle = Math.floor((rotationRef.current - Math.PI / 2) / sliceAngle);
      if (currentTickAngle !== lastTickAngle.current) {
        audioService.playTick();
        lastTickAngle.current = currentTickAngle;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const normalizedRotation = (rotationRef.current % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
        const targetAngle = (1.5 * Math.PI - normalizedRotation + 2 * Math.PI) % (2 * Math.PI);
        const winnerIndex = Math.floor(targetAngle / sliceAngle) % players.length;
        
        audioService.playWin();
        onSpinEnd(players[winnerIndex]);
      }
    };

    requestAnimationFrame(animate);
  };

  const getAngle = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isSpinning) return;
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const angle = getAngle(clientX, clientY);
    dragStartAngle.current = angle - rotationRef.current;
    lastDragAngle.current = angle;
    lastDragTime.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || isSpinning) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const currentAngle = getAngle(clientX, clientY);
    const now = Date.now();
    const dt = now - lastDragTime.current;
    
    if (dt > 0) {
      // Smallest angle difference
      let diff = currentAngle - lastDragAngle.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      dragVelocity.current = diff / dt;
    }

    rotationRef.current = currentAngle - dragStartAngle.current;
    setRotation(rotationRef.current);
    lastDragAngle.current = currentAngle;
    lastDragTime.current = now;
  };

  const handleMouseUp = () => {
    if (!isDragging.current || isSpinning) return;
    isDragging.current = false;
    
    // Trigger spin if "flicked" fast enough
    if (Math.abs(dragVelocity.current) > 0.005) {
      triggerSpin(Math.abs(dragVelocity.current) * 100);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <div 
        className="canvas-container relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Pointer */}
        <div className="absolute top-[-10px] left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-8 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-indigo-600">
             <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[16px] border-t-indigo-600 mb-[-12px]"></div>
          </div>
        </div>
        
        <canvas 
          ref={canvasRef} 
          width={500} 
          height={500} 
          className="rounded-full bg-slate-800 border-8 border-slate-700 shadow-2xl"
        />
      </div>

      <button
        onClick={() => triggerSpin()}
        disabled={isSpinning || players.length === 0}
        className={`mt-10 px-12 py-4 rounded-full text-2xl font-bungee transition-all transform hover:scale-105 active:scale-95 shadow-xl ${
          isSpinning || players.length === 0
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:shadow-indigo-500/50'
        }`}
      >
        {isSpinning ? 'SPINNING...' : 'SPIN THE WHEEL'}
      </button>
      <p className="mt-4 text-slate-500 text-sm font-semibold uppercase tracking-widest animate-pulse">
        {isSpinning ? 'Good luck!' : 'Or flick the wheel to spin!'}
      </p>
    </div>
  );
};
