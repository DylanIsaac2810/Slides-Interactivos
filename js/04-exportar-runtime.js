/* Código que se incrusta en el script.js exportado (pop-ups, elementos flotantes, navegación) */
/* ---------- Renderizado de pop-ups (se incrusta tal cual en script.js) ---------- */
function itvEsc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}
/* Markdown mínimo y seguro: **negrita**, *cursiva*, [texto](url), listas «- » y «1. », párrafos. */
function itvMd(src){
    function inl(s){
        s=itvEsc(s);
        s=s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
        s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
        s=s.replace(/\*([^*\s][^*]*)\*/g,'<em>$1</em>');
        return s;
    }
    var out='', para=[], list=null;
    function flushP(){ if(para.length){ out+='<p>'+para.map(inl).join('<br>')+'</p>'; para=[]; } }
    function flushL(){ if(list){ out+='<'+list.t+'>'+list.items.map(function(x){return '<li>'+inl(x)+'</li>';}).join('')+'</'+list.t+'>'; list=null; } }
    String(src||'').replace(/\r/g,'').split('\n').forEach(function(l){
        var m;
        if(!l.trim()){ flushP(); flushL(); return; }
        if((m=l.match(/^\s*[-•*]\s+(.*)$/))){ flushP(); if(!list||list.t!=='ul'){ flushL(); list={t:'ul',items:[]}; } list.items.push(m[1]); return; }
        if((m=l.match(/^\s*\d+[.)]\s+(.*)$/))){ flushP(); if(!list||list.t!=='ol'){ flushL(); list={t:'ol',items:[]}; } list.items.push(m[1]); return; }
        flushL(); para.push(l.trim());
    });
    flushP(); flushL();
    return out;
}
function itvPopupHTML(pop,idp){
    var h='<div class="itv-pop-head"><h2 class="itv-pop-title" id="'+idp+'-t">'+itvEsc(pop.title)+'</h2>'+
        '<button type="button" class="itv-pop-x" data-close aria-label="Cerrar ventana">&times;</button></div><div class="itv-pop-body">';
    (pop.blocks||[]).forEach(function(b){
        if(b.type==='heading') h+='<h3>'+itvEsc(b.text)+'</h3>';
        else if(b.type==='text') h+=itvMd(b.text);
        else if(b.type==='note') h+='<div class="itv-pop-note">'+itvMd(b.text)+'</div>';
        else if(b.type==='image'&&b.src){
            h+='<figure class="itv-pop-fig w-'+itvEsc(b.width||'full')+'"><img src="'+itvEsc(b.src)+'" alt="'+itvEsc(b.alt||b.caption||'')+'"'+
                (b.w&&b.h?' width="'+b.w+'" height="'+b.h+'"':'')+' loading="lazy">'+
                (b.caption?'<figcaption>'+itvEsc(b.caption)+'</figcaption>':'')+'</figure>';
        }
    });
    return h+'</div>';
}
/* Convierte el pop-up del editor en los datos que usa el resultado final. srcFn decide la ruta de cada imagen. */
function popData(pop,srcFn){
    pop=pop||{};
    return {
        title:pop.title||'', size:pop.size||'md',
        blocks:(pop.blocks||[]).filter(function(b){ return b.type==='image'?!!b.data:String(b.text||'').trim()!==''; }).map(function(b){
            if(b.type==='image') return {type:'image',src:srcFn(b),alt:b.alt||'',caption:b.caption||'',w:b.w||0,h:b.h||0,width:b.width||'full'};
            return {type:b.type,text:b.text};
        })
    };
}
function popHasContent(pop){ return !!pop&&(String(pop.title||'').trim()!==''||popData(pop,function(){return '';}).blocks.length>0); }

function itvOvHTML(els,sid,hit){
    var sv='',h='';
    function rgba(c,a){var n=parseInt(String(c).slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}
    (els||[]).forEach(function(e,i){
        var sc=(e.id&&e.id===sid)?' edsel':'', id=' data-e="'+itvEsc(e.id||'')+'"', dl='animation-delay:'+(i*0.12).toFixed(2)+'s;';
        if(e.t==='line'){
            sv+='<line class="itv-ovl'+sc+'"'+id+' x1="'+e.x+'" y1="'+e.y+'" x2="'+e.x2+'" y2="'+e.y2+'" stroke="'+itvEsc(e.str)+'" stroke-width="'+e.sw+'" stroke-linecap="round" vector-effect="non-scaling-stroke" style="'+dl+'"/>';
            if(hit)sv+='<line class="itv-hit"'+id+' x1="'+e.x+'" y1="'+e.y+'" x2="'+e.x2+'" y2="'+e.y2+'" stroke="rgba(0,0,0,0)" stroke-width="'+hit+'" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
        }else if(e.t==='text'){
            h+='<div class="itv-ovt'+sc+'"'+id+' style="left:'+e.x+'%;top:'+e.y+'%;width:'+e.w+'%;font-size:'+e.fs+'cqw;color:'+itvEsc(e.col)+';font-weight:'+(e.b?700:400)+';text-align:'+e.al+';'+dl+'">'+itvEsc(e.txt).replace(/\n/g,'<br>')+'</div>';
        }else{
            h+='<div class="itv-ove'+sc+'"'+id+' style="left:'+e.x+'%;top:'+e.y+'%;width:'+e.w+'%;height:'+e.h+'%;background:'+rgba(e.fill,e.op)+';border:'+e.sw+'px solid '+itvEsc(e.str)+';border-radius:'+(e.t==='ell'?'50%':'6px')+';'+dl+'"></div>';
        }
    });
    return '<svg class="itv-ovs" viewBox="0 0 100 100" preserveAspectRatio="none">'+sv+'</svg>'+h;
}

function itvRuntime(DATA){
    'use strict';
    var root=document.getElementById('itv');
    var T=DATA.theme, current=0, busy=false, view;

    root.innerHTML='<div class="itv-view"></div>';
    view=root.lastChild;
    if(T.accent) root.style.setProperty('--itv-accent',T.accent);
    var popEl=null, popTrigger=null;
    function reducedMotion(){ return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    function openPopup(p,btn){
        if(!p.popup) return;
        closePopup(true);
        popTrigger=btn;
        var idp='itvp'+Math.random().toString(36).slice(2,8);
        var ov=document.createElement('div');
        ov.className='itv-pop';
        ov.innerHTML='<div class="itv-pop-box itv-pop-'+(p.popup.size||'md')+'" role="dialog" aria-modal="true" tabindex="-1" '+
            (p.popup.title?'aria-labelledby="'+idp+'-t"':'aria-label="Información"')+'>'+itvPopupHTML(p.popup,idp)+'</div>';
        root.appendChild(ov);
        popEl=ov;
        var x=ov.querySelector('[data-close]')||ov.firstChild;
        try{ x.focus({preventScroll:true}); }catch(err){ x.focus(); }
    }
    function closePopup(instant){
        if(!popEl) return;
        var el=popEl; popEl=null;
        if(instant||reducedMotion()) el.parentNode.removeChild(el);
        else{
            el.className+=' itv-pop-closing';
            setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },180);
        }
        if(!instant&&popTrigger&&document.contains(popTrigger)){
            try{ popTrigger.focus({preventScroll:true}); }catch(err){}
        }
        popTrigger=null;
    }
    document.addEventListener('keydown',function(e){
        if(!popEl) return;
        if(e.key==='Escape'||e.key==='Esc'){ e.preventDefault(); closePopup(); return; }
        if(e.key!=='Tab') return;
        var f=popEl.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])');
        if(!f.length){ e.preventDefault(); return; }
        var first=f[0], last=f[f.length-1], a=document.activeElement, inside=popEl.contains(a);
        if(e.shiftKey&&(a===first||!inside)){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey&&(a===last||!inside)){ e.preventDefault(); first.focus(); }
    });

    function esc(s){
        return String(s).replace(/[&<>"']/g,function(c){
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        });
    }
    function indexOfScreen(id){
        for(var i=0;i<DATA.screens.length;i++) if(DATA.screens[i].id===id) return i;
        return -1;
    }
    function hmark(p){
        if(!p.hv) return '';
        var k=p.hv, st='--c:'+(p.hc||'#7fa9d6')+';';
        if(k==='ring'||k==='glow') st+='left:'+(p.x-p.w/2)+'%;top:'+(p.y-p.h/2)+'%;width:'+p.w+'%;height:'+p.h+'%';
        else if(k==='tr') st+='left:'+(p.x+p.w/2)+'%;top:'+p.y+'%';
        else if(k==='tl') st+='left:'+(p.x-p.w/2)+'%;top:'+p.y+'%';
        else if(k==='tt') st+='left:'+p.x+'%;top:'+(p.y-p.h/2)+'%';
        else st+='left:'+p.x+'%;top:'+(p.y+p.h/2)+'%';
        return '<span class="itv-hm itv-hm-'+k+'" style="'+st+'"></span>';
    }
    function build(){
        var s=DATA.screens[current], h='';
        h+='<div class="itv-stage"><img src="'+esc(s.src)+'" alt="'+esc(s.alt)+'" draggable="false">';
        s.hotspots.forEach(function(p,i){
            h+='<button type="button" class="itv-hs" data-i="'+i+'" aria-label="'+esc(p.label)+'" style="left:'+p.x+'%;top:'+p.y+'%;width:'+p.w+'%;height:'+p.h+'%'+(p.clip?';clip-path:'+p.clip+';-webkit-clip-path:'+p.clip:'')+'"></button>'+(p.vs?itvVisHTML(p):'')+hmark(p);
        });
        h+='</div>';
        view.innerHTML=h;
    }
    function go(k){
        if(busy||k<0||k===current) return;
        var done=false, im=new Image();
        function run(){ if(done) return; done=true; transition(k); }
        im.onload=run; im.onerror=run; im.src=DATA.screens[k].src;
        setTimeout(run,2000);
    }
    function transition(k){
        var t=T.transition, suffix=(t==='slide')?(k>current?'-f':'-b'):'';
        var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(!t||t==='none'||reduce){ current=k; build(); return; }
        busy=true;
        view.className='itv-view itv-out-'+t+suffix;
        setTimeout(function(){
            current=k; build();
            view.className='itv-view itv-in-'+t+suffix;
            setTimeout(function(){ view.className='itv-view'; busy=false; },320);
        },200);
    }

    function toggleFloat(p,i,only){
        var st=view.querySelector('.itv-stage'); if(!st) return;
        var old=st.querySelectorAll('[data-fi="'+i+'"]');
        if(old.length){ for(var k=0;k<old.length;k++) st.removeChild(old[k]); return; }
        if(p.els&&p.els.length){
            var ov=document.createElement('div'); ov.className='itv-ov'; ov.setAttribute('data-fi',i);
            ov.innerHTML=itvOvHTML(p.els); st.appendChild(ov);
        }
        if(only||!p.popup||!(p.popup.title||p.popup.blocks.length)) return;
        var f=p.fl||{x:5,y:5,w:34}, d=document.createElement('div');
        d.className='itv-float'; d.setAttribute('data-fi',i); d.setAttribute('role','dialog');
        if(p.popup.title) d.setAttribute('aria-labelledby','itvf'+i+'-t'); else d.setAttribute('aria-label','Información');
        d.style.left=f.x+'%'; d.style.top=f.y+'%'; d.style.width=f.w+'%'; d.style.maxHeight=(100-f.y)+'%';
        d.innerHTML=itvPopupHTML(p.popup,'itvf'+i);
        st.appendChild(d);
        var ox=d.offsetLeft+d.offsetWidth-st.clientWidth; if(ox>0) d.style.left=Math.max(0,d.offsetLeft-ox)+'px';
        var oy=d.offsetTop+d.offsetHeight-st.clientHeight; if(oy>0) d.style.top=Math.max(0,d.offsetTop-oy)+'px';
    }
    root.addEventListener('click',function(e){
        var fe=e.target.closest('.itv-float');
        if(fe){ if(e.target.closest('[data-close]')&&fe.parentNode) fe.parentNode.removeChild(fe); return; }
        if(popEl&&popEl.contains(e.target)){
            if(e.target===popEl||e.target.closest('[data-close]')) closePopup();
            return;
        }
        var b=e.target.closest('[data-i]');
        if(!b) return;
        var p=DATA.screens[current].hotspots[+b.getAttribute('data-i')];
        if(p.action==='goto'){ go(indexOfScreen(p.target)); }
        else if(p.action==='popup'){ openPopup(p,b); }
        else if(p.action==='float'){ toggleFloat(p,+b.getAttribute('data-i')); }
        else if(p.action==='link'&&p.url){ window.open(p.url,'_blank','noopener'); }
        else if(p.action==='close'){
            // Oculta el contenedor localmente y notifica a Moodle (si está dentro de un iframe)
            root.style.display = 'none';
            try {
                window.parent.postMessage('close-interactive', '*');
            } catch(err){}
        }
    });
    build();
}
