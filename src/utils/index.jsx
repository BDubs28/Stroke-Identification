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
  
    // Step 1: Precompute edge pixels
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
              nx < 0 || ny < 0 ||
              nx >= width || ny >= height ||
              !isBlack(nx, ny)
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
  
    // Step 2: Use edgeMap instead of recalculating
    const isEdgePixel = (x, y) => {
      return edgeMap[getPixelIndex(x, y)] === 1;
    };
  
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  
    const drawDebugPoint = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    };
  
    const animateDebugAngle = async (p1, p2, p3, angle, isSharp) => {
      drawDebugPoint(p1[0], p1[1], "#ff0000");
      drawDebugPoint(p2[0], p2[1], "#ffff00");
      drawDebugPoint(p3[0], p3[1], "#00aaff");
  
      if (isSharp) {
        drawDebugPoint(p2[0], p2[1], "#ff00ff");
        console.log(`🟪 Sharp angle at (${p2[0]}, ${p2[1]}): ${angle.toFixed(1)}°`);
        // await sleep(10);
      } else {
        // await sleep(10);
      }
    };
  
    const getAngle = (p1, p2, p3) => {
      const a = [p2[0] - p1[0], p2[1] - p1[1]];
      const b = [p3[0] - p2[0], p3[1] - p2[1]];
      const dot = a[0] * b[0] + a[1] * b[1];
      const magA = Math.hypot(a[0], a[1]);
      const magB = Math.hypot(b[0], b[1]);
      const cosTheta = dot / (magA * magB);
      const angle = Math.acos(Math.min(Math.max(cosTheta, -1), 1)) * (180 / Math.PI);
      return angle;
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
            const nx = cx + dx;
            const ny = cy + dy;
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
  
      // Sliding window: angle check with p1=i, p2=i+7, p3=i+14
      for (let i = 0; i < path.length - 14; i++) {
        const p1 = path[i];
        const p2 = path[i + 7];
        const p3 = path[i + 14];
        const angle = getAngle(p1, p2, p3);
  
        const isSharp = !isNaN(angle) && angle > 40;
        if (isSharp) debugPoints.push({ point: p2, index: i });
  
        await animateDebugAngle(p1, p2, p3, angle, isSharp);
      }
    };
  
    // Step 3: Scan the image and process edge pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!visited[getPixelIndex(x, y)] && isEdgePixel(x, y)) {
          await floodFill(x, y);
        }
      }
    }
  
    console.log("🟣 Found", debugPoints.length, "sharp angle debug points.");
  
    // Step 4: Deduplicate sharp angles by their index, not physical space
    const deduplicateByProximity = (points, window = 10) => {
      const clusters = [];
      let currentCluster = [];
  
      for (let i = 0; i < points.length; i++) {
        const cur = points[i];
        if (
          currentCluster.length === 0 ||
          cur.index - currentCluster[currentCluster.length - 1].index <= window
        ) {
          currentCluster.push(cur);
        } else {
          clusters.push(currentCluster);
          currentCluster = [cur];
        }
      }
  
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }
  
      return clusters.map((cluster) => {
        const avgX = Math.round(
          cluster.reduce((sum, p) => sum + p.point[0], 0) / cluster.length
        );
        const avgY = Math.round(
          cluster.reduce((sum, p) => sum + p.point[1], 0) / cluster.length
        );
        return [avgX, avgY];
      });
    };
  
    const deduped = deduplicateByProximity(debugPoints);
    console.log("🟢 Deduplicated sharp angles:", deduped.length);
  
    const isSurroundedByWhite = (x, y, radius = 3, threshold = 0.6) => {
        let whiteCount = 0;
        let total = 0;
      
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            total++;
            const i = (ny * width + nx) * 4;
            const isWhite = data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200;
            if (isWhite) whiteCount++;
          }
        }
      
        return whiteCount / total > threshold;
      };
      
      const filtered = deduped.filter(([x, y]) => !isSurroundedByWhite(x, y));
      
      console.log("🧠 After spatial fluke filtering:", filtered.length);
      
      filtered.forEach(([x, y]) => {
        ctx.fillStyle = "#00ff00";
        ctx.fillRect(x, y, 2, 2);
      });
      
      return filtered;
      

  }
  