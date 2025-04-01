export async function extractStrokeSegments(canvas, batchSize = 30) {
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    
    // Draw the original image onto the canvas to extract pixel data
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
 
    const getPixelIndex = (x, y) => y * width + x;
    const isWhite = (x, y) => {
      const i = (y * width + x) * 4;
      return data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230;
    };
  
    // Step 1: Build stroke map and edge map
    const strokeMap = new Uint8Array(width * height);
    const edgeMap = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isWhite(x, y)) {
          const idx = getPixelIndex(x, y);
          strokeMap[idx] = 1;
        }
      }
    }
  
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = getPixelIndex(x, y);
        if (strokeMap[idx] === 1) {
          let isEdge = false;
          for (let dx = -1; dx <= 1 && !isEdge; dx++) {
            for (let dy = -1; dy <= 1 && !isEdge; dy++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= width || ny >= height ||
                strokeMap[getPixelIndex(nx, ny)] === 0) {
                isEdge = true;
              }
            }
          }
          if (isEdge) edgeMap[idx] = 1;
        }
      }
    }
  
    const isEdgePixel = (x, y) => edgeMap[getPixelIndex(x, y)] === 1;
  
    // Step 2: Flood fill edge strokes and store draw order
    const visited = new Uint8Array(width * height);
    const drawOrder = [];
  
    const floodFill = (x, y) => {
      const stack = [[x, y]];
      while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        const idx = getPixelIndex(cx, cy);
        if (visited[idx]) continue;
        visited[idx] = 1;
        drawOrder.push([cx, cy]);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              const nIdx = getPixelIndex(nx, ny);
              if (!visited[nIdx] && isEdgePixel(nx, ny)) {
                stack.push([nx, ny]);
              }
            }
          }
        }
      }
    };
  
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = getPixelIndex(x, y);
        if (strokeMap[idx] === 1 && edgeMap[idx] === 1 && !visited[idx]) {
          floodFill(x, y);
        }
      }
    }
  
    // Step 3: Animate edge drawing
    console.log("🟥 Drawing", drawOrder.length, "edge pixels");
    let edgeIndex = 0;
    const drawEdges = () => {
      for (let i = 0; i < batchSize && edgeIndex < drawOrder.length; i++, edgeIndex++) {
        const [x, y] = drawOrder[edgeIndex];
        ctx.fillStyle = "#000000"; // red
        ctx.fillRect(x, y, 1, 1);
      }
      if (edgeIndex < drawOrder.length) {
        requestAnimationFrame(drawEdges);
      } else {
        drawFiller(); // Start filler animation after edge is done
      }
    };
  
    // Step 4: Fill regions flood fill
    const fillerGroups = [];
    const visitedFill = new Uint8Array(width * height);
  
    const floodFillFiller = (x, y, group) => {
      const stack = [[x, y]];
      while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        const idx = getPixelIndex(cx, cy);
        if (visitedFill[idx]) continue;
        visitedFill[idx] = 1;
        group.push([cx, cy]);
  
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = cx + dx, ny = cy + dy;
            const nIdx = getPixelIndex(nx, ny);
            if (nx >= 0 && ny >= 0 && nx < width && ny < height &&
                strokeMap[nIdx] === 1 && edgeMap[nIdx] === 0 && !visitedFill[nIdx]) {
              stack.push([nx, ny]);
            }
          }
        }
      }
    };
  
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = getPixelIndex(x, y);
        if (strokeMap[idx] === 1 && edgeMap[idx] === 0 && !visitedFill[idx]) {
          const group = [];
          floodFillFiller(x, y, group);
          fillerGroups.push(group);
        }
      }
    }
  
    fillerGroups.sort((a, b) => {
      const minA = Math.min(...a.map(p => p[1]));
      const minB = Math.min(...b.map(p => p[1]));
      return minA - minB;
    });
  
    let fillGroupIndex = 0;
    let fillPixelIndex = 0;
  
    const drawFiller = () => {
      if (fillGroupIndex >= fillerGroups.length) return;
      const group = fillerGroups[fillGroupIndex];
      for (let i = 0; i < batchSize && fillPixelIndex < group.length; i++, fillPixelIndex++) {
        const [x, y] = group[fillPixelIndex];
        ctx.fillStyle = "#000000"; // light blue
        ctx.fillRect(x, y, 1, 1);
      }
      if (fillPixelIndex >= group.length) {
        fillGroupIndex++;
        fillPixelIndex = 0;
      }
      if (fillGroupIndex < fillerGroups.length) {
        requestAnimationFrame(drawFiller);
      }
    };
  
    drawEdges();
  
    return {
      edges: drawOrder,
      fill: fillerGroups
    };
  }
  