// -------------------------------------------------------------------------------------------------
// Variables for animation.
// -------------------------------------------------------------------------------------------------

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
    
    mat4.perspective(wgl.projectionMatrix, wgl.fovy, wgl.aspect, wgl.zNear, wgl.zFar);
    
    mat4.identity(wgl.modelViewMatrix); // Reset to identity
    mat4.lookAt(wgl.modelViewMatrix, wgl.eye, wgl.lookAt, wgl.up); // To eye coordinates
    // Final changes made based on input
    mat4.multiply(wgl.modelViewMatrix, wgl.modelViewMatrix, wgl.viewMatrix); // Rotation
    mat4.scale(wgl.modelViewMatrix, wgl.modelViewMatrix,                     // Scale
               [ wgl.zoomScale, wgl.zoomScale, wgl.zoomScale ])

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
        handlePressedDownKeys(gl, wgl);
        // Handle mouse movement
        handleMouseMovement(wgl);
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
    const mvMatrix           = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
    const pMatrix            = gl.getUniformLocation(shaderProgram, 'uPMatrix');

    // Put the program info in the wgl object
    wgl.shaderProgram    = shaderProgram;
    wgl.attribLocations  = { 
        vertexPosition: vertexPosition,
        vertexColor:    vertexColor, 
    };
    wgl.uniformLocations = {
        mvMatrix: mvMatrix,
        pMatrix:  pMatrix,
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
        cubeModel.vertexPositionBufferItemSize   = 3;
        cubeModel.vertexPositionBufferNumItems   = 8;
        cubeModel.vertexIndexBuffer              = gl.createBuffer();
        cubeModel.vertexIndexBufferItemSize      = 1;
        cubeModel.vertexIndexBufferRoundNumItems = 24;

        const cubeVertexPositions = [
            // Top face
             1.0,  1.0,  1.0,
             1.0,  1.0, -1.0,
            -1.0,  1.0, -1.0, 
            -1.0,  1.0,  1.0,

            // Bottom face
             1.0, -1.0,  1.0,
             1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
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
    // Put all models into wgl
    // ------------------------------------ 
    wgl.models = {
        cube: cubeModel,
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
    wgl.fovy   = 60 * Math.PI / 180;
    wgl.aspect = gl.viewportWidth / gl.viewportHeight;
    wgl.zNear  = 0.1;
    wgl.zFar   = 100.0;

    wgl.eye    = [ 0,   0, -10 ];
    wgl.lookAt = [ 0,   0,   0 ];
    wgl.up     = [ 0,   1,   0 ];

    // Camera movement setup
    wgl.upVec      = vec3.fromValues(0, 1, 0); // Up axis for camera movement
    wgl.rightVec   = vec3.fromValues(1, 0, 0); // Right axis for camera movement
    wgl.viewMatrix = mat4.create();            // For rotation of view
    wgl.zoomScale  = 1.0;                      // For scaling of view
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
function initMatrixStack(gl, wgl) {
    wgl.modelViewMatrix  = mat4.create();
    wgl.projectionMatrix = mat4.create();
    wgl.modelViewMatrixStack = [];

    wgl.pushMatrix = function() {
        var copyToPush = mat4.create();
        mat4.copy(copyToPush, wgl.modelViewMatrix);
        wgl.modelViewMatrixStack.push(copyToPush);
    }
    wgl.popMatrix = function() {
        if (wgl.modelViewMatrixStack.length == 0) {
            throw "Error wgl.popMatrix() - Stack was empty ";
        }
        wgl.modelViewMatrix = wgl.modelViewMatrixStack.pop();
    }
    wgl.uploadMvMatrix = function() {
        gl.uniformMatrix4fv(wgl.uniformLocations.mvMatrix, false, wgl.modelViewMatrix);
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

    // Put drawables into wgl
    wgl.numberOfDrawables = 1;
    wgl.listOfOpaqueDrawables = [ cube ];
}


// -------------------------------------------------------------------------------------------------
// ----------------------------------- Interaction functions ---------------------------------------
// -------------------------------------------------------------------------------------------------
// Rotate the view by the angle around the specified axis vec3.
// -------------------------------------------------------------------------------------------------
function rotateView(wgl, rads, axisVec) {
    // Get the rotation matrix
    var rotation = mat4.create();
    mat4.fromRotation(rotation, rads, axisVec);
    // Rotate the view matrix
    mat4.multiply(wgl.viewMatrix, rotation, wgl.viewMatrix);
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
function handlePressedDownKeys(gl, wgl) {  
    // Zoom functions
    if (wgl.listOfPressedKeys[90]) { // z - zoom in
        scaleView(wgl, 0.1);
    } 
    if (wgl.listOfPressedKeys[88]) { // x - zoom out
        scaleView(wgl, -0.1);
    } 

    // Camera movement functions
    if (wgl.listOfPressedKeys[37]) { // left
        rotateView(wgl, -5 * Math.PI / 180, wgl.upVec);
    } 
    if (wgl.listOfPressedKeys[39]) { // right
        rotateView(wgl, 5 * Math.PI / 180, wgl.upVec);
    } 
    if (wgl.listOfPressedKeys[38]) { // up
        rotateView(wgl, 5 * Math.PI / 180, wgl.rightVec);
    }
    if (wgl.listOfPressedKeys[40]) { // down
        rotateView(wgl, -5 * Math.PI / 180, wgl.rightVec);
    }  
    if (wgl.listOfPressedKeys[82]) { // r - reset camera
        mat4.identity(wgl.viewMatrix);
        wgl.zoomScale = 1.0;
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
    rotateView(wgl, dX * Math.PI / 180, wgl.upVec);     // x movement -> rot around up axis
    rotateView(wgl, -dY * Math.PI / 180, wgl.rightVec); // y movement -> rot around right axis
}