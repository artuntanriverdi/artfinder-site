document.addEventListener('DOMContentLoaded', function () {
  var btn = document.querySelector('.nav-menu-btn');
  var links = document.querySelector('.nav-links');
  if (btn && links) {
    btn.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  // Hero'daki dekoratif pin noktalarını rastgele dağıt
  var field = document.querySelector('.hero-pins');
  if (field) {
    var colors = ['var(--pin-orange)', 'var(--pin-blue)', 'var(--pin-purple)', 'var(--spray)'];
    for (var i = 0; i < 14; i++) {
      var pin = document.createElement('div');
      pin.className = 'hero-pin';
      pin.style.left = (Math.random() * 94 + 3) + '%';
      pin.style.top = (Math.random() * 88 + 6) + '%';
      pin.style.background = colors[i % colors.length];
      pin.style.opacity = (0.35 + Math.random() * 0.4).toFixed(2);
      field.appendChild(pin);
    }
  }
});
