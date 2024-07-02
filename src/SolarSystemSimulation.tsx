import React, { useState, useEffect, useRef } from 'react';

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  isSun: boolean;
  tail: {x: number, y: number}[];
}

const SolarSystemSimulation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bodies, setBodies] = useState<Body[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const G = 100;
  const baseTimeStep = 0.02;
  const tailLength = 100;

  useEffect(() => {
    const sun: Body = { 
      x: size.width / 2, y: size.height / 2, vx: 0, vy: 0, 
      mass: 1000, radius: 15, color: 'yellow', 
      isSun: true, tail: []
    };
    setBodies([sun]);
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const simulate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const updatedBodies = bodies.map(body => {
        if (body.isSun) return { ...body, tail: [...body.tail, { x: body.x, y: body.y }].slice(-tailLength) };

        let ax = 0;
        let ay = 0;

        bodies.forEach(otherBody => {
          if (body === otherBody) return;

          const dx = otherBody.x - body.x;
          const dy = otherBody.y - body.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > body.radius + otherBody.radius) {
            const force = (G * body.mass * otherBody.mass) / (distance * distance);
            ax += force * dx / (distance * body.mass);
            ay += force * dy / (distance * body.mass);
          }
        });

        const newVx = body.vx + ax * baseTimeStep * timeScale;
        const newVy = body.vy + ay * baseTimeStep * timeScale;
        const newX = body.x + newVx * baseTimeStep * timeScale;
        const newY = body.y + newVy * baseTimeStep * timeScale;

        return {
          ...body,
          vx: newVx,
          vy: newVy,
          x: newX,
          y: newY,
          tail: [...body.tail, { x: newX, y: newY }].slice(-tailLength)
        };
      });

      setBodies(updatedBodies);

      // Render tails and bodies
      updatedBodies.forEach(body => {
        // Render tail
        if (body.tail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(body.tail[0].x, body.tail[0].y);
          for (let i = 1; i < body.tail.length; i++) {
            ctx.lineTo(body.tail[i].x, body.tail[i].y);
          }
          ctx.strokeStyle = `${body.color}40`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Render body
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius, 0, 2 * Math.PI);
        ctx.fillStyle = body.color;
        ctx.fill();
      });

      if (isRunning) {
        animationFrameId = requestAnimationFrame(simulate);
      }
    };

    if (isRunning) {
      animationFrameId = requestAnimationFrame(simulate);
    } else {
      // Render initial state
      bodies.forEach(body => {
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius, 0, 2 * Math.PI);
        ctx.fillStyle = body.color;
        ctx.fill();
      });
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [bodies, isRunning, timeScale, size]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    const sun = bodies.find(body => body.isSun);
    if (!sun) return;

    const dx = x - sun.x;
    const dy = y - sun.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const speed = Math.sqrt(G * sun.mass / distance) * 0.8;
    const angle = Math.atan2(dy, dx) + Math.PI / 2;

    const newBody: Body = {
      x,
      y,
      vx: speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
      mass: 1 + Math.random() * 9,
      radius: 3 + Math.random() * 5,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      isSun: false,
      tail: []
    };

    setBodies([...bodies, newBody]);
  };

  const handleReset = () => {
    const sun: Body = { 
      x: size.width / 2, y: size.height / 2, vx: 0, vy: 0, 
      mass: 1000, radius: 15, color: 'yellow', 
      isSun: true, tail: []
    };
    setBodies([sun]);
    setIsRunning(false);
    setTimeScale(1);
  };

  const handleResize = (event: React.MouseEvent, direction: string) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const doDrag = (e: MouseEvent) => {
      if (direction === 'se') {
        setSize({
          width: startWidth + e.clientX - startX,
          height: startHeight + e.clientY - startY
        });
      }
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full bg-gray-900 text-white overflow-hidden p-4">
      <h1 className="text-4xl font-bold mb-4 text-center">N-Body Gravity Simulation</h1>
      <div ref={containerRef} className="bg-gray-800 p-4 rounded-xl shadow-lg relative" style={{ width: size.width, height: size.height }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full border border-gray-700 rounded-lg cursor-crosshair"
          onClick={handleCanvasClick}
        />
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 bg-gray-600 cursor-se-resize"
          onMouseDown={(e) => handleResize(e, 'se')}
        />
      </div>
      <div className="mt-4 space-x-4 flex justify-center">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition duration-300"
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-300"
        >
          Reset
        </button>
      </div>
      <div className="mt-4 w-full max-w-xs mx-auto">
        <label htmlFor="timeScale" className="block text-sm font-medium text-gray-300 mb-2">
          Time Scale: {timeScale.toFixed(2)}x
        </label>
        <input
          type="range"
          id="timeScale"
          min="0.1"
          max="5"
          step="0.1"
          value={timeScale}
          onChange={(e) => setTimeScale(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      <p className="mt-4 text-sm text-gray-300">Click on the canvas to add new bodies</p>
      <p className="mt-1 text-sm text-gray-300">Bodies: {bodies.length}</p>
    </div>
  );
};

export default SolarSystemSimulation;