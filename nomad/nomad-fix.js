/* nomad.html JS - Carousel drag scroll + mobile menu */
document.querySelectorAll('.iUNIl').forEach(function(el) {
  el.style.cursor = 'grab';
  var isDown = false, startX, scrollLeft;
  el.addEventListener('mousedown', function(e) {
    isDown = true; el.style.cursor = 'grabbing';
    startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft;
  });
  el.addEventListener('mouseleave', function() { isDown = false; el.style.cursor = 'grab'; });
  el.addEventListener('mouseup', function() { isDown = false; el.style.cursor = 'grab'; });
  el.addEventListener('mousemove', function(e) {
    if (!isDown) return; e.preventDefault();
    var x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeft - (x - startX) * 1.5;
  });
});

// Footer accordion on mobile
document.querySelectorAll('#footer h3, .C3G2R h3').forEach(function(h) {
  h.style.cursor = 'pointer';
  h.addEventListener('click', function() {
    var col = this.parentElement;
    document.querySelectorAll('#footer .KcRIx, #footer .cVfyM, .C3G2R .KcRIx, .C3G2R .cVfyM').forEach(function(c) {
      if (c !== col) c.classList.remove('open');
    });
    col.classList.toggle('open');
  });
});
