const canvas = document.getElementById("digital-board-canvas");
const selectedPencilColorEle = document.getElementById("selected-stroke-color");
const strokeWidthEle = document.getElementById("stroke-width");
const tools = document.querySelectorAll(".tool");
const strokeColorsEle = document.querySelectorAll(".stroke-color");
const configCont = document.querySelector(".config-cont");
const textInput = document.getElementById("textInput");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const video = document.querySelector("video");
const videoCont = document.querySelector(".video-cont");

function draw() {
  if (canvas.getContext) {
    const ctx = canvas.getContext("2d");
    // Set initial canvas size to match the viewport
    let canvasWidth = window.innerWidth;
    let canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    let mouseDown = false;
    let selectedToolOption = null;
    let strokeColor = "black";
    let lineWidth = strokeWidthEle.value;
    let startX;
    let startY;
    let textX;
    let textY;
    const INCRESEDEFAULTFONT = 2;
    // Array to store all drawn paths
    let allPaths = [];

    // Array to store current pencil path
    let currentPencilPath = [];

    function beginPath(data) {
      if (selectedToolOption?.id === "pencil") {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);

        currentPencilPath = [];
        currentPencilPath.push({
          x: data.x,
          y: data.y,
        });
      }

      if (
        selectedToolOption?.id === "rectangle" ||
        selectedToolOption?.id === "circle" ||
        selectedToolOption?.id === "line"
      ) {
        startX = data.x;
        startY = data.y;
      }
    }

    function redrawAllPaths() {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
      allPaths.forEach((path) => {
        ctx.lineWidth = path.lineWidth;
        ctx.strokeStyle = path.strokeColor;

        if (path.tool === "pencil") {
          ctx.beginPath();
          path.path.forEach((point, i) => {
            if (i === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
        }

        if (path.tool === "rectangle") {
          ctx.strokeRect(path.x, path.y, path.width, path.height); // Redraw each rectangle
        }

        if (path.tool === "circle") {
          // Redraw all circles

          ctx.beginPath();
          ctx.ellipse(
            path.centerX,
            path.centerY,
            path.radiusX,
            path.radiusY,
            0,
            0,
            2 * Math.PI
          );
          ctx.stroke();
        }

        if (path.tool === "line") {
          ctx.beginPath();
          ctx.moveTo(path.startX, path.startY);
          ctx.lineTo(path.endX, path.endY);
          ctx.stroke();
        }

        if (path.tool === "text") {
          ctx.font = `${path.fontSize}px Arial`;
          ctx.fillStyle = path.color;
          ctx.fillText(path.text, path.x, path.y);
        }
      });

      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeColor;
    }

    function drawStroke(data) {
      ctx.lineWidth = data.lineWidth;
      ctx.strokeStyle = data.strokeStyle;

      if (selectedToolOption.id === "pencil") {
        ctx.lineTo(data.x, data.y);
        ctx.stroke();

        currentPencilPath.push({
          x: data.x,
          y: data.y,
        });
      } else if (selectedToolOption.id === "rectangle") {
        redrawAllPaths();
        // Calculate current width and height based on mouse position
        const width = data.x - startX;
        const height = data.y - startY;

        // Draw the new rectangle (in progress)
        ctx.strokeRect(startX, startY, width, height);
      } else if (selectedToolOption?.id === "circle") {
        redrawAllPaths();
        const currentX = data.x;
        const currentY = data.y;

        // Calculate the bounding box dimensions
        const width = currentX - startX;
        const height = currentY - startY;

        // Calculate the center and radii for the ellipse
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;
        const radiusX = Math.abs(width / 2);
        const radiusY = Math.abs(height / 2);

        // Draw the new ellipse
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (selectedToolOption?.id === "line") {
        redrawAllPaths();
        // Draw the current line being drawn
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      } else if (selectedToolOption?.id === "eraser") {
        eraseAtPosition(data.x, data.y);
      }
    }

    // Function to draw the text on the canvas
    function drawText(text, x, y, size, color) {
      ctx.font = `${size}px Arial`;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    }

    function eraseAtPosition(x, y) {
      // Iterate backwards to prioritize topmost elements in the paths array
      for (let i = allPaths.length - 1; i >= 0; i--) {
        const path = allPaths[i];

        if (path.tool === "pencil") {
          // Erase pencil path points near the eraser
          for (let j = 0; j < path.path.length; j++) {
            const point = path.path[j];
            const dx = x - point.x;
            const dy = y - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 10) {
              // proximity threshold for erasing pencil strokes
              allPaths.splice(i, 1);
              redrawAllPaths();
              return; // Exit after erasing to avoid affecting other shapes
            }
          }
        } else if (path.tool === "rectangle") {
          // Check if we are near the edge of the rectangle, not inside
          const isNearLeft =
            Math.abs(x - path.x) < 10 &&
            y >= path.y &&
            y <= path.y + path.height;
          const isNearRight =
            Math.abs(x - (path.x + path.width)) < 10 &&
            y >= path.y &&
            y <= path.y + path.height;
          const isNearTop =
            Math.abs(y - path.y) < 10 &&
            x >= path.x &&
            x <= path.x + path.width;
          const isNearBottom =
            Math.abs(y - (path.y + path.height)) < 10 &&
            x >= path.x &&
            x <= path.x + path.width;

          if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
            allPaths.splice(i, 1); // Erase the rectangle
            redrawAllPaths();
            return;
          }
        } else if (path.tool === "circle") {
          // Check if the eraser is near the edge of the circle
          const dx = x - path.centerX;
          const dy = y - path.centerY;
          const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
          const isNearCircleEdge =
            Math.abs(distanceToCenter - path.radiusX) < 10; // proximity threshold for circle edges

          if (isNearCircleEdge) {
            allPaths.splice(i, 1); // Erase the circle
            redrawAllPaths();
            return;
          }
        } else if (path.tool === "line") {
          const distanceToLine = pointToLineDistance(
            { x: path.startX, y: path.startY },
            { x: path.endX, y: path.endY },
            { x, y }
          );
          if (distanceToLine < 10) {
            // threshold for line erasing
            allPaths.splice(i, 1); // Erase the line
            redrawAllPaths();
            return;
          }
        } else if (path.tool === "text") {
          const textWidth = ctx.measureText(path.text).width;
          const textHeight = path.fontSize;
          // Check if the eraser is over the text bounding box
          if (
            x > path.x &&
            x < path.x + textWidth &&
            y > path.y - textHeight &&
            y < path.y
          ) {
            allPaths.splice(i, 1); // Erase the text
            redrawAllPaths();
            return;
          }
        }
      }
    }

    // Utility function to measure distance from a point to a line segment
    function pointToLineDistance(start, end, point) {
      const a = end.y - start.y;
      const b = start.x - end.x;
      const c = end.x * start.y - start.x * end.y;

      const distance =
        Math.abs(a * point.x + b * point.y + c) / Math.sqrt(a * a + b * b);
      return distance;
    }

    tools.forEach((tool) => {
      tool.addEventListener("click", () => {
        mouseDown = false;
        if (selectedToolOption) {
          selectedToolOption.classList.remove("selected-tool");
        }

        selectedToolOption = tool;
        tool.classList.add("selected-tool");

        if (tool?.id !== "eraser") {
          configCont.style.display = "block";
        }
      });
    });

    strokeColorsEle.forEach((element) => {
      element.addEventListener("click", () => {
        const color = element.classList[2];
        const classToRemove = selectedPencilColorEle.classList.item(1);
        selectedPencilColorEle.classList.remove(classToRemove);

        selectedPencilColorEle.classList.add(color);

        strokeColor = color;
      });
    });

    strokeWidthEle.addEventListener("change", () => {
      lineWidth = strokeWidthEle.value;
    });

    // When the user types text and presses Enter, draw the text
    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        currentText = textInput.value;
        if (selectedToolOption?.id === "text" && currentText !== "") {
          drawText(
            currentText,
            textX,
            textY,
            lineWidth + INCRESEDEFAULTFONT,
            strokeColor
          );
          // Hide the input field after text is placed
          textInput.style.display = "none";

          // Save the text object in an array to allow future manipulation (e.g., moving, editing)
          allPaths.push({
            x: textX,
            y: textY,
            text: currentText,
            fontSize: lineWidth + INCRESEDEFAULTFONT,
            color: strokeColor,
            tool: "text",
          });
        }
      }
    });

    canvas.addEventListener("mousedown", (e) => {
      mouseDown = true;
      beginPath({
        x: e.clientX + window.scrollX,
        y: e.clientY + window.scrollY,
      });

      if (selectedToolOption?.id === "text") {
        textX = e.clientX + window.scrollX;
        textY = e.clientY + window.scrollY;

        // Show the text input field and position it
        textInput.style.display = "block";
        textInput.style.position = "absolute";
        textInput.style.left = `${textX}px`;
        textInput.style.top = `${textY - 40}px`;
        textInput.value = ""; // Clear input field
        textInput.focus();
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (mouseDown && selectedToolOption) {
        drawStroke({
          x: e.clientX + window.scrollX,
          y: e.clientY + window.scrollY,
          lineWidth: selectedToolOption.id === "eraser" ? 10 : lineWidth,
          strokeStyle:
            selectedToolOption.id === "eraser" ? "#ffffff" : strokeColor,
        });
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      if (mouseDown) {
        if (selectedToolOption?.id === "rectangle") {
          // Save the final rectangle to the array
          const width = e.clientX + window.scrollX - startX;
          const height = e.clientY + window.scrollY - startY;
          allPaths.push({
            x: startX,
            y: startY,
            width,
            height,
            tool: "rectangle",
            lineWidth,
            strokeColor,
          });
        }

        if (selectedToolOption?.id === "pencil") {
          allPaths.push({
            path: currentPencilPath,
            tool: "pencil",
            lineWidth,
            strokeColor,
          });
        }

        if (selectedToolOption?.id === "circle") {
          const currentX = e.clientX + window.scrollX;
          const currentY = e.clientY + window.scrollY;

          // Calculate the bounding box dimensions
          const width = currentX - startX;
          const height = currentY - startY;

          // Calculate the center and radii for the ellipse
          const centerX = startX + width / 2;
          const centerY = startY + height / 2;
          const radiusX = Math.abs(width / 2);
          const radiusY = Math.abs(height / 2);

          allPaths.push({
            centerX,
            centerY,
            radiusX,
            radiusY,
            tool: "circle",
            lineWidth,
            strokeColor,
          });
        }

        if (selectedToolOption?.id === "line") {
          const currentX = e.clientX + window.scrollX;
          const currentY = e.clientY + window.scrollY;
          allPaths.push({
            startX,
            startY,
            endX: currentX,
            endY: currentY,
            tool: "line",
            lineWidth,
            strokeColor,
          });
        }
      }

      mouseDown = false;
    });

    canvas.addEventListener("click", (e) => {
      configCont.style.display = "none";
    });

    window.addEventListener("scroll", (e) => {
      if (window.innerHeight + window.scrollY > canvas.height - 100) {
        const prevImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.height += window.innerHeight;
        // Restore the previous image on the expanded canvas
        ctx.putImageData(prevImage, 0, 0);
      }

      if (window.innerWidth + window.scrollX > canvas.width - 100) {
        const prevImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width += window.innerWidth;
        // Restore the previous image on the expanded canvas
        ctx.putImageData(prevImage, 0, 0);
      }
    });

    let mediaRecorder;
    let recordedChunks = [];
    startBtn.addEventListener("click", async () => {
      try {
        // Capture screen video
        recordedChunks = [];
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "browser" },
        });

        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        startBtn.style.display = "none";
        stopBtn.style.display = "inline-block";
        videoCont.style.display = "block";

        video.srcObject = videoStream;

        // Combine both streams
        const combinedStream = new MediaStream([
          ...screenStream.getTracks(), // Video tracks
          ...audioStream.getTracks(), // Audio tracks
        ]);

        mediaRecorder = new MediaRecorder(combinedStream);

        mediaRecorder.ondataavailable = function (event) {
          recordedChunks.push(event.data);
        };

        mediaRecorder.onstop = function () {
          screenStream.getTracks().forEach((track) => track.stop());

          const blob = new Blob(recordedChunks, {
            type: "video/webm",
          });
          const url = URL.createObjectURL(blob);

          // Create a download link for the recorded video
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = "digital_board_recording.webm";
          a.click();
          window.URL.revokeObjectURL(url);
        };

        mediaRecorder.start();
      } catch (err) {
        console.error("Error: " + err);
      }
    });

    stopBtn.addEventListener("click", () => {
      mediaRecorder.stop();

      // Stop the screen sharing when recording stops
      startBtn.style.display = "inline-block";
      stopBtn.style.display = "none";
      videoCont.style.display = "none";
    });
    // drawing code here
  } else {
    // canvas-unsupported code here
  }
}

window.addEventListener("load", draw);
