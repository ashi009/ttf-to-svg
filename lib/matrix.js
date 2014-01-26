require('apollo');

function Matrix(arr) {
  this.buffer = new Float32Array(arr || 16);
}
$declare(Matrix, {

  toString: function() {
    var res = '';
    for (var r = 0; r < 4; r++) {
      if (r > 0) res += '\n';
      for (var i = r; i < 16; i += 4) {
        if (i > r) res += ',';
        res += this.buffer[i].toString();
      }
    }
    return res;
  },

  join: function(splitter) {
    return Array.prototype.join.call(this.buffer, splitter);
  },

  clone: function() {
    return new Matrix(this.buffer);
  },

  transform: function(p) {
    var res = [];
    var buf = this.buffer;
    var w = p[0] * buf[3] + p[1] * buf[7] + p[2] * buf[11] + buf[15];
    if (w === 0) return null;
    w = 1 / w;
    for (var i = 0; i < 3; i++)
      res[i] = (p[0] * buf[i] + p[1] * buf[4+i] + p[2] * buf[8+i] + buf[12+i]) * w;
    return res;
  },

  mult: function(m) {
    var res = new Matrix();
    var buf = res.buffer, sbuf = this.buffer, mbuf = m.buffer;
    for (var i = 0; i < 4; i++)
    for (var j = 0; j < 4; j++)
    for (var k = 0; k < 4; k++)
      buf[i+4*j] += sbuf[i+4*k] * mbuf[k+4*j];
    return res;
  },

  add: function(m) {
    var res = this.clone();
    var buf = res.buffer, mbuf = m.buffer;
    for (var i = 0; i < 16; i++)
      buf[i] += mbuf[i];
    return res;
  },

  sub: function(m) {
    var res = this.clone();
    var buf = res.buffer, mbuf = m.buffer;
    for (var i = 0; i < 16; i++)
      buf[i] -= mbuf[i];
    return res;
  },

  times: function(k) {
    var res = this.clone();
    for (var i = 0; i < 16; i++)
      res.buffer[i] *= k;
    return res;
  },

  scale: function(x, y, z) {
    var buf = this.buffer;
    if (x && x != 1) for (var i = 0; i < 16; i += 4) buf[i] *= x;
    if (y && y != 1) for (var i = 1; i < 16; i += 4) buf[i] *= y;
    if (z && z != 1) for (var i = 2; i < 16; i += 4) buf[i] *= z;
    return this;
  },

  translate: function(x, y, z) {
    var buf = this.buffer;
    if (x) for (var i = 0; i < 16; i += 4) buf[i] += x * buf[i+3];
    if (y) for (var i = 1; i < 16; i += 4) buf[i] += y * buf[i+2];
    if (z) for (var i = 2; i < 16; i += 4) buf[i] += z * buf[i+1];
    return this;
  },

  rotateX: function(deg) {
    if (deg) {
      var buf = this.buffer, sbuf = new Float32Array(this.buffer);
      var angle = deg / 180 * Math.PI, cos = Math.cos(angle), sin = Math.sin(angle);
      for (var i = 1; i < 16; i += 4) buf[i] = sbuf[i] * cos - sbuf[i+1] * sin;
      for (var i = 2; i < 16; i += 4) buf[i] = sbuf[i-1] * sin + sbuf[i] * cos;
    }
    return this;
  },

  rotateY: function(deg) {
    if (deg) {
      var buf = this.buffer, sbuf = new Float32Array(this.buffer);
      var angle = deg / 180 * Math.PI, cos = Math.cos(angle), sin = Math.sin(angle);
      for (var i = 0; i < 16; i += 4) buf[i] = sbuf[i] * cos + sbuf[i+2] * sin;
      for (var i = 2; i < 16; i += 4) buf[i] = - sbuf[i-2] * sin + sbuf[i] * cos;
    }
    return this;
  },

  rotateZ: function(deg) {
    if (deg) {
      var buf = this.buffer, sbuf = new Float32Array(this.buffer);
      var angle = deg / 180 * Math.PI, cos = Math.cos(angle), sin = Math.sin(angle);
      for (var i = 0; i < 16; i += 4) buf[i] = sbuf[i] * cos - sbuf[i+1] * sin;
      for (var i = 1; i < 16; i += 4) buf[i] = sbuf[i-1] * sin + sbuf[i] * cos;
    }
    return this;
  },

  inverse: function(p) {

/*
// eq1.

w\begin{bmatrix}
x' \\ y' \\ z' \\ 1
\end{bmatrix}
=M_{4 \times 4}\begin{bmatrix} x \\ y \\ 0 \\ 1 \end{bmatrix}

// eq2.

w = m_{41}x + m_{42}y + m_{44}

eq3 & 4
x' w = m_{11}x + m_{12}y + m_{14}
y' w = m_{21}x + m_{22}y + m_{24}

// eq5 & 6

(m_{41}x' - m_{11})x + (m_{42}x' - m_{12})y = m_{14} - m_{44}x'
(m_{41}y' - m_{21})x + (m_{42}y' - m_{22})y = m_{24} - m_{44}y'

// eq7

\begin{bmatrix}
m_{41}x' - m_{11} & m_{42}x' - m_{12} \\
m_{41}y' - m_{21} & m_{42}y' - m_{22}
\end{bmatrix} \begin{bmatrix}
x \\ y
\end{bmatrix} = \begin{bmatrix}
m_{14} - m_{44}x' \\
m_{24} - m_{44}y'
\end{bmatrix}

*/

    var buf = this.buffer;

    var a00 = buf[3] * p[0] - buf[0];
    var a01 = buf[7] * p[0] - buf[4];
    var a10 = buf[3] * p[1] - buf[1];
    var a11 = buf[7] * p[1] - buf[5];
    var b0 = buf[12] - buf[15] * p[0];
    var b1 = buf[13] - buf[15] * p[1];
    var D = a01 * a10 - a00 * a11;

    if (D === 0) return Number.MIN_VALUE;

    D = 1 / D;

    return [(a01 * b1 - a11 * b0) * D, (a10 * b0 - a00 * b1) * D];

  },

  findZ: function(p) {

    var w = p[0] * buf[3] + p[1] * buf[7] + buf[15];
    return (p[0] * buf[2] + p[1] * buf[6] + buf[14]) / w;

  }

});

$define(Matrix, {

  I: function() {
    var res = new Matrix();
    var buf = res.buffer;
    for (var i = 0; i < 4; i++)
       buf[i*5] = 1;
    return res;
  },

  Scale: function(x, y, z) {
    var res = new Matrix();
    var buf = res.buffer;
    buf[0] = x;
    buf[5] = y;
    buf[10] = z;
    buf[15] = 1;
    return res;
  },

  Translate: function(x, y, z) {
    var res = Matrix.I();
    var buf = res.buffer;
    buf[12] = x;
    buf[13] = y;
    buf[14] = z;
    return res;
  },

  RotateX: function(deg) {
    var res = Matrix.I();
    var buf = res.buffer;
    var angle = deg / 180 * Math.PI, cos = Math.cos(angle), sin = Math.sin(angle);
    buf[5] = cos;
    buf[9] = -sin;
    buf[6] = sin;
    buf[10] = cos;
    return res;
  },

  RotateY: function(deg) {
    var res = Matrix.I();
    var buf = res.buffer;
    var angle = deg / 180 * Math.PI, cos = Math.cos(angle), sin = Math.sin(angle);
    buf[0] = cos;
    buf[8] = sin;
    buf[2] = -sin;
    buf[10] = cos;
    return res;
  },

  RotateZ: function(deg) {
    var res = Matrix.I();
    var buf = res.buffer;
    var angle = deg / 180 * Math.PI, cos = Math.cos(angle), sin = Math.sin(angle);
    buf[0] = cos;
    buf[4] = -sin;
    buf[1] = sin;
    buf[5] = cos;
    return res;
  },

// http://www.songho.ca/opengl/gl_projectionmatrix.html

  Perspective: function(fovy, aspect, near, far) {
    var f = fovy * Math.PI / 360;
    var a = 1 / (far - near);
    var cot = Math.cos(f) / Math.sin(f);
    var res = new Matrix();
    var buf = res.buffer;
    buf[0] = cot / aspect;
    buf[5] = cot;
    buf[10] = -(near + far) * a;
    buf[14] = -2 * near * far * a;
    buf[11] = -1;
    return res;
  },

  Orthographic: function(width, height, near, far) {
    var a = 1 / (far - near);
    var res = new Matrix();
    var buf = res.buffer;
    buf[0] = 2 / width;
    buf[5] = 2 / height;
    buf[10] = -2 * a;
    buf[14] = -(far + near) * a;
    buf[15] = 1;
    return res;
  },

  Reverse: function(LB, LT, RB, RT, width, height) {

/*

// eq 1

\begin{bmatrix}
m_{11} & m_{12} & 0 & m_{14}\\
m_{21} & m_{22} & 0 & m_{24}\\
0 & 0 & 1 & 0 \\
m_{41} & m_{42} & 0 & 1\\
\end{bmatrix}
\begin{bmatrix}
x\\y\\0\\1
\end{bmatrix} = w\begin{bmatrix}
x'\\y'\\0\\1
\end{bmatrix}

// eq 2

m_{41}x + m_{42}y + 1 = w

// eq 3 & 4

\begin{matrix}
(m_{41}x + m_{42}y + 1) x'= m_{11}x+m_{12}y+m_{14} \\
(m_{41}x + m_{42}y + 1) y'= m_{21}x+m_{22}y+m_{24}
\end{matrix}

// as (x, y) and (x', y') are already known, and we have 4 cornor points.
// so we may find out the matrix.

// eq 5 & 6

\begin{matrix}
xm_{11} + ym_{12} + m_{14} - xx'm_{41} - yx'm_{42} = x' \\
xm_{21} + ym_{22} + m_{24} - xy'm_{41} - yy'm_{42} = y'
\end{matrix}

// eq 7

\begin{bmatrix}
x_1 & y_1 & 1 & 0 & 0 & 0 & -x_1x_1' & -y_1x_1' \\
0 & 0 & 0 & x_1 & y_1 & 1 & -x_1y_1' & -y_1y_1' \\
x_2 & y_2 & 1 & 0 & 0 & 0 & -x_2x_2' & -y_2x_2' \\
0 & 0 & 0 & x_2 & y_2 & 1 & -x_2y_2' & -y_2y_2' \\
x_3 & y_3 & 1 & 0 & 0 & 0 & -x_3x_3' & -y_3x_3' \\
0 & 0 & 0 & x_3 & y_3 & 1 & -x_3y_3' & -y_3y_3' \\
x_4 & y_4 & 1 & 0 & 0 & 0 & -x_4x_4' & -y_4x_4' \\
0 & 0 & 0 & x_4 & y_4 & 1 & -x_4y_4' & -y_4y_4'
\end{bmatrix}
\begin{bmatrix}
m_{11} \\ m_{12} \\ m_{14} \\ m_{21} \\ m_{22} \\ m_{24} \\ m_{41} \\ m_{42}
\end{bmatrix} = \begin{bmatrix}
x_1' \\ y_1' \\ x_2' \\ y_2' \\ x_3' \\ y_3' \\ x_4' \\ y_4'
\end{bmatrix}

// considering (x_1, y_1) is (-w/2, -h/2), (x_2, y_2) is (-w/2, h/2)
// (x_3, y_3) is (w/2, -h/2), (x_4, y_4) is (w/2, h/2)

we will be able to find out matrix by apply x's and y's in the equation system.

\begin{bmatrix}
-w/2 & -h/2 & 1 & 0 & 0 & 0 & w/2 x_1' & h/2 x_1' \\
-w/2 & h/2 & 1 & 0 & 0 & 0 & w/2 x_2' & -h/2 x_2' \\
w/2 & -h/2 & 1 & 0 & 0 & 0 & -w/2 x_3' & h/2 x_3' \\
w/2 & h/2 & 1 & 0 & 0 & 0 & -w/2 x_4' & -h/2 x_4' \\
0 & 0 & 0 & -w/2 & -h/2 & 1 & w/2 y_1' & h/2 y_1' \\
0 & 0 & 0 & -w/2 & h/2 & 1 & w/2 y_2' & -h/2 y_2' \\
0 & 0 & 0 & w/2 & -h/2 & 1 & -w/2 y_3' & h/2 y_3' \\
0 & 0 & 0 & w/2 & h/2 & 1 & -w/2 y_4' & -h/2 y_4'
\end{bmatrix}
\begin{bmatrix}
m_{11} \\ m_{12} \\ m_{14} \\ m_{21} \\ m_{22} \\ m_{24} \\ m_{41} \\ m_{42}
\end{bmatrix} = \begin{bmatrix}
x_1' \\ x_2' \\ x_3' \\ x_4' \\ y_1' \\ y_2' \\ y_3' \\ y_4'
\end{bmatrix}

noticing eqs for x_1', x_2', x_3' and x_4' are similar to y_1', y_2', y_3' and y_4'
so we may take advantage of this.

\begin{bmatrix}
-w & h & 0 & 0 & 0 & 0 & w/2(x_2'+x_3') & -h/2(x_2'+x_3') \\
-w & -h & 0 & 0 & 0 & 0 & w/2(x_1'+x_4') & h/2(x_1'+x_4') \\
0 & 0 & 2 & 0 & 0 & 0 & w/2(x_2'-x_3') & -h/2(x_2'-x_3') \\
0 & 0 & 2 & 0 & 0 & 0 & w/2(x_1'-x_4') & h/2(x_1'-x_4') \\
0 & 0 & 0 & -w & h & 0 & w/2(y_2'+y_3') & -h/2(y_2'+y_3') \\
0 & 0 & 0 & -w & -h & 0 & w/2(y_1'+y_4') & h/2(y_1'+y_4') \\
0 & 0 & 0 & 0 & 0 & 2 & w/2(y_2'-y_3') & -h/2(y_2'-y_3') \\
0 & 0 & 0 & 0 & 0 & 2 & w/2(y_1'-y_4') & h/2(y_1'-y_4')
\end{bmatrix}
\begin{bmatrix}
m_{11} \\ m_{12} \\ m_{14} \\ m_{21} \\ m_{22} \\ m_{24} \\ m_{41} \\ m_{42}
\end{bmatrix} = \begin{bmatrix}
x_2' - x_3' \\ x_1'-x_4' \\ x_2' + x_3' \\ x_1' + x_4' \\
y_2' - y_3' \\ y_1'-y_4' \\ y_2' + y_3' \\ y_1' + y_4'
\end{bmatrix}

\begin{bmatrix}
-w & h & 0 & 0 & 0 & 0 & w/2(x_2'+x_3') & -h/2(x_2'+x_3') \\
-w & -h & 0 & 0 & 0 & 0 & w/2(x_1'+x_4') & h/2(x_1'+x_4') \\
0 & 0 & 2 & 0 & 0 & 0 & w/2(x_2'-x_3') & -h/2(x_2'-x_3') \\
0 & 0 & 2 & 0 & 0 & 0 & w/2(x_1'-x_4') & h/2(x_1'-x_4') \\
0 & 0 & 0 & -w & h & 0 & w/2(y_2'+y_3') & -h/2(y_2'+y_3') \\
0 & 0 & 0 & -w & -h & 0 & w/2(y_1'+y_4') & h/2(y_1'+y_4') \\
0 & 0 & 0 & 0 & 0 & 2 & w/2(y_2'-y_3') & -h/2(y_2'-y_3') \\
0 & 0 & 0 & 0 & 0 & 2 & w/2(y_1'-y_4') & h/2(y_1'-y_4')
\end{bmatrix}
\begin{bmatrix}
m_{11} \\ m_{12} \\ m_{14} \\ m_{21} \\ m_{22} \\ m_{24} \\ m_{41} \\ m_{42}
\end{bmatrix} = \begin{bmatrix}
x_2' - x_3' \\ x_1'-x_4' \\ x_2' + x_3' \\ x_1' + x_4' \\
y_2' - y_3' \\ y_1'-y_4' \\ y_2' + y_3' \\ y_1' + y_4'
\end{bmatrix}

let
d_{11} = x_2'-x_3', d_{12} = x_1'-x_4', d_{21} = y_2'-y_3', d_{22} = y_1'-y_4';
s_{11} = x_2'+x_3', s_{12} = x_1'+x_4', s_{21} = y_2'+y_3', s_{22} = y_1'+y_4';

\begin{bmatrix}
w(d_{11}-d_{12}) & -h(d_{11}+d_{12}) \\
w(d_{21}-d_{22}) & -h(d_{21}+d_{22}) \\
\end{bmatrix}
\begin{bmatrix}
m_{41} \\ m_{42}
\end{bmatrix} = 2 \begin{bmatrix}
s_{11} - s_{12} \\ s_{21} - s_{22}
\end{bmatrix}

\begin{bmatrix}
-2w & 0 & 0 & 0 & 0 & 0 & w/2(s_{11}+s_{12}) & -h/2(s_{11}-s_{12}) \\
0 & 2h & 0 & 0 & 0 & 0 & w/2(s_{11}-s_{12}) & -h/2(s_{11}+s_{12}) \\
0 & 0 & 0 & -2w & 0 & 0 & w/2(s_{21}+s_{22}) & -h/2(s_{21}-s_{22}) \\
0 & 0 & 0 & 0 & 2h & 0 & w/2(s_{21}-s_{22}) & -h/2(s_{21}+s_{22}) \\
\end{bmatrix}
\begin{bmatrix}
m_{11} \\ m_{12} \\ m_{14} \\ m_{21} \\ m_{22} \\ m_{24} \\ m_{41} \\ m_{42}
\end{bmatrix} = \begin{bmatrix}
d_{11} + d_{12} \\
d_{11} - d_{12} \\
d_{21} + d_{22} \\
d_{21} - d_{22} \\
\end{bmatrix}

*/

    var w = width || 1, h = height || 1;
    var oow = 1 / w, ooh = 1 / h;

    function calcB(d, s, a, p) {
      d[0] = p[1] - p[2];
      d[1] = p[0] - p[3];
      s[0] = p[1] + p[2];
      s[1] = p[0] + p[3];
      a[0] = (d[0] - d[1]) * w;
      a[1] = (d[0] + d[1]) * -h;
      return (s[0] - s[1]) * 2;
    }

    function calcM(d, s, m41, m42, m) {
      var ds = s[0] - s[1];
      var ss = s[0] + s[1];
      var sd = d[0] + d[1];
      /*
      m[2] = s[1] * 0.5- (m41 + m42) * d[1] * 0.25;
      m[1] = dd * 0.5 - (m41 * ds - m42 * ss) * 0.25;
      m[0] = -sd * 0.5 + (m41 * ss - m42 * ds) * 0.25;
      */
      m[0] = 0.25 * ss * m41 - (0.25 * h * ds * m42 + 0.5 * sd) * oow;
      m[1] = 0.25 * ss * m42 - (0.25 * w * ds * m41 - 0.5 * dd) * ooh;
      m[2] = 0.5 * s[1] + 0.25 * d[1] * (w * m41 + h * m42);
    }

    var d = [[], []], s = [[], []], a = [[], []];
    var p = [[LB[0], LT[0], RB[0], RT[0]], [LB[1], LT[1], RB[1], RT[1]]];
    var b = [calcB(d[0], s[0], a[0], p[0]), calcB(d[1], s[1], a[1], p[1])];

    var D = a[0][1] * a[1][0] - a[0][0] * a[1][1];

    if (D === 0) return null;

    D = 1 / D;
    var m41 = (a[0][1] * b[1] - a[1][1] * b[0]) * D;
    var m42 = (a[1][0] * b[0] - a[0][0] * b[1]) * D;

    var m = [[], []];

    calcM(d[0], s[0], m41, m42, m[0]);
    calcM(d[1], s[1], m41, m42, m[1]);

    return new GLMatrix([
      m[0][0], m[1][0], 0, m41,
      m[0][1], m[1][1], 0, m42,
      0, 0, 1, 0,
      m[0][2], m[1][2], 0, 1
    ]);

  },

  StandardCords: [
    [-1, -1], //LB
    [-1, 1],  //LT
    [1, -1],  //RB
    [1, 1]    //RT
  ]

});

module.exports = Matrix;