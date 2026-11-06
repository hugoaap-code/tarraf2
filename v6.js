/* AMJT II v6: submenu, formulários (cadastro, Empresa Amiga, anúncios) e etapa do Pix. */
(() => {
  /* Submenu "Comunidade": hover no desktop, clique/teclado em qualquer tela. */
  document.querySelectorAll('.dd').forEach(dd => {
    const b = dd.querySelector('.dd-btn');
    b.addEventListener('click', e => {
      e.stopPropagation();
      const open = !dd.classList.contains('open');
      document.querySelectorAll('.dd.open').forEach(x => { x.classList.remove('open'); x.querySelector('.dd-btn').setAttribute('aria-expanded', 'false'); });
      dd.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
    });
    dd.addEventListener('keydown', e => { if (e.key === 'Escape') { dd.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); b.focus(); } });
  });
  document.addEventListener('click', () => document.querySelectorAll('.dd.open').forEach(x => { x.classList.remove('open'); x.querySelector('.dd-btn').setAttribute('aria-expanded', 'false'); }));

  /* Máscaras leves (não bloqueiam a digitação). */
  const masks = {
    cpf: v => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'),
    cep: v => v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'),
    tel: v => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length < 3 ? d : d.length < 8 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`; }
  };
  document.querySelectorAll('[data-mask]').forEach(inp => inp.addEventListener('input', () => { inp.value = masks[inp.dataset.mask](inp.value); }));

  /* Planos da Empresa Amiga: escolhe o plano e leva ao formulário. */
  const PIX = { ouro: 200, prata: 150, bronze: 100 };
  document.querySelectorAll('[data-choose-plan]').forEach(b => b.addEventListener('click', () => {
    const r = document.querySelector(`input[name=plano][value=${b.dataset.choosePlan}]`);
    if (r) { r.checked = true; document.getElementById('cadastro').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => r.focus({ preventScroll: true }), 600); }
  }));

  async function clientIp() {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 2500);
      const r = await fetch('https://api.ipify.org?format=json', { signal: c.signal }); clearTimeout(t);
      return (await r.json()).ip || '';
    } catch (e) { return ''; }
  }

  document.querySelectorAll('form[data-form]').forEach(form => {
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('[type=submit]');
    const panel = form.parentElement.querySelector('[data-success]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      form.classList.add('was-validated');
      if (!form.checkValidity()) {
        const bad = form.querySelector(':invalid');
        status.className = 'form-status err';
        status.textContent = 'Confira os campos destacados.';
        if (bad) bad.focus();
        return;
      }
      submit.disabled = true; status.className = 'form-status wait'; status.textContent = 'Enviando…';
      const fd = new FormData(form);
      fd.set('ip_cliente', await clientIp());
      fd.set('navegador', navigator.userAgent.slice(0, 280));
      fd.set('pagina', location.pathname.split('/').pop() || 'index.html');
      try {
        const r = await fetch(window.AMJT_ENDPOINT, { method: 'POST', body: new URLSearchParams(fd) });
        const res = await r.json();
        if (!res.ok) throw new Error(res.erro || 'Não foi possível enviar.');
        panel.querySelectorAll('[data-protocolo]').forEach(x => x.textContent = res.protocolo);
        if (form.dataset.form === 'empresa') {
          const plano = fd.get('plano');
          const code = (window.AMJT_PIX || {})[plano];
          panel.querySelector('[data-pix-valor]').textContent = PIX[plano];
          const qr = panel.querySelector('[data-pix-qr]');
          qr.src = `assets/pix-${plano}.svg`; qr.alt = `QR Code Pix da associação no valor de R$ ${PIX[plano]},00`;
          if (code) { panel.querySelector('[data-pix-code]').textContent = code; panel.querySelector('[data-pix-copy]').dataset.copy = code; }
        }
        form.hidden = true; panel.hidden = false;
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        panel.focus({ preventScroll: true });
      } catch (err) {
        status.className = 'form-status err';
        status.textContent = (err && err.message && !/fetch|network/i.test(err.message)) ? err.message : 'Não foi possível enviar agora. Verifique a internet e tente de novo.';
        submit.disabled = false;
      }
    });
  });
})();

/* v6.3: Classificados — lista aprovada vinda do Apps Script; filtros compactos (tipo + categoria + busca)
   e, no formulário, categorias que mudam conforme Produto/Serviço. */
(() => {
  const CATS = window.AMJT_CATS || {}, GROUPS = window.AMJT_CAT_GROUPS || { produto: {}, servico: {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const X = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  // Formulário: categoria depende do tipo
  const catSel = document.querySelector('[data-cat-select]');
  if (catSel) {
    const form = catSel.closest('form');
    const fill = tipo => {
      const g = GROUPS[tipo] || {};
      catSel.innerHTML = `<option value="">${tipo === 'servico' ? 'Escolha o tipo de serviço' : 'Escolha o tipo de produto'}</option>` +
        Object.entries(g).map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join('');
      catSel.disabled = false;
      const t = form.querySelector('[name=titulo]'); if (t) t.placeholder = tipo === 'servico' ? 'Ex.: Diarista às terças e quintas' : 'Ex.: Bolos caseiros sob encomenda';
      const hint = form.querySelector('[data-cat-hint]'); if (hint) hint.textContent = tipo === 'servico' ? 'Mostrando categorias de serviços.' : 'Mostrando categorias de produtos.';
    };
    form.querySelectorAll('input[name=tipo_anuncio]').forEach(r => r.addEventListener('change', () => r.checked && fill(r.value)));
    form.addEventListener('reset', () => setTimeout(() => {
      catSel.innerHTML = '<option value="">Escolha primeiro: produto ou serviço</option>'; catSel.disabled = true;
      const hint = form.querySelector('[data-cat-hint]'); if (hint) hint.textContent = 'As categorias mudam conforme a sua escolha acima.';
    }));
  }

  const grid = document.getElementById('cl-grid');
  if (!grid) return;
  const count = document.getElementById('cl-count'), empty = document.getElementById('cl-empty'), search = document.getElementById('cl-search');
  const sel = document.getElementById('cl-cat'), active = document.getElementById('cl-active');
  const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const WA = window.AMJT_WA || '';
  const typeOf = k => GROUPS.produto[k] ? 'produto' : GROUPS.servico[k] ? 'servico' : '';
  let ads = [], type = 'all', cat = 'all';
  const pager = amjtPager(grid, { noun: ['anúncio', 'anúncios'], label: 'Páginas dos anúncios', top: count, onChange: () => apply(true) });
  const params = new URLSearchParams(location.search);
  if (CATS[params.get('categoria')]) cat = params.get('categoria');
  if (['produto', 'servico'].includes(params.get('tipo'))) type = params.get('tipo');
  function linkOf(l) {
    l = String(l || '').trim(); if (!l) return '';
    if (l.startsWith('@')) return 'https://instagram.com/' + l.slice(1);
    return /^https?:\/\//.test(l) ? l : 'https://' + l;
  }
  function card(a) {
    const wa = a.whatsapp ? `<a class="btn btn-wa" href="https://wa.me/${esc(a.whatsapp)}?text=${encodeURIComponent('Olá! Vi seu anúncio "' + a.titulo + '" nos Classificados do Tarraf II.')}" target="_blank" rel="noopener">${WA} WhatsApp</a>` : '';
    const ln = linkOf(a.link) ? `<a class="link" href="${esc(linkOf(a.link))}" target="_blank" rel="noopener nofollow">Ver perfil ↗</a>` : '';
    // Ícone da categoria (06/11/2026): window.AMJT_CAT_ICONS vem do v6.py; categoria desconhecida usa o padrão do tipo.
    const ICO = window.AMJT_CAT_ICONS || {}, svg = ICO[a.categoria] || ICO[a.tipo === 'servico' ? '_servico' : '_produto'] || '';
    const ico = svg ? `<span class="cl-ico${a.tipo === 'servico' ? ' servico' : ''}" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24">${svg}</svg></span>` : '';
    return `<article class="cl-card"><div class="cl-head">${ico}<div class="cl-tags"><span class="cl-tag ${esc(a.tipo)}">${a.tipo === 'servico' ? 'Serviço' : 'Produto'}</span><span class="cl-tag">${esc(CATS[a.categoria] || 'Outros')}</span></div></div><h3>${esc(a.titulo)}</h3><p>${esc(a.descricao)}</p>${a.preco ? `<p class="cl-price">${esc(a.preco)}</p>` : ''}<p class="cl-who">Anunciado por ${esc(a.nome)}</p><div class="cl-actions">${wa}${ln}</div></article>`;
  }
  // Monta o seletor de categorias: agrupado por Produtos/Serviços, com contagem; categorias com anúncio primeiro.
  function buildSelect() {
    const n = {}; ads.forEach(a => { n[a.categoria] = (n[a.categoria] || 0) + 1; });
    const group = (t, label) => {
      const items = Object.entries(GROUPS[t]).map(([k, l]) => [k, l, n[k] || 0]).sort((x, y) => (y[2] > 0) - (x[2] > 0));
      return `<optgroup label="${label}">` + items.map(([k, l, c]) => `<option value="${esc(k)}">${esc(l)}${c ? ` (${c})` : ''}</option>`).join('') + '</optgroup>';
    };
    const total = type === 'all' ? ads.length : ads.filter(a => a.tipo === type).length;
    sel.innerHTML = `<option value="all">${type === 'servico' ? 'Todos os serviços' : type === 'produto' ? 'Todos os produtos' : 'Todas as categorias'}${ads.length ? ` (${total})` : ''}</option>` +
      (type !== 'servico' ? group('produto', 'Produtos') : '') + (type !== 'produto' ? group('servico', 'Serviços') : '');
    if (cat !== 'all' && !sel.querySelector(`option[value="${CSS.escape(cat)}"]`)) cat = 'all';
    sel.value = cat;
  }
  function syncUrl() {
    const u = new URL(location.href);
    cat === 'all' ? u.searchParams.delete('categoria') : u.searchParams.set('categoria', cat);
    type === 'all' ? u.searchParams.delete('tipo') : u.searchParams.set('tipo', type);
    history.replaceState(null, '', u);
  }
  function apply(keep) {
    if (keep !== true) pager.reset();   // mudou filtro/busca: volta para a página 1
    const q = norm(search.value.trim());
    document.querySelectorAll('[data-cl-type]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.clType === type)));
    const list = ads.filter(a => (type === 'all' || a.tipo === type) && (cat === 'all' || a.categoria === cat) && (!q || norm(a.titulo + ' ' + a.descricao + ' ' + (CATS[a.categoria] || '')).includes(q)));
    const pg = pager.slice(list.length);
    grid.innerHTML = list.slice(pg.from, pg.to).map(card).join('');
    count.textContent = list.length + (list.length === 1 ? ' anúncio' : ' anúncios') + pg.suffix;
    empty.hidden = list.length !== 0;
    const chips = [];
    if (cat !== 'all') chips.push(`<button type="button" class="chip" data-clear="cat">${esc(CATS[cat])} ${X}<span class="sr-only">remover filtro</span></button>`);
    if (q) chips.push(`<button type="button" class="chip" data-clear="q">“${esc(search.value.trim())}” ${X}<span class="sr-only">remover busca</span></button>`);
    if (type !== 'all' || chips.length) chips.push('<button type="button" class="clear" data-clear="all">Limpar filtros</button>');
    active.innerHTML = chips.join(''); active.hidden = !chips.length;
  }
  document.querySelectorAll('[data-cl-type]').forEach(b => b.addEventListener('click', () => {
    type = b.dataset.clType; if (cat !== 'all' && type !== 'all' && typeOf(cat) && typeOf(cat) !== type) cat = 'all';
    buildSelect(); syncUrl(); apply();
  }));
  sel.addEventListener('change', () => { cat = sel.value; if (cat !== 'all' && type !== 'all' && typeOf(cat) !== type) type = typeOf(cat) || 'all'; syncUrl(); apply(); });
  active.addEventListener('click', e => {
    const b = e.target.closest('[data-clear]'); if (!b) return;
    const k = b.dataset.clear;
    if (k === 'cat' || k === 'all') cat = 'all';
    if (k === 'q' || k === 'all') search.value = '';
    if (k === 'all') type = 'all';
    buildSelect(); syncUrl(); apply();
  });
  search.addEventListener('input', apply);
  buildSelect(); apply(true); count.textContent = 'Carregando anúncios…'; empty.hidden = true;
  fetch(window.AMJT_ENDPOINT + '?lista=classificados').then(r => r.json()).then(r => { ads = (r && r.anuncios) || []; buildSelect(); apply(true); })
    .catch(() => { count.textContent = 'Não foi possível carregar os anúncios agora.'; empty.hidden = false; });
  document.querySelectorAll('[data-form-again]').forEach(b => b.addEventListener('click', () => {
    const panel = b.closest('[data-success]'), form = panel.parentElement.querySelector('form[data-form]');
    form.reset(); form.classList.remove('was-validated'); form.querySelector('[type=submit]').disabled = false;
    form.querySelector('.form-status').textContent = ''; panel.hidden = true; form.hidden = false; form.scrollIntoView({ behavior: 'smooth' });
  }));
})();

/* v6.2: esconde a barra fixa "Quero me associar" no celular quando a faixa de Empresas Amigas ou o rodapé aparecem. */
(() => {
  const m = document.getElementById('mcta');
  if (!m) return;
  const seen = new Set();
  const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)); m.classList.toggle('mcta-off', seen.size > 0); }, { threshold: 0.05 });
  document.querySelectorAll('.partners-band, footer').forEach(el => io.observe(el));
})();

/* v6.4: carrossel do topo dos posts (deslizar, setas, teclado, miniaturas). */
document.querySelectorAll('[data-carousel]').forEach(car => {
  const track = car.querySelector('.pc-track'), slides = [...car.querySelectorAll('.pc-slide')];
  const thumbs = [...car.querySelectorAll('.pc-thumb')], cap = car.querySelector('.pc-caption');
  const prev = car.querySelector('.pc-prev'), next = car.querySelector('.pc-next'), count = car.querySelector('.pc-count b');
  if (slides.length < 2) return;
  let cur = 0;
  const go = i => { i = Math.max(0, Math.min(slides.length - 1, i)); track.scrollTo({ left: slides[i].offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  const mark = i => {
    if (i === cur && count.textContent == i + 1) return;
    cur = i; count.textContent = i + 1;
    thumbs.forEach((t, n) => t.setAttribute('aria-current', String(n === i)));
    if (cap) cap.textContent = slides[i].querySelector('.pc-open').dataset.caption || '';
    prev.disabled = i === 0; next.disabled = i === slides.length - 1;
    const t = thumbs[i], box = t.parentElement;
    if (t.offsetLeft < box.scrollLeft || t.offsetLeft + t.offsetWidth > box.scrollLeft + box.clientWidth)
      box.scrollTo({ left: t.offsetLeft - box.clientWidth / 2 + t.offsetWidth / 2, behavior: 'smooth' });
  };
  let raf;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => mark(Math.round(track.scrollLeft / track.clientWidth))); }, { passive: true });
  prev.addEventListener('click', () => go(cur - 1));
  next.addEventListener('click', () => go(cur + 1));
  thumbs.forEach(t => t.addEventListener('click', () => go(+t.dataset.go)));
  car.addEventListener('keydown', e => {
    if (e.target.closest('input,textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
  });
  mark(0); cur = -1; mark(0);
  car.amjtGo = i => { track.style.scrollBehavior = 'auto'; track.scrollLeft = slides[i].offsetLeft; track.style.scrollBehavior = ''; };
});

/* v6.5: Indicações — filtro por categoria (select + chips), busca e "com telefone"; estado na URL (?categoria=&q=). */
(() => {
  const grid = document.getElementById('ind-grid'); if (!grid) return;
  const cards = [...grid.querySelectorAll('.ind-card')], sel = document.getElementById('ind-cat'), search = document.getElementById('ind-search');
  const count = document.getElementById('ind-count'), empty = document.getElementById('ind-empty'), active = document.getElementById('ind-active');
  const groups = [...grid.querySelectorAll('.ind-group')];
  const chips = [...document.querySelectorAll('[data-ind-cat]')], segs = [...document.querySelectorAll('[data-ind-direct]')];
  const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const X = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const label = k => (sel.querySelector(`option[value="${CSS.escape(k)}"]`) || {}).textContent?.replace(/\s*\(\d+\)$/, '') || k;
  const P = new URLSearchParams(location.search);
  let cat = sel.querySelector(`option[value="${CSS.escape(P.get('categoria') || 'all')}"]`) ? (P.get('categoria') || 'all') : 'all';
  let direct = P.get('telefone') === '1' ? '1' : 'all';
  search.value = P.get('q') || '';
  const pager = amjtPager(grid, { noun: ['indicação', 'indicações'], label: 'Páginas das indicações', top: count, onChange: () => apply(false, true) });
  function apply(sync, keep) {
    if (keep !== true) pager.reset();   // mudou filtro/busca: volta para a página 1
    const q = norm(search.value.trim());
    const match = cards.filter(c => (cat === 'all' || c.dataset.cat === cat) && (direct === 'all' || c.dataset.direct === '1') && (!q || q.split(/\s+/).every(w => norm(c.dataset.q).includes(w))));
    const n = match.length, pg = pager.slice(n), page = new Set(match.slice(pg.from, pg.to));
    cards.forEach(c => { c.hidden = !page.has(c); });
    // Título do grupo aparece se o grupo tem card nesta página; o número é o total do grupo com os filtros.
    groups.forEach(h => { const k = h.dataset.group; h.hidden = !cards.some(c => c.dataset.cat === k && !c.hidden); h.querySelector('span').textContent = match.filter(c => c.dataset.cat === k).length; });
    sel.value = cat;
    chips.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.indCat === cat)));
    segs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.indDirect === direct)));
    count.textContent = n + (n === 1 ? ' indicação' : ' indicações') + pg.suffix;
    empty.hidden = n !== 0;
    const a = [];
    if (cat !== 'all') a.push(`<button type="button" class="chip" data-clear="cat">${esc(label(cat))} ${X}<span class="sr-only">remover filtro</span></button>`);
    if (q) a.push(`<button type="button" class="chip" data-clear="q">“${esc(search.value.trim())}” ${X}<span class="sr-only">remover busca</span></button>`);
    if (direct !== 'all') a.push(`<button type="button" class="chip" data-clear="direct">Com telefone ${X}<span class="sr-only">remover filtro</span></button>`);
    if (a.length > 1) a.push('<button type="button" class="clear" data-clear="all">Limpar filtros</button>');
    active.innerHTML = a.join(''); active.hidden = !a.length;
    if (sync) {
      const u = new URL(location.href);
      cat === 'all' ? u.searchParams.delete('categoria') : u.searchParams.set('categoria', cat);
      search.value.trim() ? u.searchParams.set('q', search.value.trim()) : u.searchParams.delete('q');
      direct === 'all' ? u.searchParams.delete('telefone') : u.searchParams.set('telefone', '1');
      history.replaceState(null, '', u);
    }
  }
  sel.addEventListener('change', () => { cat = sel.value; apply(true); });
  chips.forEach(b => b.addEventListener('click', () => { cat = cat === b.dataset.indCat ? 'all' : b.dataset.indCat; apply(true); }));
  segs.forEach(b => b.addEventListener('click', () => { direct = b.dataset.indDirect; apply(true); }));
  let t; search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => apply(true), 120); });
  active.addEventListener('click', e => {
    const b = e.target.closest('[data-clear]'); if (!b) return;
    const k = b.dataset.clear;
    if (k === 'cat' || k === 'all') cat = 'all';
    if (k === 'q' || k === 'all') search.value = '';
    if (k === 'direct' || k === 'all') direct = 'all';
    apply(true);
  });
  apply(false, true);
})();

/* v6.6: paginação compartilhada (Classificados e Indicações). 12 por página, ?pagina=N na URL,
   números com reticências no computador e "Página X de Y" no celular; rola de volta ao topo da lista. */
function amjtPager(list, o) {
  const per = o.per || 12, KEY = 'pagina';
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ARROW = d => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${d ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'}"/></svg>`;
  const nav = document.createElement('nav');
  nav.className = 'pager'; nav.setAttribute('aria-label', o.label || 'Paginação'); nav.hidden = true;
  list.insertAdjacentElement('afterend', nav);
  let page = Math.max(1, parseInt(new URLSearchParams(location.search).get(KEY), 10) || 1), pages = 1;
  function setUrl() {
    const u = new URL(location.href);
    page > 1 ? u.searchParams.set(KEY, page) : u.searchParams.delete(KEY);
    history.replaceState(null, '', u);
  }
  function nums() {   // 1 … 4 [5] 6 … 12
    const want = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages));
    if (page <= 3) [2, 3, 4].forEach(n => n <= pages && want.add(n));
    if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach(n => n >= 1 && want.add(n));
    const out = []; let last = 0;
    [...want].sort((a, b) => a - b).forEach(n => { if (n - last > 1) out.push(0); out.push(n); last = n; });
    return out;
  }
  function render(total, from, to) {
    nav.hidden = pages < 2;
    if (nav.hidden) { nav.innerHTML = ''; return; }
    const btn = (n, txt, cls, aria, dis) => `<button type="button" class="${cls}" data-page="${n}" aria-label="${aria}"${dis ? ' disabled' : ''}>${txt}</button>`;
    nav.innerHTML =
      `<p class="pager-info">Mostrando <b>${from + 1}–${to}</b> de <b>${total}</b> ${total === 1 ? o.noun[0] : o.noun[1]}</p>` +
      `<div class="pager-ctrl">` +
      btn(page - 1, `${ARROW(0)}<span>Anterior</span>`, 'pager-btn pager-prev', 'Página anterior', page === 1) +
      `<ol class="pager-pages">` + nums().map(n => n ? `<li><button type="button" class="pager-num" data-page="${n}"${n === page ? ' aria-current="page"' : ''} aria-label="Página ${n}">${n}</button></li>` : '<li class="pager-gap" aria-hidden="true">…</li>').join('') + `</ol>` +
      `<span class="pager-mob" aria-hidden="true">Página <b>${page}</b> de ${pages}</span>` +
      btn(page + 1, `<span>Próxima</span>${ARROW(1)}`, 'pager-btn pager-next', 'Próxima página', page === pages) +
      `</div>`;
  }
  nav.addEventListener('click', e => {
    const b = e.target.closest('[data-page]'); if (!b || b.disabled) return;
    const n = +b.dataset.page; if (n === page || n < 1 || n > pages) return;
    page = n; setUrl(); o.onChange();
    const top = o.top || list;
    top.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
    if (!top.hasAttribute('tabindex')) top.setAttribute('tabindex', '-1');
    top.focus({ preventScroll: true });
  });
  return {
    reset() { if (page !== 1) { page = 1; setUrl(); } },
    slice(total) {
      pages = Math.max(1, Math.ceil(total / per));
      if (total && page > pages) { page = pages; setUrl(); }   // lista vazia (ainda carregando): mantém a página pedida na URL
      if (page > pages) { render(0, 0, 0); return { from: 0, to: 0, suffix: '' }; }
      const from = (page - 1) * per, to = Math.min(total, from + per);
      render(total, from, to);
      return { from, to, suffix: pages > 1 ? ` · página ${page} de ${pages}` : '' };
    }
  };
}


/* v6.6: foto ampliada do carrossel dos posts com setas, swipe, teclado e contador; ao fechar, o carrossel fica na mesma foto. */
(() => {
  const pd = document.getElementById('photo-dialog'); if (!pd) return;
  const img = document.getElementById('photo-full'), cap = document.getElementById('photo-caption');
  const stage = document.createElement('div'); stage.className = 'pd-stage';
  img.parentNode.insertBefore(stage, img); stage.appendChild(img);
  stage.insertAdjacentHTML('beforeend', '<button type="button" class="pd-nav pd-prev" aria-label="Foto anterior">‹</button><button type="button" class="pd-nav pd-next" aria-label="Próxima foto">›</button><span class="pd-count" aria-live="polite"></span>');
  const prev = stage.querySelector('.pd-prev'), next = stage.querySelector('.pd-next'), count = stage.querySelector('.pd-count');
  let list = [], idx = 0, car = null;
  function show(i, dir) {
    idx = Math.max(0, Math.min(list.length - 1, i)); const b = list[idx];
    img.classList.remove('pd-in-l', 'pd-in-r'); void img.offsetWidth;
    img.src = b.dataset.photo; img.alt = (b.querySelector('img') || {}).alt || '';
    if (dir) img.classList.add(dir > 0 ? 'pd-in-r' : 'pd-in-l');
    cap.textContent = b.dataset.caption || '';
    count.textContent = (idx + 1) + ' / ' + list.length;
    prev.disabled = idx === 0; next.disabled = idx === list.length - 1;
    [list[idx + 1], list[idx - 1]].forEach(n => { if (n) (new Image()).src = n.dataset.photo; });
  }
  document.querySelectorAll('[data-carousel]').forEach(c => {
    const btns = [...c.querySelectorAll('.pc-open')];
    if (btns.length < 2) return;
    btns.forEach((b, i) => b.addEventListener('click', () => { list = btns; car = c; pd.classList.add('has-gallery'); show(i); }));
  });
  document.querySelectorAll('[data-photo]').forEach(b => { if (!b.closest('[data-carousel]')) b.addEventListener('click', () => { pd.classList.remove('has-gallery'); list = []; car = null; }); });
  prev.addEventListener('click', e => { e.stopPropagation(); show(idx - 1, -1); });
  next.addEventListener('click', e => { e.stopPropagation(); show(idx + 1, 1); });
  pd.addEventListener('keydown', e => {
    if (!list.length) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1, 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1, -1); }
  });
  let x0 = null, y0 = 0;
  stage.addEventListener('touchstart', e => { if (list.length) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? show(idx + 1, 1) : show(idx - 1, -1);
  });
  pd.addEventListener('close', () => { if (car && car.amjtGo) car.amjtGo(idx); });
})();
