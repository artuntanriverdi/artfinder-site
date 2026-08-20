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
  if (field) {
    var colors = ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.75)'];
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

  // ---------- DİL DEĞİŞTİRME (EN varsayılan, TR seçeneği) ----------
  function applyLanguage(lang) {
    document.querySelectorAll('[data-en]').forEach(function (el) {
      var text = (lang === 'tr') ? (el.getAttribute('data-tr') || el.getAttribute('data-en')) : el.getAttribute('data-en');
      if (text !== null) el.textContent = text;
    });
    document.documentElement.setAttribute('lang', lang);
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    try { localStorage.setItem('site_lang', lang); } catch (e) {}
  }

  var savedLang = 'en';
  try { savedLang = localStorage.getItem('site_lang') || 'en'; } catch (e) {}
  applyLanguage(savedLang);

  document.querySelectorAll('.lang-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      applyLanguage(b.getAttribute('data-lang'));
    });
  });

  // Hero shader - sayfa açılır açılmaz başlar (ilk ekran, lazy-load yok)
  initHeroShader(reduceMotion);

  // Dünya globe'u - sadece bölüme yaklaşınca yüklenir (performans için)
  initGlobeSection(reduceMotion);

  // Topluluk bölümü - çizginin üzerinde dolaşan takip noktası
  initCommunityTraveler(reduceMotion);
});

function initCommunityTraveler(reduceMotion) {
  var path = document.getElementById('community-path');
  var group = document.getElementById('traveler-group');
  if (!path || !group || reduceMotion) return;

  var length = path.getTotalLength();
  var duration = 4200;
  var start = null;
  var running = false;

  function frame(ts) {
    if (!start) start = ts;
    var elapsed = (ts - start) % duration;
    var t = elapsed / duration;
    var point = path.getPointAtLength(t * length);
    group.setAttribute('transform', 'translate(' + point.x + ',' + point.y + ')');
    requestAnimationFrame(frame);
  }

  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !running) {
        running = true;
        group.setAttribute('opacity', '1');
        requestAnimationFrame(frame);
      }
    });
  }, { threshold: 0.3 });
  obs.observe(path);
}

function initGlobeSection(reduceMotion) {
  var canvas = document.getElementById('art-globe');
  if (!canvas) return;

  if (reduceMotion) {
    canvas.parentElement.classList.add('globe-fallback');
    return;
  }

  var triggered = false;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !triggered) {
        triggered = true;
        loadGlobe(canvas);
        obs.disconnect();
      }
    });
  }, { rootMargin: '250px' });
  obs.observe(canvas);
}

function loadGlobe(canvas) {
  var script = document.createElement('script');
  script.type = 'module';
  script.textContent =
    "import createGlobe from 'https://esm.sh/cobe@0.6.3';" +
    "window.__artfinderCreateGlobe = createGlobe;" +
    "window.dispatchEvent(new Event('cobe-ready'));";

  window.addEventListener('cobe-ready', function onReady() {
    window.removeEventListener('cobe-ready', onReady);
    if (window.__artfinderCreateGlobe) {
      startGlobe(canvas, window.__artfinderCreateGlobe);
    }
  });

  document.head.appendChild(script);
}

function startGlobe(canvas, createGlobe) {
  var phi = 0;
  var width = 0;
  var isMobile = window.innerWidth < 700;
  var dpr = isMobile ? Math.min(window.devicePixelRatio || 1, 1.5) : 2;

  function onResize() {
    width = canvas.offsetWidth;
    canvas.width = width * dpr;
    canvas.height = width * dpr;
  }
  window.addEventListener('resize', onResize);
  onResize();

  // Sanat/keşif temalı birkaç dünya şehri
  var markers = [
    { location: [48.8566, 2.3522], size: 0.05 },   // Paris
    { location: [41.9028, 12.4964], size: 0.05 },  // Roma
    { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
    { location: [40.7128, -74.0060], size: 0.05 }, // New York
    { location: [41.0082, 28.9784], size: 0.065 }, // İstanbul
    { location: [-22.9068, -43.1729], size: 0.05 } // Rio de Janeiro
  ];

  var globe = createGlobe(canvas, {
    devicePixelRatio: dpr,
    width: width * dpr,
    height: width * dpr,
    phi: 0,
    theta: 0.3,
    dark: 1,
    diffuse: 1.2,
    mapSamples: isMobile ? 4000 : 8000,
    mapBrightness: 6,
    baseColor: [0.15, 0.15, 0.16],
    markerColor: [1, 1, 1],
    glowColor: [0.4, 0.4, 0.42],
    markers: markers,
    opacity: 0.9,
    onRender: function (state) {
      state.phi = phi;
      phi += 0.0045;
      state.width = width * dpr;
      state.height = width * dpr;
    }
  });

  setTimeout(function () { canvas.style.opacity = '1'; }, 60);

  window.addEventListener('beforeunload', function () {
    if (globe && globe.destroy) globe.destroy();
  });
}

function initHeroShader(reduceMotion) {
  var holder = document.getElementById('hero-shader-holder');
  if (!holder) return;
  if (reduceMotion) return;
  loadThreeAndStart(holder);
}

function loadThreeAndStart(holder) {
  if (window.THREE) {
    startShader(holder);
    return;
  }
  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js';
  script.onload = function () { startShader(holder); };
  document.head.appendChild(script);
}

function startShader(container) {
  var THREE = window.THREE;
  if (!THREE || !container) return;

  var camera = new THREE.Camera();
  camera.position.z = 1;

  var scene = new THREE.Scene();
  var geometry = new THREE.PlaneBufferGeometry(2, 2);

  var uniforms = {
    time: { type: 'f', value: 1.0 },
    resolution: { type: 'v2', value: new THREE.Vector2() }
  };

  var vertexShader = 'void main() { gl_Position = vec4( position, 1.0 ); }';

  var fragmentShader = [
    'precision highp float;',
    'uniform vec2 resolution;',
    'uniform float time;',
    'float random (in float x) { return fract(sin(x)*1e4); }',
    'void main(void) {',
    '  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);',
    '  vec2 fMosaicScal = vec2(4.0, 2.0);',
    '  vec2 vScreenSize = vec2(256,256);',
    '  uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);',
    '  uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);',
    '  float t = time*0.06+random(uv.x)*0.4;',
    '  float lineWidth = 0.0008;',
    '  vec3 raw = vec3(0.0);',
    '  for(int j = 0; j < 3; j++){',
    '    for(int i=0; i < 5; i++){',
    '      raw[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));',
    '    }',
    '  }',
    '  float intensity = clamp(raw.r + raw.g + raw.b, 0.0, 1.0);',
    '  vec3 steelDark = vec3(0.03, 0.035, 0.04);',
    '  vec3 steelMid = vec3(0.42, 0.44, 0.47);',
    '  vec3 highlight = vec3(1.0, 1.0, 1.0);',
    '  vec3 color = mix(steelDark, steelMid, smoothstep(0.0, 0.5, intensity));',
    '  color = mix(color, highlight, smoothstep(0.5, 1.0, intensity));',
    '  gl_FragColor = vec4(color, 1.0);',
    '}'
  ].join('\n');

  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader
  });

  var mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  var renderer = new THREE.WebGLRenderer({ antialias: false });
  var isMobileHero = window.innerWidth < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileHero ? 1.5 : 2));
  container.appendChild(renderer.domElement);

  function resize() {
    var rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    uniforms.resolution.value.x = renderer.domElement.width;
    uniforms.resolution.value.y = renderer.domElement.height;
  }
  resize();
  window.addEventListener('resize', resize, false);

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible = entry.isIntersecting; });
    }, { threshold: 0.05 }).observe(container);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    uniforms.time.value += 0.05;
    renderer.render(scene, camera);
  }
  animate();
}
