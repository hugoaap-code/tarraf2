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

/* v6.1: Classificados — lista aprovada vinda do Apps Script, filtros por tipo/categoria/busca. */
(() => {
  const grid = document.getElementById('ad-grid');
  if (!grid) return;
  const CATS = window.AMJT_CATS || {};
  const count = document.getElementById('ad-count'), empty = document.getElementById('ad-empty'), search = document.getElementById('ad-search');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const WA = window.AMJT_WA || '';
  let ads = [], type = 'all', cat = 'all';
  const params = new URLSearchParams(location.search);
  if (CATS[params.get('categoria')]) cat = params.get('categoria');
  function linkOf(l) {
    l = String(l || '').trim(); if (!l) return '';
    if (l.startsWith('@')) return 'https://instagram.com/' + l.slice(1);
    return /^https?:\/\//.test(l) ? l : 'https://' + l;
  }
  function card(a) {
    const wa = a.whatsapp ? `<a class="btn btn-wa" href="https://wa.me/${esc(a.whatsapp)}?text=${encodeURIComponent('Olá! Vi seu anúncio "' + a.titulo + '" nos Classificados do Tarraf II.')}" target="_blank" rel="noopener">${WA} WhatsApp</a>` : '';
    const ln = linkOf(a.link) ? `<a class="link" href="${esc(linkOf(a.link))}" target="_blank" rel="noopener nofollow">Ver perfil ↗</a>` : '';
    return `<article class="ad-card"><div class="ad-tags"><span class="ad-tag ${esc(a.tipo)}">${a.tipo === 'servico' ? 'Serviço' : 'Produto'}</span><span class="ad-tag">${esc(CATS[a.categoria] || 'Outros')}</span></div><h3>${esc(a.titulo)}</h3><p>${esc(a.descricao)}</p>${a.preco ? `<p class="ad-price">${esc(a.preco)}</p>` : ''}<p class="ad-who">Anunciado por ${esc(a.nome)}</p><div class="ad-actions">${wa}${ln}</div></article>`;
  }
  function apply() {
    const q = norm(search.value.trim());
    document.querySelectorAll('[data-ad-type]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.adType === type)));
    document.querySelectorAll('[data-ad-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.adFilter === cat)));
    const list = ads.filter(a => (type === 'all' || a.tipo === type) && (cat === 'all' || a.categoria === cat) && (!q || norm(a.titulo + ' ' + a.descricao + ' ' + (CATS[a.categoria] || '')).includes(q)));
    grid.innerHTML = list.map(card).join('');
    count.textContent = list.length + (list.length === 1 ? ' anúncio' : ' anúncios');
    empty.hidden = list.length !== 0;
  }
  document.querySelectorAll('[data-ad-type]').forEach(b => b.addEventListener('click', () => { type = b.dataset.adType; apply(); }));
  document.querySelectorAll('[data-ad-filter]').forEach(b => b.addEventListener('click', () => {
    cat = b.dataset.adFilter; const u = new URL(location.href);
    if (cat === 'all') u.searchParams.delete('categoria'); else u.searchParams.set('categoria', cat);
    history.replaceState(null, '', u); apply();
  }));
  search.addEventListener('input', apply);
  fetch(window.AMJT_ENDPOINT + '?lista=classificados').then(r => r.json()).then(r => { ads = (r && r.anuncios) || []; apply(); })
    .catch(() => { count.textContent = 'Não foi possível carregar os anúncios agora.'; empty.hidden = false; });
  document.querySelectorAll('[data-form-again]').forEach(b => b.addEventListener('click', () => {
    const panel = b.closest('[data-success]'), form = panel.parentElement.querySelector('form[data-form]');
    form.reset(); form.classList.remove('was-validated'); form.querySelector('[type=submit]').disabled = false;
    form.querySelector('.form-status').textContent = ''; panel.hidden = true; form.hidden = false; form.scrollIntoView({ behavior: 'smooth' });
  }));
})();
