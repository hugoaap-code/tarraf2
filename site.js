/* ===== Configuração: ajuste aqui ===== */
const CONFIG = {
  email: "associacaot2@gmail.com",
  // WhatsApp oficial para inscrição (só dígitos: 55 + DDD + número)
  whatsapp: "5517991154582",
  grupoEventos: "https://chat.whatsapp.com/DBK75Jvrozn5hmdGqLZHoJ"
};

/* ===== Eventos: edite esta lista para atualizar o site =====
   destaque:true = aparece em grande no topo da seção (use no evento mais recente). */
const EVENTOS = [
  { destaque:true, quando:"31 de outubro de 2026", titulo:"Halloween na Praça",
    texto:"Organizado pelos próprios vizinhos: decoração montada junto à tarde, recreação com danças e gincanas, passeio de doces ou travessuras pelo bairro e piquenique na praça. Os doces vieram de doações e de Pix para a associação.",
    fatos:[["39","crianças inscritas"],["18","famílias na lista"],["15h","montagem coletiva"]],
    fala:"“Foi lindo ver as crianças fantasiadas e se divertindo.” — moradora, no grupo" },
  { quando:"Outubro", titulo:"Dia das Crianças", texto:"Festa para a criançada na praça." },
  { quando:"Sábado à tarde", titulo:"Sabadão na Praça", texto:"Tarde com os empreendedores do bairro. Chame a família e prestigie quem trabalha aqui." },
  { quando:"Agosto", titulo:"Mês dos Pais", texto:"Homenagem aos pais e às famílias do bairro." },
  { quando:"Junho", titulo:"Arraiá do Tarraf", texto:"A festa junina do bairro, na praça." },
  { quando:"Abril", titulo:"Páscoa no bairro", texto:"Diversão para as crianças na praça." },
  { quando:"Durante o ano", titulo:"Happy Hour dos vizinhos", texto:"Encontro de adultos para se conhecer além do “bom dia” no portão." }
];
(function(){
  if (!document.getElementById("ev-list") && !document.getElementById("ev-feature")) return;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const f = EVENTOS.find(e => e.destaque);
  const fe = document.getElementById("ev-feature"), li = document.getElementById("ev-list");
  if (f && fe) fe.innerHTML =
    '<div class="ev-feature"><div><p class="when">Último evento · '+esc(f.quando)+'</p><h3 style="margin:12px 0 14px">'+esc(f.titulo)+'</h3><p>'+esc(f.texto)+'</p></div>'+
    '<div class="side">'+(f.fatos?'<div class="facts">'+f.fatos.map(x=>'<div><b>'+esc(x[0])+'</b>'+esc(x[1])+'</div>').join("")+'</div>':'')+
    (f.fala?'<p class="quote-s">'+esc(f.fala)+'</p>':'')+'</div></div>';
  if (li) li.innerHTML = EVENTOS.filter(e => !e.destaque).map(e =>
    '<article><span class="when">'+esc(e.quando)+'</span><h3>'+esc(e.titulo)+'</h3><p>'+esc(e.texto)+'</p></article>').join("");
})();

document.querySelectorAll("[data-wa-group]").forEach(a => a.href = CONFIG.grupoEventos);
document.querySelectorAll("[data-email]").forEach(a => { a.href = "mailto:" + CONFIG.email; a.textContent = CONFIG.email; });

/* Destaca o evento do mês atual na agenda */
const mesAtual = String(new Date().getMonth()+1);
document.querySelectorAll(".agenda li[data-mes]").forEach(li => li.classList.toggle("now", li.dataset.mes === mesAtual));

/* Links de WhatsApp com mensagem pronta para cada intenção */
const MSGS = {
  Associar:   "Olá! Moro no Jardim Tarraf II e quero me associar à AMJT II.\nNome: \nEndereço: ",
  Voluntariar:"Olá! Moro no Jardim Tarraf II e quero ser voluntário(a) da associação.\nNome: ",
  Apoiar:     "Olá! Tenho um negócio e quero apoiar os eventos da AMJT II.\nNome/empresa: ",
  Sugerir:    "Olá! Quero apontar um problema/sugerir uma melhoria no Jardim Tarraf II:\n",
  Evento:     "Olá! Tenho uma ideia de evento para o Jardim Tarraf II:\n",
  Contato:    "Olá! Moro no Jardim Tarraf II e queria falar com a associação."
};
const fmtNum = n => n.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
document.querySelectorAll("[data-wa]").forEach(a => {
  a.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(MSGS[a.dataset.wa] || MSGS.Associar);
  if (a.hasAttribute("data-num")) a.textContent = fmtNum(CONFIG.whatsapp);
});

/* CTA fixo no celular: aparece depois do topo, some na área de inscrição */
const mcta = document.getElementById("mcta");
if (mcta) {
  const top = document.querySelector(".hero, .phero"), join = document.getElementById("associe-se");
  let pastTop = false, inJoin = false;
  const upd = () => mcta.classList.toggle("on", pastTop && !inJoin);
  if (top) new IntersectionObserver(([en]) => { pastTop = !en.isIntersecting; upd(); }).observe(top);
  if (join) new IntersectionObserver(([en]) => { inJoin = en.isIntersecting; upd(); }, {threshold:.05}).observe(join);
}

/* Menu do celular */
const mb = document.getElementById("menu-btn"), mn = document.getElementById("mnav");
if (mb && mn) mb.addEventListener("click", () => { const o = mn.classList.toggle("open"); mb.setAttribute("aria-expanded", o); });

/* Copiar chave Pix */
document.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copiado!"; }
  catch(e) { b.textContent = "Copie: " + b.dataset.copy; }
  setTimeout(() => b.textContent = "Copiar chave", 2500);
}));
