const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    attribute float aIs4d; // -1.0: false, +1.0: true

    uniform float uFocalLength;
    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    varying vec4 vColor; 

    void main() 
    {
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
        vColor = aVertexColor;
    }
`;