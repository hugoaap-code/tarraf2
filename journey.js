document.documentElement.classList.add("js");

/* ===== Configuração: ajuste aqui ===== */
const CONFIG = {
  email: "associacaot2@gmail.com",
  // WhatsApp oficial para inscrição (só dígitos: 55 + DDD + número)
  whatsapp: "5517991154582",
  grupoEventos: "https://chat.whatsapp.com/DBK75Jvrozn5hmdGqLZHoJ"
};

document.querySelectorAll("[data-wa-group]").forEach(a => a.href = CONFIG.grupoEventos);
document.querySelectorAll("[data-email]").forEach(a => { a.href = "mailto:" + CONFIG.email; if (!a.children.length) a.textContent = CONFIG.email; });

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

/* Revelar ao rolar + barra de progresso */
const io = new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
}), {threshold:.12, rootMargin:"0px 0px -40px 0px"});
document.querySelectorAll(".rv, .meter").forEach(el => io.observe(el));

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
  const label = b.querySelector("span");
  try { await navigator.clipboard.writeText(b.dataset.copy); label.textContent = "Copiado!"; }
  catch(e) { label.textContent = b.dataset.copy; }
  setTimeout(() => label.textContent = "Copiar chave", 2500);
}));

/* Fotografias: visualização ampliada com origem e legenda. */
const pd = document.getElementById('photo-dialog');
let lastPhotoButton;
document.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>{
  lastPhotoButton=b;
  const img=document.getElementById('photo-full');img.src=b.dataset.photo;img.alt=b.querySelector('img').alt;
  document.getElementById('photo-caption').textContent=b.dataset.caption;
  const link=document.getElementById('photo-source');link.href=b.dataset.origin;
  pd.showModal();
}));
if(pd){
 pd.querySelector('.dialog-close').addEventListener('click',()=>pd.close());
 pd.addEventListener('click',e=>{if(e.target===pd){const box=pd.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)pd.close();}});
 pd.addEventListener('close',()=>{if(lastPhotoButton)lastPhotoButton.focus({preventScroll:true});});
}
/* Arquivo de histórias: filtro acessível, sem esconder registros sem JS. */
const filterButtons=[...document.querySelectorAll('[data-filter]')];
function applyFilter(value){
 filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===value)));
 let total=0;
 document.querySelectorAll('.narrative[data-category]').forEach(el=>{
   el.hidden=value!=='all'&&el.dataset.category!==value;
   if(!el.hidden){total++;el.classList.add('in');}
 });
 const count=document.getElementById('filter-count');if(count)count.textContent=total+(total===1?' história':' histórias');
}
filterButtons.forEach(b=>b.addEventListener('click',()=>applyFilter(b.dataset.filter)));
window.addEventListener('hashchange',()=>{if(filterButtons.length)applyFilter('all');});
