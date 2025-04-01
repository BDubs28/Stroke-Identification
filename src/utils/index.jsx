export async function extractStrokeSegments(canvas) {
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const visited = new Uint8Array(width * height);
    const debugPoints = [];
  
    const getPixelIndex = (x, y) => y * width + x;
  
    const isBlack = (x, y) => {
      const i = (y * width + x) * 4;
      return (
        data[i] < 20 &&
        data[i + 1] < 20 &&
        data[i + 2] < 20 &&
        data[i + 3] > 0
      );
    };
  
    // Precompute edge pixels
    const edgeMap = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isBlack(x, y)) continue;
  
        let isEdge = false;
        for (let dx = -1; dx <= 1 && !isEdge; dx++) {
          for (let dy = -1; dy <= 1 && !isEdge; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx < 0 || ny < 0 || nx >= width || ny >= height || !isBlack(nx, ny)
            ) {
              isEdge = true;
            }
          }
        }
  
        if (isEdge) {
          edgeMap[getPixelIndex(x, y)] = 1;
        }
      }
    }
  
    const isEdgePixel = (x, y) => edgeMap[getPixelIndex(x, y)] === 1;
  
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  
    const drawDebugPoint = (x, y, color, size = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, size, size);
    };
  
    const animateDebugAngle = async (p1, p2, p3, angle, isSharp) => {
      drawDebugPoint(p1[0], p1[1], "#ff0000");
      drawDebugPoint(p2[0], p2[1], "#ffff00");
      drawDebugPoint(p3[0], p3[1], "#00aaff");
      if (isSharp) {
        drawDebugPoint(p2[0], p2[1], "#ff00ff", 2);
        console.log(`🟪 Sharp angle at (${p2[0]}, ${p2[1]}): ${angle.toFixed(1)}°`);
        // await sleep(300);
      } else {
        // await sleep(10);
      }
    };
  
    const getAngle = (p1, p2, p3) => {
      const a = [p2[0] - p1[0], p2[1] - p1[1]];
      const b = [p3[0] - p2[0], p3[1] - p2[1]];
      const dot = a[0] * b[0] + a[1] * b[1];
      const magA = Math.hypot(...a);
      const magB = Math.hypot(...b);
      const cosTheta = dot / (magA * magB);
      return Math.acos(Math.min(Math.max(cosTheta, -1), 1)) * (180 / Math.PI);
    };
  
    const floodFill = async (x, y) => {
      const stack = [[x, y]];
      const path = [];
      const localVisited = new Set();
  
      while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        const idx = getPixelIndex(cx, cy);
        if (visited[idx] || localVisited.has(idx)) continue;
        visited[idx] = 1;
        localVisited.add(idx);
        path.push([cx, cy]);
  
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = cx + dx, ny = cy + dy;
            if (
              nx >= 0 && ny >= 0 &&
              nx < width && ny < height &&
              !visited[getPixelIndex(nx, ny)] &&
              isEdgePixel(nx, ny)
            ) {
              stack.push([nx, ny]);
            }
          }
        }
      }
  
      const strokeSegments = [];
      const sharpPoints = [];
  
      for (let i = 0; i < path.length - 14; i++) {
        const p1 = path[i];
        const p2 = path[i + 7];
        const p3 = path[i + 14];
        const angle = getAngle(p1, p2, p3);
        const isSharp = !isNaN(angle) && angle > 40;
        await animateDebugAngle(p1, p2, p3, angle, isSharp);
        if (isSharp) {
          sharpPoints.push({ point: p2, index: i + 7 });
        }
      }
  
      if (sharpPoints.length === 0) return [];
  
      const strokes = [];
      let lastIndex = 0;
  
      for (const sharp of sharpPoints) {
        const segment = path.slice(lastIndex, sharp.index + 1);
        if (segment.length >= 2) {
          strokes.push(segment);
        }
        lastIndex = sharp.index + 1;
      }
  
      if (lastIndex < path.length - 1) {
        strokes.push(path.slice(lastIndex));
      }
  
      return strokes;
    };
  
    const allStrokes = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!visited[getPixelIndex(x, y)] && isEdgePixel(x, y)) {
          const segments = await floodFill(x, y);
          if (segments) allStrokes.push(...segments);
        }
      }
    }
  
    console.log("🧠 Segmented strokes:", allStrokes.length);
  
    const brushRadius = 5;
    const colored = new Set();
    const strokeGroups = [];
  
    const strokeCovered = (brushPath, target) => {
      let hit = 0;
      const hitSet = new Set(target.map(([x, y]) => `${x},${y}`));
      for (const [bx, by] of brushPath) {
        for (let dx = -brushRadius; dx <= brushRadius; dx++) {
          for (let dy = -brushRadius; dy <= brushRadius; dy++) {
            const k = `${bx + dx},${by + dy}`;
            if (hitSet.has(k)) {
              hit++;
              break;
            }
          }
        }
      }
      return hit / target.length;
    };
  
    for (let i = 0; i < allStrokes.length; i++) {
      if (colored.has(i)) continue;
      const group = [i];
      colored.add(i);
      const color = `hsl(${Math.floor(Math.random() * 360)},100%,60%)`;
  
      for (let j = 0; j < allStrokes.length; j++) {
        if (i === j || colored.has(j)) continue;
        const overlap = strokeCovered(allStrokes[i], allStrokes[j]);
        if (overlap > 0.8) {
          group.push(j);
          colored.add(j);
          console.log(`🔗 Merging stroke ${i} & ${j} — confidence: ${overlap.toFixed(2)}`);
        }
      }
  
      strokeGroups.push(group);
  
      for (const idx of group) {
        const stroke = allStrokes[idx];
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(stroke[0][0], stroke[0][1]);
        for (const [x, y] of stroke) {
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  
    console.log("🎨 Final stroke groups:", strokeGroups.length);
    return strokeGroups.map(g => g.map(i => allStrokes[i]));
  }
  