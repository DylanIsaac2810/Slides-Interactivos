/* Editor: formas, lienzo, interacción y panel de propiedades */
/* ----- Formas ----- */
var SHAPES=[['rect','Rectángulo / cuadrado'],['ellipse','Círculo / elipse'],['triangle','Triángulo'],['rhombus','Rombo'],['pentagon','Pentágono'],['hexagon','Hexágono'],['octagon','Octágono'],['dodecagon','Dodecágono'],['regular','Polígono regular (N lados)'],['custom','Polígono libre (vértices)']];
var PRESETS={triangle:{n:3,rot:0},rhombus:{n:4,rot:0},pentagon:{n:5,rot:0},hexagon:{n:6,rot:30},octagon:{n:8,rot:22.5},dodecagon:{n:12,rot:15},regular:{n:7,rot:0}};
function shapeName(k){var r=SHAPES.find(function(x){return x[0]===k;});return r?r[1]:k;}
$('#shapeSel').innerHTML=SHAPES.filter(function(x){return x[0]!=='custom';}).map(function(x){return '<option value="'+x[0]+'">'+x[1]+'</option>';}).join('');
function isFam(p){return p.shape!=='rect'&&p.shape!=='ellipse'&&p.shape!=='custom';}

/* Geometría. Todo en % de la imagen. x,y = centro del cuadro; w,h = tamaño del cuadro. */
function updateBBox(p){
    var mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
    p.pts.forEach(function(q){if(q[0]<mnx)mnx=q[0];if(q[0]>mxx)mxx=q[0];if(q[1]<mny)mny=q[1];if(q[1]>mxy)mxy=q[1];});
    p.x=(mnx+mxx)/2;p.y=(mny+mxy)/2;p.w=Math.max(mxx-mnx,0.1);p.h=Math.max(mxy-mny,0.1);
}
function absPts(p){
    if(p.shape==='custom')return p.pts;
    if(p.shape==='rect'||p.shape==='ellipse')return null;
    var l=p.x-p.w/2,t=p.y-p.h/2;
    return regularPts(p.n,p.rot).map(function(q){return [l+q[0]*p.w/100,t+q[1]*p.h/100];});
}
function toCustom(p){
    var a,i,g,l,t;
    if(p.shape==='rect'){l=p.x-p.w/2;t=p.y-p.h/2;a=[[l,t],[l+p.w,t],[l+p.w,t+p.h],[l,t+p.h]];}
    else if(p.shape==='ellipse'){a=[];for(i=0;i<32;i++){g=i/32*2*Math.PI;a.push([p.x+Math.cos(g)*p.w/2,p.y+Math.sin(g)*p.h/2]);}}
    else a=absPts(p);
    p.pts=a.map(function(q){return [q[0],q[1]];});p.shape='custom';updateBBox(p);
}
function setShape(p,v){
    if(v===p.shape)return;
    if(v==='custom'){toCustom(p);return;}
    var wasFam=isFam(p);
    if(p.shape==='custom')delete p.pts;
    p.shape=v;
    var pr=PRESETS[v];
    if(pr&&!(v==='regular'&&wasFam)){p.n=pr.n;p.rot=pr.rot;}
}
function snapshot(p){return {x:p.x,y:p.y,pts:p.pts?p.pts.map(function(q){return [q[0],q[1]];}):null};}
function placeFrom(p,sn,dx,dy){
    dx=clamp(dx,-(sn.x-p.w/2),100-(sn.x+p.w/2));dy=clamp(dy,-(sn.y-p.h/2),100-(sn.y+p.h/2));
    p.x=sn.x+dx;p.y=sn.y+dy;
    if(sn.pts)p.pts=sn.pts.map(function(q){return [q[0]+dx,q[1]+dy];});
}
function moveBy(p,dx,dy){placeFrom(p,snapshot(p),dx,dy);}
function setBox(p,f,v){
    var nb={x:p.x,y:p.y,w:p.w,h:p.h};nb[f]=v;
    nb.w=clamp(nb.w,0.5,100);nb.h=clamp(nb.h,0.5,100);
    nb.x=clamp(nb.x,nb.w/2,100-nb.w/2);nb.y=clamp(nb.y,nb.h/2,100-nb.h/2);
    if(p.shape==='custom'){
        var ol=p.x-p.w/2,ot=p.y-p.h/2,ow=Math.max(p.w,0.01),oh=Math.max(p.h,0.01),nl=nb.x-nb.w/2,nt=nb.y-nb.h/2;
        p.pts=p.pts.map(function(q){return [nl+(q[0]-ol)/ow*nb.w,nt+(q[1]-ot)/oh*nb.h];});
    }
    p.x=nb.x;p.y=nb.y;p.w=nb.w;p.h=nb.h;
}

/* ----- Render: lienzo ----- */
function renderStage(){
    var wrap=$('#stageWrap'), s=scr();
    if(drawing&&drawing.sid!==cur)drawing=null;
    if(!s){
        wrap.innerHTML='<div class="drop"><p style="font-size:18px;margin:0 0 6px"><b>Empieza subiendo una imagen o un PDF</b></p><p>Arrástralo aquí o usa el botón «Subir imagen o PDF».</p></div>';
        return;
    }
    var st=$('#stage');
    if(!st||st.dataset.sid!==s.id){
        wrap.innerHTML='<div class="stage" id="stage" data-sid="'+s.id+'"><img src="'+s.blob+'" alt=""><div class="layer" id="layer"></div></div>';
    }
    $('#stage').classList.toggle('placing',placing);
    $('#stage').classList.toggle('drawing',!!drawing);
    renderHotspots();
}
function f2(n){return (+n).toFixed(2);}
function ptsStr(a){return a.map(function(q){return f2(q[0])+','+f2(q[1]);}).join(' ');}
function shapeSVG(p,on){
    var a=' class="shp'+(on?' sel':'')+'" data-id="'+p.id+'"';
    if(p.shape==='ellipse')return '<ellipse'+a+' cx="'+f2(p.x)+'" cy="'+f2(p.y)+'" rx="'+f2(p.w/2)+'" ry="'+f2(p.h/2)+'"/>';
    var A=absPts(p);
    if(A)return '<polygon'+a+' points="'+ptsStr(A)+'"/>';
    return '<rect'+a+' x="'+f2(p.x-p.w/2)+'" y="'+f2(p.y-p.h/2)+'" width="'+f2(p.w)+'" height="'+f2(p.h)+'"/>';
}
function renderHotspots(){
    var s=scr(), L=$('#layer'); if(!s||!L)return;
    var svg='', html='', sp=curP();
    s.hotspots.forEach(function(p){if(p.id!==sel)svg+=shapeSVG(p,false);});
    if(sp)svg+=shapeSVG(sp,true);
    s.hotspots.forEach(function(p,i){
        html+='<div class="nb'+(p.id===sel?' sel':'')+'" style="left:'+f2(p.x)+'%;top:'+f2(p.y)+'%">'+(i+1)+'</div>';
    });
    if(sp){
        svg+='<rect class="bbox" x="'+f2(sp.x-sp.w/2)+'" y="'+f2(sp.y-sp.h/2)+'" width="'+f2(sp.w)+'" height="'+f2(sp.h)+'"/>';
        if(sp.shape==='custom'){
            var n=sp.pts.length;
            sp.pts.forEach(function(q,i){
                var b=sp.pts[(i+1)%n];
                html+='<div class="mh" data-i="'+i+'" title="Clic y arrastra para agregar un vértice" style="left:'+f2((q[0]+b[0])/2)+'%;top:'+f2((q[1]+b[1])/2)+'%"></div>';
            });
            sp.pts.forEach(function(q,i){
                html+='<div class="vh" data-i="'+i+'" title="Arrastra para mover · doble clic para quitar" style="left:'+f2(q[0])+'%;top:'+f2(q[1])+'%"></div>';
            });
        }else{
            html+='<div class="rh" title="Arrastra para cambiar el tamaño" style="left:'+f2(sp.x+sp.w/2)+'%;top:'+f2(sp.y+sp.h/2)+'%"></div>';
        }
    }
    if(sp&&sp.action==='float'){
        html+='<div class="itv-ov edov">'+itvOvHTML(sp.els,selEl,18)+'</div>';
        var se=(sp.els||[]).find(function(x){return x.id===selEl;});
        if(se){
            if(se.t==='line')html+='<div class="eh" data-eh="1" style="left:'+f2(se.x)+'%;top:'+f2(se.y)+'%"></div><div class="eh" data-eh="2" style="left:'+f2(se.x2)+'%;top:'+f2(se.y2)+'%"></div>';
            else if(se.t==='text')html+='<div class="eh" data-eh="w" style="cursor:ew-resize;left:'+f2(se.x+se.w)+'%;top:'+f2(se.y)+'%"></div>';
            else html+='<div class="eh" data-eh="r" style="left:'+f2(se.x+se.w)+'%;top:'+f2(se.y+se.h)+'%"></div>';
        }
    }
    if(sp&&sp.action==='float'&&sp.popup&&popHasContent(sp.popup)){
        var flb=ensureFl(sp);
        html+='<div class="itv-float flt" style="--itv-accent:'+esc(P.theme.accent||'#5b3a8e')+';left:'+f2(flb.x)+'%;top:'+f2(flb.y)+'%;width:'+f2(flb.w)+'%">'+itvPopupHTML(popData(sp.popup,function(b){return b.blob;}),'fl')+'</div>'+
            '<div class="fwh" title="Arrastra para cambiar el ancho" style="left:'+f2(flb.x+flb.w)+'%;top:'+f2(flb.y)+'%"></div>';
    }
    if(drawing&&drawing.pts.length){
        var d=drawing, ps=ptsStr(d.pts);
        if(d.pts.length>=3)svg+='<polygon class="draft" points="'+ps+'"/>';
        svg+='<polyline class="draftline" points="'+ps+(d.cur?' '+f2(d.cur.x)+','+f2(d.cur.y):'')+'"/>';
        d.pts.forEach(function(q,i){
            html+='<div class="dv'+(i===0&&d.pts.length>=3?' first':'')+'" style="left:'+f2(q[0])+'%;top:'+f2(q[1])+'%"></div>';
        });
    }
    L.innerHTML=visHTML(s)+'<svg viewBox="0 0 100 100" preserveAspectRatio="none">'+svg+'</svg>'+html;
}
function renderChips(){
    var s=scr();
    $('#chips').innerHTML=s&&s.hotspots.length?s.hotspots.map(function(p,i){
        return '<button class="chip'+(p.id===sel?' on':'')+'" data-id="'+p.id+'">'+(i+1)+' · '+shapeName(p.shape).replace(/ \(.*\)/,'')+'</button>';
    }).join(''):'<span class="hint">Aún no hay zonas. Elige una forma y usa «Colocar zona», o dibuja un polígono libre.</span>';
}
$('#chips').addEventListener('click',function(e){
    var b=e.target.closest('.chip'); if(!b)return;
    select(b.dataset.id);
});
function renderStatus(){
    $('#btnPlace').classList.toggle('on',placing);
    $('#btnDraw').classList.toggle('on',!!drawing);
    $('#btnFinish').hidden=!drawing;
    $('#btnCancel').hidden=!drawing;
    $('#status').textContent=drawing
        ?'Clic = nuevo vértice ('+drawing.pts.length+'). Cierra la figura con clic en el punto verde, doble clic o «Terminar». Retroceso borra el último; Esc cancela.'
        :placing?'Haz clic sobre la imagen para colocar la zona (Esc para terminar).'
        :(scr()?'Arrastra una zona para moverla. En el resultado final las zonas son invisibles.':'');
}

/* ----- Interacción en el lienzo ----- */
var drag=null;
function ptOf(ev,rect){return {x:clamp((ev.clientX-rect.left)/rect.width*100,0,100),y:clamp((ev.clientY-rect.top)/rect.height*100,0,100)};}
$('#stageWrap').addEventListener('pointerdown',function(e){
    var stage=$('#stage'); if(!stage||!stage.contains(e.target)||e.button>0)return;
    var rect=stage.getBoundingClientRect(), q=ptOf(e,rect), t=e.target, p=curP();
    if(chain){
        var cl=chain.el; lineAimTo(cl,q,e.shiftKey,1,null);
        if(lineLen(cl)<2){chain.p.els=chain.p.els.filter(function(x){return x.id!==cl.id;});selEl=null;}
        chain=null;markDirty();renderHotspots();renderProps();e.preventDefault();return;
    }
    if(drawing){drawClick(q,rect);e.preventDefault();return;}
    var vh=t.closest('.vh'), mh=t.closest('.mh'), rh=t.closest('.rh');
    if(p&&vh){drag={mode:'vertex',p:p,i:+vh.dataset.i,rect:rect};e.preventDefault();return;}
    if(p&&mh){
        var i=+mh.dataset.i, a=p.pts[i], b=p.pts[(i+1)%p.pts.length];
        p.pts.splice(i+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);
        updateBBox(p);markDirty();
        drag={mode:'vertex',p:p,i:i+1,rect:rect};
        renderHotspots();renderProps();e.preventDefault();return;
    }
    if(p&&rh){drag={mode:'resize',p:p,rect:rect,l:p.x-p.w/2,t:p.y-p.h/2};e.preventDefault();return;}
    var eh=t.closest('.eh'), ee=t.closest('[data-e]');
    if(p&&p.els&&eh&&selEl){var se=p.els.find(function(x){return x.id===selEl;});if(se){drag={mode:'elh',p:p,e:se,k:eh.getAttribute('data-eh'),rect:rect};e.preventDefault();return;}}
    if(p&&p.els&&ee){
        var el=p.els.find(function(x){return x.id===ee.getAttribute('data-e');});
        if(el){selEl=el.id;drag={mode:'elmove',p:p,e:el,rect:rect,q0:q,s:{x:el.x,y:el.y,x2:el.x2,y2:el.y2}};renderHotspots();renderProps();e.preventDefault();return;}
    }
    var fh=t.closest('.fwh'), fb=t.closest('.flt');
    if(p&&fh&&p.fl){drag={mode:'flw',p:p,rect:rect};e.preventDefault();return;}
    if(p&&fb&&p.fl){drag={mode:'flmove',p:p,rect:rect,q0:q,fx:p.fl.x,fy:p.fl.y};e.preventDefault();return;}
    var sh=t.closest('.shp');
    if(placing&&!sh){addHotspot(q.x,q.y);return;}
    if(!sh){select(null);return;}
    var hit=scr().hotspots.find(function(x){return x.id===sh.dataset.id;});
    select(hit.id);
    drag={mode:'move',p:hit,rect:rect,q0:q,snap:snapshot(hit)};
    e.preventDefault();
});
window.addEventListener('pointermove',function(e){
    if(drag){
        var q=ptOf(e,drag.rect), p=drag.p;
        if(drag.mode==='move')placeFrom(p,drag.snap,q.x-drag.q0.x,q.y-drag.q0.y);
        else if(drag.mode==='resize'){
            var w=clamp(q.x-drag.l,1,100-drag.l), h=clamp(q.y-drag.t,1,100-drag.t);
            p.w=w;p.h=h;p.x=drag.l+w/2;p.y=drag.t+h/2;
        }else if(drag.mode==='elmove'){
            var e0=drag.e,dx=q.x-drag.q0.x,dy=q.y-drag.q0.y,S=drag.s;
            if(e0.t==='line'){
                dx=clamp(dx,-Math.min(S.x,S.x2),100-Math.max(S.x,S.x2));dy=clamp(dy,-Math.min(S.y,S.y2),100-Math.max(S.y,S.y2));
                e0.x=S.x+dx;e0.x2=S.x2+dx;e0.y=S.y+dy;e0.y2=S.y2+dy;
            }else{e0.x=clamp(S.x+dx,0,100-e0.w);e0.y=clamp(S.y+dy,0,100-(e0.h||0));}
        }else if(drag.mode==='elh'){
            var e1=drag.e;
            if(e1.t==='line'){
                if(e.shiftKey){lineAimTo(e1,q,true,drag.k==='1'?2:1,null);}
                else if(drag.k==='1'){e1.x=q.x;e1.y=q.y;}else{e1.x2=q.x;e1.y2=q.y;}
            }
            else if(drag.k==='w'){e1.w=clamp(q.x-e1.x,3,100-e1.x);}
            else{e1.w=clamp(q.x-e1.x,0.5,100-e1.x);e1.h=clamp(q.y-e1.y,0.5,100-e1.y);}
        }else if(drag.mode==='flmove'){
            var fl=p.fl;fl.x=clamp(drag.fx+q.x-drag.q0.x,0,100-fl.w);fl.y=clamp(drag.fy+q.y-drag.q0.y,0,98);
        }else if(drag.mode==='flw'){
            p.fl.w=clamp(q.x-p.fl.x,10,100-p.fl.x);
        }else{p.pts[drag.i]=[q.x,q.y];updateBBox(p);}
        syncNumFields();markDirty();renderHotspots();
    }else if(chain&&e.target.closest&&e.target.closest('#stageWrap')){
        var st3=$('#stage');
        if(st3){lineAimTo(chain.el,ptOf(e,st3.getBoundingClientRect()),e.shiftKey,1,null);renderHotspots();}
    }else if(drawing){
        var st=$('#stage'); if(!st)return;
        drawing.cur=ptOf(e,st.getBoundingClientRect());
        renderHotspots();
    }
});
window.addEventListener('pointerup',function(){drag=null;});
$('#stageWrap').addEventListener('dblclick',function(e){
    if(drawing){finishDraw();return;}
    var vh=e.target.closest('.vh'), p=curP();
    if(vh&&p&&p.pts&&p.pts.length>3){
        p.pts.splice(+vh.dataset.i,1);updateBBox(p);markDirty();renderHotspots();renderProps();
    }
});
function syncNumFields(){
    var p=curP(); if(!p)return;
    ['x','y','w','h','fx','fy','fw'].forEach(function(k){
        var f=$('#props [data-f="'+k+'"]'); if(f&&document.activeElement!==f){var v=(k.length===2)?(p.fl?p.fl[k.charAt(1)]:null):p[k];if(v!=null)f.value=(+v).toFixed(1);}
    });
}
function select(id){
    sel=id;selEl=null;renderHotspots();renderChips();renderProps();
}

/* ----- Colocar formas predefinidas ----- */
function addHotspot(x,y){
    var s=scr(); if(!s)return;
    var kind=$('#shapeSel').value, pr=PRESETS[kind]||{n:6,rot:30};
    var w=12, h=(kind==='rect')?9:clamp(12*s.w/s.h,1,100);
    var p={id:uid(),shape:kind,n:pr.n,rot:pr.rot,x:clamp(x,w/2,100-w/2),y:clamp(y,h/2,100-h/2),w:w,h:h,action:'goto',target:'',url:''};
    if($('#visNew')&&$('#visNew').checked){p.vis=true;p.vs=defVs();}
    s.hotspots.push(p);markDirty();
    sel=p.id;renderScreens();renderHotspots();renderChips();renderProps();
}

/* ----- Polígono libre: cada clic es un vértice ----- */
function startDraw(){
    if(!scr()){alert('Sube primero una imagen.');return;}
    placing=false;drawing={pts:[],cur:null,sid:cur};sel=null;
    renderChips();renderProps();renderStage();renderStatus();
}
function drawClick(q,rect){
    var d=drawing, n=d.pts.length;
    function px(a,b){return Math.hypot((a[0]-b.x)/100*rect.width,(a[1]-b.y)/100*rect.height);}
    if(n>=3&&px(d.pts[0],q)<12){finishDraw();return;}
    if(n&&px(d.pts[n-1],q)<4)return;
    d.pts.push([q.x,q.y]);renderHotspots();renderStatus();
}
function finishDraw(){
    var d=drawing; if(!d)return;
    if(d.pts.length<3){$('#status').textContent='Faltan vértices: una figura necesita al menos 3.';return;}
    var s=scr();
    var p={id:uid(),shape:'custom',n:6,rot:30,pts:d.pts.map(function(q){return [q[0],q[1]];}),x:0,y:0,w:1,h:1,action:'goto',target:'',url:''};
    updateBBox(p);s.hotspots.push(p);drawing=null;sel=p.id;markDirty();
    renderScreens();renderStage();renderChips();renderProps();renderStatus();
}
function cancelDraw(){drawing=null;renderStage();renderStatus();}

/* ----- Panel de propiedades ----- */
function renderProps(){
    var p=curP(), box=$('#props'), s=scr();
    if(!p){box.innerHTML='<p class="hint">Selecciona una zona (en la imagen o en la lista) para configurar su forma y a dónde lleva.</p>';return;}
    var others=P.screens.filter(function(x){return x.id!==s.id;});
    var a='';
    if(p.action==='goto'){
        a=others.length?'<label>Ir a la pantalla<select data-f="target"><option value="">— elegir —</option>'+others.map(function(o){return '<option value="'+o.id+'"'+(p.target===o.id?' selected':'')+'>'+esc(o.name)+'</option>';}).join('')+'</select></label>':'<p class="hint">Primero sube otra imagen para poder navegar hacia ella.</p>';
    }else if(p.action==='link'){
        a='<label>Dirección web (URL)<input data-f="url" value="'+esc(p.url)+'" placeholder="https://…"></label>';
    }else if(p.action==='close'){
        a='<p class="hint">Esta zona cerrará el interactivo (ideal para los botones de "Cerrar" que vienen impresos en tus infografías).</p>';
    }else if(p.action==='float'){
        a=visPanel(p)+elPanel(p);
    }else if(p.action==='popup'){
        var pp=p.popup||newPopup(), nImg=pp.blocks.filter(function(b){return b.type==='image';}).length;
        a='<div class="popsum"><b>'+(pp.title?esc(pp.title):'<i>(sin título)</i>')+'</b><small>'+pp.blocks.length+' bloque(s)'+(nImg?' · '+nImg+' imagen(es)':'')+'</small></div>'+
            '<div class="btnrow" style="margin-top:0"><button data-act="editpop" class="primary" style="flex:1">✎ Editar contenido '+(p.action==='float'?'de la tarjeta flotante (opcional)':'del pop-up')+'</button></div>';
    }
    var sh='<label>Forma<select data-f="shape">'+SHAPES.map(function(o){return '<option value="'+o[0]+'"'+(p.shape===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>';
    if(p.shape==='regular')sh+='<label>Número de lados<input type="number" min="3" max="40" step="1" data-f="n" value="'+p.n+'"></label>';
    if(isFam(p))sh+='<label>Giro (°)<input type="number" step="1" data-f="rot" value="'+p.rot+'"></label>';
    if(p.shape==='custom')sh+='<p class="hint"><b>'+p.pts.length+' vértices.</b> Arrastra los círculos blancos para dar forma. Haz clic en un punto naranja del borde para agregar un vértice. Doble clic en un vértice para quitarlo.</p>';
    box.innerHTML=
        sh+
        '<label>Al hacer clic…<select data-f="action">'+
            '<option value="goto"'+(p.action==='goto'?' selected':'')+'>Ir a otra pantalla</option>'+
            '<option value="link"'+(p.action==='link'?' selected':'')+'>Abrir un enlace</option>'+
            '<option value="popup"'+(p.action==='popup'?' selected':'')+'>Mostrar un pop-up (texto, imágenes, figuras)</option>'+
            '<option value="float"'+(p.action==='float'?' selected':'')+'>Mostrar elemento flotante sobre el slide</option>'+
            '<option value="close"'+(p.action==='close'?' selected':'')+'>Cerrar interactivo</option>'+
        '</select></label>'+
        a+
        '<div class="row2"><label>Posición X (%)<input type="number" step="0.1" min="0" max="100" data-f="x" value="'+(+p.x).toFixed(1)+'"></label><label>Posición Y (%)<input type="number" step="0.1" min="0" max="100" data-f="y" value="'+(+p.y).toFixed(1)+'"></label></div>'+
        '<div class="row2"><label>Ancho (%)<input type="number" step="0.1" min="1" max="100" data-f="w" value="'+(+p.w).toFixed(1)+'"></label><label>Alto (%)<input type="number" step="0.1" min="1" max="100" data-f="h" value="'+(+p.h).toFixed(1)+'"></label></div>'+
        (p.action==='float'?'':visPanel(p))+hvPanel(p)+'<div class="btnrow"><button data-act="dup">Duplicar</button><button data-act="del" class="danger">Eliminar zona</button>'+(p.shape!=='custom'?'<button data-act="tocustom" title="Convierte la forma en vértices que puedes mover">Convertir en polígono editable</button>':'')+'</div>';
}
$('#props').addEventListener('input',function(e){
    var t=e.target, p=curP(); if(!p||!t.dataset.f)return;
    var f=t.dataset.f, v=t.value;
    if(t.type==='number'){v=parseFloat(v);if(isNaN(v))return;}
    if(f==='shape'){setShape(p,v);markDirty();renderProps();renderHotspots();renderChips();return;}
    if(f==='fx'||f==='fy'||f==='fw'){setFl(p,f.charAt(1),v);markDirty();renderHotspots();return;}
    if(f==='n')p.n=clamp(Math.round(v),3,40);
    else if(f==='x'||f==='y'||f==='w'||f==='h')setBox(p,f,v);
    else p[f]=v;
    markDirty();
    if(f==='action'){
        renderProps();
        if(v==='popup'||v==='float'){ if(!p.popup)p.popup=newPopup(); if(v==='float'&&!p.fl)p.fl=defFl(p); renderProps(); if(v==='popup')openPopEd(p); }
    }
    renderHotspots();
});
$('#props').addEventListener('click',function(e){
    var b=e.target.closest('[data-act]'), p=curP(), s=scr(); if(!b||!p||/^el-/.test(b.dataset.act))return;
    if(b.dataset.act==='dup'){
        var c=JSON.parse(JSON.stringify(p));c.id=uid();
        s.hotspots.push(c);moveBy(c,3,3);sel=c.id;
    }else if(b.dataset.act==='del'){
        s.hotspots=s.hotspots.filter(function(x){return x.id!==p.id;});sel=null;
    }else if(b.dataset.act==='tocustom'){
        toCustom(p);
    }else if(b.dataset.act==='editpop'){
        if(!p.popup)p.popup=newPopup();
        openPopEd(p);return;
    }
    markDirty();renderScreens();renderHotspots();renderChips();renderProps();
});

/* ----- Ajustes generales ----- */
function renderSettings(){
    $('#setTitle').value=P.title;$('#setTransition').value=P.theme.transition;$('#setAccent').value=P.theme.accent||'#5b3a8e';
}
$('#setTitle').addEventListener('input',function(e){P.title=e.target.value||'Mi interactivo';markDirty();});
$('#setTransition').addEventListener('change',function(e){P.theme.transition=e.target.value;markDirty();});
$('#setAccent').addEventListener('input',function(e){P.theme.accent=e.target.value;markDirty();});
