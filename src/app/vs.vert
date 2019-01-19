const vsSource = `
    // Representation of the mat5 MVMatrix:
    // 0  5  10  15  20
    // 1  6  11  16  21
    // 2  7  12  17  22
    // 3  8  13  18  23
    // 4  9  14  19  24
    // 
    // uMVMatrix1       uMVMatrix2
    // 0  4  8  12      4 19 22
    // 1  5  9  13      9 24 21
    // 2  6 10  14     14 23 20
    // 3  7 11  15

    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    attribute float aIs4d; // -1.0: false, +1.0: true

    uniform float uFocalLength;
    uniform mat4 uMVMatrix1; // Upper left part of matrix 
    uniform mat3 uMVMatrix2; // From bottom left to top right of matrix
    uniform mat4 uPMatrix;

    varying vec4 vColor; 

    void main() 
    {
        aIs4d; uFocalLength;
        if (aIs4d < 0.0) {
            gl_Position = uPMatrix * uMVMatrix1 * aVertexPosition;
            // Points are sized from 2 to 10
            gl_PointSize = (gl_Position.z + 1.5) / 3.0 * 8.0 + 2.0;
        } else {
            float x = aVertexPosition.x;
            float y = aVertexPosition.y;
            float z = aVertexPosition.z;
            float w = aVertexPosition.w;

            // Manually carry out uMVMatrix5 * vec5(vertexPosition, 1.0), discarding 5th dim
            float newX = x * uMVMatrix1[0][0] + y * uMVMatrix1[1][0] + z * uMVMatrix1[2][0]
                       + w * uMVMatrix1[3][0] +     uMVMatrix2[2][2];
            float newY = x * uMVMatrix1[0][1] + y * uMVMatrix1[1][1] + z * uMVMatrix1[2][1]
                       + w * uMVMatrix1[3][1] +     uMVMatrix2[2][1];
            float newZ = x * uMVMatrix1[0][2] + y * uMVMatrix1[1][2] + z * uMVMatrix1[2][2]
                       + w * uMVMatrix1[3][2] +     uMVMatrix2[2][0];
            float newW = x * uMVMatrix1[0][3] + y * uMVMatrix1[1][3] + z * uMVMatrix1[2][3]
                       + w * uMVMatrix1[3][3] +     uMVMatrix2[1][2];

            // Perspective divide
            float perspFactor = 1.0 / (uFocalLength - newW);
            vec4 vertexPosition = vec4(newX * perspFactor,
                                       newY * perspFactor,
                                       newZ * perspFactor,
                                       1.0); // Now discard w component
            gl_Position = uPMatrix * vertexPosition;
            // Points are sized from 2 to 10
            gl_PointSize = (vertexPosition.z + 1.5) / 3.0 * 8.0 + 2.0;
        }
        vColor = aVertexColor;

    }
`;