/* Mural do bairro (AMJT II, 14/11/2026): Achados e perdidos (/achados), "Conte uma história" (/historias#contar)
   e Denúncia anônima (/contato#denuncia). Fala com a API /api/mural (container amjt2-mural). Sem cadastro. */
(() => {
  const SITE = 'https://site.amjt2.com.br/';
  const API = /github\.io$/.test(location.hostname) ? SITE + 'api/mural' : (window.MURAL_API || '/api/mural');
  const ROOT = API.replace(/api\/mural$/, '');
  const ASSOC_WA = '5517991154582';
  const TOKEN = new URLSearchParams(location.search).get('aviso');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = p => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    pin: svg('<path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11Z"/><circle cx="12" cy="10" r="2.2"/>'),
    cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
  };
  const WA = '<svg class="wa" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';
  const SIT = { perdido: 'Perdido', encontrado: 'Encontrado' };
  const ddmm = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}` : ''; };
  const digits = s => String(s || '').replace(/\D/g, '');
  const fone = s => { const d = digits(s).replace(/^55(?=\d{10,11}$)/, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : s; };
  const waNum = s => { const d = digits(s); return d.length >= 12 ? d : '55' + d; };

  async function api(path, body) {
    const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
    let r, j;
    try { r = await fetch(API + path, opt); } catch (e) { throw new Error('Sem conexão. Verifique a internet e tente de novo.'); }
    try { j = await r.json(); } catch (e) { throw new Error('Servidor indisponível agora. Tente de novo em instantes.'); }
    if (!j.ok) { const er = new Error(j.erro || 'Algo deu errado.'); er.status = r.status; throw er; }
    return j;
  }

  /* ---------------- fotos (reduz no celular antes de enviar: 1600 px, JPG) ---------------- */
  function shrink(item) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.86));
      };
      im.onerror = () => rej(new Error(`Não consegui ler a foto "${item.f.name}". Tente outra (JPG ou PNG).`));
      im.src = item.url;
    });
  }
  function picker(form) {
    const input = $('[data-mu-files]', form), prevs = $('[data-mu-previews]', form);
    const st = { files: [] };
    if (!input) return st;
    const MAX = +input.dataset.max || 4, lbl = $('.mu-drop b', form);
    const draw = () => {
      prevs.innerHTML = st.files.map((f, k) => `<div class="mu-prev"><img src="${f.url}" alt="Foto ${k + 1} escolhida"><button type="button" data-rm="${k}" aria-label="Remover foto ${k + 1}">×</button></div>`).join('');
      lbl.textContent = st.files.length ? (st.files.length < MAX ? `Adicionar mais fotos (${st.files.length} de ${MAX})` : `Máximo de ${MAX} fotos`) : 'Escolher fotos';
    };
    input.addEventListener('change', () => {
      let sobra = 0;
      for (const f of input.files) { if (!(/^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name))) continue; if (st.files.length >= MAX) { sobra++; continue; } st.files.push({ f, url: URL.createObjectURL(f) }); }
      const s = $('.form-status', form); s.className = 'form-status' + (sobra ? ' err' : ''); s.textContent = sobra ? `Cabem até ${MAX} fotos; ${sobra} ficaram de fora.` : '';
      input.value = ''; draw();
    });
    prevs.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; const [r] = st.files.splice(+b.dataset.rm, 1); URL.revokeObjectURL(r.url); draw(); });
    st.reset = () => { st.files.forEach(f => URL.revokeObjectURL(f.url)); st.files = []; draw(); };
    st.encode = async () => { const out = []; for (const f of st.files) out.push(await shrink(f)); return out; };
    return st;
  }

  /* ---------------- formulários (achados / historia / denuncia) ---------------- */
  $$('[data-mu-form]').forEach(form => {
    const kind = form.dataset.muForm, ok = form.nextElementSibling, ph = picker(form);
    const today = $('[data-mu-today]', form);
    const setToday = () => { if (today) { const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); today.value = d; today.max = d; } };
    setToday();
    const tip = $('[data-mu-tip]', form);
    const syncTip = () => { if (tip) tip.hidden = !(form.elements.tipo && form.elements.tipo.value === 'objeto'); };
    form.addEventListener('change', syncTip); syncTip();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const st = $('.form-status', form), btn = $('[type=submit]', form);
      form.classList.add('was-validated');
      if (!form.checkValidity()) {
        st.className = 'form-status err'; st.textContent = 'Confira os campos destacados.';
        const bad = form.querySelector(':invalid'); if (bad) bad.focus();
        return;
      }
      btn.disabled = true; st.className = 'form-status wait'; st.textContent = ph.files.length ? 'Preparando as fotos…' : 'Enviando…';
      try {
        const fotos = ph.encode ? await ph.encode() : [];
        st.textContent = 'Enviando…';
        const fd = new FormData(form), body = { fotos };
        for (const [k, v] of fd.entries()) if (typeof v === 'string') body[k] = v;
        const path = kind === 'achados' ? '/achados' : '/' + kind;
        const j = await api(path, body);
        $('[data-mu-proto]', ok).textContent = j.protocolo;
        if (kind === 'achados' && j.link) {
          guarda(j.id, j.link);
          const t = `${body.situacao === 'perdido' ? '😟 Perdido' : '🙌 Encontrado'}: ${body.titulo} (${body.local}). Viu ou sabe de quem é? ${j.compartilhar}`;
          $('[data-mu-share-wa]', ok).href = 'https://wa.me/?text=' + encodeURIComponent(t);
          $('[data-mu-link]', ok).textContent = j.link;
          $('[data-mu-self-wa]', ok).href = 'https://wa.me/?text=' + encodeURIComponent(`Meu link para marcar como resolvido o aviso ${j.protocolo} (Achados e perdidos do Tarraf II): ${j.link}`);
          load();
        }
        form.hidden = true; ok.hidden = false; ok.scrollIntoView({ behavior: 'smooth', block: 'start' }); ok.focus({ preventScroll: true });
        ph.reset && ph.reset(); form.reset(); setToday(); syncTip(); form.classList.remove('was-validated');
        st.textContent = ''; st.className = 'form-status';
      } catch (er) { st.className = 'form-status err'; st.textContent = er.message; }
      btn.disabled = false;
    });
    const again = $('[data-mu-again]', ok);
    if (again) again.addEventListener('click', () => { ok.hidden = true; form.hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const copy = $('[data-mu-copy]', ok);
    if (copy) copy.addEventListener('click', async () => {
      const code = $('[data-mu-link]', ok), l = $('span', copy);
      try { await navigator.clipboard.writeText(code.textContent); l.textContent = 'Copiado!'; }
      catch (x) { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); l.textContent = 'Selecionado'; }
      setTimeout(() => { l.textContent = 'Copiar'; }, 2500);
    });
  });

  function guarda(id, link) { try { const m = JSON.parse(localStorage.getItem('amjt2_mural_avisos') || '{}'); m[id] = link; localStorage.setItem('amjt2_mural_avisos', JSON.stringify(m)); } catch (e) {} }
  function meus() { try { return JSON.parse(localStorage.getItem('amjt2_mural_avisos') || '{}'); } catch (e) { return {}; } }

  /* ---------------- lista de Achados e perdidos ---------------- */
  const grid = $('#mu-grid');
  const S = { itens: [], tipo: 'all', sit: 'all', q: '', alvo: +new URLSearchParams(location.search).get('d') || 0 };
  function card(x) {
    const f = x.fotos[0], sit = x.resolvido ? 'resolvido' : x.situacao;
    const badge = x.resolvido ? 'Resolvido 🎉' : SIT[x.situacao];
    const emoji = x.tipo === 'pet' ? '🐾' : '🔑';
    const media = f ? `<button type="button" class="mu-media" data-full="${esc(ROOT + f.full)}" aria-label="Ver foto de ${esc(x.titulo)}"><img src="${esc(ROOT + f.thumb)}" alt="${esc(x.titulo)}" loading="lazy" decoding="async"></button>`
      : `<div class="mu-media mu-noimg" aria-hidden="true"><span>${emoji}</span></div>`;
    const mais = x.fotos.length > 1 ? `<div class="mu-thumbs">${x.fotos.map((p, k) => `<button type="button" data-full="${esc(ROOT + p.full)}" data-thumb="${esc(ROOT + p.thumb)}" aria-label="Foto ${k + 1}"${k ? '' : ' aria-current="true"'}><img src="${esc(ROOT + p.thumb)}" alt="" loading="lazy"></button>`).join('')}</div>` : '';
    const quando = x.quando ? `${x.situacao === 'perdido' ? 'Perdido' : 'Encontrado'} em ${ddmm(x.quando)}` : `Publicado em ${ddmm(x.criado)}`;
    const msg = x.situacao === 'perdido' ? `Olá! Vi no site da associação o aviso "${x.titulo}" (Achados e perdidos). Acho que posso ajudar.`
      : `Olá! Vi no site da associação que você encontrou: "${x.titulo}". Acho que é meu.`;
    const nota = x.resolvido ? `<p class="mu-note">🎉 ${esc(x.nota || 'Final feliz! Obrigado, vizinhos.')}</p>` : '';
    const acoes = x.resolvido ? '' : `<div class="mu-actions"><a class="btn btn-wa" href="https://wa.me/${waNum(x.celular)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${WA} Falar com ${esc(x.nome)}</a><button type="button" class="mu-sharebtn" data-share="${x.id}" aria-label="Compartilhar aviso">${IC.share}<span>Compartilhar</span></button></div>`;
    const meu = !x.resolvido && !TOKEN && meus()[x.id] ? `<a class="link mu-mine" href="${esc(meus()[x.id])}">Seu aviso: marcar como resolvido</a>` : '';
    return `<article class="mu-card ${sit}" id="aviso-${x.id}" data-sit="${sit}">
${media}<span class="mu-badge ${sit}">${badge}</span>
<div class="mu-body">${mais}<p class="mu-tags"><span class="mu-tag">${emoji} ${x.tipo === 'pet' ? 'Pet' : 'Objeto'}</span></p>
<h3>${esc(x.titulo)}</h3>
<ul class="mu-meta"><li>${IC.pin}<span>${esc(x.local)}</span></li><li>${IC.cal}<span>${quando}</span></li></ul>
${x.descricao ? `<p class="mu-desc">${esc(x.descricao)}</p>` : ''}${nota}${acoes}${meu}</div></article>`;
  }
  function filtra() {
    const q = S.q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return S.itens.filter(x => (S.tipo === 'all' || x.tipo === S.tipo)
      && (S.sit === 'all' || (S.sit === 'resolvido' ? x.resolvido : (!x.resolvido && x.situacao === S.sit)))
      && (!q || [x.titulo, x.descricao, x.local].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q)))
      .sort((a, b) => (a.resolvido - b.resolvido) || (b.id - a.id));
  }
  function draw() {
    const xs = filtra(), n = xs.length, abertos = xs.filter(x => !x.resolvido).length;
    grid.innerHTML = xs.map(card).join('');
    $('#mu-empty').hidden = n > 0;
    $('#mu-count').textContent = !n ? 'Nenhum aviso.' : S.sit === 'resolvido' ? `${n} ${n === 1 ? 'final feliz' : 'finais felizes'}` : `${abertos} ${abertos === 1 ? 'aviso aberto' : 'avisos abertos'}` + (n > abertos ? ` · ${n - abertos} resolvido${n - abertos > 1 ? 's' : ''}` : '');
    if (S.alvo) {
      const el = $('#aviso-' + S.alvo);
      if (el) { el.classList.add('hl'); setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200); }
      S.alvo = 0;
    }
  }
  async function load() {
    if (!grid) return;
    try { const j = await api('/achados'); S.itens = j.achados; draw(); }
    catch (e) { $('#mu-count').textContent = 'Não deu para carregar os avisos agora. ' + e.message; }
  }
  if (grid) {
    const sp = new URLSearchParams(location.search);
    if (['pet', 'objeto'].includes(sp.get('tipo'))) S.tipo = sp.get('tipo');
    if (['perdido', 'encontrado', 'resolvido'].includes(sp.get('sit'))) S.sit = sp.get('sit');
    const sync = () => {
      $$('[data-mu-tipo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.muTipo === S.tipo)));
      $$('[data-mu-sit]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.muSit === S.sit)));
      const u = new URL(location.href); ['tipo', 'sit'].forEach(k => { const v = S[k]; if (v === 'all') u.searchParams.delete(k); else u.searchParams.set(k, v); }); u.searchParams.delete('d');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    };
    $$('[data-mu-tipo]').forEach(b => b.addEventListener('click', () => { S.tipo = b.dataset.muTipo; sync(); draw(); }));
    $$('[data-mu-sit]').forEach(b => b.addEventListener('click', () => { S.sit = b.dataset.muSit; sync(); draw(); }));
    $('#mu-search').addEventListener('input', e => { S.q = e.target.value.trim(); draw(); });
    $$('[data-mu-tipo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.muTipo === S.tipo)));
    $$('[data-mu-sit]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.muSit === S.sit)));
    const dlg = $('#mu-dlg');
    grid.addEventListener('click', async e => {
      const th = e.target.closest('.mu-thumbs [data-full]');
      if (th) {
        const c = th.closest('.mu-card'), m = $('.mu-media', c);
        $('img', m).src = th.dataset.thumb; m.dataset.full = th.dataset.full;
        $$('.mu-thumbs button', c).forEach(b => b.removeAttribute('aria-current')); th.setAttribute('aria-current', 'true');
        return;
      }
      const md = e.target.closest('.mu-media[data-full]');
      if (md && dlg) { $('img', dlg).src = md.dataset.full; $('img', dlg).alt = $('img', md).alt; dlg.showModal(); return; }
      const sh = e.target.closest('[data-share]');
      if (sh) {
        const x = S.itens.find(y => y.id === +sh.dataset.share); if (!x) return;
        const url = SITE + 'achados/' + x.id, text = `${x.situacao === 'perdido' ? '😟 Perdido' : '🙌 Encontrado'}: ${x.titulo} (${x.local}). Viu ou sabe de quem é?`;
        try {
          if (navigator.share) { await navigator.share({ title: x.titulo, text, url }); return; }
          await navigator.clipboard.writeText(text + ' ' + url); $('span', sh).textContent = 'Link copiado!';
          setTimeout(() => { $('span', sh).textContent = 'Compartilhar'; }, 2500);
        } catch (er) { if (er && er.name !== 'AbortError') $('span', sh).textContent = 'Copie: ' + url; }
      }
    });
    if (dlg) {
      $('.dialog-close', dlg).addEventListener('click', () => dlg.close());
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    }
    load();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
  }

  /* ---------------- marcar como resolvido (?aviso=<token>) ---------------- */
  const box = $('[data-mu-resolver]');
  if (box && TOKEN) {
    box.hidden = false;
    const st = $('.form-status', box), go = $('[data-mu-res-go]', box), reopen = $('[data-mu-res-reopen]', box), nota = $('input[name=nota]', box);
    const show = x => {
      $('[data-mu-res-card]', box).innerHTML = `<div class="mu-grid mu-one">${card(x)}</div>`;
      $('[data-mu-res-title]', box).textContent = x.resolvido ? 'Aviso resolvido 🎉' : 'Seu aviso está no ar';
      $('[data-mu-res-sub]', box).textContent = x.resolvido ? 'Que bom! Ele aparece em Finais felizes por 30 dias. Errou? Dá para reabrir.' : 'Encontrou o dono ou o seu pet voltou? Marque como resolvido.';
      go.hidden = x.resolvido; $('[data-mu-res-nota]', box).hidden = x.resolvido; reopen.hidden = !x.resolvido;
    };
    const act = async reabrir => {
      go.disabled = reopen.disabled = true; st.className = 'form-status wait'; st.textContent = 'Salvando…';
      try { const j = await api('/resolver', { t: TOKEN, nota: nota.value, reabrir }); show(j.achado); st.className = 'form-status'; st.textContent = reabrir ? 'Aviso reaberto.' : 'Pronto! Obrigado por avisar.'; load(); }
      catch (e) { st.className = 'form-status err'; st.textContent = e.message; }
      go.disabled = reopen.disabled = false;
    };
    go.addEventListener('click', () => act(false));
    reopen.addEventListener('click', () => act(true));
    api('/aviso?t=' + encodeURIComponent(TOKEN)).then(j => { show(j.achado); guarda(j.achado.id, location.href); })
      .catch(e => { $('[data-mu-res-title]', box).textContent = 'Não deu para abrir o aviso'; $('[data-mu-res-sub]', box).innerHTML = esc(e.message) + ` <a class="link" href="https://wa.me/${ASSOC_WA}" target="_blank" rel="noopener">Falar com a associação</a>`; go.hidden = true; $('[data-mu-res-nota]', box).hidden = true; });
    setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
  }
  /* barra fixa "Quero me associar" some sobre os formulários do mural (como no formulário de anúncio) */
  const mcta = document.getElementById('mcta');
  if (mcta && 'IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)); mcta.classList.toggle('mu-off', seen.size > 0); }, { threshold: 0.05 });
    $$('#contar, #denuncia, #publicar, #resolver').forEach(el => io.observe(el));
  }
})();
