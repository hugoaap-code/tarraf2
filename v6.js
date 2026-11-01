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
