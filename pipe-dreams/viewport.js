(() => {
  'use strict';

  const viewport = window.visualViewport;
  const style = document.documentElement.style;
  let scheduled = false;

  function fitViewport() {
    // Safari's visible area can change independently of vh/dvh when its
    // toolbars move or the iPad rotates. Keep the game in that visible area.
    // Do not reflow or follow the viewport while the player pinch-zooms:
    // the enlarged board must remain available to pan around normally.
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
    const height = viewport ? viewport.height : window.innerHeight;
    if (!(height > 0)) return;
    style.setProperty('--viewport-height', `${height}px`);
    style.setProperty('--viewport-top', `${viewport ? viewport.offsetTop : 0}px`);
  }

  function scheduleFit() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      fitViewport();
    });
  }

  fitViewport();
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', scheduleFit);
  window.addEventListener('pageshow', scheduleFit);
  if (viewport) {
    viewport.addEventListener('resize', scheduleFit);
    viewport.addEventListener('scroll', scheduleFit);
  }
})();
