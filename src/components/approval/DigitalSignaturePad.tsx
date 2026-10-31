// src/components/approval/DigitalSignaturePad.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Stamp, Eraser, CheckCircle2 } from 'lucide-react';

interface DigitalSignaturePadProps {
  signerName: string;
  signerPosition: string;
  defaultStampAction: string;
  value: string;
  onChange: (signatureData: string) => void;
}

export default function DigitalSignaturePad({
  signerName,
  signerPosition,
  defaultStampAction,
  value,
  onChange,
}: DigitalSignaturePadProps) {
  const [mode, setMode] = useState<'STAMP' | 'DRAW'>('STAMP');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnStroke, setHasDrawnStroke] = useState(false);

  const stampValue = `STAMP::${signerName}::${defaultStampAction}`;

  useEffect(() => {
    if (mode === 'STAMP') {
      onChange(stampValue);
    }
  }, [mode, stampValue, onChange]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = '#0f172a'; // หมึกสีน้ำเงินเข้มราชการบนพื้นขาวเวลาพิมพ์ A4
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnStroke(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawnStroke) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnStroke(false);
    onChange('');
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-200">
          รูปแบบการลงนามอิเล็กทรอนิกส์ (Digital Signature / E-Stamp)
        </span>
        <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setMode('STAMP')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold transition ${
              mode === 'STAMP'
                ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stamp className="h-3.5 w-3.5" /> ตราประทับลายเซ็นดิจิทัล
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('DRAW');
              onChange('');
              setHasDrawnStroke(false);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold transition ${
              mode === 'DRAW'
                ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" /> วาดลายเซ็นด้วยเมาส์/ปากกา
          </button>
        </div>
      </div>

      {mode === 'STAMP' ? (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-cyan-500/40 bg-cyan-950/20 px-4 py-3">
          <div>
            <p className="font-serif text-sm italic font-semibold text-cyan-200">
              {signerName}
            </p>
            <p className="text-[11px] text-slate-400">{signerPosition}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> ประทับตราดิจิทัล: &ldquo;{defaultStampAction}&rdquo;
            </p>
          </div>
          <div className="rounded-lg border-2 border-cyan-400/50 px-3 py-1.5 text-center rotate-[-4deg]">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300">
              E-VERIFIED
            </p>
            <p className="text-[9px] text-cyan-200/80">วท.ท่าหลวงฯ</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-white">
            <canvas
              ref={canvasRef}
              width={480}
              height={120}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="h-[120px] w-full cursor-crosshair touch-none"
            />
            {!hasDrawnStroke && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                ใช้นิ้วหรือเมาส์วาดลายมือชื่อที่นี่ (จะปรากฏบนฟอร์ม A4 ทันที)
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              ผู้ลงนาม: <strong className="text-slate-200">{signerName}</strong>
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-300 hover:bg-slate-800"
            >
              <Eraser className="h-3 w-3" /> ล้างลายเซ็น
            </button>
          </div>
          {!value && (
            <p className="text-[11px] text-amber-300">
              * กรุณาวาดลายมือชื่อ หรือสลับเป็นโหมดตราประทับลายเซ็นดิจิทัล
            </p>
          )}
        </div>
      )}
    </div>
  );
}
