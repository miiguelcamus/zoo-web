// Menú móvil
(function(){var t=document.querySelector('.menu-toggle'),n=document.querySelector('.navlinks');if(!t||!n)return;
t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',String(o));t.setAttribute('aria-label',o?'Cerrar menú':'Abrir menú')});
n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open');t.setAttribute('aria-expanded','false')})})})();

// Horario (hora de Madrid). 0 = domingo. Tramos en minutos desde las 0:00.
(function(){
  var H={0:[[720,1440]],1:null,2:null,3:null,4:[[720,960],[1110,1440]],5:[[720,960],[1110,1440]],6:[[720,1440]]};
  var order=[1,2,3,4,5,6,0],names=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],low=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  function f(m){return m>=1440?'24:00':Math.floor(m/60)+':'+String(m%60).padStart(2,'0')}
  function label(d){var h=H[d];return h?h.map(function(s){return f(s[0])+'–'+f(s[1])}).join(' · '):'Cerrado'}
  function now(){var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());function g(t){return p.filter(function(x){return x.type===t})[0].value}
    return{day:{Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[g('weekday')],min:(parseInt(g('hour'),10)%24)*60+parseInt(g('minute'),10)}}
  function state(){var n=now(),h=H[n.day],i,s;
    if(h)for(i=0;i<h.length;i++){s=h[i];if(n.min>=s[0]&&n.min<s[1])return{open:true,text:'Abierto ahora · hasta las '+f(s[1]),sub:'Hasta las '+f(s[1])}}
    if(h)for(i=0;i<h.length;i++){if(n.min<h[i][0])return{open:false,text:'Cerrado ahora · abre hoy a las '+f(h[i][0]),sub:'Abrimos hoy a las '+f(h[i][0])}}
    for(i=1;i<=7;i++){var d=(n.day+i)%7;if(H[d])return{open:false,text:'Cerrado ahora · abre '+(i===1?'mañana':'el '+low[d])+' a las '+f(H[d][0][0]),sub:'Abrimos '+(i===1?'mañana':'el '+low[d])+' a las '+f(H[d][0][0])}}
    return{open:false,text:'Cerrado ahora',sub:''}}
  function paint(){var n=now(),s=state();
    document.querySelectorAll('[data-open-badge]').forEach(function(b){b.textContent=s.text;b.classList.toggle('is-open',s.open);b.classList.toggle('is-closed',!s.open)});
    document.querySelectorAll('[data-door]').forEach(function(d){d.classList.toggle('is-open',s.open);d.classList.toggle('is-closed',!s.open);
      d.querySelector('[data-door-title]').textContent=s.open?'Abierto':'Cerrado';d.querySelector('[data-door-sub]').textContent=s.sub});
    var tl=document.querySelector('[data-timeline]');
    if(tl){var first=!tl.children.length;
      tl.innerHTML=order.map(function(d){var h=H[d];
        var segs=h?h.map(function(x){return'<i class="tl-seg" style="left:'+(x[0]/14.4)+'%;width:'+((x[1]-x[0])/14.4)+'%"></i>'}).join(''):'';
        var mark=d===n.day?'<i class="tl-now" style="left:'+(n.min/14.4)+'%"></i>':'';
        return'<div class="tl-row'+(d===n.day?' is-today':'')+(h?'':' is-closed')+'"><span class="tl-day">'+names[d]+'</span><div class="tl-track">'+segs+mark+'</div><span class="tl-txt">'+label(d)+'</span></div>'}).join('');
      if(!first)tl.querySelectorAll('.tl-seg').forEach(function(e){e.style.animation='none'})}}
  paint();setInterval(paint,60000);
})();

// Efectos
(function(){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  // Aparecer al hacer scroll
  var items=document.querySelectorAll('.reveal,.big-h,.card,.panel,.tl-note');
  items.forEach(function(e){e.classList.add('reveal')});
  if('IntersectionObserver' in window&&!reduce){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});items.forEach(function(e){io.observe(e)})}
  else items.forEach(function(e){e.classList.add('in')});

  // Pulsar la hamburguesa para montarla otra vez
  var art=document.querySelector('[data-burger]');
  if(art)art.addEventListener('click',function(){art.classList.add('redo');void art.offsetWidth;art.classList.remove('redo')});

  // Tarjetas: arrastrar con el ratón
  var cs=document.querySelector('[data-drag]');
  if(cs){var down=false,sx=0,sl=0;
    cs.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return;down=true;sx=e.clientX;sl=cs.scrollLeft;cs.classList.add('grab')});
    window.addEventListener('pointerup',function(){down=false;cs.classList.remove('grab')});
    window.addEventListener('pointermove',function(e){if(!down)return;cs.scrollLeft=sl-(e.clientX-sx)})}

  // Paneles: tocar en el móvil
  document.querySelectorAll('.panel').forEach(function(p){p.addEventListener('touchstart',function(){document.querySelectorAll('.panel').forEach(function(q){q.classList.toggle('on',q===p)})},{passive:true})});

})();
