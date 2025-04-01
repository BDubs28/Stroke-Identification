import { useRef, useState } from "react";
import { extractStrokeSegments } from "../utils/index";

const StrokeSegmenter = () => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [strokeCount, setStrokeCount] = useState(0);

  const handleImageUpload = async (e) => {
    console.log("handling upload");
    const file = e.target.files[0];
    if (!file) return;
    console.log("file exists");

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      console.log("reader loaded");

      img.onload = async () => {
        console.log("📷 Image loaded:", img.width, img.height);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // extractStrokeSegments now handles drawing and timing internally
        const debugPoints = await extractStrokeSegments(canvas);

        setStrokeCount(debugPoints.length);
        console.log(`🟣 Done with stroke analysis, ${debugPoints.length} debug points.`);
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  };

  return (
    <div style={{ marginTop: "3rem" }}>
      <h2>🖌️ Stroke Segmenter</h2>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        ref={fileInputRef}
      />
      <p style={{ marginTop: "1rem" }}>
        {strokeCount > 0
          ? `Found ${strokeCount} sharp angle points`
          : `Found 0 sharp angle points`}
      </p>
      <canvas
        ref={canvasRef}
        style={{
          marginTop: "1rem",
          border: "1px solid #ccc",
          maxWidth: "100%",
        }}
      />
    </div>
  );
};

export default StrokeSegmenter;
