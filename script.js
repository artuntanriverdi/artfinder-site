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

  // Shader imza bölümü - Three.js ile akan siyah/beyaz/kırmızı çizgiler
  initShaderSection(reduceMotion);
});

function initShaderSection(reduceMotion) {
  var holder = document.getElementById('shader-canvas-holder');
  if (!holder) return;

  // Hareket azaltma tercihi varsa, sabit noktalı bir doku göster, WebGL hiç yüklenmesin
  if (reduceMotion) {
    var fallback = document.createElement('div');
    fallback.className = 'shader-fallback';
    holder.appendChild(fallback);
    return;
  }

  // Sadece bölüm görünüme yaklaşınca yükle (performans için)
  var triggered = false;
  var lazyObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !triggered) {
        triggered = true;
        loadThreeAndStart(holder);
        lazyObserver.disconnect();
      }
    });
  }, { rootMargin: '300px' });

  lazyObserver.observe(holder);
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

  // Fragment shader: orijinal akış efekti korunuyor, ama çıkış rengi
  // sitenin siyah/beyaz/kırmızı (spray) paletine uyarlanmış duotone.
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
    '  vec3 white = vec3(1.0, 1.0, 1.0);',
    '  vec3 spray = vec3(0.878, 0.251, 0.184);',
    '  vec3 tint = mix(white, spray, 0.4 + 0.3 * sin(time*0.15));',
    '  vec3 finalColor = mix(vec3(0.0), tint, intensity);',
    '  gl_FragColor = vec4(finalColor, 1.0);',
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
  var sectionEl = document.getElementById('shader-section');
  if (sectionEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible = entry.isIntersecting; });
    }, { threshold: 0.05 }).observe(sectionEl);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    uniforms.time.value += 0.05;
    renderer.render(scene, camera);
  }
  animate();
}
