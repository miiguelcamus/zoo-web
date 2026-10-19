(function(){var t=document.querySelector('.menu-toggle'),n=document.querySelector('.navlinks');if(!t||!n)return;t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',String(o));t.setAttribute('aria-label',o?'Cerrar menú':'Abrir menú')});n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open');t.setAttribute('aria-expanded','false')})})})();

// Horario (hora de Madrid). 0 = domingo. Tramos en minutos desde las 0:00.
(function(){
  var H={0:[[720,1440]],1:null,2:null,3:null,4:[[720,960],[1110,1440]],5:[[720,960],[1110,1440]],6:[[720,1440]]};
  var order=[1,2,3,4,5,6,0],names=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],low=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  function f(m){return m>=1440?'24:00':Math.floor(m/60)+':'+String(m%60).padStart(2,'0')}
  function label(d){var h=H[d];return h?h.map(function(s){return f(s[0])+' – '+f(s[1])}).join(' · '):'Cerrado'}
  function now(){var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());function g(t){return p.filter(function(x){return x.type===t})[0].value}
    return{day:{Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[g('weekday')],min:(parseInt(g('hour'),10)%24)*60+parseInt(g('minute'),10)}}
  function state(){var n=now(),h=H[n.day],i,s;
    if(h)for(i=0;i<h.length;i++){s=h[i];if(n.min>=s[0]&&n.min<s[1])return{open:true,text:'Abierto ahora · hasta las '+f(s[1])}}
    if(h)for(i=0;i<h.length;i++){if(n.min<h[i][0])return{open:false,text:'Cerrado ahora · abre hoy a las '+f(h[i][0])}}
    for(i=1;i<=7;i++){var d=(n.day+i)%7;if(H[d])return{open:false,text:'Cerrado ahora · abre '+(i===1?'mañana':'el '+low[d])+' a las '+f(H[d][0][0])}}
    return{open:false,text:'Cerrado ahora'}}
  function paint(){var n=now(),s=state();
    document.querySelectorAll('[data-open-badge]').forEach(function(b){b.textContent=s.text;b.classList.toggle('is-open',s.open);b.classList.toggle('is-closed',!s.open)});
    var l=document.querySelector('[data-week-list]'),t=document.querySelector('[data-week-table]');
    if(l)l.innerHTML=order.map(function(d){return'<li class="'+(d===n.day?'is-today ':'')+(H[d]?'':'is-closed')+'"><span>'+names[d]+'</span><span>'+label(d)+'</span></li>'}).join('');
    if(t)t.innerHTML=order.map(function(d){return'<tr class="'+(d===n.day?'is-today ':'')+(H[d]?'':'is-closed')+'"><td>'+names[d]+'</td><td>'+label(d)+'</td></tr>'}).join('')}
  paint();setInterval(paint,60000);
})();

// Efectos
(function(){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');
  var h1=document.querySelector('.hero h1');
  if(h1&&!reduce){var tx=h1.textContent;h1.innerHTML=tx.split('').map(function(c,i){return'<span class="ch" aria-hidden="true" style="animation-delay:'+(i*120)+'ms">'+c+'</span>'}).join('')}
  var items=document.querySelectorAll('.section-head,.feature,.cta-band,.info-card,.map-frame,.band-grid>div,.week-table,.review-card');
  items.forEach(function(e){e.classList.add('reveal')});
  if('IntersectionObserver' in window&&!reduce){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});items.forEach(function(e){io.observe(e)})}
  else items.forEach(function(e){e.classList.add('in')});
})();
