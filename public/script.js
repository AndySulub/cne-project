// public/script.js — versión reforzada para depurar y resolver problemas de claves
// Reemplaza tu public/script.js actual por este archivo.
// Añadí logs y lookup más tolerante para keys (mayúsculas/minúsculas, guiones/underscores).

// ========== UTIL - TOKEN STORAGE ==========
function setToken(token) { localStorage.setItem('cne_token', token); }
function getToken() { return localStorage.getItem('cne_token'); }
function setRole(role) { localStorage.setItem('cne_role', role); }
function getRole() { return localStorage.getItem('cne_role'); }
function setDelegacion(key) { localStorage.setItem('cne_delegacion', key); }
function getDelegacion() { return localStorage.getItem('cne_delegacion'); }
function logout() { localStorage.removeItem('cne_token'); localStorage.removeItem('cne_role'); localStorage.removeItem('cne_delegacion'); window.location.reload(); }

// ========== DATOS DELEGACIONES (se llenan desde el servidor) ==========
let delegacionesData = {};
let delegacionesLoaded = false;

async function loadDelegacionesFromServer() {
  try {
    console.info('[deleg] cargando delegaciones desde /api/delegaciones ...');
    const res = await fetch('/api/delegaciones');
    if (!res.ok) {
      console.warn('[deleg] fetch /api/delegaciones respondió con status', res.status);
      try {
        const text = await res.text();
        console.warn('[deleg] body:', text);
      } catch (e) {}
      return;
    }
    const j = await res.json();
    // Compatibilidad: aceptar { delegs }, { delegaciones } o el mismo objeto
    if (j && typeof j === 'object') {
      if (j.delegs) {
        delegacionesData = j.delegs;
        console.info('[deleg] respuesta con "delegs" — asignado a delegacionesData');
      } else if (j.delegaciones) {
        delegacionesData = j.delegaciones;
        console.info('[deleg] respuesta con "delegaciones" — asignado a delegacionesData');
      } else {
        // Si es un objeto plano que contiene las claves
        delegacionesData = j;
        console.info('[deleg] respuesta con objeto directo — asignado a delegacionesData');
      }
      // Log de claves cargadas
      try {
        const keys = Object.keys(delegacionesData || {});
        console.info('[deleg] claves cargadas:', keys.length, keys.slice(0,50));
      } catch (e) {
        console.warn('[deleg] no se pudieron listar claves:', e);
      }
    } else {
      console.warn('[deleg] respuesta inesperada al parsear JSON', j);
    }
  } catch (err) {
    console.warn('No se pudieron cargar delegaciones desde servidor', err);
  } finally {
    delegacionesLoaded = true;
  }
}

// ========== TABS NAVIGATION ==========
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn, .tab-btn-footer').forEach(btn => {
    if (btn.dataset.tab === tabName) btn.classList.add('active'); else btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-section').forEach(sec => {
    if (sec.id === tabName) { sec.classList.add('active'); window.scrollTo({top:0, behavior:'smooth'}); } else sec.classList.remove('active');
  });
}
document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
document.querySelectorAll('.tab-btn-footer').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
if (hamburger && nav) {
  hamburger.addEventListener('click', () => {
    nav.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', nav.classList.contains('open'));
  });
}

// ESC global close behavior
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') {
    if (nav) nav.classList.remove('open');
    closeAnyModal();
    document.body.style.overflow = '';
  }
});

// HERO ANIM
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { const hero = document.querySelector('.hero-content'); if (hero) hero.classList.add('visible'); }, 350);
});

// fade-in on scroll
function handleFadeIns() {
  document.querySelectorAll('.fade-in').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 60) el.classList.add('visible');
  });
}
window.addEventListener('scroll', handleFadeIns);
window.addEventListener('DOMContentLoaded', handleFadeIns);

// ========== MODALES HELPERS ==========
const modalOverlay = document.getElementById('modal-overlay');
function openModalById(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.setAttribute('aria-hidden','false');
  if (modalOverlay) modalOverlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function closeModalById(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.setAttribute('aria-hidden','true');
  if (modalOverlay) modalOverlay.style.display = 'none';
  document.body.style.overflow = '';
}
function closeAnyModal() {
  document.querySelectorAll('.modal[aria-hidden="false"]').forEach(m => m.setAttribute('aria-hidden','true'));
  if (modalOverlay) modalOverlay.style.display = 'none';
}

// Emergency modal hookup
const emergenciaBtn = document.getElementById('emergencia-btn');
const reportarBtn = document.getElementById('reportar-btn');
const emergenciaModalClose = document.getElementById('emergencia-modal-close');
if (emergenciaBtn) emergenciaBtn.addEventListener('click', () => openModalById('emergencia-modal'));
if (reportarBtn) reportarBtn.addEventListener('click', () => openModalById('emergencia-modal'));
if (emergenciaModalClose) emergenciaModalClose.addEventListener('click', () => closeModalById('emergencia-modal'));

// Voluntario CTA
const voluntarioBtn = document.getElementById('voluntario-btn');
if (voluntarioBtn) voluntarioBtn.addEventListener('click', () => switchTab('contacto'));

// ========== JOIN FORM -> POST /api/contact ==========
const joinForm = document.getElementById('join-form');
const successMsg = document.getElementById('form-success');
if (joinForm) {
  joinForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    let valid = true;
    const nombre = this.nombre;
    const correo = this.correo;
    const telefono = this.telefono;
    const delegacion = this.delegacion;

    if (!nombre.value.trim()) { nombre.nextElementSibling.textContent = 'Ingresa tu nombre.'; valid = false; } else nombre.nextElementSibling.textContent = '';
    if (!correo.value.trim() || !/\S+@\S+\.\S+/.test(correo.value)) { correo.nextElementSibling.textContent = 'Correo inválido.'; valid = false; } else correo.nextElementSibling.textContent = '';
    if (!telefono.value.trim() || !telefono.value.match(/^[0-9\s\-+()]{8,}$/)) { telefono.nextElementSibling.textContent = 'Teléfono inválido.'; valid = false; } else telefono.nextElementSibling.textContent = '';
    if (!delegacion.value) { delegacion.nextElementSibling.textContent = 'Selecciona delegación.'; valid = false; } else delegacion.nextElementSibling.textContent = '';
    const dispChecks = joinForm.querySelectorAll('input[name="disp[]"]:checked');
    const dispError = joinForm.querySelector('.disponibilidad .error-msg');
    if (dispChecks.length === 0) { dispError.textContent = 'Selecciona al menos una opción.'; valid = false; } else dispError.textContent = '';

    if (!valid) return;

    // send to backend
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.value,
          correo: correo.value,
          telefono: telefono.value,
          delegacion: delegacion.value,
          mensaje: 'Solicitud de incorporación (formulario web)'
        })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error enviando');
      this.reset();
      if (successMsg) { successMsg.style.display = 'block'; setTimeout(()=> successMsg.style.display='none', 5000); }
    } catch (err) {
      alert('Error enviando formulario: ' + (err.message || err));
    }
  });
}

// FAQ toggles
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', function() {
    const item = btn.parentElement;
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!open) item.classList.add('open');
  });
});

// ========== DELEGACIONES: tooltip, modal y render ==========
const delegTooltip = document.getElementById('deleg-tooltip');
const delegModal = document.getElementById('deleg-modal');
const delegModalBody = document.getElementById('deleg-modal-body');
const delegModalClose = document.getElementById('deleg-modal-close');

function normalizeKeyVariants(key) {
  if (!key) return [];
  const variants = new Set();
  variants.add(key);
  try { variants.add(key.toUpperCase()); variants.add(key.toLowerCase()); } catch(e){}
  // Replace hyphens/space with underscore
  variants.add(key.replace(/-/g, '_'));
  variants.add(key.replace(/\s+/g, '_'));
  variants.add(key.replace(/_/g, '-'));
  // Trim
  variants.forEach(v => v && variants.add((v||'').trim()));
  return Array.from(variants);
}

function safeGetDeleg(key) {
  if (!delegacionesData) return null;
  // Try direct
  if (delegacionesData[key]) return delegacionesData[key];
  // Try variants (uppercase/lowercase/underscores/hyphens)
  const tries = normalizeKeyVariants(key);
  for (let t of tries) {
    if (delegacionesData[t]) return delegacionesData[t];
  }
  // Try keys case-insensitive match
  const lower = key.toLowerCase();
  for (const k of Object.keys(delegacionesData || {})) {
    if (k.toLowerCase() === lower) return delegacionesData[k];
  }
  return null;
}

function renderDelegModalFromData(key) {
  const data = safeGetDeleg(key);
  if (!delegacionesLoaded) {
    delegModalBody.innerHTML = `<div style="padding:18px;text-align:center;">Cargando información... por favor espera.</div>`;
    delegModal.setAttribute('aria-hidden','false');
    if (modalOverlay) modalOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    return;
  }
  if (!data) {
    // DEBUG: mostrar las claves disponibles para ayudar a identificar mismatch
    let available = [];
    try { available = Object.keys(delegacionesData || {}).slice(0,50); } catch(e){ available = []; }
    delegModalBody.innerHTML = `<div style="padding:18px;text-align:center;">Delegación no encontrada.<br><small>Clave solicitada: <strong>${key}</strong></small><br><small>Claves disponibles (muestra): ${available.join(', ') || 'ninguna'}</small></div>`;
    delegModal.setAttribute('aria-hidden','false');
    if (modalOverlay) modalOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    return;
  }
  let html = `<div class="deleg-modal-cabecera"><img src="${data.foto || 'img/default-deleg.jpg'}" alt="${data.nombre}" onerror="this.onerror=null;this.src='img/default-deleg.jpg'"><h2>${data.nombre}</h2></div>`;
  html += `<ul class="deleg-modal-miembros">`;
  (data.miembros || []).forEach(m => {
    html += `<li><img src="img/delegado1.jpg" alt="${m.cargo}" onerror="this.onerror=null;this.src='img/default-person.jpg'"><div><strong>${m.cargo}${m.numeral ? ' ('+m.numeral+')' : ''}:</strong> ${m.nombre}</div></li>`;
  });
  if (!data.miembros || data.miembros.length === 0) {
    html += `<li style="padding:12px;background:transparent;color:#666">No hay miembros listados.</li>`;
  }
  html += `</ul>`;
  html += `<div style="margin-top:12px;text-align:center;"><button class="deleg-modal-edit-btn" data-deleg="${key}" style="display:none;">Editar delegación</button></div>`;
  delegModalBody.innerHTML = html;
  delegModal.setAttribute('aria-hidden','false');
  if (modalOverlay) modalOverlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
  applyEditorUI();
}

document.querySelectorAll('.deleg-dot').forEach(dot => {
  dot.addEventListener('mouseenter', function() {
    const key = dot.dataset.deleg;
    if (!delegTooltip) return;
    const d = safeGetDeleg(key);
    delegTooltip.textContent = d ? d.nombre : key;
    delegTooltip.style.display = 'block';
    delegTooltip.setAttribute('aria-hidden','false');
    const svgRect = dot.ownerSVGElement ? dot.ownerSVGElement.getBoundingClientRect() : dot.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();
    let left = dotRect.left - (svgRect.left || 0) + (svgRect.width||0)/2 - 60;
    if (window.innerWidth < 600) left = 10;
    delegTooltip.style.left = left + 'px';
  });
  dot.addEventListener('mouseleave', function() {
    if (!delegTooltip) return;
    delegTooltip.style.display = 'none';
    delegTooltip.setAttribute('aria-hidden','true');
  });
  dot.addEventListener('click', function() { renderDelegModalFromData(dot.dataset.deleg); });
});
document.querySelectorAll('.deleg-link').forEach(btn => btn.addEventListener('click', function(){ renderDelegModalFromData(btn.dataset.deleg); }));
if (delegModalClose) delegModalClose.addEventListener('click', function() { delegModal.setAttribute('aria-hidden','true'); if (modalOverlay) modalOverlay.style.display = 'none'; document.body.style.overflow = ''; });

// Delegation edit handler (deleg-modal-edit-btn created dynamically)
document.addEventListener('click', async function(e) {
  if (e.target && e.target.classList && e.target.classList.contains('deleg-modal-edit-btn')) {
    const key = e.target.dataset.deleg;
    const data = safeGetDeleg(key) || { nombre: '', foto: '', miembros: [] };
    const formHtml = `
      <div id="deleg-edit-form" style="text-align:left;margin-top:12px;">
        <label>Nombre</label>
        <input id="edit-nombre" type="text" value="${(data.nombre||'')}" style="width:100%;padding:8px;margin:6px 0;border-radius:6px;border:1px solid #ccc;">
        <label>Foto (ruta)</label>
        <input id="edit-foto" type="text" value="${(data.foto||'')}" style="width:100%;padding:8px;margin:6px 0;border-radius:6px;border:1px solid #ccc;">
        <label>Miembros (JSON array)</label>
        <textarea id="edit-miembros" style="width:100%;height:160px;padding:8px;margin:6px 0;border-radius:6px;border:1px solid #ccc;">${JSON.stringify(data.miembros||[],null,2)}</textarea>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button id="save-deleg-btn" class="btn-black">Guardar</button>
          <button id="cancel-deleg-btn" class="btn-beige">Cancelar</button>
        </div>
      </div>
    `;
    delegModalBody.insertAdjacentHTML('beforeend', formHtml);

    document.getElementById('cancel-deleg-btn').addEventListener('click', function(){ const el = document.getElementById('deleg-edit-form'); if (el) el.remove(); renderDelegModalFromData(key); });

    document.getElementById('save-deleg-btn').addEventListener('click', async function(){
      const nombreVal = document.getElementById('edit-nombre').value.trim();
      const fotoVal = document.getElementById('edit-foto').value.trim();
      const miembrosVal = document.getElementById('edit-miembros').value.trim();
      let parsedMiembros = [];
      try { parsedMiembros = miembrosVal ? JSON.parse(miembrosVal) : []; } catch(err){ alert('JSON inválido en miembros. Corrige y vuelve a intentar.'); return; }
      const delegacionData = { nombre: nombreVal, foto: fotoVal, miembros: parsedMiembros };
      try {
        const token = getToken();
        if (!token) throw new Error('No autorizado. Inicia sesión.');
        const res = await fetch('/api/delegaciones/' + encodeURIComponent(key), {
          method: 'PUT',
          headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ delegacionData })
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Error guardando delegación');
        // refrescar desde servidor
        await loadDelegacionesFromServer();
        renderDelegModalFromData(key);
        alert('Delegación guardada correctamente.');
      } catch (err) {
        alert('Error guardando delegación: ' + (err.message || err));
      }
    });
  }
});

// ========== AUTH: login (POST /api/login) and UI control ==========
const headerLoginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const loginModalClose = document.getElementById('login-modal-close');
const loginSubmit = document.getElementById('login-submit');
const loginAdminKey = document.getElementById('login-adminkey');
const loginError = document.getElementById('login-error');

if (headerLoginBtn) headerLoginBtn.addEventListener('click', () => {
  if (!loginModal) return;
  loginModal.setAttribute('aria-hidden','false');
  if (modalOverlay) modalOverlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
  const u = document.getElementById('login-username');
  if (u) u.focus();
});

if (loginModalClose) loginModalClose.addEventListener('click', () => {
  loginModal.setAttribute('aria-hidden','true');
  if (modalOverlay) modalOverlay.style.display = 'none';
  document.body.style.overflow = '';
});

async function loginWithCredentials(username, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ username, password })
  });
  const j = await res.json();
  return { ok: res.ok, body: j };
}

async function loginAdminKeyFlow(adminKey) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ adminKey })
  });
  const j = await res.json();
  return { ok: res.ok, body: j };
}

if (loginSubmit) loginSubmit.addEventListener('click', async () => {
  loginError.style.display = 'none';
  const username = (document.getElementById('login-username')||{}).value || '';
  const password = (document.getElementById('login-password')||{}).value || '';
  try {
    const { ok, body } = await loginWithCredentials(username, password);
    if (!ok) throw new Error(body.error || 'Credenciales inválidas');
    setToken(body.token); setRole(body.role); if (body.delegacion) setDelegacion(body.delegacion);
    loginModal.setAttribute('aria-hidden','true');
    if (modalOverlay) modalOverlay.style.display = 'none';
    document.body.style.overflow = '';
    applyEditorUI();
    headerLoginBtn.textContent = body.role === 'admin' ? 'Admin' : 'Perfil';
    alert('Login correcto');
  } catch (err) {
    loginError.style.display = 'block';
    loginError.textContent = err.message || 'Error login';
  }
});

if (loginAdminKey) loginAdminKey.addEventListener('click', async () => {
  const adminKey = prompt('Introduce ADMIN KEY (sólo usuarios autorizados)');
  if (!adminKey) return;
  try {
    const { ok, body } = await loginAdminKeyFlow(adminKey);
    if (!ok) throw new Error(body.error || 'Admin key inválida');
    setToken(body.token); setRole(body.role);
    loginModal.setAttribute('aria-hidden','true');
    if (modalOverlay) modalOverlay.style.display = 'none';
    document.body.style.overflow = '';
    applyEditorUI();
    headerLoginBtn.textContent = 'Admin';
    alert('Acceso admin concedido');
  } catch (err) {
    alert('Error: ' + (err.message || 'Admin key inválida'));
  }
});

// show/hide edit UI depending on role + delegacion
function applyEditorUI() {
  const role = getRole();
  const deleg = getDelegacion();
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = (role === 'admin') ? 'inline-block' : 'none');
  document.querySelectorAll('.deleg-modal-edit-btn').forEach(btn => {
    const key = btn.dataset.deleg;
    if (role === 'admin' || (role === 'delegate' && deleg === key)) btn.style.display = 'inline-block'; else btn.style.display = 'none';
  });
}

// If token is present at load, apply UI and load delegaciones
document.addEventListener('DOMContentLoaded', () => {
  loadDelegacionesFromServer().then(() => {
    if (getToken()) applyEditorUI();
  });
});

// ========== GALLERY LIGHTBOX ===========
// ... el resto del lightbox se mantiene igual (sin cambios)
// Copia abajo el resto de tu lightbox original si lo omití por brevedad.
(function(){
  const thumbs = document.querySelectorAll('.gallery-thumb');
  const modal = document.getElementById('gallery-modal');
  const modalImg = document.getElementById('gallery-modal-img');
  const captionEl = document.getElementById('gallery-caption');
  const btnClose = modal ? modal.querySelector('.gallery-close') : null;
  const btnPrev = modal ? modal.querySelector('.gallery-prev') : null;
  const btnNext = modal ? modal.querySelector('.gallery-next') : null;
  if (!thumbs.length || !modal) return;
  const images = Array.from(thumbs).map((btn, i) => {
    const img = btn.querySelector('img');
    return { src: img.getAttribute('src'), alt: img.getAttribute('alt') || '', index: i };
  });
  let current = 0;
  function openAt(index){ if (index < 0) index = images.length -1; if (index >= images.length) index = 0; current = index; modalImg.src = images[current].src; modalImg.alt = images[current].alt; captionEl.textContent = images[current].alt; modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; if (btnClose) btnClose.focus(); }
  function closeGallery(){ modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; modalImg.src=''; }
  thumbs.forEach(btn => btn.addEventListener('click', () => openAt(parseInt(btn.dataset.index,10)||0)));
  if (btnClose) btnClose.addEventListener('click', closeGallery);
  if (btnPrev) btnPrev.addEventListener('click', ()=> openAt(current-1));
  if (btnNext) btnNext.addEventListener('click', ()=> openAt(current+1));
  document.addEventListener('keydown', (e)=> { if (modal.getAttribute('aria-hidden')==='false') { if (e.key==='Escape') closeGallery(); if (e.key==='ArrowLeft') openAt(current-1); if (e.key==='ArrowRight') openAt(current+1); } });
  modal.addEventListener('click', e => { if (e.target===modal) closeGallery(); });
  let startX=0;
  if (modalImg) {
    modalImg.addEventListener('touchstart', e => startX = e.touches[0].clientX, {passive:true});
    modalImg.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - startX; if (dx>40) openAt(current-1); else if (dx<-40) openAt(current+1); }, {passive:true});
  }
})();