// Polyfill DOMMatrix for pdfjs-dist
if (typeof global !== 'undefined' && !global.DOMMatrix) {
  global.DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    
    constructor(transformList: any = 'none') {
      if (typeof transformList === 'string' && transformList === 'none') {
        return;
      }
    }
  };
}
