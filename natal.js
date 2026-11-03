/* É Natal no Tarraf II: galeria, ranking por categoria, votos (3 por dia em cada categoria, em decorações diferentes), comentários, inscrição e painel.
   Fala com a API /api/natal (container amjt2-natal). Sem cadastro: o visitante é um ID aleatório no navegador. */
(() => {
  const SITE = 'https://site.amjt2.com.br/';
  const API = /github\.io$/.test(location.hostname) ? SITE + 'api/natal' : (window.NATAL_API || '/api/natal');
  const ROOT = API.replace(/api\/natal$/, '');
  const src = p => ROOT + p;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = p => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    heart: svg('<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.5 1.1 4.2 2.3h2c.7-1.2 2.1-2.3 4.2-2.3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z"/>'),
    chat: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/>'),
    camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    pin: svg('<path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11Z"/><circle cx="12" cy="10" r="2.2"/>'),
    check: svg('<path d="m5 12 4.5 4.5L19 7"/>'),
    x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  };
  const ddmm = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}`; };
  const quando = iso => { try { const t = new Date(iso); return t.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const CATS = window.NATAL_CATS || {};
  const MEDAL = { 1: '🥇 ', 2: '🥈 ', 3: '🥉 ' };
  const catNome = k => (CATS[k] || {}).nome || '';
  const catTag = k => CATS[k] ? `${CATS[k].emoji} ${CATS[k].nome}` : '';
  const nomeDe = x => x.titulo || (x.categoria === 'fantasia' ? `Fantasia de ${x.nome}` : `Decoração de ${x.nome}`);

  async function api(path, body, headers = {}) {
    const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) } : { headers };
    let r, j;
    try { r = await fetch(API + path, opt); } catch (e) { throw new Error('Sem conexão. Verifique a internet e tente de novo.'); }
    try { j = await r.json(); } catch (e) { throw new Error('Servidor indisponível agora. Tente de novo em instantes.'); }
    if (!j.ok) { const er = new Error(j.erro || 'Algo deu errado.'); er.data = j; er.status = r.status; throw er; }
    return j;
  }

  /* ---------------- visitante (sem cadastro) ---------------- */
  const VK = 'amjt2_natal_vis';
  let VIS = '';
  try { VIS = localStorage.getItem(VK) || ''; } catch (e) {}
  if (!/^[A-Za-z0-9-]{16,64}$/.test(VIS)) {
    VIS = ((crypto.randomUUID && crypto.randomUUID()) || (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2))).replace(/[^A-Za-z0-9-]/g, '');
    try { localStorage.setItem(VK, VIS); } catch (e) {}
  }

  /* links de edição das inscrições feitas neste navegador {id: link} (sem cadastro: quem tem o link edita) */
  const EK = 'amjt2_natal_edit';
  const meusLinks = () => { try { return JSON.parse(localStorage.getItem(EK) || '{}') || {}; } catch (e) { return {}; } };
  const guardaLink = (id, link) => { try { const m = meusLinks(); m[id] = link; localStorage.setItem(EK, JSON.stringify(m)); } catch (e) {} };

  /* ================= PÁGINA PÚBLICA ================= */
  const grid = $('#nt-grid');
  if (grid) {
    const S = { itens: [], fase: null, meu: {}, sort: 'votos', cat: 'all', q: '', aberto: null, foto: 0 };
    const info = $('#nt-vote-info'), empty = $('#nt-empty'), status = $('[data-nt-status]');

    /* posição dentro da própria categoria, só pelos votos. Mesmo número de votos = mesma posição (empate);
       a posição seguinte pula os empatados (1º, 1º, 3º). Sem votos = sem posição. */
    const rankOf = () => {
      const m = {};
      S.itens.forEach(x => {
        const mesma = S.itens.filter(y => y.categoria === x.categoria);
        m[x.id] = { pos: 1 + mesma.filter(y => y.votos > x.votos).length, empate: mesma.filter(y => y.votos === x.votos).length > 1 };
      });
      return m;
    };
    const lugar = rk => `${MEDAL[rk.pos] || ''}${rk.empate ? 'Empatado em ' : ''}${rk.pos}º lugar`;
    const sorted = () => {
      const q = S.q.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let r = S.itens.filter(x => (S.cat === 'all' || x.categoria === S.cat) && (!q || (x.nome + ' ' + x.rua + ' ' + x.titulo).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)));
      const by = { votos: (a, b) => b.votos - a.votos || b.comentarios - a.comentarios || a.id - b.id,
                   comentarios: (a, b) => b.comentarios - a.comentarios || b.votos - a.votos || a.id - b.id,
                   recentes: (a, b) => b.id - a.id }[S.sort];
      return r.sort(by);
    };

    /* votos de hoje: S.meu = {categoria: [ids]}; até porCat() por categoria, em decorações diferentes */
    const meusDe = cat => { const v = (S.meu || {})[cat]; return Array.isArray(v) ? v : (v ? [v] : []); };
    const porCat = () => (S.fase && S.fase.votos_por_categoria) || 3;
    const votoPal = n => n === 1 ? 'voto' : 'votos';
    const restam = cat => Math.max(0, porCat() - meusDe(cat).length);
    function voteLabel(x, compacto) {   // compacto = botão do card (pouco espaço): só um × no canto
      const f = S.fase || {};
      const meu = meusDe(x.categoria);
      if (meu.includes(x.id)) {   // já votou aqui hoje: clicar de novo tira o voto (e devolve o voto para usar na categoria)
        if (!f.votacao_aberta) return { t: `${IC.check} Seu voto`, dis: true, cls: 'nt-voted' };
        return { t: compacto ? `${IC.check} Seu voto<span class="nt-undo-dot" aria-hidden="true">${IC.x}</span>` : `${IC.check} Seu voto<span class="nt-undo">${IC.x}tirar</span>`, dis: false, cls: 'nt-voted', undo: true,
                 tip: 'Seu voto. Toque para tirar o voto' };
      }
      if (f.encerrado) return { t: 'Votação encerrada', dis: true };
      if (!f.votacao_aberta) return { t: `Votação abre ${ddmm(f.votacao_de)}`, dis: true };
      if (meu.length >= porCat()) return { t: 'Volte amanhã', dis: true };
      return { t: `${IC.heart} Votar`, dis: false };
    }

    function setInfo() {
      const f = S.fase || {};
      const cats = Object.keys(CATS), tot = (cats.length || 5) * porCat();
      const nv = cats.reduce((s, k) => s + meusDe(k).length, 0);
      if (f.votacao_aberta && nv) info.innerHTML = nv >= tot ? `Você já usou seus <b>${tot} votos</b> de hoje. Amanhã tem mais!`
        : `Hoje você já usou <b>${nv} de ${tot}</b> votos (${porCat()} por categoria, em decorações diferentes).`;
      else if (f.votacao_aberta) info.textContent = `Votação aberta até ${ddmm(f.votacao_ate)}: ${porCat()} votos por dia em cada categoria, em decorações diferentes.`;
      else if (f.encerrado) info.textContent = `Votação encerrada. Resultado em ${ddmm(f.resultado)}.`;
      else if (f.votacao_de) info.textContent = `A votação abre em ${ddmm(f.votacao_de)}. Enquanto isso, veja as decorações e comente!`;
      if (status && f.votacao_de) {
        status.textContent = f.votacao_aberta ? `Votação aberta até ${ddmm(f.votacao_ate)} · ${porCat()} votos por dia em cada categoria`
          : f.encerrado ? `Votação encerrada · resultado em ${ddmm(f.resultado)}`
          : f.inscricoes_abertas ? `Inscrições até ${ddmm(f.inscricoes_ate)} · votação de ${ddmm(f.votacao_de)} a ${ddmm(f.votacao_ate)}`
          : `Inscrições encerradas · votação de ${ddmm(f.votacao_de)} a ${ddmm(f.votacao_ate)}`;
      }
    }

    function card(x, rank) {
      const v = voteLabel(x, true), f = x.fotos[0];
      const showRank = S.sort === 'votos' && x.votos > 0;
      const medal = rank.pos <= 3 && x.votos > 0 ? ` r${rank.pos}` : '';
      const naTodas = S.cat === 'all' ? ` · ${esc((CATS[x.categoria] || {}).curto || catNome(x.categoria))}` : '';   // em "Todas", diz de qual categoria é a posição
      return `<article class="nt-card${rank.pos === 1 && x.votos > 0 && S.sort === 'votos' ? ' is-top' : ''}" data-id="${x.id}">
<button type="button" class="nt-photo" data-open="${x.id}" aria-label="Ver a decoração de ${esc(x.nome)}"><img src="${esc(src(f.thumb))}" alt="${esc(nomeDe(x))}, ${esc(x.rua)}" loading="lazy" decoding="async" width="720" height="540">
${showRank ? `<span class="nt-rank${medal}">${lugar(rank)}${naTodas}</span>` : ''}${x.fotos.length > 1 ? `<span class="nt-nphotos">${IC.camera}${x.fotos.length}</span>` : ''}</button>
<div class="nt-body"><span class="nt-tag">${esc(catTag(x.categoria))}</span><h3>${esc(nomeDe(x))}</h3><p class="nt-who">${IC.pin}<span>${esc(x.nome)} · ${esc(x.rua)}</span></p>
<div class="nt-stats"><span>${IC.heart}<b data-v>${x.votos}</b> ${x.votos === 1 ? 'voto' : 'votos'}</span><span>${IC.chat}<b>${x.comentarios}</b></span></div>
<div class="nt-actions"><button type="button" class="btn btn-sun ${v.cls || ''}" data-vote="${x.id}"${v.dis ? ' disabled' : ''}${v.tip ? ` title="${v.tip}" aria-label="${v.tip}"` : ''}>${v.t}</button><button type="button" class="btn btn-line" data-open="${x.id}">${IC.chat} Comentar</button></div></div></article>`;
    }

    function render() {
      const r = sorted(), rk = rankOf();
      empty.hidden = S.itens.length > 0;
      grid.innerHTML = S.itens.length && !r.length ? `<p class="filter-count">${S.q ? 'Nada encontrado nessa busca.' : 'Ainda não há inscrições publicadas nesta categoria.'}</p>` : r.map(x => card(x, rk[x.id])).join('');
      setInfo();
    }

    async function load() {
      try {
        const j = await api('/inscricoes?v=' + encodeURIComponent(VIS));
        S.itens = j.inscricoes; S.fase = j.fase; S.meu = j.meus_votos_hoje || {};
        render(); fecharInscricoes();
        const d = +new URLSearchParams(location.search).get('d');
        if (d && S.itens.some(x => x.id === d) && !S.aberto) abrir(d, false);
      } catch (e) {
        grid.innerHTML = `<p class="filter-count">Não foi possível carregar as decorações agora. <button type="button" class="btn btn-line" data-retry>Tentar de novo</button></p>`;
      }
    }

    async function votar(id, btn) {
      const alvo = S.itens.find(y => y.id === id);
      if (alvo && meusDe(alvo.categoria).includes(id)) return desvotar(id, btn);
      if (btn) { btn.disabled = true; }
      try {
        const j = await api('/votar', { id, visitante: VIS });
        S.meu = j.meus_votos_hoje || {};
        const x = S.itens.find(y => y.id === id); if (x) x.votos = j.votos;
        render(); if (S.aberto === id) preencher(x);
        const b = $(`.nt-card[data-id="${id}"] [data-v]`); if (b) b.parentElement.classList.add('nt-pop');
        const r = restam(x.categoria), cn = catNome(x.categoria);
        const resto = r ? `Você ainda tem ${r} ${votoPal(r)} hoje em ${cn}.` : `Você usou seus ${porCat()} votos de hoje em ${cn}.`;
        msg(S.aberto ? `Voto registrado! ${resto} Mudou de ideia? Toque em “Seu voto” para tirar.` : '');
        if (!S.aberto) info.innerHTML = `Voto registrado em <b>${esc(nomeDe(x))}</b>! ${esc(resto)} Mudou de ideia? Toque em “Seu voto” para tirar.`;
      } catch (e) {
        if (e.data && e.data.meus_votos_hoje) { S.meu = e.data.meus_votos_hoje; render(); if (S.aberto) preencher(S.itens.find(y => y.id === S.aberto)); }
        if (S.aberto) msg(e.message, true); else { info.textContent = e.message; if (btn) btn.disabled = false; }
      }
    }

    /* clicou de novo em "Seu voto": tira o voto de hoje e devolve o voto para usar na categoria */
    async function desvotar(id, btn) {
      if (btn) { btn.disabled = true; }
      try {
        const j = await api('/desvotar', { id, visitante: VIS });
        S.meu = j.meus_votos_hoje || {};
        const x = S.itens.find(y => y.id === id); if (x) x.votos = j.votos;
        render(); if (S.aberto === id) preencher(x);
        const r = restam(x.categoria), resto = `Você tem ${r} ${votoPal(r)} para usar hoje em ${catNome(x.categoria)}.`;
        if (S.aberto) msg(`Voto retirado. ${resto}`); else info.innerHTML = `Voto retirado de <b>${esc(nomeDe(x))}</b>. ${esc(resto)}`;
      } catch (e) {
        if (e.data && e.data.meus_votos_hoje) { S.meu = e.data.meus_votos_hoje; render(); if (S.aberto) preencher(S.itens.find(y => y.id === S.aberto)); }
        if (S.aberto) msg(e.message, true); else { info.textContent = e.message; if (btn) btn.disabled = false; }
      }
    }

    document.addEventListener('click', e => {
      const o = e.target.closest('[data-open]'); if (o) { abrir(+o.dataset.open); return; }
      const v = e.target.closest('[data-vote]'); if (v) { votar(+v.dataset.vote, v); return; }
      if (e.target.closest('[data-retry]')) load();
    });
    $$('[data-nt-sort]').forEach(b => b.addEventListener('click', () => {
      S.sort = b.dataset.ntSort; $$('[data-nt-sort]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render();
    }));
    /* "Inscreva-se" de cada categoria: já marca a categoria no formulário */
    $$('[data-nt-pick]').forEach(a => a.addEventListener('click', () => {
      const r = document.querySelector(`[data-nt-form] input[name=categoria][value="${a.dataset.ntPick}"]`);
      if (r) { r.checked = true; setTimeout(() => r.focus({ preventScroll: true }), 700); }
    }));
    $$('[data-nt-cat]').forEach(b => b.addEventListener('click', () => {
      S.cat = b.dataset.ntCat; $$('[data-nt-cat]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render();
    }));
    const search = $('#nt-search'); if (search) search.addEventListener('input', () => { S.q = search.value; render(); });

    /* ---------- detalhe ---------- */
    const dlg = $('#nt-dialog'), dImg = $('#nt-d-img'), dThumbs = $('#nt-d-thumbs'), dMsg = $('#nt-d-msg');
    const msg = (t, err) => { dMsg.textContent = t || ''; dMsg.className = 'nt-d-msg' + (err ? ' err' : ''); };
    function foto(i) {
      const x = S.itens.find(y => y.id === S.aberto); if (!x) return;
      const n = x.fotos.length; S.foto = (i + n) % n;
      dImg.src = src(x.fotos[S.foto].full); dImg.alt = `${nomeDe(x)}: foto ${S.foto + 1} de ${n}`;
      $('.nt-d-count', dlg).textContent = n > 1 ? `${S.foto + 1} / ${n}` : '';
      $$('.nt-d-nav', dlg).forEach(b => { b.hidden = n < 2; });
      $$('button', dThumbs).forEach((b, k) => b.setAttribute('aria-current', String(k === S.foto)));
    }
    function preencher(x) {
      const rk = rankOf()[x.id];
      $('#nt-d-cat').textContent = catTag(x.categoria);
      $('#nt-d-rank').textContent = x.votos > 0 ? `${lugar(rk)} em ${catNome(x.categoria)}` : '';
      $('#nt-d-title').textContent = nomeDe(x);
      $('#nt-d-who').innerHTML = `${IC.pin}<span>${esc(x.nome)} · ${esc(x.rua)}</span>`;
      $('#nt-d-desc').textContent = x.descricao || '';
      $('#nt-d-votos').textContent = x.votos; $('#nt-d-ncom').textContent = x.comentarios;
      $('#nt-d-votos-l').textContent = x.votos === 1 ? 'voto' : 'votos'; $('#nt-d-ncom-l').textContent = x.comentarios === 1 ? 'comentário' : 'comentários';
      const v = voteLabel(x), b = $('[data-nt-dvote]', dlg);
      b.innerHTML = v.t; b.disabled = v.dis; b.classList.toggle('nt-voted', !!v.cls);
      if (v.tip) { b.title = v.tip; b.setAttribute('aria-label', v.tip); } else { b.removeAttribute('title'); b.removeAttribute('aria-label'); }
      const ed = $('[data-nt-dedit]', dlg), lk = meusLinks()[x.id];
      ed.hidden = !lk; if (lk) ed.href = lk;
      const url = SITE + 'natal/' + x.id;
      $('[data-nt-wa]', dlg).href = 'https://wa.me/?text=' + encodeURIComponent(`Vota na ${nomeDe(x)} (${x.rua}), categoria ${catNome(x.categoria)}, no É Natal no Tarraf II! 🎄✨ Dá para votar todo dia: ${url}`);
    }
    function comentarios(lista) {
      const ol = $('#nt-comments');
      ol.innerHTML = lista.length ? lista.map(c => `<li><div class="nt-cmeta"><b>${esc(c.nome || 'Vizinho(a)')}</b><time>${esc(quando(c.criado))}</time></div><p>${esc(c.texto)}</p></li>`).join('')
        : '<li class="nt-none">Ninguém comentou ainda. Seja o primeiro!</li>';
    }
    async function abrir(id, push = true) {
      const x = S.itens.find(y => y.id === id); if (!x) return;
      S.aberto = id; msg('');
      dThumbs.innerHTML = x.fotos.length > 1 ? x.fotos.map((f, k) => `<button type="button" data-foto="${k}" aria-label="Foto ${k + 1}"><img src="${esc(src(f.thumb))}" alt=""></button>`).join('') : '';
      preencher(x); foto(0);
      $('#nt-comments').innerHTML = '<li class="nt-none">Carregando comentários…</li>';
      const cf = $('[data-nt-comment]'); cf.reset(); $('.form-status', cf).textContent = '';
      try { cf.nome.value = localStorage.getItem('amjt2_natal_nome') || ''; } catch (e) {}
      if (!dlg.open) dlg.showModal();
      if (push) history.replaceState(null, '', location.pathname + '?d=' + id + location.hash);
      try {
        const j = await api(`/inscricoes/${id}?v=` + encodeURIComponent(VIS));
        Object.assign(x, j.inscricao); S.meu = j.meus_votos_hoje || {}; S.fase = j.fase;
        if (S.aberto === id) { preencher(x); comentarios(j.comentarios); }
      } catch (e) { $('#nt-comments').innerHTML = `<li class="nt-none">${esc(e.message)}</li>`; }
    }
    dlg.addEventListener('close', () => { S.aberto = null; history.replaceState(null, '', location.pathname + location.hash); render(); });
    $('[data-nt-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    $('.nt-d-nav.prev', dlg).addEventListener('click', () => foto(S.foto - 1));
    $('.nt-d-nav.next', dlg).addEventListener('click', () => foto(S.foto + 1));
    dThumbs.addEventListener('click', e => { const b = e.target.closest('[data-foto]'); if (b) foto(+b.dataset.foto); });
    dlg.addEventListener('keydown', e => { if (e.target.matches('input,textarea')) return; if (e.key === 'ArrowLeft') foto(S.foto - 1); if (e.key === 'ArrowRight') foto(S.foto + 1); });
    let tx = null; const stage = $('.nt-d-stage', dlg);
    stage.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) foto(S.foto + (dx < 0 ? 1 : -1)); tx = null; });
    $('[data-nt-dvote]', dlg).addEventListener('click', e => votar(S.aberto, e.currentTarget));
    $('[data-nt-share]', dlg).addEventListener('click', async () => {
      const x = S.itens.find(y => y.id === S.aberto); if (!x) return;
      const url = SITE + 'natal/' + x.id, text = `Vota na ${nomeDe(x)} no É Natal no Tarraf II! 🎄`;
      try {
        if (navigator.share) { await navigator.share({ title: nomeDe(x), text, url }); return; }
        await navigator.clipboard.writeText(url); msg('Link copiado! Cole no WhatsApp e peça votos.');
      } catch (e) { if (e && e.name !== 'AbortError') msg('Copie o link: ' + url); }
    });
    $('[data-nt-comment]').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.currentTarget, st = $('.form-status', f), btn = $('[type=submit]', f);
      if (!f.texto.value.trim()) { st.className = 'form-status err'; st.textContent = 'Escreva o comentário.'; f.texto.focus(); return; }
      btn.disabled = true; st.className = 'form-status wait'; st.textContent = 'Enviando…';
      try {
        const j = await api('/comentar', { id: S.aberto, nome: f.nome.value, texto: f.texto.value, website: f.website.value, visitante: VIS });
        try { localStorage.setItem('amjt2_natal_nome', f.nome.value); } catch (x) {}
        const x = S.itens.find(y => y.id === S.aberto); if (x && j.comentarios != null) { x.comentarios = j.comentarios; preencher(x); }
        const ol = $('#nt-comments'); const none = $('.nt-none', ol); if (none) none.remove();
        if (j.comentario) ol.insertAdjacentHTML('afterbegin', `<li class="new"><div class="nt-cmeta"><b>${esc(j.comentario.nome)}</b><time>agora</time></div><p>${esc(j.comentario.texto)}</p></li>`);
        f.texto.value = ''; st.className = 'form-status'; st.textContent = 'Comentário publicado. Obrigado!';
      } catch (er) { st.className = 'form-status err'; st.textContent = er.message; }
      btn.disabled = false;
    });

    /* ---------- inscrição ---------- */
    const form = $('[data-nt-form]'), ok = $('[data-nt-success]'), closed = $('[data-nt-closed]');
    const prevs = $('[data-nt-previews]'), input = $('[data-nt-files]');
    let files = []; const MAXF = 10;
    const edited = $('[data-nt-edited]'), ETOKEN = new URLSearchParams(location.search).get('editar');
    let EDIT = null;   // {t, x}: modo edição (link secreto)
    function fecharInscricoes() { if (!ETOKEN && S.fase && !S.fase.inscricoes_abertas && ok.hidden) { form.hidden = true; closed.hidden = false; } }
    function drawPrevs() {
      prevs.innerHTML = files.map((f, k) => `<div class="nt-prev"><img src="${f.url}" alt="Foto ${k + 1} escolhida"><button type="button" data-rm="${k}" aria-label="Remover foto ${k + 1}">×</button></div>`).join('');
      $('.nt-drop b', form).textContent = files.length ? (files.length < MAXF ? `Adicionar mais fotos (${files.length} de ${MAXF})` : `Máximo de ${MAXF} fotos`) : 'Escolher fotos';
    }
    input.addEventListener('change', () => {
      let sobra = 0;
      for (const f of input.files) { if (!(/^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name))) continue; if (files.length >= MAXF) { sobra++; continue; } files.push({ f, url: URL.createObjectURL(f) }); }
      const st0 = $('.form-status', form); st0.className = 'form-status' + (sobra ? ' err' : ''); st0.textContent = sobra ? `Cabem até ${MAXF} fotos por inscrição; ${sobra} ficaram de fora.` : '';
      input.value = ''; $('.nt-photos', form).classList.remove('invalid'); drawPrevs();
    });
    prevs.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; const [r] = files.splice(+b.dataset.rm, 1); URL.revokeObjectURL(r.url); drawPrevs(); });
    function shrink(item) {   // reduz no celular antes de enviar (máx. 1600 px, JPG)
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
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const st = $('.form-status', form), btn = $('[type=submit]', form);
      form.classList.add('was-validated');
      if (!form.checkValidity() || !files.length) {
        st.className = 'form-status err';
        st.textContent = !files.length && form.checkValidity() ? 'Escolha pelo menos uma foto da decoração.' : 'Confira os campos destacados.';
        if (!files.length) $('.nt-photos', form).classList.add('invalid');
        const bad = form.querySelector(':invalid'); if (bad) bad.focus(); else if (!files.length) input.focus();
        return;
      }
      btn.disabled = true; st.className = 'form-status wait'; st.textContent = 'Preparando as fotos…';
      try {
        const fotos = []; for (const f of files) fotos.push(f.keep ? f.keep : await shrink(f));
        st.textContent = 'Enviando…';
        const fd = new FormData(form);
        if (EDIT) {
          const j = await api('/editar', { t: EDIT.t, nome: fd.get('nome'), rua: fd.get('rua'), titulo: fd.get('titulo'),
            descricao: fd.get('descricao'), website: fd.get('website'), fotos });
          $('[data-nt-edited-msg]', edited).textContent = j.aplicada ? 'Pronto! Sua inscrição já foi atualizada no site. Votos e comentários continuam.'
            : 'Pronto! Em breve a alteração aparece no site. Votos e comentários continuam.';
          form.hidden = true; edited.hidden = false; edited.scrollIntoView({ behavior: 'smooth', block: 'start' }); edited.focus({ preventScroll: true });
          st.textContent = ''; st.className = 'form-status'; btn.disabled = false;
          return;
        }
        const j = await api('/inscrever', { categoria: fd.get('categoria'), nome: fd.get('nome'), rua: fd.get('rua'), titulo: fd.get('titulo'),
          descricao: fd.get('descricao'), aceite: fd.get('aceite') === 'sim', website: fd.get('website'), visitante: VIS, fotos });
        $('[data-nt-proto]', ok).textContent = j.protocolo;
        const box = $('[data-nt-ebox]', ok); box.hidden = !j.editar;
        if (j.editar) {
          guardaLink(j.id, j.editar);
          $('[data-nt-elink]', ok).textContent = j.editar;
          $('[data-nt-ewa]', ok).href = 'https://wa.me/?text=' + encodeURIComponent(`Meu link para editar a inscrição ${j.protocolo} no É Natal no Tarraf II 🎄: ${j.editar}`);
          const as = $('[data-nt-eassoc]', ok);
          as.href = `https://wa.me/${as.dataset.num}?text=` + encodeURIComponent(`Olá! Quero alterar minha inscrição ${j.protocolo} no É Natal no Tarraf II.`);
        }
        form.hidden = true; ok.hidden = false; ok.scrollIntoView({ behavior: 'smooth', block: 'start' }); ok.focus({ preventScroll: true });
        load();   // já publicada: atualiza a lista de participantes
        files.forEach(f => URL.revokeObjectURL(f.url)); files = []; drawPrevs(); form.reset(); form.classList.remove('was-validated');
        st.textContent = ''; st.className = 'form-status';
      } catch (er) { st.className = 'form-status err'; st.textContent = er.message; }
      btn.disabled = false;
    });
    $('[data-nt-again]').addEventListener('click', () => { ok.hidden = true; form.hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('[data-nt-ecopy]', ok).addEventListener('click', async e => {
      const b = e.currentTarget, code = $('[data-nt-elink]', ok), lbl = $('span', b);
      try { await navigator.clipboard.writeText(code.textContent); lbl.textContent = 'Copiado!'; }
      catch (x) { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); lbl.textContent = 'Selecionado'; }
      setTimeout(() => { lbl.textContent = 'Copiar'; }, 2500);
    });

    /* ---------- edição pelo link secreto (?editar=<token>) ---------- */
    async function modoEditar(t) {
      const head = $('.form-head', form), alvo = $('#inscrever');
      try {
        const j = await api('/editar?t=' + encodeURIComponent(t)), x = j.inscricao;
        EDIT = { t, x }; guardaLink(x.id, SITE + 'natal?editar=' + t);
        $('.pill', head).textContent = 'Editar inscrição';
        $('h2', head).textContent = `Editar ${x.protocolo}`;
        $('p', head).textContent = j.alteracao_pendente ? 'Sua última alteração ainda vai aparecer no site. Se salvar de novo, vale esta versão.'
          : 'Mude o que quiser e salve. Votos e comentários continuam.';
        const cf = $('.nt-cat-field', form); cf.hidden = true; $$('input[name=categoria]', form).forEach(r => { r.disabled = true; });
        if (!$('.nt-edit-cat', form)) cf.insertAdjacentHTML('afterend', '<p class="full nt-edit-cat"></p>');
        $('.nt-edit-cat', form).innerHTML = `Categoria: <b>${esc(catTag(x.categoria))}</b>. Para trocar, fale com a associação.`;
        const ac = form.querySelector('input[name=aceite]'); if (ac) { ac.disabled = true; ac.closest('label').hidden = true; }
        ['nome', 'rua', 'titulo', 'descricao'].forEach(k => { form.elements[k].value = x[k] || ''; });
        files.forEach(f => { if (!f.keep) URL.revokeObjectURL(f.url); });
        files = x.fotos.map(f => ({ keep: f.nome, url: src(f.thumb) })); drawPrevs();
        $('[type=submit]', form).firstChild.textContent = 'Salvar alterações ';
        ok.hidden = true; edited.hidden = true; closed.hidden = true; form.hidden = false;
      } catch (e) {
        closed.innerHTML = `<b>Não deu para abrir a edição.</b><p>${esc(e.message)}</p>`;
        form.hidden = true; ok.hidden = true; closed.hidden = false;
      }
      setTimeout(() => alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
    $('[data-nt-edit-again]').addEventListener('click', () => modoEditar(EDIT.t));
    if (ETOKEN) modoEditar(ETOKEN);

    load();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !S.aberto) load(); });
  }

  /* ================= PAINEL ================= */
  const app = $('#nt-admin-app');
  if (app) {
    const AK = 'amjt2_natal_admin';
    const keyForm = $('#nt-keyform'), list = $('#nt-admin-list');
    let KEY = '', DATA = null, TAB = 'aprovado';   // inscrições entram publicadas (sem aprovação)
    const m = location.hash.match(/k=([^&]+)/);
    if (m) { KEY = decodeURIComponent(m[1]); try { localStorage.setItem(AK, KEY); } catch (e) {} history.replaceState(null, '', location.pathname); }
    if (!KEY) { try { KEY = localStorage.getItem(AK) || ''; } catch (e) {} }
    const H = () => ({ 'X-Admin-Key': KEY });

    async function carregar() {
      const st = $('.form-status', keyForm);
      try {
        DATA = await api('/admin/tudo', null, H());
        keyForm.hidden = true; app.hidden = false; desenhar();
      } catch (e) { keyForm.hidden = false; app.hidden = true; st.className = 'form-status err'; st.textContent = KEY ? e.message : ''; }
    }
    function desenhar() {
      const n = s => DATA.inscricoes.filter(x => x.status === s).length;
      const sus = DATA.suspeitos || [];
      const alts = DATA.alteracoes || [];
      $('#nt-admin-stats').textContent = `${alts.length ? alts.length + ' alterações esperando · ' : ''}${n('pendente')} pendentes · ${n('aprovado')} publicadas · ${n('oculto')} ocultas · ${DATA.votos_total} votos (${DATA.votos_hoje} hoje${DATA.votos_anulados ? ', ' + DATA.votos_anulados + ' anulados' : ''}) · ${DATA.comentarios.length} comentários`;
      $$('[data-nt-tab]').forEach(b => {
        const t = b.dataset.ntTab; b.setAttribute('aria-pressed', String(t === TAB));
        b.textContent = { pendente: 'Pendentes', aprovado: 'Publicadas', oculto: 'Ocultas', comentarios: 'Comentários', alteracoes: 'Alterações', votos: 'Votos suspeitos' }[t]
          + ` (${t === 'comentarios' ? DATA.comentarios.length : t === 'votos' ? sus.length : t === 'alteracoes' ? alts.length : n(t)})`;
      });
      if (TAB === 'alteracoes') {
        // Mudanças feitas pelo próprio inscrito (link de edição) em inscrições já publicadas. Aprovar troca no site; votos ficam.
        const rot = { nome: 'Nome no site', rua: 'Rua', titulo: 'Título', descricao: 'História' };
        const th = fs => fs.map(f => `<a href="${esc(src(f.full))}" target="_blank" rel="noopener"><img src="${esc(src(f.thumb))}" alt="foto"></a>`).join('');
        list.innerHTML = alts.map(a => {
          const mud = Object.keys(rot).filter(k => (a.antes[k] || '') !== (a.depois[k] || ''))
            .map(k => `<dt>${rot[k]}</dt><dd><s>${esc(a.antes[k] || '—')}</s><br><b>${esc(a.depois[k] || '—')}</b></dd>`).join('');
          const fm = a.antes.fotos.map(f => f.full).join() !== a.depois.fotos.map(f => f.full).join();
          return `<div class="nt-arow"><div><span class="nt-badge pendente">alteração</span> <small>PP${String(a.inscricao_id).padStart(3, '0')} · ${esc(quando(a.criado))}</small></div>
<h3>${esc(nomeDe({ ...a.depois, categoria: a.categoria }))}</h3>${mud ? `<dl>${mud}</dl>` : ''}
${fm ? `<p><small>Fotos novas (${a.depois.fotos.length})</small></p><div class="nt-athumbs">${th(a.depois.fotos)}</div><p><small>Antes (${a.antes.fotos.length})</small></p><div class="nt-athumbs nt-old">${th(a.antes.fotos)}</div>` : ''}
<div class="nt-abtns"><button type="button" class="btn btn-sun" data-alt="${a.id}" data-acao="aprovar">Aprovar alteração</button><button type="button" class="btn btn-line" data-alt="${a.id}" data-acao="recusar">Recusar</button></div></div>`;
        }).join('') || '<p>Nenhuma alteração esperando.</p>';
        return;
      }
      if (TAB === 'votos') {
        // Muitos votos da mesma rede (IP) na mesma inscrição no mesmo dia. Condomínio/4G dividem IP: olhe o horário antes de anular.
        list.innerHTML = '<p class="nt-crow"><small>Grupos com 4 ou mais votos da mesma rede, na mesma inscrição, no mesmo dia. Uma família ou um condomínio podem dividir a mesma rede: desconfie quando os votos vêm em poucos minutos. Anular não apaga nada e pode ser desfeito.</small></p>' +
          (sus.map(s => `<div class="nt-crow${s.anulados >= s.votos ? ' oc' : ''}"><small>${esc(s.dia)} · em <b>${esc(s.de)}</b> (PP${String(s.inscricao_id).padStart(3, '0')}) · rede ${esc(s.rede_curta)}</small><div><b>${s.votos} votos</b> entre ${esc(quando(s.primeiro))} e ${esc(quando(s.ultimo))}${s.anulados ? ` · ${s.anulados} anulados` : ''}</div><div class="nt-abtns"><button type="button" class="btn btn-line" data-vt="${s.inscricao_id}" data-rede="${esc(s.rede)}" data-dia="${esc(s.dia)}" data-an="${s.anulados >= s.votos ? 0 : 1}">${s.anulados >= s.votos ? 'Restaurar estes votos' : 'Anular estes votos'}</button></div></div>`).join('') || '<p>Nenhum grupo suspeito.</p>');
        return;
      }
      if (TAB === 'comentarios') {
        list.innerHTML = DATA.comentarios.map(c => `<div class="nt-crow${c.oculto ? ' oc' : ''}"><small>#${c.id} · em <b>${esc(c.de)}</b> (PP${String(c.inscricao_id).padStart(3, '0')}) · ${esc(quando(c.criado))}${c.oculto ? ' · OCULTO' : ''}</small><div><b>${esc(c.nome)}</b>: ${esc(c.texto)}</div><div class="nt-abtns"><button type="button" class="btn btn-line" data-com="${c.id}" data-oc="${c.oculto ? 0 : 1}">${c.oculto ? 'Mostrar de novo' : 'Ocultar comentário'}</button></div></div>`).join('') || '<p>Nenhum comentário ainda.</p>';
        return;
      }
      const its = DATA.inscricoes.filter(x => x.status === TAB);
      list.innerHTML = its.map(x => {
        const cel = String(x.celular || '').replace(/\D/g, '');
        const acts = { pendente: [['aprovado', 'Aprovar e publicar', 'btn-sun'], ['oculto', 'Ocultar', 'btn-line']],
                       aprovado: [['oculto', 'Ocultar do site', 'btn-line'], ['pendente', 'Voltar para pendente', 'btn-line']],
                       oculto: [['aprovado', 'Publicar', 'btn-sun'], ['pendente', 'Voltar para pendente', 'btn-line']] }[x.status];
        return `<div class="nt-arow"><div><span class="nt-badge ${x.status}">${x.status}</span> <small>PP${String(x.id).padStart(3, '0')} · ${esc(quando(x.criado))}</small></div>
<h3>${esc(nomeDe(x))}</h3>
<label class="nt-acat">Categoria <select data-cat-id="${x.id}">${Object.keys(CATS).map(k => `<option value="${k}"${k === x.categoria ? ' selected' : ''}>${esc(catTag(k))}</option>`).join('')}</select></label>
<div class="nt-athumbs">${x.fotos.map(f => `<a href="${esc(src(f.full))}" target="_blank" rel="noopener"><img src="${esc(src(f.thumb))}" alt="foto"></a>`).join('')}</div>
<dl><dt>Nome no site</dt><dd>${esc(x.nome)}</dd><dt>Rua</dt><dd>${esc(x.rua)}</dd><dt>Número</dt><dd>${esc(x.numero || '—')}</dd>
<dt>Celular</dt><dd>${cel.length >= 10 ? `<a href="https://wa.me/55${cel}" target="_blank" rel="noopener">${esc(x.celular)}</a>` : esc(x.celular || '—')}</dd>
<dt>História</dt><dd>${esc(x.descricao || '—')}</dd><dt>Votos</dt><dd>${x.votos}</dd><dt>Comentários</dt><dd>${x.comentarios}</dd></dl>
<div class="nt-abtns">${acts.map(([s, l, c]) => `<button type="button" class="btn ${c}" data-st="${s}" data-id="${x.id}">${l}</button>`).join('')}${x.status === 'aprovado' ? `<a class="btn btn-line" href="natal?d=${x.id}" target="_blank" rel="noopener">Ver no site</a>` : ''}<button type="button" class="btn btn-line" data-elink="${x.id}">Novo link de edição</button></div></div>`;
      }).join('') || '<p>Nada por aqui.</p>';
    }
    keyForm.addEventListener('submit', e => { e.preventDefault(); KEY = $('#nt-key').value.trim(); try { localStorage.setItem(AK, KEY); } catch (x) {} carregar(); });
    $$('[data-nt-tab]').forEach(b => b.addEventListener('click', () => { TAB = b.dataset.ntTab; desenhar(); }));
    list.addEventListener('change', async e => {
      const sel = e.target.closest('[data-cat-id]'); if (!sel) return;
      sel.disabled = true;
      try { await api('/admin/inscricao', { id: +sel.dataset.catId, categoria: sel.value }, H()); await carregar(); }
      catch (er) { alert(er.message); sel.disabled = false; }
    });
    list.addEventListener('click', async e => {
      const b = e.target.closest('[data-st],[data-com],[data-vt],[data-alt],[data-elink]'); if (!b) return;
      if (b.dataset.elink) {   // morador perdeu o link: gera outro (o antigo para de funcionar) e mostra para copiar
        if (!confirm('Gerar um novo link de edição para esta inscrição? O link antigo para de funcionar.')) return;
        b.disabled = true;
        try {
          const j = await api('/admin/link', { id: +b.dataset.elink }, H());
          try { await navigator.clipboard.writeText(j.editar); } catch (x) {}
          prompt('Link de edição (já copiado). Mande para o morador:', j.editar);
        } catch (er) { alert(er.message); }
        b.disabled = false; return;
      }
      b.disabled = true;
      try {
        if (b.dataset.alt) await api('/admin/alteracao', { id: +b.dataset.alt, acao: b.dataset.acao }, H());
        else if (b.dataset.vt) await api('/admin/votos', { inscricao_id: +b.dataset.vt, rede: b.dataset.rede, dia: b.dataset.dia, anulado: b.dataset.an === '1' }, H());
        else if (b.dataset.st) await api('/admin/inscricao', { id: +b.dataset.id, status: b.dataset.st }, H());
        else await api('/admin/comentario', { id: +b.dataset.com, oculto: b.dataset.oc === '1' }, H());
        await carregar();
      } catch (er) { alert(er.message); b.disabled = false; }
    });
    if (KEY) carregar();
  }
})();
