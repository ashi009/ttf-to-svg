require('apollo');

var fs = require('fs');
var util = require('util');
var tokenize = require('./tokenizer').tokenize;
var parser = new require('xml2js').Parser();
var Matrix = require('./matrix');
var SVGO = require('svgo');

var fileName = process.argv[2];
var pattern = new RegExp(process.argv[3]);
var color = process.argv[4];
var floatPrecision = parseInt(process.argv[5], 10) || 2;
var scale = parseFloat(process.argv[6]) || 0.05 * 0.85;

var svgo = new SVGO({
      plugins: [
        {
          convertPathData: {
            floatPrecision: floatPrecision
          }
        }
      ]
    });

function select(root, path) {
  var nodes = [];
  path = path.split('.');
  dfs(root, 0);
  return nodes.flatten();
  function dfs(root, depth) {
    if (depth == path.length)
      return nodes.push(root);
    var name = path[depth];
    if (Array.isArray(root)) {
      for (var i = 0; i < root.length; i++) {
        if (root[i].hasOwnProperty(name))
          dfs(root[i][name], depth + 1);
      }
    } else if (root.hasOwnProperty(name)) {
      dfs(root[name], depth + 1);
    }
  }
}

var kParamLength = {
  m: [0, 2],
  l: [0, 2],
  z: [0, 0],
  c: [0, 6],
  s: [0, 4],
  q: [0, 2],
  t: [0, 2],
  a: [5, 7]
};

function conv(d, matrix) {
  var tokens = tokenize(d);
  var cx = 0, cy = 0, np, nx, ny;
  var op, isAbsolute;
  var params, len;
  var res = [];
  for (var i = 0, upperBound, j, k; i < tokens.length; i = upperBound) {
    op = tokens[i].value.toLowerCase();
    isAbsolute = /[A-Z]/.test(tokens[i].value);
    upperBound = extractParam(++i);
    params = tokens.slice(i, upperBound).map(p2v);
    if (op == 'h') {
      op = 'l';
      params = params.map(h2l).flatten();
    } else if (op == 'v') {
      op = 'l';
      params = params.map(v2l).flatten();
    }
    // console.log(op, params, cx, cy);
    len = kParamLength[op];
    for (j = 0; j < params.length; j += len[1]) {
      for (k = j + len[0]; k < j + len[1]; k += 2) {
        if (!isAbsolute) {
          params[k] += cx;
          params[k+1] += cy;
        }
        nx = params[k];
        ny = params[k+1];
      }
    }
    cx = nx;
    cy = ny;
    // console.log(params, nx, ny);
    for (j = 0; j < params.length; j += len[1]) {
      for (k = j + len[0]; k < j + len[1]; k += 2) {
        np = matrix.transform([params[k], params[k+1], 0]);
        params[k] = np[0];
        params[k+1] = np[1];
      }
    }
    res.push(op.toUpperCase());
    res.push(params);
  }
  return res.flatten().join(' ');
  function extractParam(i) {
    if (i >= tokens.length)
      return i;
    while (tokens[i].type != 'op')
      i++;
    return i;
  }
  function p2v(p) {
    return parseFloat(p.value);
  }
  function h2l(p) {
    return [p, 0];
  }
  function v2l(p) {
    return [0, p];
  }
}

parser.parseString(fs.readFileSync(fileName), function(err, root) {
  var font = select(root, 'svg.defs.font');
  var fontFace = select(font, 'font-face');
  var horizAdvX = parseFloat(font[0].$['horiz-adv-x']);
  var height = parseFloat(fontFace[0].$.ascent) - parseFloat(fontFace[0].$.descent);
  var xHeight = parseFloat(fontFace[0].$['x-height']);
  var glyphs = select(font, 'glyph').map(function(glyph) {
    return glyph.$;
  }).filter(function(glyph) {
    return pattern.test(glyph.unicode);
  }).forEach(function(glyph) {
    var w = parseFloat(glyph['horiz-adv-x']) || horizAdvX;
    var matrix = Matrix.I()
        .mult(Matrix.Translate(w * scale * 0.5, height * scale * 0.5, 0))
        .mult(Matrix.Scale(scale, -scale, 1))
        .mult(Matrix.Translate(-w / 2, -xHeight / 2, 0));
    var source = util.format('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="%s" height="%s"><path d="%s" fill="%s" /></svg>',
        w * scale, height * scale, conv(glyph.d, matrix), color);
    svgo.optimize(source, function(res) {
      fs.writeFileSync(glyph['glyph-name'] + '.svg', res.data);
    });
  });
});
