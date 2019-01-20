// -------------------------------------------------------------------------------------------------
// Variables for animation.
// -------------------------------------------------------------------------------------------------
const defaultZoom = 2.3;
const defaultFovy = 67 / 180 * Math.PI;
const aboutY  = [0, 1, 0, 1];
const aboutX  = [1, 0, 0, 1];
const aboutZ  = [0, 0, 1, 1];
const aboutXZ = [1, 0, 1, 0];
const aboutXY = [1, 1, 0, 0];
const aboutYZ = [0, 1, 1, 0];

const isRnB   = true; // Whether to use 3d or not
const is4d    = [ false, false, false, true ] // Square, Cube, Tesseract
const selectedObj = 0;

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
    
    // Projection matrix
    const tanFovy =  Math.tan(wgl.fovy); 
    wgl.projectionMatrix = mat4.fromValues(
        // Transposed matrix notation
        tanFovy,             0,              0,               0,
             0,        tanFovy,              0,               0,
             0,              0,             -1,              -1, 
             0,              0,  1/focalLength,               1,
    );
    mat4.translate(wgl.projectionMatrix, wgl.projectionMatrix, [0, 0, -focalLength]);
    
    // Model view matrix
    mat5.identity(wgl.modelViewMatrix); // Reset to identity
    // Set w backward for camera
    mat5.translate(wgl.modelViewMatrix, wgl.modelViewMatrix, [0, 0, 0, -wgl.focalLength]);
    // Final changes made based on input
    mat5.multiply(wgl.modelViewMatrix, wgl.modelViewMatrix, wgl.viewMatrix); // Rotation
    // Scale for visibility. If this is not done, 4d rotation is not clear.
    mat5.scale(wgl.modelViewMatrix, wgl.modelViewMatrix,                     // Scale
               [ wgl.zoomScale, wgl.zoomScale, wgl.zoomScale, wgl.zoomScale ])

    wgl.uploadPMatrix();
    wgl.uploadMvMatrix();
    
    // ------------------------------------
    // Draw all objects
    // ------------------------------------    
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    wgl.listOfOpaqueDrawables[selectedObj].draw(deltaTime);
}

// -------------------------------------------------------------------------------------------------
// Function to draw the object in 3d.
// -------------------------------------------------------------------------------------------------
function draw3dObject(wgl, drawable) {
    // Cyan object
    drawable.setupAttributes([0.0, 1.0, 1.0, 1.0]);
    wgl.uploadMvMatrix();
    mat4.translate(wgl.projectionMatrix, wgl.projectionMatrix, 
                   [-0.01, 0, 0]);
    // 0.08 rads is worked out as the angle correction (trial and error)
    mat4.rotate(wgl.projectionMatrix, wgl.projectionMatrix,
                0.08, [0, -1, 0]);
    wgl.uploadPMatrix();
    drawable.drawElements();
    // Reverse the rotation and translation to render blue in-place
    mat4.rotate(wgl.projectionMatrix, wgl.projectionMatrix,
                0.08, [0, 1, 0]);
    mat4.translate(wgl.projectionMatrix, wgl.projectionMatrix, 
                   [0.01, 0, 0]);

    // Red cube
    drawable.setupAttributes([1.0, 0.0, 0.0, 1.0]);
    wgl.uploadMvMatrix();
    wgl.uploadPMatrix();
    drawable.drawElements();
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
        mvMatrix1:   mvMatrix1,
        mvMatrix2:   mvMatrix2,
        pMatrix:     pMatrix,
    };
}

// -------------------------------------------------------------------------------------------------
// Initializes the models and buffers to be drawn in this scene.
// -------------------------------------------------------------------------------------------------
function initModels(gl, wgl) {
    // ------------------------------------
    // Line model
    // ------------------------------------ 
    lineModel = {};
    // Set up buffers
    lineModel.setupBuffers = function() {
        // Setup object data
        lineModel.vertexPositionBuffer           = gl.createBuffer();
        lineModel.vertexPositionBufferItemSize   = 4;
        lineModel.vertexPositionBufferNumItems   = 2;
        lineModel.vertexIndexBuffer              = gl.createBuffer();
        lineModel.vertexIndexBufferItemSize      = 1;
        lineModel.vertexIndexBufferRoundNumItems = 2;

        const lineVertexPositions = [
             1.0,  0.0,  0.0, 1.0, // w is always 1 for non-4d
            -1.0,  0.0,  0.0, 1.0,
        ];
        gl.bindBuffer(gl.ARRAY_BUFFER, lineModel.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertexPositions), gl.STATIC_DRAW);

        const lineVertexIndices = [
            0, 1,
        ];
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineModel.vertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lineVertexIndices), gl.STATIC_DRAW);
    }
    lineModel.setupBuffers();

    // Set up functions
    lineModel.setupAttributes = function(colors) {
        // Tell shader that it's NOT 4d
        {
            // False
            gl.disableVertexAttribArray(wgl.attribLocations.is4d);
            gl.vertexAttrib1f(wgl.attribLocations.is4d, -1.0);     
        }
        // Constant color for the line
        {
            var r, g, b, a;
            if (colors == null) {
                a = 1.0, r = g = b = 1.0; // white line
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
            gl.bindBuffer(gl.ARRAY_BUFFER, lineModel.vertexPositionBuffer);
            gl.vertexAttribPointer(wgl.attribLocations.vertexPosition,
                                   lineModel.vertexPositionBufferItemSize,
                                   type, norm, stride, offset);
        }
    }
    lineModel.drawElements = function() {
        const offset = 0;
        // Element indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineModel.vertexIndexBuffer);
        gl.drawElements(gl.LINE_LOOP, lineModel.vertexIndexBufferRoundNumItems,
                        gl.UNSIGNED_SHORT, offset);
        // Points
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineModel.vertexIndexBuffer);
        gl.drawElements(gl.POINTS, lineModel.vertexIndexBufferRoundNumItems,
                        gl.UNSIGNED_SHORT, offset);
    }
    // ------------------------------------
    // Square model
    // ------------------------------------ 
    squareModel = {};
    // Set up buffers
    squareModel.setupBuffers = function() {
        // Setup object data
        squareModel.vertexPositionBuffer           = gl.createBuffer();
        squareModel.vertexPositionBufferItemSize   = 4;
        squareModel.vertexPositionBufferNumItems   = 4;
        squareModel.vertexIndexBuffer              = gl.createBuffer();
        squareModel.vertexIndexBufferItemSize      = 1;
        squareModel.vertexIndexBufferRoundNumItems = 4;

        const squareVertexPositions = [
             1.0,  1.0,  0.0, 1.0, // w is always 1 for non-4d
             1.0, -1.0,  0.0, 1.0,
            -1.0, -1.0,  0.0, 1.0, 
            -1.0,  1.0,  0.0, 1.0,
        ];
        gl.bindBuffer(gl.ARRAY_BUFFER, squareModel.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareVertexPositions), gl.STATIC_DRAW);

        const squareVertexIndices = [
            0, 1, 2, 3,
        ];
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareModel.vertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(squareVertexIndices), gl.STATIC_DRAW);
    }
    squareModel.setupBuffers();

    // Set up functions
    squareModel.setupAttributes = function(colors) {
        // Tell shader that it's NOT 4d
        {
            // False
            gl.disableVertexAttribArray(wgl.attribLocations.is4d);
            gl.vertexAttrib1f(wgl.attribLocations.is4d, -1.0);     
        }
        // Constant color for the square
        {
            var r, g, b, a;
            if (colors == null) {
                a = 1.0, r = g = b = 1.0; // white square
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
            gl.bindBuffer(gl.ARRAY_BUFFER, squareModel.vertexPositionBuffer);
            gl.vertexAttribPointer(wgl.attribLocations.vertexPosition,
                                   squareModel.vertexPositionBufferItemSize,
                                   type, norm, stride, offset);
        }
    }
    squareModel.drawElements = function() {
        const offset = 0;
        // Element indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareModel.vertexIndexBuffer);
        gl.drawElements(gl.LINE_LOOP, squareModel.vertexIndexBufferRoundNumItems,
                        gl.UNSIGNED_SHORT, offset);
    }

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
        cubeModel.vertexPointBuffer              = gl.createBuffer();
        cubeModel.vertexPointBufferItemSize      = 1;
        cubeModel.vertexPointBufferRoundNumItems = 8;

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

        const cubePointIndices = [
            0, 1, 2, 3, 4, 5, 6, 7,
        ];
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeModel.vertexPointBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubePointIndices), gl.STATIC_DRAW);
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
        // Points
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeModel.vertexPointBuffer);
        gl.drawElements(gl.POINTS, cubeModel.vertexPointBufferRoundNumItems,
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
        tesseractModel.vertexPointBuffer              = gl.createBuffer();
        tesseractModel.vertexPointBufferItemSize      = 1;
        tesseractModel.vertexPointBufferRoundNumItems = 16;

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

        const tessVertexPointIndices = [
            0,  1,  2,  3,  4,  5,  6,  7,
            8,  9, 10, 11, 12, 13, 14, 15,
        ];
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tesseractModel.vertexPointBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tessVertexPointIndices), gl.STATIC_DRAW);
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
        // Points
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tesseractModel.vertexPointBuffer);
        gl.drawElements(gl.POINTS, tesseractModel.vertexPointBufferRoundNumItems,
                        gl.UNSIGNED_SHORT, offset);
    }

    // ------------------------------------
    // Put all models into wgl
    // ------------------------------------ 
    wgl.models = {
        line: lineModel,
        square: squareModel,
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
    gl.blendFunc(gl.ONE, gl.ONE);
    // gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // For perspective matrix setup
    wgl.focalLength = focalLength = 5;             // Focal length of 5
    gl.uniform1f(wgl.uniformLocations.focalLength, false, focalLength);
    wgl.fovy = defaultFovy;

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
    // Instructions to draw objects
    // ------------------------------------ 
    line = {
        draw: function(deltaTime) {
            if (!isRnB) { // Not 3d
                wgl.models.line.setupAttributes([1.0, 1.0, 1.0, 1.0]);
                wgl.pushMatrix();
                    wgl.uploadMvMatrix();
                    wgl.models.line.drawElements();
                wgl.popMatrix();
            } else { // 3d
                wgl.pushMatrix();
                    draw3dObject(wgl, wgl.models.line);
                wgl.popMatrix();
            }
        }
    };
    square = {
        draw: function(deltaTime) {
            if (!isRnB) { // Not 3d
                wgl.models.square.setupAttributes([1.0, 1.0, 1.0, 1.0]);
                wgl.pushMatrix();
                    wgl.uploadMvMatrix();
                    wgl.models.square.drawElements();
                wgl.popMatrix();
            } else { // 3d
                wgl.pushMatrix();
                    draw3dObject(wgl, wgl.models.square);
                wgl.popMatrix();
            }
        }
    };

    cube = {
        draw: function(deltaTime) {
            if (!isRnB) { // Not 3d
                wgl.models.cube.setupAttributes([1.0, 1.0, 1.0, 1.0]);
                wgl.pushMatrix();
                    wgl.uploadMvMatrix();
                    wgl.models.cube.drawElements();
                wgl.popMatrix();
            } else { // 3d
                wgl.pushMatrix();
                    draw3dObject(wgl, wgl.models.cube);
                wgl.popMatrix();
            }
        }
    };

    tesseract = {
        draw: function(deltaTime) {
            if (!isRnB) { // Not 3d
                wgl.models.tesseract.setupAttributes([1.0, 1.0, 1.0, 1.0]);
                wgl.pushMatrix();
                    wgl.uploadMvMatrix();
                    wgl.models.tesseract.drawElements();
                wgl.popMatrix();
            } else { // 3d
                wgl.pushMatrix();
                    draw3dObject(wgl, wgl.models.tesseract);
                wgl.popMatrix();
            }
        }
    };

    // Put drawables into wgl
    wgl.numberOfDrawables = 4;
    wgl.listOfOpaqueDrawables = [ line, square, cube, tesseract ];
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
// Zooms the view in/out.
// -------------------------------------------------------------------------------------------------
function zoomView(wgl, amt) {
    // Zoom in
    if (amt > 0) {
        wgl.fovy = Math.min(wgl.fovy + amt, 1.5);
    } else {
        wgl.fovy = Math.max(wgl.fovy + amt, 0.1);
    }
}

// -------------------------------------------------------------------------------------------------
// Resets the camera.
// -------------------------------------------------------------------------------------------------
function resetCamera(wgl) {
    mat5.identity(wgl.viewMatrix);
    wgl.zoomScale = defaultZoom;    
}

// -------------------------------------------------------------------------------------------------
// Handle key presses.
// -------------------------------------------------------------------------------------------------
function handlePressedDownKeys(wgl) {  
    // Zoom functions
    if (wgl.listOfPressedKeys[90]) { // z - zoom in
        zoomView(wgl, -0.01);
    } 
    if (wgl.listOfPressedKeys[88]) { // x - zoom out
        zoomView(wgl, 0.01);
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
    if (wgl.listOfPressedKeys[83] && is4d[selectedObj]) { // s
        rotateView(wgl, 5 * Math.PI / 180, aboutXY);
    }
    if (wgl.listOfPressedKeys[87] && is4d[selectedObj]) { // w
        rotateView(wgl, -5 * Math.PI / 180, aboutXY);
    }  
    if (wgl.listOfPressedKeys[73] && is4d[selectedObj]) { // i
        rotateView(wgl, -5 * Math.PI / 180, aboutXZ);
    }
    if (wgl.listOfPressedKeys[75] && is4d[selectedObj]) { // k
        rotateView(wgl, 5 * Math.PI / 180, aboutXZ);
    }  
    if (wgl.listOfPressedKeys[74] && is4d[selectedObj]) { // j
        rotateView(wgl, -5 * Math.PI / 180, aboutYZ);
    }
    if (wgl.listOfPressedKeys[76] && is4d[selectedObj]) { // l
        rotateView(wgl, 5 * Math.PI / 180, aboutYZ);
    }  
    if (wgl.listOfPressedKeys[82]) { // r - reset camera
        resetCamera(wgl);
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
    rotateView(wgl, dX * -5 * Math.PI / 180, aboutY);
    rotateView(wgl, dY * -5 * Math.PI / 180, aboutX);  
    rotateView(wgl, dZ * 5 * Math.PI / 180, aboutZ);  
    // Rotate about W IF selected object is 4d compatible
    if (is4d[selectedObj]) {
        rotateView(wgl, dXZ * 2 * Math.PI / 180, aboutXZ); 
        rotateView(wgl, dXY * 5 * Math.PI / 180, aboutXY); 
        rotateView(wgl, dYZ * 2 * Math.PI / 180, aboutYZ); 
    } else {
        rotateView(wgl, dXY * -5 * Math.PI / 180, aboutX);  
    }

    // Zoom functions
    if (wgl.pxgamepad.buttons.leftTop || wgl.pxgamepad.buttons.rightTop) { // zoom in
        zoomView(wgl, -0.01);
    } 
    if (wgl.pxgamepad.buttons.leftTrigger || wgl.pxgamepad.buttons.rightTrigger) { // zoom out
        zoomView(wgl, 0.01);
    } 
    // Reset camera
    if (wgl.pxgamepad.buttons.y) { 
        resetCamera(wgl);
    } 
}