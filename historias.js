/* Curtidas e comentários das Histórias do bairro (13/11/2026). Sem cadastro: o visitante é um ID aleatório no navegador.
   Fala com /api/historias (container amjt2-historias, ../historias/app.py). Anti-robô: o navegador resolve um desafio
   SHA-256 (prova de trabalho, formato ALTCHA) e ganha um passe de algumas horas para curtir e comentar.
   Lista (/historias): barra em cada card + janela de comentários. História (/post-*): barra no topo + seção #comentarios. */
(() => {
  const SITE = 'https://site.amjt2.com.br/';
  const API = /github\.io$/.test(location.hostname) ? SITE + 'api/historias' : (window.HIST_API || '/api/historias');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const bars = () => $$('[data-hs-bar]');
  if (!bars().length) return;

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  let VIS = ls.get('amjt2_hist_vis', '');
  if (!/^[A-Za-z0-9-]{16,64}$/.test(VIS)) {
    VIS = (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''));
    ls.set('amjt2_hist_vis', VIS);
  }

  async function call(path, body) {
    const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
    let r;
    try { r = await fetch(API + path, opt); } catch (e) { throw new Error('Sem conexão. Verifique a internet e tente de novo.'); }
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok || j.ok === false) { const er = new Error(j.erro || 'Não deu certo. Tente de novo.'); er.captcha = !!j.captcha; throw er; }
    return j;
  }

  /* ---------- anti-robô (prova de trabalho) ---------- */
  const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  async function resolve(d) {
    const enc = new TextEncoder();
    for (let n = 0; n <= d.maxnumber; n += 400) {
      const lote = [];
      for (let k = n; k < n + 400 && k <= d.maxnumber; k++) lote.push(crypto.subtle.digest('SHA-256', enc.encode(d.salt + k)).then(h => [k, h]));
      for (const [k, h] of await Promise.all(lote)) if (hex(h) === d.challenge) return k;
    }
    throw new Error('A verificação anti-robô falhou. Tente de novo.');
  }
  let passeEmCurso = null;
  async function passe(forcar) {
    const p = ls.get('amjt2_hist_passe', null);
    if (!forcar && p && p.vis === VIS && p.exp * 1000 > Date.now() + 60000) return p.passe;
    if (passeEmCurso) return passeEmCurso;
    capStatus('busy');
    passeEmCurso = (async () => {
      if (!(window.crypto && crypto.subtle)) throw new Error('Seu navegador não fez a verificação anti-robô. Atualize o navegador.');
      const d = await call('/desafio');
      const number = await resolve(d);
      const j = await call('/passe', { visitante: VIS, solucao: { challenge: d.challenge, salt: d.salt, signature: d.signature, number } });
      ls.set('amjt2_hist_passe', { vis: VIS, passe: j.passe, exp: j.expira });
      return j.passe;
    })();
    try { const r = await passeEmCurso; capStatus('ok'); return r; }
    catch (e) { capStatus('err'); throw e; }
    finally { passeEmCurso = null; }
  }
  async function comPasse(path, body) {
    try { return await call(path, { ...body, visitante: VIS, passe: await passe() }); }
    catch (e) { if (!e.captcha) throw e; return call(path, { ...body, visitante: VIS, passe: await passe(true) }); }
  }
  function capStatus(s) {
    $$('[data-hs-cap]').forEach(el => {
      el.dataset.state = s;
      el.querySelector('span').textContent = s === 'busy' ? 'Verificando que você não é um robô…' : s === 'ok' ? 'Verificado: você não é um robô' : s === 'err' ? 'Verificação falhou. Tente de novo.' : 'Proteção anti-robô';
    });
  }

  /* ---------- aviso rápido (com Desfazer) ---------- */
  let toastT;
  function toast(msg, acao, fn) {
    let t = $('#hs-toast');
    if (!t) { t = document.createElement('div'); t.id = 'hs-toast'; t.className = 'hs-toast'; t.setAttribute('role', 'status'); }
    const pai = document.querySelector('dialog[open]') || document.body;   // janela aberta fica por cima de tudo: o aviso vai dentro dela
    if (t.parentNode !== pai) pai.appendChild(t);
    t.innerHTML = '';
    const s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
    if (acao) { const b = document.createElement('button'); b.type = 'button'; b.textContent = acao; b.onclick = () => { t.classList.remove('show'); fn(); }; t.appendChild(b); }
    t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), acao ? 8000 : 4000);
  }

  /* ---------- contagens e barras ---------- */
  const estado = {};   // slug -> {curtidas, comentarios, curti}
  const st = slug => (estado[slug] = estado[slug] || { curtidas: 0, comentarios: 0, curti: false });
  function pinta(slug) {
    const s = st(slug);
    bars().filter(b => b.dataset.slug === slug).forEach(b => {
      const lk = $('.hs-like', b), cm = $('.hs-com', b);
      lk.setAttribute('aria-pressed', String(s.curti));
      $('b', lk).textContent = s.curtidas ? s.curtidas : '';
      $('.hs-lbl', lk).textContent = s.curti ? 'Curtiu' : 'Curtir';
      lk.setAttribute('aria-label', (s.curti ? 'Você curtiu. Toque para desfazer' : 'Curtir') + (s.curtidas ? ` (${s.curtidas} curtida${s.curtidas > 1 ? 's' : ''})` : ''));
      $('b', cm).textContent = s.comentarios ? s.comentarios : '';
      cm.setAttribute('aria-label', s.comentarios ? `${s.comentarios} comentário${s.comentarios > 1 ? 's' : ''}. Comentar` : 'Comentar');
    });
  }
  async function carregaContagens() {
    try {
      const j = await call('/contagens?v=' + encodeURIComponent(VIS));
      Object.entries(j.contagens).forEach(([k, v]) => Object.assign(st(k), v));
      j.minhas.forEach(k => { st(k).curti = true; });
      document.documentElement.classList.add('hs-on');
      bars().forEach(b => pinta(b.dataset.slug));
    } catch (e) { /* API fora do ar: as barras ficam escondidas (CSS só mostra com .hs-on) */ }
  }

  const ocupado = new Set();
  async function curtir(slug) {
    if (ocupado.has(slug)) return;
    ocupado.add(slug);
    const s = st(slug), antes = { ...s };
    s.curti = !s.curti; s.curtidas = Math.max(0, s.curtidas + (s.curti ? 1 : -1)); pinta(slug);
    try {
      const j = await comPasse('/curtir', { slug, curtir: s.curti });
      s.curti = j.curti; s.curtidas = j.curtidas; pinta(slug);
      if (!j.curti) toast('Curtida desfeita.');
    } catch (e) { Object.assign(s, antes); pinta(slug); toast(e.message); }
    finally { ocupado.delete(slug); }
  }

  /* ---------- painel de comentários (janela na lista, seção na história) ---------- */
  const quando = iso => {
    const d = new Date(iso), s = (Date.now() - d) / 1000;
    if (s < 60) return 'agora';
    if (s < 3600) return `há ${Math.floor(s / 60)} min`;
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    if (s < 7 * 86400) { const n = Math.floor(s / 86400); return `há ${n} dia${n > 1 ? 's' : ''}`; }
    return d.toLocaleDateString('pt-BR');
  };
  function itemCom(c) {
    const li = document.createElement('li');
    li.className = 'hs-c' + (c.meu ? ' meu' : ''); li.dataset.id = c.id;
    const h = document.createElement('div'); h.className = 'hs-c-head';
    const n = document.createElement('b'); n.textContent = c.nome;
    const t = document.createElement('time'); t.dateTime = c.criado; t.textContent = quando(c.criado);
    h.append(n, t);
    if (c.meu) { const a = document.createElement('button'); a.type = 'button'; a.className = 'hs-del'; a.dataset.del = c.id; a.textContent = 'Apagar'; h.appendChild(a); }
    const p = document.createElement('p'); p.textContent = c.texto;
    li.append(h, p);
    return li;
  }
  function form(slug) {
    const f = document.createElement('form');
    f.className = 'hs-form'; f.noValidate = true;
    f.innerHTML = `<label class="hs-txt"><span>Seu comentário</span><textarea name="texto" rows="3" maxlength="500" placeholder="Escreva algo sobre esta história…" required></textarea></label>
<div class="hs-row"><label class="hs-nome"><span>Seu nome <small>(opcional)</small></span><input name="nome" maxlength="40" autocomplete="given-name" placeholder="Vizinho(a)"></label>
<button class="btn btn-sun hs-send" type="submit">Comentar</button></div>
<label class="hs-hp" aria-hidden="true">Site <input name="website" tabindex="-1" autocomplete="off"></label>
<p class="hs-cap" data-hs-cap data-state="idle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg><span>Proteção anti-robô</span><em class="hs-count">0/500</em></p>
<p class="hs-msg" role="alert" hidden></p>`;
    f.nome.value = ls.get('amjt2_hist_nome', '');
    const pv = ls.get('amjt2_hist_passe', null);
    if (pv && pv.vis === VIS && pv.exp * 1000 > Date.now() + 60000) setTimeout(() => capStatus('ok'));
    const msg = $('.hs-msg', f), cnt = $('.hs-count', f);
    f.texto.addEventListener('input', () => { cnt.textContent = `${f.texto.value.length}/500`; });
    f.texto.addEventListener('focus', () => { passe().catch(() => {}); }, { once: true });   // já resolve o desafio enquanto a pessoa escreve
    f.addEventListener('submit', async e => {
      e.preventDefault();
      msg.hidden = true;
      const texto = f.texto.value.trim();
      if (texto.length < 2) { msg.textContent = 'Escreva o comentário.'; msg.hidden = false; f.texto.focus(); return; }
      const bt = $('.hs-send', f); bt.disabled = true; bt.textContent = 'Enviando…';
      try {
        ls.set('amjt2_hist_nome', f.nome.value.trim());
        const j = await comPasse('/comentar', { slug, nome: f.nome.value, texto, website: f.website.value });
        if (j.comentario) {
          st(slug).comentarios = j.comentarios; pinta(slug);
          $$(`[data-hs-panel][data-slug="${slug}"] .hs-list`).forEach(ul => { ul.prepend(itemCom(j.comentario)); vazio(ul); });
          f.texto.value = ''; cnt.textContent = '0/500';
          const id = j.comentario.id;
          toast('Comentário publicado.', 'Desfazer', () => apagar(slug, id, true));
        }
      } catch (er) { msg.textContent = er.message; msg.hidden = false; }
      finally { bt.disabled = false; bt.textContent = 'Comentar'; }
    });
    return f;
  }
  function vazio(ul) {
    const e = ul.parentNode.querySelector('.hs-empty');
    if (e) e.hidden = !!ul.children.length;
  }
  async function abrePainel(box, slug) {
    box.dataset.slug = slug;
    const corpo = $('[data-hs-body]', box);
    corpo.innerHTML = '<p class="hs-loading">Carregando comentários…</p>';
    try {
      const j = await call('/h/' + encodeURIComponent(slug) + '?v=' + encodeURIComponent(VIS));
      Object.assign(st(slug), { curtidas: j.curtidas, comentarios: j.comentarios.length, curti: j.curti }); pinta(slug);
      corpo.innerHTML = '';
      const ul = document.createElement('ul'); ul.className = 'hs-list';
      j.comentarios.forEach(c => ul.appendChild(itemCom(c)));
      const vz = document.createElement('p'); vz.className = 'hs-empty'; vz.textContent = 'Ninguém comentou ainda. Seja o primeiro!';
      corpo.append(form(slug), vz, ul); vazio(ul);
    } catch (e) {
      corpo.innerHTML = '';
      const p = document.createElement('p'); p.className = 'hs-msg'; p.textContent = e.message; corpo.appendChild(p);
    }
  }
  async function apagar(slug, id, desfazer) {
    if (!desfazer && !confirm('Apagar seu comentário?')) return;
    try {
      const j = await call('/apagar', { id, visitante: VIS });
      st(slug).comentarios = j.comentarios; pinta(slug);
      $$(`.hs-c[data-id="${id}"]`).forEach(li => { const ul = li.parentNode; li.remove(); vazio(ul); });
      toast(desfazer ? 'Comentário desfeito.' : 'Comentário apagado.');
    } catch (e) { toast(e.message); }
  }

  /* ---------- janela da lista ---------- */
  const dlg = $('#hs-dialog');
  function abreJanela(slug, titulo) {
    if (!dlg) return;
    $('[data-hs-title]', dlg).textContent = titulo;
    const lnk = $('[data-hs-link]', dlg); lnk.href = 'post-' + slug;
    const bar = $('[data-hs-bar]', dlg); bar.dataset.slug = slug; pinta(slug);
    abrePainel($('[data-hs-panel]', dlg), slug);
    if (!dlg.open) dlg.showModal();
  }
  if (dlg) {
    $('.hs-close', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- cliques ---------- */
  document.addEventListener('click', e => {
    const lk = e.target.closest('.hs-like');
    if (lk) { e.preventDefault(); curtir(lk.closest('[data-hs-bar]').dataset.slug); return; }
    const cm = e.target.closest('.hs-com');
    if (cm) {
      const bar = cm.closest('[data-hs-bar]'), slug = bar.dataset.slug;
      const sec = $(`#comentarios[data-slug="${slug}"]`);
      if (sec) { e.preventDefault(); sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => { const t = $('textarea', sec); if (t) t.focus({ preventScroll: true }); }, 500); return; }
      if (dlg && !bar.closest('#hs-dialog')) { e.preventDefault(); abreJanela(slug, bar.dataset.title || ''); return; }
      if (bar.closest('#hs-dialog')) { e.preventDefault(); const t = $('#hs-dialog textarea'); if (t) t.focus(); }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) { const box = del.closest('[data-hs-panel]'); apagar(box.dataset.slug, +del.dataset.del, false); }
  });

  carregaContagens();
  $$('section[data-hs-panel]').forEach(sec => abrePainel(sec, sec.dataset.slug));
})();
