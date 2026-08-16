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

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero'daki dekoratif pin noktalarını rastgele dağıt
  var field = document.querySelector('.hero-pins');
  var pinEls = [];
  if (field) {
    var colors = ['var(--pin-orange)', 'var(--pin-blue)', 'var(--pin-purple)', 'var(--spray)'];
    for (var i = 0; i < 14; i++) {
      var pin = document.createElement('div');
      pin.className = 'hero-pin';
      var lx = Math.random() * 94 + 3;
      var ty = Math.random() * 88 + 6;
      pin.style.left = lx + '%';
      pin.style.top = ty + '%';
      pin.style.background = colors[i % colors.length];
      pin.style.opacity = (0.35 + Math.random() * 0.4).toFixed(2);
      if (!reduceMotion) pin.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
      field.appendChild(pin);
      pinEls.push(pin);
    }
  }

  // Fare hareketiyle hafif parallax (hero pin alanı)
  var hero = document.querySelector('.hero');
  if (hero && field && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      var relX = (e.clientX - rect.left) / rect.width - 0.5;
      var relY = (e.clientY - rect.top) / rect.height - 0.5;
      field.style.transform = 'translate(' + (relX * -14).toFixed(1) + 'px,' + (relY * -10).toFixed(1) + 'px)';
    });
    hero.addEventListener('mouseleave', function () {
      field.style.transform = 'translate(0,0)';
    });
  }

  // Scroll-reveal
  var revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }
});
