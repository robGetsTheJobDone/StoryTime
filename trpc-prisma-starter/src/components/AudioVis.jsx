import React, { useEffect, useRef } from 'react';

const AudioVisualizer = ({ audioRef, isPlaying }) => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      audioAnalyserRef.current = audioContextRef.current.createAnalyser();

      const source = audioContextRef.current.createMediaElementSource(
        audioRef.current,
      );
      source.connect(audioAnalyserRef.current);

      // Connect the analyser to the context's destination (audio output)
      audioAnalyserRef.current.connect(audioContextRef.current.destination);
    }

    // Kick off the visualization
    draw();
  }, [isPlaying, audioRef]);

  let colorShift = 0;
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const dataArray = new Uint8Array(
      audioAnalyserRef.current.frequencyBinCount,
    );
    audioAnalyserRef.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, width, height);

    dataArray.forEach((value, i) => {
      const x = (i / dataArray.length) * width;
      const y = height - (value / 255) * height;

      // Draw a circle at the calculated x, y position
      ctx.beginPath();
      ctx.arc(x, y, value / 10, 0, Math.PI * 2, false); // Use 'value / 10' as radius to scale it down

      // Color generation in HSL color space
      ctx.fillStyle = `hsl(${
        ((i / dataArray.length) * 360 + colorShift) % 360
      }, 100%, 50%)`;
      ctx.fill();
    });

    // Increase colorShift
    colorShift += 1;

    // Loop the animation
    requestAnimationFrame(draw);
  };

  return (
    <canvas
      style={{ opacity: 0.2 }}
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
    />
  );
};

export default AudioVisualizer;
