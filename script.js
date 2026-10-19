// Menú móvil
(function(){var t=document.querySelector('.menu-toggle'),n=document.querySelector('.navlinks');if(!t||!n)return;
t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',String(o));t.setAttribute('aria-label',o?'Cerrar menú':'Abrir menú')});
n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open');t.setAttribute('aria-expanded','false')})})})();

// Horario (hora de Madrid). 0 = domingo. Tramos en minutos desde las 0:00.
(function(){
  var H={0:[[720,1440]],1:null,2:null,3:null,4:[[720,960],[1110,1440]],5:[[720,960],[1110,1440]],6:[[720,1440]]};
  var order=[1,2,3,4,5,6,0],names=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],low=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  function f(m){return m>=1440?'24:00':Math.floor(m/60)+':'+String(m%60).padStart(2,'0')}
  function dur(m){var h=Math.floor(m/60),r=m%60;return h?(h+' h'+(r?' '+r+' min':'')):(r+' min')}
  function label(d){var h=H[d];return h?h.map(function(s){return f(s[0])+'–'+f(s[1])}).join(' · '):'Cerrado'}
  function now(){var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());function g(t){return p.filter(function(x){return x.type===t})[0].value}
    return{day:{Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[g('weekday')],min:(parseInt(g('hour'),10)%24)*60+parseInt(g('minute'),10)}}
  function state(){var n=now(),h=H[n.day],i,s;
    if(h)for(i=0;i<h.length;i++){s=h[i];if(n.min>=s[0]&&n.min<s[1])return{open:true,badge:'Abierto ahora · hasta las '+f(s[1]),title:'Abierto',sub:'Hasta las '+f(s[1]),extra:'Cierra en '+dur(s[1]-n.min)}}
    if(h)for(i=0;i<h.length;i++){if(n.min<h[i][0])return{open:false,badge:'Cerrado ahora · abrimos hoy a las '+f(h[i][0]),title:'Cerrado',sub:'Abrimos hoy a las '+f(h[i][0]),extra:'Abre en '+dur(h[i][0]-n.min)}}
    for(i=1;i<=7;i++){var d=(n.day+i)%7;if(H[d]){var w=i===1?'mañana':'el '+low[d];return{open:false,badge:'Cerrado ahora · abrimos '+w+' a las '+f(H[d][0][0]),title:'Cerrado',sub:'Abrimos '+w+' a las '+f(H[d][0][0]),extra:''}}}
    return{open:false,badge:'Cerrado ahora',title:'Cerrado',sub:'',extra:''}}
  function paint(){var n=now(),s=state();
    document.querySelectorAll('[data-open-badge]').forEach(function(b){b.textContent=s.badge;b.classList.toggle('is-open',s.open);b.classList.toggle('is-closed',!s.open)});
    document.querySelectorAll('[data-door]').forEach(function(d){d.classList.toggle('is-open',s.open);d.classList.toggle('is-closed',!s.open);
      d.querySelector('[data-door-title]').textContent=s.title;d.querySelector('[data-door-sub]').textContent=s.sub;d.querySelector('[data-door-extra]').textContent=s.extra});
    document.querySelectorAll('[data-today]').forEach(function(e){e.textContent=label(n.day)});
    document.querySelectorAll('[data-clock]').forEach(function(e){e.textContent=f(n.min)});
    var tl=document.querySelector('[data-timeline]');
    if(tl){var first=!tl.children.length;
      tl.innerHTML=order.map(function(d){var h=H[d];
        var segs=h?h.map(function(x){return'<i class="tl-seg" style="left:'+(x[0]/14.4)+'%;width:'+((x[1]-x[0])/14.4)+'%"></i>'}).join(''):'';
        var mark=d===n.day?'<i class="tl-now" style="left:'+(n.min/14.4)+'%"></i>':'';
        return'<div class="tl-row'+(d===n.day?' is-today':'')+(h?'':' is-closed')+'"><span class="tl-day">'+names[d]+'</span><div class="tl-track">'+segs+mark+'</div><span class="tl-txt">'+label(d)+'</span></div>'}).join('');
      if(!first)tl.querySelectorAll('.tl-seg').forEach(function(e){e.style.animation='none'})}}
  paint();setInterval(paint,30000);
})();

// Efectos
(function(){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  // Aparecer al hacer scroll
  var items=document.querySelectorAll('.reveal,.big-h,.item,.panel,.tl-note,.facts>div,.status');
  items.forEach(function(e){e.classList.add('reveal')});
  if('IntersectionObserver' in window&&!reduce){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});items.forEach(function(e){io.observe(e)})}
  else items.forEach(function(e){e.classList.add('in')});

  // Barra superior que se oscurece y progreso de lectura
  var bar=document.querySelector('.bar'),pg=document.querySelector('.progress');
  function sc(){var y=window.scrollY,h=document.documentElement.scrollHeight-window.innerHeight;if(bar)bar.classList.toggle('scrolled',y>10);if(pg)pg.style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')'}
  window.addEventListener('scroll',sc,{passive:true});sc();

  // Foco de luz que sigue al puntero
  document.querySelectorAll('[data-spot]').forEach(function(el){el.addEventListener('pointermove',function(e){if(e.pointerType!=='mouse')return;var r=el.getBoundingClientRect();el.style.setProperty('--mx',(e.clientX-r.left)+'px');el.style.setProperty('--my',(e.clientY-r.top)+'px')})});

  // Paneles: tocar en el móvil
  document.querySelectorAll('.panel').forEach(function(p){p.addEventListener('touchstart',function(){document.querySelectorAll('.panel').forEach(function(q){q.classList.toggle('on',q===p)})},{passive:true})});

  // Guardar contacto en el móvil (tarjeta vCard)
  document.querySelectorAll('[data-vcard]').forEach(function(b){b.addEventListener('click',function(){
    var v=['BEGIN:VCARD','VERSION:3.0','FN:Zoo Hamburguesería','ORG:Zoo','TEL;TYPE=WORK,VOICE:+34942401961','ADR;TYPE=WORK:;;Calle Pedro del Camino Mijarazo\\, 40;Ajo;Cantabria;39170;España','END:VCARD'].join('\r\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([v],{type:'text/vcard'}));a.download='zoo-ajo.vcf';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1500)})});
})();
