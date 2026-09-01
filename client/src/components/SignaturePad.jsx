import { useEffect, useRef } from 'react';

export function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#17324d';
    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = value;
    }
  }, []);
  const point = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: ((source.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((source.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  };
  const start = (event) => {
    event.preventDefault();
    drawing.current = true;
    const context = canvasRef.current.getContext('2d');
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
  };
  const move = (event) => {
    if (!drawing.current) return;
    event.preventDefault();
    const current = point(event);
    const context = canvasRef.current.getContext('2d');
    context.lineTo(current.x, current.y);
    context.stroke();
  };
  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };
  return (
    <div className='signature-field'>
      <canvas
        ref={canvasRef}
        width='600'
        height='180'
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={finish}
        onMouseLeave={finish}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={finish}
      />
      <button type='button' className='text-button' onClick={clear}>Clear signature</button>
    </div>
  );
}
