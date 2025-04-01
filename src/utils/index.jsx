export async function extractStrokeSegments(canvas) {
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const visited = new Uint8Array(width * height);
    const debugPoints = [];
    const drawOrder = []; // <- store points in logical traversal order
  
    const getPixelIndex = (x, y) => y * width + x;
  
    const isWhite = (x, y) => {
      const i = (y * width + x) * 4;
      return data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230;
    };
  
    const isStrokePixel = (x, y) => !isWhite(x, y);
  
    const getAngle = (p1, p2, p3) => {
      const a = [p2[0] - p1[0], p2[1] - p1[1]];
      const b = [p3[0] - p2[0], p3[1] - p2[1]];
      const dot = a[0] * b[0] + a[1] * b[1];
      const magA = Math.hypot(a[0], a[1]);
      const magB = Math.hypot(b[0], b[1]);
      const cosTheta = dot / (magA * magB);
      return Math.acos(Math.min(Math.max(cosTheta, -1), 1)) * (180 / Math.PI);
    };
  
    // Build strokeMap
    const strokeMap = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isWhite(x, y)) {
          strokeMap[getPixelIndex(x, y)] = 1;
        }
      }
    }
  
    // Build edge map
    const edgeMap = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = getPixelIndex(x, y);
        if (strokeMap[idx] !== 1) continue;
        let isEdge = false;
        for (let dx = -1; dx <= 1 && !isEdge; dx++) {
          for (let dy = -1; dy <= 1 && !isEdge; dy++) {
            const nx = x + dx, ny = y + dy;
            if (
              nx < 0 || ny < 0 ||
              nx >= width || ny >= height ||
              strokeMap[getPixelIndex(nx, ny)] !== 1
            ) {
              isEdge = true;
            }
          }
        }
        if (isEdge) edgeMap[idx] = 1;
      }
    }
  
    const isEdgePixel = (x, y) => edgeMap[getPixelIndex(x, y)] === 1;
  
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
        drawOrder.push([cx, cy]); // Add in the traversal order
  
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = cx + dx, ny = cy + dy;
            if (
              nx >= 0 && nx < width &&
              ny >= 0 && ny < height &&
              !visited[getPixelIndex(nx, ny)] &&
              isEdgePixel(nx, ny)
            ) {
              stack.push([nx, ny]);
            }
          }
        }
      }
  
      // Angle checks for sharp turns
      for (let i = 0; i < path.length - 14; i++) {
        const p1 = path[i];
        const p2 = path[i + 7];
        const p3 = path[i + 14];
        const angle = getAngle(p1, p2, p3);
        const isSharp = !isNaN(angle) && angle > 40;
        if (isSharp) {
          debugPoints.push({ point: p2, index: i });
        }
      }
    };
  
    // Scan and flood fill
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!visited[getPixelIndex(x, y)] && isEdgePixel(x, y)) {
          await floodFill(x, y);
        }
      }
    }
  
    console.log("🟡 Drawing edges in logical order:", drawOrder.length);
  
    // Draw everything in drawOrder one by one
    let i = 0;
    const animateDrawing = () => {
        const batchSize = 30; // draw 100 pixels per frame
        for (let j = 0; j < batchSize && i < drawOrder.length; j++, i++) {
          const [x, y] = drawOrder[i];
          ctx.fillStyle = "#ff0000";
          ctx.fillRect(x, y, 1, 1);
        }
        if (i < drawOrder.length) {
          requestAnimationFrame(animateDrawing);
        }
      };
      
    animateDrawing();
  
    return drawOrder;
  }
  