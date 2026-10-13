'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('./viewport.js'), 'utf8');

function start(visualViewport = {height: 1024, offsetTop: 0, scale: 1}) {
  const styles = new Map();
  const events = new Map();
  const frames = [];
  const listen = target => (event, callback) => events.set(`${target}:${event}`, callback);
  if (visualViewport) visualViewport.addEventListener = listen('visual');
  const window = {
    innerHeight: 1080, visualViewport,
    addEventListener: listen('window'),
    requestAnimationFrame: callback => frames.push(callback)
  };
  vm.runInNewContext(source, {
    window, document: {documentElement: {style: {setProperty: (key, value) => styles.set(key, value)}}}
  });
  return {
    window, visualViewport, styles, frames,
    emit: event => events.get(event)(),
    flush: () => { while (frames.length) frames.shift()(); }
  };
}

const app = start();
assert.equal(app.styles.get('--viewport-height'), '1024px', 'initial fit uses the visible area, not the taller layout viewport');
assert.equal(app.styles.get('--viewport-top'), '0px');

app.visualViewport.height = 948;
app.visualViewport.offsetTop = 24;
app.emit('visual:resize');
app.emit('visual:scroll');
assert.equal(app.frames.length, 1, 'toolbar resize and scroll are batched into one frame');
app.flush();
assert.equal(app.styles.get('--viewport-height'), '948px');
assert.equal(app.styles.get('--viewport-top'), '24px', 'top controls follow an unzoomed visual-viewport offset');

app.visualViewport.height = 694;
app.visualViewport.offsetTop = 0;
app.emit('window:orientationchange');
app.emit('window:resize');
app.flush();
assert.equal(app.styles.get('--viewport-height'), '694px', 'rotation recomputes the usable height');
assert.equal(app.styles.get('--viewport-top'), '0px');

app.visualViewport.scale = 2;
app.visualViewport.height = 347;
app.visualViewport.offsetTop = 160;
app.emit('visual:resize');
app.emit('visual:scroll');
app.flush();
assert.equal(app.styles.get('--viewport-height'), '694px', 'pinch zoom must magnify the board without shrinking its layout');
assert.equal(app.styles.get('--viewport-top'), '0px', 'zoom panning must not make the game follow the finger');

app.visualViewport.scale = 1;
app.visualViewport.height = 1024;
app.visualViewport.offsetTop = 0;
app.emit('visual:resize');
app.flush();
assert.equal(app.styles.get('--viewport-height'), '1024px', 'fitting resumes after zooming back out');

app.visualViewport.height = 948;
app.emit('window:pageshow');
app.flush();
assert.equal(app.styles.get('--viewport-height'), '948px', 'returning from the back/forward cache refits the page');
app.visualViewport.height = 0;
app.emit('visual:resize');
app.flush();
assert.equal(app.styles.get('--viewport-height'), '948px', 'a transient zero height cannot collapse the game');

const fallback = start(null);
assert.equal(fallback.styles.get('--viewport-height'), '1080px');
fallback.window.innerHeight = 720;
fallback.emit('window:resize');
fallback.flush();
assert.equal(fallback.styles.get('--viewport-height'), '720px', 'browsers without VisualViewport use the window height');
assert.equal(fallback.styles.get('--viewport-top'), '0px');
console.log('Viewport checks passed: toolbar changes, rotation, restored pages, zoom and pan, invalid heights, and fallback sizing.');
