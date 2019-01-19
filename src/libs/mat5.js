let mat5 = {
    create: function() {
        var out = new glMatrix.ARRAY_TYPE(25);
        out[0]  = 1; out[1]  = 0; out[2]  = 0; out[3]  = 0; out[4]  = 0;
        out[5]  = 0; out[6]  = 1; out[7]  = 0; out[8]  = 0; out[9]  = 0;
        out[10] = 0; out[11] = 0; out[12] = 1; out[13] = 0; out[14] = 0;
        out[15] = 0; out[16] = 0; out[17] = 0; out[18] = 1; out[19] = 0;
        out[20] = 0; out[21] = 0; out[22] = 0; out[23] = 0; out[24] = 1;

        return out;
    },
    identity: function(out) {
        out[0]  = 1; out[1]  = 0; out[2]  = 0; out[3]  = 0; out[4]  = 0;
        out[5]  = 0; out[6]  = 1; out[7]  = 0; out[8]  = 0; out[9]  = 0;
        out[10] = 0; out[11] = 0; out[12] = 1; out[13] = 0; out[14] = 0;
        out[15] = 0; out[16] = 0; out[17] = 0; out[18] = 1; out[19] = 0;
        out[20] = 0; out[21] = 0; out[22] = 0; out[23] = 0; out[24] = 1;

        return out;
    },
    multiply: function(out, a, b) {
        var a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3],  a04 = a[4];
        var a10 = a[5],  a11 = a[6],  a12 = a[7],  a13 = a[8],  a14 = a[9];
        var a20 = a[10], a21 = a[11], a22 = a[12], a23 = a[13], a24 = a[14];
        var a30 = a[15], a31 = a[16], a32 = a[17], a33 = a[18], a34 = a[19];
        var a40 = a[20], a41 = a[21], a42 = a[22], a43 = a[23], a44 = a[24];

        // Cache only the current line of the second matrix
        var b0 = b[0],
            b1 = b[1],
            b2 = b[2],
            b3 = b[3],
            b4 = b[4];
        out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30 + b4 * a40;
        out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31 + b4 * a41;
        out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32 + b4 * a42;
        out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33 + b4 * a43;
        out[4] = b0 * a04 + b1 * a14 + b2 * a24 + b3 * a34 + b4 * a44;

        b0 = b[5];b1 = b[6];b2 = b[7];b3 = b[8];b4 = b[9];
        out[5] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30 + b4 * a40;
        out[6] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31 + b4 * a41;
        out[7] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32 + b4 * a42;
        out[8] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33 + b4 * a43;
        out[9] = b0 * a04 + b1 * a14 + b2 * a24 + b3 * a34 + b4 * a44;

        b0 = b[10];b1 = b[11];b2 = b[12];b3 = b[13];b4 = b[14];
        out[10] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30 + b4 * a40;
        out[11] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31 + b4 * a41;
        out[12] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32 + b4 * a42;
        out[13] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33 + b4 * a43;
        out[14] = b0 * a04 + b1 * a14 + b2 * a24 + b3 * a34 + b4 * a44;

        b0 = b[15];b1 = b[16];b2 = b[17];b3 = b[18];b4 = b[19];
        out[15] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30 + b4 * a40;
        out[16] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31 + b4 * a41;
        out[17] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32 + b4 * a42;
        out[18] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33 + b4 * a43;
        out[19] = b0 * a04 + b1 * a14 + b2 * a24 + b3 * a34 + b4 * a44;
        
        b0 = b[20];b1 = b[21];b2 = b[22];b3 = b[23];b4 = b[24];
        out[20] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30 + b4 * a40;
        out[21] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31 + b4 * a41;
        out[22] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32 + b4 * a42;
        out[23] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33 + b4 * a43;
        out[24] = b0 * a04 + b1 * a14 + b2 * a24 + b3 * a34 + b4 * a44;

        return out;
    },
    scale: function(out, a, v) {
        var x = v[0],
            y = v[1],
            z = v[2]
            w = v[3];

        out[0] = a[0] * x;
        out[1] = a[1] * x;
        out[2] = a[2] * x;
        out[3] = a[3] * x;
        out[4] = a[4] * x;
        out[5] = a[5] * y;
        out[6] = a[6] * y;
        out[7] = a[7] * y;
        out[8] = a[8] * y;
        out[9] = a[9] * y;
        out[10] = a[10] * z;
        out[11] = a[11] * z;
        out[12] = a[12] * z;
        out[13] = a[13] * z;
        out[14] = a[14] * z;
        out[15] = a[15] * w;
        out[16] = a[16] * w;
        out[17] = a[17] * w;
        out[18] = a[18] * w;
        out[19] = a[19] * w;
        out[20] = a[20];
        out[21] = a[21];
        out[22] = a[22];
        out[23] = a[23];
        out[24] = a[24];
        return out;
    },
    translate: function(out, a, v) {
        var x = v[0],
            y = v[1],
            z = v[2],
            w = v[3];
        var a00 = void 0,
            a01 = void 0,
            a02 = void 0,
            a03 = void 0,
            a04 = void 0;
        var a10 = void 0,
            a11 = void 0,
            a12 = void 0,
            a13 = void 0,
            a14 = void 0;
        var a20 = void 0,
            a21 = void 0,
            a22 = void 0,
            a23 = void 0,
            a24 = void 0;
        var a30 = void 0,
            a31 = void 0,
            a32 = void 0,
            a33 = void 0,
            a34 = void 0;

        if (a === out) {
            out[20] = a[0] * x + a[5] * y + a[10] * z + a[15] * w + a[20];
            out[21] = a[1] * x + a[6] * y + a[11] * z + a[16] * w + a[21];
            out[22] = a[2] * x + a[7] * y + a[12] * z + a[17] * w + a[22];
            out[23] = a[3] * x + a[8] * y + a[13] * z + a[18] * w + a[23];
            out[24] = a[4] * x + a[9] * y + a[14] * z + a[19] * w + a[24];
        } else {
            a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3]; a04 = a[4];
            a10 = a[5]; a11 = a[6]; a12 = a[7]; a13 = a[8]; a14 = a[9];
            a20 = a[10];a21 = a[11];a22 = a[12];a23 = a[13];a24 = a[14];
            a30 = a[15];a31 = a[16];a32 = a[17];a33 = a[18];a34 = a[19];

            out[0]  = a00; out[1] = a01; out[2] = a02; out[3] = a03; out[4] = a04;
            out[5]  = a10; out[6] = a11; out[7] = a12; out[8] = a13; out[9] = a14;
            out[10] = a20;out[11] = a21;out[12] = a22;out[13] = a23;out[14] = a24;
            out[15] = a30;out[16] = a31;out[17] = a32;out[18] = a33;out[19] = a34;

            out[20] = a00 * x + a10 * y + a20 * z + a30 * w + a[20] ;
            out[21] = a01 * x + a11 * y + a21 * z + a31 * w + a[21] ;
            out[22] = a02 * x + a12 * y + a22 * z + a32 * w + a[22] ;
            out[23] = a03 * x + a13 * y + a23 * z + a33 * w + a[23] ;
            out[24] = a04 * x + a14 * y + a24 * z + a34 * w + a[24] ;
        }

        return out;
    },
    fromValues: function(m00, m01, m02, m03, m04, m10, m11, m12, m13, m14, m20, m21, m22, m23, m24, m30, m31, m32, m33, m34, m40, m41, m42, m43, m44) {
        var out = new glMatrix.ARRAY_TYPE(25);
        out[0] = m00;
        out[1] = m01;
        out[2] = m02;
        out[3] = m03;
        out[4] = m04;
        out[5] = m10;
        out[6] = m11;
        out[7] = m12;
        out[8] = m13;
        out[9] = m14;
        out[10] = m20;
        out[11] = m21;
        out[12] = m22;
        out[13] = m23;
        out[14] = m24;
        out[15] = m30;
        out[16] = m31;
        out[17] = m32;
        out[18] = m33;
        out[19] = m34;
        out[20] = m40;
        out[21] = m41;
        out[22] = m42;
        out[23] = m43;
        out[24] = m44;
        return out;
    },
    copy: function(out, a) {
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[4] = a[4];
        out[5] = a[5];
        out[6] = a[6];
        out[7] = a[7];
        out[8] = a[8];
        out[9] = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
        out[16] = a[16];
        out[17] = a[17];
        out[18] = a[18];
        out[19] = a[19];
        out[20] = a[20];
        out[21] = a[21];
        out[22] = a[22];
        out[23] = a[23];
        out[24] = a[24];
        out[25] = a[25];
        return out;
    },
    /* WEAK VERSION OF FROM_ROTATION: ONLY TAKES AXIS VECTORS!!! */
    fromRotation: function(out, rad, axis) {
        var s = Math.sin(rad);
        var c = Math.cos(rad);
        var out = new glMatrix.ARRAY_TYPE(25);
        // x-w axis rotation
        if (axis[0] == 1 && axis[3] == 1) {
            out[0]  = 1; out[1]  = 0; out[2]  = 0; out[3]  = 0; out[4]  = 0;
            out[5]  = 0; out[6]  = c; out[7]  =-s; out[8]  = 0; out[9]  = 0;
            out[10] = 0; out[11] = s; out[12] = c; out[13] = 0; out[14] = 0;
            out[15] = 0; out[16] = 0; out[17] = 0; out[18] = 1; out[19] = 0;
            out[20] = 0; out[21] = 0; out[22] = 0; out[23] = 0; out[24] = 1;
        // y-w axis rotation
        } else if (axis[1] == 1 && axis[3] == 1) {
            out[0]  = c; out[1]  = 0; out[2]  = s; out[3]  = 0; out[4]  = 0;
            out[5]  = 0; out[6]  = 1; out[7]  = 0; out[8]  = 0; out[9]  = 0;
            out[10] =-s; out[11] = 0; out[12] = c; out[13] = 0; out[14] = 0;
            out[15] = 0; out[16] = 0; out[17] = 0; out[18] = 1; out[19] = 0;
            out[20] = 0; out[21] = 0; out[22] = 0; out[23] = 0; out[24] = 1;
        // z-w axis rotation
        } else if (axis[2] == 1 && axis[3] == 1) {
            out[0]  = c; out[1]  =-s; out[2]  = 0; out[3]  = 0; out[4]  = 0;
            out[5]  = s; out[6]  = c; out[7]  = 0; out[8]  = 0; out[9]  = 0;
            out[10] = 0; out[11] = 0; out[12] = 1; out[13] = 0; out[14] = 0;
            out[15] = 0; out[16] = 0; out[17] = 0; out[18] = 1; out[19] = 0;
            out[20] = 0; out[21] = 0; out[22] = 0; out[23] = 0; out[24] = 1;
        // y-z axis rotation
        } else if (axis[1] == 1 && axis[2] == 1) {
            out[0]  = c; out[1]  = 0; out[2]  = 0; out[3]  = s; out[4]  = 0;
            out[5]  = 0; out[6]  = 1; out[7]  = 0; out[8]  = 0; out[9]  = 0;
            out[10] = 0; out[11] = 0; out[12] = 1; out[13] = 0; out[14] = 0;
            out[15] =-s; out[16] = 0; out[17] = 0; out[18] = c; out[19] = 0;
            out[20] = 0; out[21] = 0; out[22] = 0; out[23] = 0; out[24] = 1;
        // x-y axis rotation
        } else if (axis[0] == 1 && axis[1] == 1) {
            out[0]  = 1; out[1]  = 0; out[2]  = 0; out[3]  = 0; out[4]  = 0;
            out[5]  = 0; out[6]  = 1; out[7]  = 0; out[8]  = 0; out[9]  = 0;
            out[10] = 0; out[11] = 0; out[12] = c; out[13] = s; out[14] = 0;
            out[15] = 0; out[16] = 0; out[17] =-s; out[18] = c; out[19] = 0;
            out[20] = 0; out[21] = 0; out[22] = 0; out[23] = 0; out[24] = 1;
        // x-z axis rotation
        } else if (axis[1] == 1 && axis[2] == 1) {
            out[0]  = 1; out[1]  = 0; out[2]  = 0; out[3]  = 0; out[4]  = 0;
            out[5]  = 0; out[6]  = c; out[7]  = 0; out[8]  =-s; out[9]  = 0;
            out[10] = 0; out[11] = 0; out[12] = 1; out[13] = 0; out[14] = 0;
            out[15] = 0; out[16] = s; out[17] = 0; out[18] = c; out[19] = 0;
            out[20] = 0; out[21] = 0; out[22] = 0; out[23] = 0; out[24] = 1;
        }
        return out;
    }
};