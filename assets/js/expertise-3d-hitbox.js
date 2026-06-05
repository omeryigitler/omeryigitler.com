function updateExpertise3DScroll() {
  var track = document.getElementById('expertise-3d-track');
  if (!track) return;

  if (window.innerWidth < 768) {
    track.style.setProperty('--scroll-progress', '1');
    return;
  }

  var rect = track.getBoundingClientRect();
  var vh = window.innerHeight || document.documentElement.clientHeight;
  var progress = (vh * 0.85 - rect.top) / (vh * 0.55);

  if (progress < 0) progress = 0;
  if (progress > 1) progress = 1;

  track.style.setProperty('--scroll-progress', progress.toFixed(4));
}

var expertise3DTicking = false;
function requestExpertise3DScrollUpdate() {
  if (expertise3DTicking) return;
  expertise3DTicking = true;
  window.requestAnimationFrame(function () {
    updateExpertise3DScroll();
    expertise3DTicking = false;
  });
}

window.addEventListener('scroll', requestExpertise3DScrollUpdate, { passive: true });
window.addEventListener('resize', requestExpertise3DScrollUpdate);
updateExpertise3DScroll();
