import React, { useRef, useEffect } from 'react';

const StrokeCanvas = ({ image }) => {
  const canvasRef = useRef();

  useEffect(() => {
    if (!image) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.drawImage(image, 0, 0);
  }, [image]);

  return (
    <canvas ref={canvasRef} style={{ border: '1px solid black' }} />
  );
};

export default StrokeCanvas;
