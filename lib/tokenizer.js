require('apollo');

module.exports.tokenize = tokenize;

function tokenize(path) {
  var pattern = /(\s+|,)|([a-zA-Z])|(-?(?:\d+(?:\.\d*)?|\.\d+))/g;
  var match;
  var tokens = [];
  var nextIndex = 0;
  while (match = pattern.exec(path)) {
    if (match.index !== nextIndex)
      return null;
    nextIndex = match.index + match[0].length;
    if (match[2]) {
      tokens.push({
        type: 'op',
        value: match[2]
      });
    } else if (match[3]) {
      tokens.push({
        type: 'param',
        value: match[3]
      });
    }
  }
  return tokens;
}
