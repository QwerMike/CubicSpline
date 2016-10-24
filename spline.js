let canvas = document.getElementById("mycanvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

// starts on script load
function start(params) {
  var ctx = canvas.getContext("2d");
  ctx.lineWidth = 3;
  ctx.fillStyle = "black";
  let i = 0;
  let points = [];
  let onCanvasClick = e => {
    points[i] = new Point(e.clientX, e.clientY, 3);
    points[i].draw(ctx, 3);
    ++i;
  }
  canvas.addEventListener("click", onCanvasClick);
  document.addEventListener("keypress", e => {
    if (e.keyCode == 13 || e.which == 13) { // 13 means 'Enter' key
      if (i < 3) {
        alert("Not enough points!!!");
        return;
      }

      canvas.removeEventListener("click", onCanvasClick);
      let s = new Spline();
      s.init(points);
      s.draw(ctx);
    }
  });
}

// represents coordinate in 2D
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  draw(context, radius) {
    context.beginPath();
    context.arc(this.x, this.y, (radius >= 0) ? radius : 0, 0, 2 * Math.PI);
    context.fill();
  }

  get vector() {
    return [this.x, this.y];
  }
}

// represents spline - numeric function that is
// piecewise-defined by polynomial functions
class Spline {
  // P(t) = b1 + b2*t + b3*t*t + b4*t*t*t;
  constructor() {
    this.b1 = [];
    this.b2 = [];
    this.b3 = [];
    this.b4 = [];
  }

  // returns polinomials P(t)
  get polynomials() {
    let polynomials = [];
    for (let i = 0; i < this.b1.length; ++i) {
      polynomials[i] = t =>
        math.add(
          math.add(this.b1[i],
            math.multiply(this.b2[i], t)),
          math.add(
            math.multiply(this.b3[i], t * t),
            math.multiply(this.b4[i], t * t * t)));
    }

    return polynomials;
  }

  createSplineMatrixCyclic(n) {
    /* n points
     * then (n-1)x(n-1) matrix
     * [4  1  0  .  .  .  1]
     * [1  4  1  0  .  .  .]
     * [0  1  4  1  0  .  .]
     * [.  .  .  .  .  .  .]
     * [.  .  .  .  .  .  .]
     * [.  .  .  .  .  .  .]
     * [.  .  .  .  0  1  4]
     */
    let m = createZeroMatrix(n - 1, n - 1);
    m[0][0] = 4;
    m[0][1] = 1;
    m[0][n - 2] = 1;
    m[n - 2][n - 3] = 1;
    m[n - 2][n - 2] = 4;
    for (let i = 1; i < m.length - 1; ++i) {
      m[i][i] = 4;
      m[i][i - 1] = 1;
      m[i][i + 1] = 1;
    }

    return m;
  }

  // M * P' = R, where R = result vector
  createResultVectorCyclic(points) {
    let n = points.length;
    let matrix = new Array(n - 1);
    matrix[0] = math.multiply(3,
      math.add(
        math.subtract(points[1].vector, points[0].vector),
        math.subtract(points[n - 1].vector, points[n - 2].vector))
    );
    for (let i = 1; i < matrix.length; ++i) {
      matrix[i] = math.multiply(3,
        math.subtract(points[i + 1].vector, points[i - 1].vector));
    }

    return matrix;
  }

  // M * P' = R, where P' = tangent vector
  calculateTangentVectorsCyclic(points) {
    let M = this.createSplineMatrixCyclic(points.length);
    let R = this.createResultVectorCyclic(points);
    let tangentVectors = math.multiply(math.inv(M), R);
    tangentVectors[points.length - 1] = tangentVectors[0];

    return tangentVectors;
  }

  // initializes Spline data with points
  init(points) {
    let n = points.length;
    let tangentVectors = this.calculateTangentVectorsCyclic(points);
    for (let i = 0; i < n - 1; ++i) {
      this.b1[i] = points[i].vector;
      this.b2[i] = tangentVectors[i];
      this.b3[i] = math.subtract(
        math.subtract(
          math.multiply(3,
            math.subtract(points[i + 1].vector, points[i].vector)),
          math.multiply(2, tangentVectors[i])),
        tangentVectors[i + 1]);
      this.b4[i] = math.add(
        math.add(
          math.multiply(2,
            math.subtract(points[i].vector, points[i + 1].vector)),
          tangentVectors[i]),
        tangentVectors[i + 1]);
    }
  }

  // draws Spline using context
  // init() first to draw !
  draw(context) {
    let polynomials = this.polynomials;
    context.strokeStyle = "purple";
    for (let i = 0; i < polynomials.length; ++i) {
      let res = polynomials[i](0);
      context.beginPath();
      context.moveTo(res[0], res[1]);
      for (let t = 0; t <= 1; t += 0.001) {
        res = polynomials[i](t);
        context.lineTo(res[0], res[1]);
      }
      context.stroke();
    }
  }
}

// generate matrix [n x m] filled with zeros
function createZeroMatrix(n, m) {
  let matrix = new Array(n);
  for (let i = 0; i < n; ++i) {
    matrix[i] = new Array(m);
    for (let j = 0; j < m; ++j) {
      matrix[i][j] = 0;
    }
  }

  return matrix;
}
