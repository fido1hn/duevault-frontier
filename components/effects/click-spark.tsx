"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ClickSparkEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

type Spark = {
  x: number;
  y: number;
  angle: number;
  startTime: number;
};

type ClickSparkProps = {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: ClickSparkEasing;
  extraScale?: number;
  className?: string;
  children: ReactNode;
};

const easingFns: Record<ClickSparkEasing, (value: number) => number> = {
  linear: (value) => value,
  "ease-in": (value) => value * value,
  "ease-out": (value) => 1 - Math.pow(1 - value, 2),
  "ease-in-out": (value) =>
    value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2,
};

export function ClickSpark({
  sparkColor = "hsl(40 80% 45%)",
  sparkSize = 7,
  sparkRadius = 18,
  sparkCount = 8,
  duration = 360,
  easing = "ease-out",
  extraScale = 1,
  className,
  children,
}: ClickSparkProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const frameRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const context = canvas.getContext("2d");
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    const ease = easingFns[easing];

    context.clearRect(0, 0, rect.width, rect.height);
    sparksRef.current = sparksRef.current.filter((spark) => {
      const progress = Math.min((now - spark.startTime) / duration, 1);

      if (progress >= 1) return false;

      const eased = ease(progress);
      const distance = eased * sparkRadius * extraScale;
      const lineLength = sparkSize * (1 - eased);
      const x1 = spark.x + distance * Math.cos(spark.angle);
      const y1 = spark.y + distance * Math.sin(spark.angle);
      const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
      const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

      context.save();
      context.globalAlpha = 1 - progress;
      context.strokeStyle = sparkColor;
      context.lineWidth = 2;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      context.restore();

      return true;
    });

    if (sparksRef.current.length > 0) {
      frameRef.current = requestAnimationFrame(draw);
    } else {
      frameRef.current = null;
    }
  }, [duration, easing, extraScale, sparkColor, sparkRadius, sparkSize]);

  const startAnimation = useCallback(() => {
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(draw);
    }
  }, [draw]);

  useEffect(() => {
    resizeCanvas();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = motionQuery.matches;

    const updateMotionPreference = () => {
      reduceMotionRef.current = motionQuery.matches;
    };

    motionQuery.addEventListener("change", updateMotionPreference);

    const observer = new ResizeObserver(resizeCanvas);
    if (wrapperRef.current) observer.observe(wrapperRef.current);

    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
      observer.disconnect();

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [resizeCanvas]);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotionRef.current) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const startTime = performance.now();

    sparksRef.current.push(
      ...Array.from({ length: sparkCount }, (_, index) => ({
        x,
        y,
        angle: (2 * Math.PI * index) / sparkCount,
        startTime,
      }))
    );

    startAnimation();
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)} onClick={handleClick}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-50"
      />
      {children}
    </div>
  );
}
