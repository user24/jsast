// Cross-browser onload handler
function onload(callback) {
  if (document.readyState === 'complete') { // Already loaded
    callback();
  } else if (typeof document.attachEvent != 'undefined') { // MSIE
    document.attachEvent('onreadystatechange', function() {
      if (document.readyState == 'complete') {
        callback();
      }
    });
  } else if (typeof window.addEventListener != 'undefined') { // Everything else
    window.addEventListener('load', callback, false);
  } else if (typeof window.onload != 'undefined') { // Legacy fallback
    window.onload = callback;
  } else { // This should never happen
    callback();
  }
}

var treeDrawer = (function() {
  function drawAST(ast) {
    function writeNodeInfo(x, y, node) {
      var text = '';
      switch (node.type) {
        case 'CallExpression':
          text = node.callee.name;
          break;
        case 'VariableDeclarator':
          text = node.id.name;
          break;
        default:
          for (var prop in node) {
            if (node.hasOwnProperty(prop) && prop != 'type' &&
                typeof node[prop] != 'object') {
              text += prop + ': ' + node[prop] + '\n';
            }
          }
          break;
      }
      if (text != '') {
        paper.text(x, y, text).attr(nodeFont);
      }
    }

    function drawNode(xy, node, parentLineConnectXY) {
      // Draw the node
      var rect = paper.rect(xy[0], xy[1], box[0], box[1], box[2]);
      rect.attr({'stroke': stroke, 'fill': fill});
      // Draw the line connecting this node to the parent
      if (parentLineConnectXY) {
        // Copy parentLineConnectXY
        var p = [parentLineConnectXY[0], parentLineConnectXY[1]];
        p[0] -= (box[0]) / 2;
        p[1] += box[1];
        var d = [xy[0], xy[1]];
        d[0] += (box[0]) / 2;
        d[1] += 0;
        var pathString = 'M' + p.join(' ') + ' L' + d.join(' ') + 'Z';
        paper.path(pathString).attr('stroke', line).attr('stroke-width', '1');
      }
      var boxY = xy[1] + fontSize;
      var text = paper.text(xy[0] + box[0] / 2, boxY, node.type);
      text.attr(nodeFont).attr({'font-size': fontSize + 2});

      // Write out some properties
      writeNodeInfo(xy[0] + box[0] / 2, boxY + fontSize, node);
    }

    function enumerateChildren(xy, ast, parentLineConnectXY) {
      // Draw this node
      drawNode(xy, ast, parentLineConnectXY);
      xy[0] += box[0] + margin;

      // Find children of this node
      var children = [];
      // The order of these matters
      // eg in a while statement the test must come before the body
      var possibleChildProperties = ['test',
                                     'body',
                                     'consequent',
                                     'alternate',
                                     'init',
                                     'declarations',
                                     'left',
                                     'right',
                                     'expression',
                                     'argument',
                                     'arguments'];
      for (var i = 0; i < possibleChildProperties.length; i++) {
        if (ast.hasOwnProperty(possibleChildProperties[i]) &&
            ast[possibleChildProperties[i]] !== null) {
          children = children.concat(ast[possibleChildProperties[i]]);
        }
      }

      if (children.length > 0) {

        // Copy XY by value to store parent coords for connecting lines
        parentLineConnectXY = [xy[0] - margin, xy[1]];

        // New line for children
        xy[1] += box[1] + margin;
        xy[0] -= box[0] + margin;
        // Work out where the first child X needs to be
        // based on the number of children and box width
        if (children.length > 1) {
          // Add half a box
          xy[0] += box[0] / 2;
          // Add half a margin
          xy[0] += margin / 2;
          // Take away half children * (box widths+margin)
          xy[0] -= children.length / 2 * (box[0] + margin);
        }

        for (var i = 0; i < children.length; i++) {
          enumerateChildren(xy, children[i], parentLineConnectXY);
        }
      }
    }
    // Send the root node in for enumeration
    enumerateChildren([(dimensions[0] / 2) - (box[0] / 2), margin], ast);
  }

  var previousCode = '';

  function parseCode() {
    var outputPane = document.getElementById('outputPane');
    var syntax = {};
    var parseError = false;
    var code = document.getElementById('codeInput').value;
    if (code == previousCode) {
      return;
    }
    previousCode = code;
    try {
      syntax = esprima.parse(code);
    } catch (e) {
      parseError = true;
      syntax = {'errorMessage': e.message, 'errorObject': e};
    }

    // Update the JSON view with the parsed, indented JSON
    var jsonView = document.getElementById('json');
    jsonView.innerHTML = JSON.stringify(syntax, undefined, 1);

    if (! parseError) {
      // Redraw the AST
      paper.clear();
      drawAST(syntax);
    }
  }

  var parentElement;
  var dimensions;
  // AST options
  var box = [150, 50, 10]; // [w, h, border-radius]
  var fill = '#3AA';
  var stroke = '#FFF';
  var text = '#FFF';
  var line = '#CCC';
  var margin = 20;
  var fontSize = 12;
  var nodeFont = { 'font-size': fontSize,
                   'font-family': 'Arial, Helvetica, sans-serif',
                   'fill': text };
  var paper;

  // Setup
  onload(function() {
    // Setup the canvas
    parentElement = document.getElementById('ast');
    dimensions = [parentElement.clientWidth, parentElement.clientHeight];

    // Create a Raphael canvas centered on the #ast element
    paper = Raphael(parentElement);

    // Inital parse
    parseCode();
  });

  return {
    'parseCode': parseCode
  };
})();
