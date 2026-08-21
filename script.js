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

  // Topluluk bölümü arka planı - akan tepeler (Perlin noise) animasyonu
  initCommunityHills(reduceMotion);
});

function initCommunityHills(reduceMotion) {
  var holder = document.getElementById('community-shader-holder');
  if (!holder || reduceMotion) return;

  var triggered = false;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !triggered) {
        triggered = true;
        ensureThree(function () { startHills(holder); });
        obs.disconnect();
      }
    });
  }, { rootMargin: '200px' });
  obs.observe(holder);
}

function ensureThree(callback) {
  if (window.THREE) {
    callback();
    return;
  }
  var existing = document.querySelector('script[data-threejs]');
  if (existing) {
    existing.addEventListener('load', callback);
    return;
  }
  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js';
  script.setAttribute('data-threejs', '1');
  script.onload = callback;
  document.head.appendChild(script);
}

function startHills(container) {
  var THREE = window.THREE;
  if (!THREE || !container) return;

  var planeSize = 130;
  var speed = 0.5;

  var vertexShader = [
    'attribute vec3 position;',
    'uniform mat4 projectionMatrix;',
    'uniform mat4 modelViewMatrix;',
    'uniform float time;',
    'varying vec3 vPosition;',

    'mat4 rotateMatrixX(float radian) {',
    '  return mat4(',
    '    1.0, 0.0, 0.0, 0.0,',
    '    0.0, cos(radian), -sin(radian), 0.0,',
    '    0.0, sin(radian), cos(radian), 0.0,',
    '    0.0, 0.0, 0.0, 1.0',
    '  );',
    '}',

    'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }',
    'vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }',
    'vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }',

    'float cnoise(vec3 P) {',
    '  vec3 Pi0 = floor(P);',
    '  vec3 Pi1 = Pi0 + vec3(1.0);',
    '  Pi0 = mod289(Pi0);',
    '  Pi1 = mod289(Pi1);',
    '  vec3 Pf0 = fract(P);',
    '  vec3 Pf1 = Pf0 - vec3(1.0);',
    '  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);',
    '  vec4 iy = vec4(Pi0.yy, Pi1.yy);',
    '  vec4 iz0 = Pi0.zzzz;',
    '  vec4 iz1 = Pi1.zzzz;',

    '  vec4 ixy = permute(permute(ix) + iy);',
    '  vec4 ixy0 = permute(ixy + iz0);',
    '  vec4 ixy1 = permute(ixy + iz1);',

    '  vec4 gx0 = ixy0 * (1.0 / 7.0);',
    '  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;',
    '  gx0 = fract(gx0);',
    '  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);',
    '  vec4 sz0 = step(gz0, vec4(0.0));',
    '  gx0 -= sz0 * (step(0.0, gx0) - 0.5);',
    '  gy0 -= sz0 * (step(0.0, gy0) - 0.5);',

    '  vec4 gx1 = ixy1 * (1.0 / 7.0);',
    '  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;',
    '  gx1 = fract(gx1);',
    '  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);',
    '  vec4 sz1 = step(gz1, vec4(0.0));',
    '  gx1 -= sz1 * (step(0.0, gx1) - 0.5);',
    '  gy1 -= sz1 * (step(0.0, gy1) - 0.5);',

    '  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);',
    '  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);',
    '  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);',
    '  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);',
    '  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);',
    '  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);',
    '  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);',
    '  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);',

    '  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));',
    '  g000 *= norm0.x;',
    '  g010 *= norm0.y;',
    '  g100 *= norm0.z;',
    '  g110 *= norm0.w;',
    '  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));',
    '  g001 *= norm1.x;',
    '  g011 *= norm1.y;',
    '  g101 *= norm1.z;',
    '  g111 *= norm1.w;',

    '  float n000 = dot(g000, Pf0);',
    '  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));',
    '  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));',
    '  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));',
    '  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));',
    '  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));',
    '  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));',
    '  float n111 = dot(g111, Pf1);',

    '  vec3 fade_xyz = fade(Pf0);',
    '  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);',
    '  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);',
    '  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);',
    '  return 2.2 * n_xyz;',
    '}',

    'void main(void) {',
    '  vec3 updatePosition = (rotateMatrixX(radians(90.0)) * vec4(position, 1.0)).xyz;',
    '  float sin1 = sin(radians(updatePosition.x / 128.0 * 90.0));',
    '  vec3 noisePosition = updatePosition + vec3(0.0, 0.0, time * -30.0);',
    '  float noise1 = cnoise(noisePosition * 0.08);',
    '  float noise2 = cnoise(noisePosition * 0.06);',
    '  float noise3 = cnoise(noisePosition * 0.4);',
    '  vec3 lastPosition = updatePosition + vec3(0.0,',
    '    noise1 * sin1 * 8.0',
    '    + noise2 * sin1 * 8.0',
    '    + noise3 * (abs(sin1) * 2.0 + 0.5)',
    '    + pow(sin1, 2.0) * 40.0, 0.0);',

    '  vPosition = lastPosition;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(lastPosition, 1.0);',
    '}'
  ].join('\n');

  var fragmentShader = [
    'precision highp float;',
    'varying vec3 vPosition;',
    'void main(void) {',
    '  float opacity = (96.0 - length(vPosition)) / 256.0 * 0.7;',
    '  vec3 color = vec3(0.78);',
    '  gl_FragColor = vec4(color, opacity);',
    '}'
  ].join('\n');

  var uniforms = { time: { type: 'f', value: 0 } };

  var mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(planeSize, planeSize, planeSize, planeSize),
    new THREE.RawShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true
    })
  );

  var renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  var isMobile = window.innerWidth < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.add(mesh);

  var camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
  camera.position.set(0, 16, 125);
  camera.lookAt(new THREE.Vector3(0, 28, 0));

  function resize() {
    var rect = container.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize, false);

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible = entry.isIntersecting; });
    }, { threshold: 0.05 }).observe(container);
  }

  var clock = new THREE.Clock();
  setTimeout(function () {
    var c = renderer.domElement;
    c.style.opacity = '1';
  }, 60);

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    uniforms.time.value += clock.getDelta() * speed;
    renderer.render(scene, camera);
  }
  animate();
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
