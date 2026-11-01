/* Blog estático: filtros + busca local. Publicações são HTML real, sem depender de JS. */
(()=>{
 const cards=[...document.querySelectorAll('[data-blog-category]')];
 if(!cards.length)return;
 const buttons=[...document.querySelectorAll('[data-blog-filter]')];
 const search=document.getElementById('blog-search');
 const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const requested=new URLSearchParams(location.search).get('tipo');
 let type=buttons.some(b=>b.dataset.blogFilter===requested)?requested:'all';
 function apply(){
  const q=norm(search.value.trim());let count=0;
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.blogFilter===type)));
  cards.forEach(c=>{const match=(type==='all'||c.dataset.blogCategory===type)&&(!q||norm(c.dataset.blogSearch).includes(q));c.hidden=!match;if(match){count++;c.classList.add('in');}});
  document.getElementById('blog-count').textContent=count+(count===1?' post':' posts');
  document.getElementById('blog-empty').hidden=count!==0;
 }
 buttons.forEach(b=>b.addEventListener('click',()=>{type=b.dataset.blogFilter;const url=new URL(location.href);if(type==='all')url.searchParams.delete('tipo');else url.searchParams.set('tipo',type);history.replaceState(null,'',url);apply();}));
 search.addEventListener('input',apply);
 document.getElementById('blog-reset').addEventListener('click',()=>{type='all';search.value='';const u=new URL(location.href);u.search='';history.replaceState(null,'',u);apply();search.focus({preventScroll:true});});
 apply();
})();
