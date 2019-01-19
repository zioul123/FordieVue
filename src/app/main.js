// -------------------------------------------------------------------------------------------------
// Variables for animation.
// -------------------------------------------------------------------------------------------------
const defaultZoom = 2.8;
const aboutY  = [0, 1, 0, 1];
const aboutX  = [1, 0, 0, 1];
const aboutZ  = [0, 0, 1, 1];
const aboutXZ = [1, 0, 1, 0];
const aboutXY = [1, 1, 0, 0];
const aboutYZ = [0, 1, 1, 0];

// -------------------------------------------------------------------------------------------------
// ----------------------------------- Main/Render functions ---------------------------------------
// -------------------------------------------------------------------------------------------------
// Main function to setup and run the WebGL App.
// -------------------------------------------------------------------------------------------------
function main() {
    var canvas = document.querySelector("#glcanvas"); // or document.getElementById("myGLCanvas");
    canvas = WebGLDebugUtils.makeLostContextSimulatingCanvas(canvas);

    const gl = WebGLDebugUtils.makeDebugContext(createGLContext(canvas)); // Init the GL context
    const wgl = {}; // The object to hold all web gl information
    wgl.fpsCounter = document.getElementById("fps"); // The FPS counter
    const render = createRenderFunction(gl, wgl, drawScene);

    // Initialize functionality
    initListeners(gl, wgl, canvas, render); // Add listeners to the canvas
    initMatrixStack(gl, wgl);               // Setup the stack functionality
    initController(wgl);                    // Setup controller

    // Initialize shaders, models/buffers and gl properties 
    init(gl, wgl);          // Initialize things that can be affected by lost context
    initDrawables(gl, wgl); // Prepare the drawn objects
    
    wgl.requestId = requestAnimationFrame(render); // start the render loop
}

// -------------------------------------------------------------------------------------------------
// Function to draw the scene.
// -------------------------------------------------------------------------------------------------
function drawScene(gl, wgl, deltaTime) {
    // ------------------------------------
    // General GL setup/drawing related
    // ------------------------------------
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // No changes to projection matrix in this program
    
    // Model view matrix
    mat5.identity(wgl.modelViewMatrix); // Reset to identity
    // Set w backward for camera
    mat5.translate(wgl.modelViewMatrix, wgl.modelViewMatrix, [0, 0, 0, -wgl.focalLength]);
    // Final changes made based on input
    mat5.multiply(wgl.modelViewMatrix, wgl.modelViewMatrix, wgl.viewMatrix); // Rotation
    mat5.scale(wgl.modelViewMatrix, wgl.modelViewMatrix,                     // Scale
               [ wgl.zoomScale, wgl.zoomScale, wgl.zoomScale, wgl.zoomScale ])
    wgl.uploadPMatrix();
    wgl.uploadMvMatrix();
    
    // ------------------------------------
    // Draw all objects
    // ------------------------------------    
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    for (let i = 0; i < wgl.numberOfDrawables; i++) {
        wgl.listOfOpaqueDrawables[i].draw(deltaTime);
    }
}

// -------------------------------------------------------------------------------------------------
// ----------------------------- Initialization Related functions ----------------------------------
// -------------------------------------------------------------------------------------------------
// Create a GL context with a given canvas.
// -------------------------------------------------------------------------------------------------
function createGLContext(canvas) {
    var context = canvas.getContext("webgl");
    if (!context) {
        alert("Unable to initialize WebGL.");
        return;
    }
    context.viewportWidth  = canvas.width;
    context.viewportHeight = canvas.height;
    return context;
}

// -------------------------------------------------------------------------------------------------
// Create a render loop function that holds gl, wgl, and draw function in scope.
// -------------------------------------------------------------------------------------------------
function createRenderFunction(gl, wgl, drawScene) {
    var prevTime           = 0; // The previous frame time
    var prevFrameTimeStamp = 0; // The time of the last FPS updte
    var numOfFramesForFps  = 0; // The number of frames counted
    function render(currTime) {
        // Request next frame before drawing current frame
        wgl.requestId = requestAnimationFrame(render);
        // Handle timing
        currTime *= 0.001;              // Convert millis to seconds
        const deltaTime = currTime - prevTime;
        prevTime = currTime;
        // Handle FPS counter
        if (currTime - prevFrameTimeStamp >= 1) {
            wgl.fpsCounter.innerHTML = numOfFramesForFps;
            numOfFramesForFps = 0;
            prevFrameTimeStamp = currTime;
        }
        // Handle keypress events
        handlePressedDownKeys(wgl);
        // Handle mouse movement
        handleMouseMovement(wgl);
        // Handle controller events
        handleControllerEvents(wgl);
        // Draw 
        drawScene(gl, wgl, deltaTime);
        // Add to FPS counter
        numOfFramesForFps++;
    }
    return render;
}

// -------------------------------------------------------------------------------------------------
// Creates a shader of given type, uploads the source and compiles it.
// -------------------------------------------------------------------------------------------------
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send source to the shader
    gl.shaderSource(shader, source);
    // Compile shader program
    gl.compileShader(shader);

    // Alert if it failed
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        alert("Error occured compiling the " 
            + (type ==  gl.VERTEX_SHADER ? "vertex" : "fragment") + " shader: " 
            + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// -------------------------------------------------------------------------------------------------
// --------------------------------- Initialization functions --------------------------------------
// -------------------------------------------------------------------------------------------------
// Initialize state that will be affected by lost context.
// -------------------------------------------------------------------------------------------------
function init(gl, wgl) {
    initShaders(gl, wgl);                   // Setup the shader program and program info
    initModels(gl, wgl);                    // Build objects to be drawn and their buffers
    initGl(gl, wgl);                        // Setup gl properties
}
// -------------------------------------------------------------------------------------------------
// Set up the shader program and program info.
// -------------------------------------------------------------------------------------------------
function initShaders(gl, wgl) {
    // Initialize shader program with the specified shader
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram  = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // Alert if it failed
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) && !gl.isContextLost()) {
        alert("Unable to initialize shader program: " + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    gl.useProgram(shaderProgram); // Use the program
   
    // Get attribute and uniform locations
    const vertexPosition     = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    const vertexColor        = gl.getAttribLocation(shaderProgram, 'aVertexColor');
    const is4d               = gl.getAttribLocation(shaderProgram, 'aIs4d');
    const focalLength        = gl.getUniformLocation(shaderProgram, 'uFocalLength');
    const mvMatrix1          = gl.getUniformLocation(shaderProgram, 'uMVMatrix1');
    const mvMatrix2          = gl.getUniformLocation(shaderProgram, 'uMVMatrix2');
    const pMatrix            = gl.getUniformLocation(shaderProgram, 'uPMatrix');

    // Put the program info in the wgl object
    wgl.shaderProgram    = shaderProgram;
    wgl.attribLocations  = { 
        vertexPosition: vertexPosition,
        vertexColor:    vertexColor, 
        is4d:           is4d,
    };
    wgl.uniformLocations = {
        focalLength: focalLength,
        mvMatrix1:    mvMatrix1,
        mvMatrix2:    mvMatrix2,
        pMatrix:     pMatrix,
    };
}

// -------------------------------------------------------------------------------------------------
// Initializes the models and buffers to be drawn in this scene.
// -------------------------------------------------------------------------------------------------
function initModels(gl, wgl) {
    // ------------------------------------
    // Cube model
    // ------------------------------------ 
    cubeModel = {};
    // Set up buffers
    cubeModel.setupBuffers = function() {
        // Setup object data
        cubeModel.vertexPositionBuffer           = gl.createBuffer();
        cubeModel.vertexPositionBufferItemSize   = 4;
        cubeModel.vertexPositionBufferNumItems   = 8;
        cubeModel.vertexIndexBuffer              = gl.createBuffer();
        cubeModel.vertexIndexBufferItemSize      = 1;
        cubeModel.vertexIndexBufferRoundNumItems = 24;

        const cubeVertexPositions = [
            // Top face
             1.0,  1.0,  1.0,  1.0, // w is always 1 for non-4d
             1.0,  1.0, -1.0,  1.0,
            -1.0,  1.0, -1.0,  1.0, 
            -1.0,  1.0,  1.0,  1.0,

            // Bottom face
             1.0, -1.0,  1.0,  1.0,
             1.0, -1.0, -1.0,  1.0,
            -1.0, -1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,  1.0,
        ];
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertexPositions), gl.STATIC_DRAW);

        const cubeVertexIndices = [
            0,  1,    1,  2,    2,  3,    3,  0, // Top
            4,  5,    5,  6,    6,  7,    7,  4, // Bot
            0,  4,    1,  5,    2,  6,    3,  7, // Connectors of the two squares
        ];
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeModel.vertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    }
    cubeModel.setupBuffers();

    // Set up functions
    cubeModel.setupAttributes = function(colors) {
        // Tell shader that it's NOT 4d
        {
            // False
            gl.disableVertexAttribArray(wgl.attribLocations.is4d);
            gl.vertexAttrib1f(wgl.attribLocations.is4d, -1.0);     
        }
        // Constant color for the cube
        {
            var r, g, b, a;
            if (colors == null) {
                a = 1.0, r = g = b = 1.0; // white cube
            } else { 
                r = colors[0]; g = colors[1]; b = colors[2]; a = colors[3];
            }

            gl.disableVertexAttribArray(wgl.attribLocations.vertexColor);
            gl.vertexAttrib4fv(wgl.attribLocations.vertexColor, [ r, g, b, a ]);
        }
        // Vertex positions
        {
            const stride = 0; const offset = 0; const norm = false; const type = gl.FLOAT;

            gl.enableVertexAttribArray(wgl.attribLocations.vertexPosition);
            gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.vertexPositionBuffer);
            gl.vertexAttribPointer(wgl.attribLocations.vertexPosition,
                                   cubeModel.vertexPositionBufferItemSize,
                                   type, norm, stride, offset);
        }
    }
    cubeModel.drawElements = function() {
        const offset = 0;
        // Element indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeModel.vertexIndexBuffer);
        gl.drawElements(gl.LINES, cubeModel.vertexIndexBufferRoundNumItems,
                        gl.UNSIGNED_SHORT, offset);
    }

    // ------------------------------------
    // Tesseract model
    // ------------------------------------ 
    tesseractModel = {};
    // Set up buffers
    tesseractModel.setupBuffers = function() {
        // Setup object data
        tesseractModel.vertexPositionBuffer           = gl.createBuffer();
        tesseractModel.vertexPositionBufferItemSize   = 4;
        tesseractModel.vertexPositionBufferNumItems   = 16;
        tesseractModel.vertexIndexBuffer              = gl.createBuffer();
        tesseractModel.vertexIndexBufferItemSize      = 1;
        tesseractModel.vertexIndexBufferRoundNumItems = 64;

        const tessVertexPositions = [
            // Top face w
             1.0,  1.0,  1.0,  1.0,
             1.0,  1.0, -1.0,  1.0,
            -1.0,  1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,  1.0,

            // Bottom face w
             1.0, -1.0,  1.0,  1.0,
             1.0, -1.0, -1.0,  1.0,
            -1.0, -1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,  1.0,

            // Top face -w
             1.0,  1.0,  1.0, -1.0,
             1.0,  1.0, -1.0, -1.0,
            -1.0,  1.0, -1.0, -1.0,
            -1.0,  1.0,  1.0, -1.0,

            // Bottom face -w
             1.0, -1.0,  1.0, -1.0,
             1.0, -1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0, -1.0,
        ];
        gl.bindBuffer(gl.ARRAY_BUFFER, tesseractModel.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tessVertexPositions), gl.STATIC_DRAW);

        var w = 8; // Offset for the w-deeper cube
        const tessVertexIndices = [
            0,  1,    1,  2,    2,  3,    3,  0, // Top w
            4,  5,    5,  6,    6,  7,    7,  4, // Bot w
            0,  4,    1,  5,    2,  6,    3,  7, // Connectors of the two squares

            w+0, w+1,  w+1, w+2,  w+2, w+3,  w+3, w+0, // Top -w
            w+4, w+5,  w+5, w+6,  w+6, w+7,  w+7, w+4, // Bot -w
            w+0, w+4,  w+1, w+5,  w+2, w+6,  w+3, w+7, // Connectors of the two squares

            0,  8,    1,  9,    2, 10,    3, 11, // Connectors of the two cubes top   
            4, 12,    5, 13,    6, 14,    7, 15, // Connectors of the two cubes bot
        ];
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tesseractModel.vertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tessVertexIndices), gl.STATIC_DRAW);
    }
    tesseractModel.setupBuffers();

    // Set up functions
    tesseractModel.setupAttributes = function(colors) {
        // Tell shader that it's 4d
        {
            // True
            gl.disableVertexAttribArray(wgl.attribLocations.is4d);
            gl.vertexAttrib1f(wgl.attribLocations.is4d, 1.0);     
        }
        // Constant color for the cube
        {
            var r, g, b, a;
            if (colors == null) {
                a = 1.0, r = g = b = 1.0; // white cube
            } else { 
                r = colors[0]; g = colors[1]; b = colors[2]; a = colors[3];
            }

            gl.disableVertexAttribArray(wgl.attribLocations.vertexColor);
            gl.vertexAttrib4fv(wgl.attribLocations.vertexColor, [ r, g, b, a ]);
        }
        // Vertex positions
        {
            const stride = 0; const offset = 0; const norm = false; const type = gl.FLOAT;

            gl.enableVertexAttribArray(wgl.attribLocations.vertexPosition);
            gl.bindBuffer(gl.ARRAY_BUFFER, tesseractModel.vertexPositionBuffer);
            gl.vertexAttribPointer(wgl.attribLocations.vertexPosition,
                                   tesseractModel.vertexPositionBufferItemSize,
                                   type, norm, stride, offset);
        }
    }
    tesseractModel.drawElements = function() {
        const offset = 0;
        // Element indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tesseractModel.vertexIndexBuffer);
        gl.drawElements(gl.LINES, tesseractModel.vertexIndexBufferRoundNumItems,
                        gl.UNSIGNED_SHORT, offset);
    }

    // ------------------------------------
    // Put all models into wgl
    // ------------------------------------ 
    wgl.models = {
        cube: cubeModel,
        tesseract: tesseractModel,
    }
}

// -------------------------------------------------------------------------------------------------
// Initialize the gl properties.
// -------------------------------------------------------------------------------------------------
function initGl(gl, wgl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    // gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // For perspective matrix setup
    wgl.focalLength = focalLength = 5;             // Focal length of 5
    gl.uniform1f(wgl.uniformLocations.focalLength, false, focalLength);

    const tan_60 =  1.7320507764816284; // Fovy of 60
    wgl.projectionMatrix = mat4.fromValues(
        // Transposed matrix notation
        tan_60,              0,              0,               0,
             0,         tan_60,              0,               0,
             0,              0,             -1,              -1, 
             0,              0,  1/focalLength,               1,
    );
    mat4.translate(wgl.projectionMatrix, wgl.projectionMatrix, [0, 0, -focalLength]);

    // Camera movement setup
    wgl.upVec      = vec3.fromValues(0, 1, 0); // Up axis for camera movement
    wgl.rightVec   = vec3.fromValues(1, 0, 0); // Right axis for camera movement
    wgl.toEyeVec   = vec3.fromValues(0, 0, 1); // Outward axis for camera movement
    wgl.viewMatrix = mat5.create();            // For rotation of view
    wgl.zoomScale  = defaultZoom;              // For scaling of view
}

// -------------------------------------------------------------------------------------------------
// Initialize and add listeners to the canvas.
// -------------------------------------------------------------------------------------------------
function initListeners(gl, wgl, canvas, render) {
    // ------------------------------------ 
    // Lost context related
    // ------------------------------------ 
    function handleContextLost(event) {
        event.preventDefault(); // Prevent default action that context will not be restored
        cancelAnimationFrame(wgl.requestId);
    }
    function handleContextRestored(event) {
        init(gl, wgl);
        requestAnimationFrame(render);
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    // Uncomment for simulating lost context.
    // window.addEventListener('mousedown', () => canvas.loseContext());
    
    // ------------------------------------ 
    // Mouse related
    // ------------------------------------ 
    wgl.prevX = undefined; wgl.prevY = undefined; // Keep track of position
    wgl.currX = undefined; wgl.currY = undefined;
    wgl.mouseDown = false;
    function handleMouseDown(event) {
        wgl.mouseDown = true;
        wgl.prevX = event.clientX; wgl.prevY = event.clientY;
        wgl.currX = event.clientX; wgl.currY = event.clientY;
        // console.log("mouseDown, clientX=%d, clientY=%d, button=%d", 
        //              event.clientX, event.clientY, event.button);
    }
    function handleMouseUp(event) {
        wgl.mouseDown = false;
        wgl.prevX = undefined; wgl.prevY = undefined;
        wgl.currX = undefined; wgl.currY = undefined;
        // console.log("mouseUp, clientX=%d, clientY=%d, button=%d", 
        //              event.clientX, event.clientY, event.button);
    }
    function handleMouseMove(event) {
        // Update previous mouse position
        wgl.prevX = wgl.currX;     wgl.prevY = wgl.currY;
        // Record current mouse position 
        wgl.currX = event.clientX; wgl.currY = event.clientY;
        // console.log("mouseMove, clientX=%d, clientY=%d, button=%d", 
        //              event.clientX, event.clientY, event.button);
    }
    document.addEventListener('mousedown', handleMouseDown, false);
    document.addEventListener('mouseup', handleMouseUp, false);
    document.addEventListener('mousemove', handleMouseMove, false);

    // ------------------------------------ 
    // Keyboard related
    // ------------------------------------ 
    wgl.listOfPressedKeys = []; // Keep track of pressed down keys
    function handleKeyDown(event) {
        wgl.listOfPressedKeys[event.keyCode] = true;
        // console.log("keydown - keyCode=%d, charCode=%d", event.keyCode, event.charCode);
    }
    function handleKeyUp(event) {
        wgl.listOfPressedKeys[event.keyCode] = false;
        // console.log("keyup - keyCode=%d, charCode=%d", event.keyCode, event.charCode);
    }
    function handleKeyPress(event) {} // Doesn't do anything
    document.addEventListener('keydown', handleKeyDown, false);
    document.addEventListener('keyup', handleKeyUp, false);
    document.addEventListener('keypress', handleKeyPress, false);
}

// -------------------------------------------------------------------------------------------------
// Set up the matrix and matrix stack functionality of the wgl object.
// -------------------------------------------------------------------------------------------------
function initController(wgl) {
    wgl.pxgamepad = new PxGamepad();
    wgl.pxgamepad.start();

    setInterval(function() {
        wgl.pxgamepad.update();
    }, 25);
}

// -------------------------------------------------------------------------------------------------
// Set up the matrix and matrix stack functionality of the wgl object.
// -------------------------------------------------------------------------------------------------
function initMatrixStack(gl, wgl) {
    wgl.modelViewMatrix  = mat5.create();
    wgl.projectionMatrix = mat4.create();
    wgl.modelViewMatrixStack = [];

    wgl.pushMatrix = function() {
        var copyToPush = mat5.create();
        mat5.copy(copyToPush, wgl.modelViewMatrix);
        wgl.modelViewMatrixStack.push(copyToPush);
    }
    wgl.popMatrix = function() {
        if (wgl.modelViewMatrixStack.length == 0) {
            throw "Error wgl.popMatrix() - Stack was empty ";
        }
        wgl.modelViewMatrix = wgl.modelViewMatrixStack.pop();
    }
    wgl.uploadMvMatrix = function() {
        let upperLeft   = mat4.create();
        let bottomRight = mat3.create();
        var a = wgl.modelViewMatrix;

        upperLeft[0]  = a[0];  upperLeft[1]  = a[1];  upperLeft[2]  = a[2];  upperLeft[3]  = a[3];
        upperLeft[4]  = a[5];  upperLeft[5]  = a[6];  upperLeft[6]  = a[7];  upperLeft[7]  = a[8];
        upperLeft[8]  = a[10]; upperLeft[9]  = a[11]; upperLeft[10] = a[12]; upperLeft[11] = a[13];
        upperLeft[12] = a[15]; upperLeft[13] = a[16]; upperLeft[14] = a[17]; upperLeft[15] = a[18];

        bottomRight[0] = a[4];  bottomRight[1] = a[9];  bottomRight[2] = a[14];
        bottomRight[3] = a[19]; bottomRight[4] = a[24]; bottomRight[5] = a[23];
        bottomRight[6] = a[22]; bottomRight[7] = a[21]; bottomRight[8] = a[20];

        gl.uniformMatrix4fv(wgl.uniformLocations.mvMatrix1, false, upperLeft);
        gl.uniformMatrix3fv(wgl.uniformLocations.mvMatrix2, false, bottomRight);
    }
    wgl.uploadPMatrix  = function() {
        gl.uniformMatrix4fv(wgl.uniformLocations.pMatrix, false, wgl.projectionMatrix);
    }
}

// -------------------------------------------------------------------------------------------------
// Initialize the gl properties.
// -------------------------------------------------------------------------------------------------
function initDrawables(gl, wgl) {
    // ------------------------------------
    // Instructions to draw cube
    // ------------------------------------ 
    cube = {
        draw: function(deltaTime) {
            wgl.models.cube.setupAttributes([1.0, 1.0, 1.0, 1.0]);
            wgl.pushMatrix();
                wgl.uploadMvMatrix();
                wgl.models.cube.drawElements();
            wgl.popMatrix();
        }
    };

    tesseract = {
        draw: function(deltaTime) {
            wgl.models.tesseract.setupAttributes([1.0, 0.2, 0.2, 1.0]);
            wgl.pushMatrix();
                wgl.uploadMvMatrix();
                wgl.models.tesseract.drawElements();
            wgl.popMatrix();
        }
    };

    // Put drawables into wgl
    wgl.numberOfDrawables = 1;
    wgl.listOfOpaqueDrawables = [ tesseract ];
}

// -------------------------------------------------------------------------------------------------
// ----------------------------------- Interaction functions ---------------------------------------
// -------------------------------------------------------------------------------------------------
// Rotate the view by the angle around the specified axis (plane) vec4.
// -------------------------------------------------------------------------------------------------
function rotateView(wgl, rads, axisVec) {
    // Get the rotation matrix
    var rotation = mat5.create();
    mat5.fromRotation(rotation, rads, axisVec);
    // Rotate the view matrix
    mat5.multiply(wgl.viewMatrix, rotation, wgl.viewMatrix);
}

// -------------------------------------------------------------------------------------------------
// Scales the view.
// -------------------------------------------------------------------------------------------------
function scaleView(wgl, amt) {
    // Set the zoom scale
    if (amt >= 0) {
        wgl.zoomScale = Math.min(wgl.zoomScale + amt, 3.5);
    } else {
        wgl.zoomScale = Math.max(wgl.zoomScale + amt, 0.1);
    }
}

// -------------------------------------------------------------------------------------------------
// Handle key presses.
// -------------------------------------------------------------------------------------------------
function handlePressedDownKeys(wgl) {  
    // Zoom functions
    if (wgl.listOfPressedKeys[90]) { // z - zoom in
        scaleView(wgl, 0.1);
    } 
    if (wgl.listOfPressedKeys[88]) { // x - zoom out
        scaleView(wgl, -0.1);
    } 

    // Camera movement functions
    if (wgl.listOfPressedKeys[37]) { // left
        rotateView(wgl, 5 * Math.PI / 180, aboutY);
    } 
    if (wgl.listOfPressedKeys[39]) { // right
        rotateView(wgl, -5 * Math.PI / 180, aboutY);
    } 
    if (wgl.listOfPressedKeys[38]) { // up
        rotateView(wgl, 5 * Math.PI / 180, aboutX);
    }
    if (wgl.listOfPressedKeys[40]) { // down
        rotateView(wgl, -5 * Math.PI / 180, aboutX);
    }  
    if (wgl.listOfPressedKeys[65]) { // a
        rotateView(wgl, -5 * Math.PI / 180, aboutZ);
    }
    if (wgl.listOfPressedKeys[68]) { // d
        rotateView(wgl, 5 * Math.PI / 180, aboutZ);
    }  
    if (wgl.listOfPressedKeys[83]) { // s
        rotateView(wgl, 5 * Math.PI / 180, aboutXY);
    }
    if (wgl.listOfPressedKeys[87]) { // w
        rotateView(wgl, -5 * Math.PI / 180, aboutXY);
    }  
    if (wgl.listOfPressedKeys[73]) { // i
        rotateView(wgl, -5 * Math.PI / 180, aboutXZ);
    }
    if (wgl.listOfPressedKeys[75]) { // k
        rotateView(wgl, 5 * Math.PI / 180, aboutXZ);
    }  
    if (wgl.listOfPressedKeys[74]) { // j
        rotateView(wgl, -5 * Math.PI / 180, aboutYZ);
    }
    if (wgl.listOfPressedKeys[76]) { // l
        rotateView(wgl, 5 * Math.PI / 180, aboutYZ);
    }  
    if (wgl.listOfPressedKeys[82]) { // r - reset camera
        mat5.identity(wgl.viewMatrix);
        wgl.zoomScale = defaultZoom;
    } 
}

// -------------------------------------------------------------------------------------------------
// Handle mouse movement.
// -------------------------------------------------------------------------------------------------
function handleMouseMovement(wgl) {
    if (!wgl.mouseDown) return;
    // Record change in mouse position
    var dX = wgl.currX - wgl.prevX;
    var dY = wgl.currY - wgl.prevY;
    // Rotate accordingly
    rotateView(wgl, -dX * Math.PI / 180, [0, 1, 0, 1]);  // x movement -> rot around up axis
    rotateView(wgl, -dY * Math.PI / 180, [1, 0, 0, 1]);  // y movement -> rot around right axis
}

// -------------------------------------------------------------------------------------------------
// Handle controller events.
// -------------------------------------------------------------------------------------------------
function handleControllerEvents(wgl) {
    // Record change in mouse position
    var dX = wgl.pxgamepad.rightStick.x;
    var dY = wgl.pxgamepad.rightStick.y;
    var dZ = wgl.pxgamepad.leftStick.x;
    var dXY = wgl.pxgamepad.leftStick.y;
    var dXZ = wgl.pxgamepad.dpad.y;
    var dYZ = wgl.pxgamepad.dpad.x;

    // Rotate accordingly
    rotateView(wgl, dX * 5 * Math.PI / 180, aboutY);
    rotateView(wgl, dY * 5 * Math.PI / 180, aboutX);  
    rotateView(wgl, dZ * 5 * Math.PI / 180, aboutZ);  
    rotateView(wgl, dXZ * 5 * Math.PI / 180, aboutXZ); 
    rotateView(wgl, dXY * 5 * Math.PI / 180, aboutXY); 
    rotateView(wgl, dYZ * 5 * Math.PI / 180, aboutYZ); 
}