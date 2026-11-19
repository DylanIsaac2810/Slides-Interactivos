/* Editor: elementos del slide, pop-ups y elementos flotantes */
/* =====================  EDITOR DE POP-UPS  ===================== */
var BLOCK_NAMES={heading:'Subtítulo',text:'Texto',image:'Imagen / figura',note:'Destacado'};
var peP=null, peReplace=-1, peRaf=0;
function newPopup(){return {title:'',size:'md',blocks:[{id:uid(),type:'text',text:''}]};}
function popEdOpen(){return !$('#popEd').hidden;}
function visHTML(sc){
    return sc.hotspots.map(function(p){var v=visFor(p);return v?itvVisHTML({x:p.x,y:p.y,w:p.w,h:p.h,vs:v}):'';}).join('');
}
function visPanel(p){
    var h='<div style="border-top:1px solid #ddd;margin:12px 0 8px"></div><label style="display:flex;gap:8px;align-items:center;font-weight:700;cursor:pointer"><input type="checkbox" data-vs="vis"'+(p.vis?' checked':'')+'> SER VISIBLE EN PANTALLA</label>';
    if(!p.vis)return h+'<p class="hint">Convierte esta zona en un botón visible sobre el slide, con color, contorno y texto personalizables.</p>';
    var v=Object.assign(defVs(),p.vs||{});
    function f(l,k,t,val,x){return '<label>'+l+'<input type="'+t+'" data-vs="'+k+'" value="'+esc(String(val))+'" '+(x||'')+'></label>';}
    function c(l,k,val){return '<label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" data-vs="'+k+'"'+(val?' checked':'')+'> '+l+'</label>';}
    h+='<details data-sec="vis"'+(secOpen.vis?' open':'')+' style="margin-top:8px"><summary style="cursor:pointer;font-weight:600">Opciones del botón visible</summary>'+
        f('Texto del botón (opcional)','txt','text',v.txt)+f('Color del texto','col','color',v.col)+f('Tamaño del texto (proporcional al botón)','fs','number',v.fs,'step="1" min="3" max="40"')+c('Texto en negrita','b',v.b)+
        f('Color de relleno','fill','color',v.fill)+f('Opacidad del relleno (%)','op','number',Math.round(v.op*100),'step="5" min="0" max="100"')+
        f('Color del contorno','str','color',v.str)+f('Grosor del contorno (px)','sw','number',v.sw,'step="0.5" min="0" max="20"')+
        (p.shape==='rect'?f('Esquinas redondeadas','rad','number',v.rad,'step="1" min="0" max="50"'):'')+c('Sombra','sh',v.sh)+'</details>';
    return h;
}
$('#props').addEventListener('toggle',function(e){var d=e.target;if(d&&d.dataset&&d.dataset.sec)secOpen[d.dataset.sec]=d.open;},true);
$('#props').addEventListener('input',function(e){
    var t=e.target,p=curP(); if(!p||!t.dataset.vs)return;
    var k=t.dataset.vs, v=(t.type==='checkbox')?t.checked:t.value;
    if(k==='vis'){p.vis=v;if(v&&!p.vs)p.vs=defVs();markDirty();renderHotspots();renderProps();return;}
    if(!p.vs)p.vs=defVs();
    if(t.type==='number'){v=parseFloat(v);if(isNaN(v))return;}
    if(k==='op')v=clamp(v,0,100)/100; else if(k==='sw')v=clamp(v,0,20); else if(k==='fs')v=clamp(v,3,40); else if(k==='rad')v=clamp(v,0,50);
    p.vs[k]=v;markDirty();renderHotspots();
});
var clip=null, ctrlTap=false, chain=null;
function selLine(){var p=curP();if(!p||!selEl||!p.els)return null;var el=p.els.find(function(x){return x.id===selEl;});return(el&&el.t==='line')?{p:p,el:el}:null;}
function lineLen(el){var sc=scr();return Math.hypot((el.x2-el.x)*sc.w/100,(el.y2-el.y)*sc.h/100);}
/* Coloca la recta con un ángulo dado (en píxeles reales, no en %), girando alrededor del extremo piv (1=inicio, 2=final). */
function setLineAng(el,ang,len,piv){
    var sc=scr(),W=sc.w,H=sc.h,ox=piv===2?el.x2:el.x,oy=piv===2?el.y2:el.y;
    var ux=Math.cos(ang)/W*100,uy=Math.sin(ang)/H*100,t=len;
    if(ux>1e-9)t=Math.min(t,(100-ox)/ux);else if(ux<-1e-9)t=Math.min(t,(0-ox)/ux);
    if(uy>1e-9)t=Math.min(t,(100-oy)/uy);else if(uy<-1e-9)t=Math.min(t,(0-oy)/uy);
    var nx=ox+ux*t,ny=oy+uy*t;
    if(piv===2){el.x=nx;el.y=ny;}else{el.x2=nx;el.y2=ny;}
}
function lineAimTo(el,q,snap,piv,fixedLen){
    var sc=scr(),ox=piv===2?el.x2:el.x,oy=piv===2?el.y2:el.y;
    var dx=(q.x-ox)*sc.w/100,dy=(q.y-oy)*sc.h/100; if(Math.abs(dx)+Math.abs(dy)<0.5)return;
    var ang=Math.atan2(dy,dx); if(snap)ang=Math.round(ang/(Math.PI/4))*(Math.PI/4);
    setLineAng(el,ang,fixedLen!=null?fixedLen:Math.hypot(dx,dy),piv);
}
function lineStraighten(el){
    var sc=scr(),dx=(el.x2-el.x)*sc.w/100,dy=(el.y2-el.y)*sc.h/100,len=Math.hypot(dx,dy); if(len<0.5)return;
    setLineAng(el,Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4),len,1);
}
function doCopy(){
    var p=curP();
    if(p&&selEl&&p.els){var el=p.els.find(function(x){return x.id===selEl;});if(el){clip={k:'el',d:JSON.parse(JSON.stringify(el)),n:0};toast('Elemento copiado');return true;}}
    if(p){clip={k:'hot',d:JSON.parse(JSON.stringify(p)),n:0};toast('Zona copiada');return true;}
    return false;
}
function doPaste(){
    if(!clip)return false;
    var sc=scr(); if(!sc)return false;
    var c=JSON.parse(JSON.stringify(clip.d)),off=2*(++clip.n);
    c.id=uid();
    if(clip.k==='el'){
        var p=curP();
        if(!p||p.action!=='float'){toast('Selecciona una zona con elementos flotantes para pegar el elemento');return true;}
        c.x=Math.min(c.x+off,100-(c.w||0));c.y=Math.min(c.y+off,100-(c.h||0));
        if(c.t==='line'){c.x2=Math.min(c.x2+off,100);c.y2=Math.min(c.y2+off,100);}
        (p.els=p.els||[]).push(c);selEl=c.id;
        toast('Elemento pegado');
        markDirty();renderHotspots();renderProps();return true;
    }
    sc.hotspots.push(c);moveBy(c,off,off);sel=c.id;selEl=null;
    toast('Zona pegada');
    markDirty();renderScreens();renderHotspots();renderChips();renderProps();return true;
}
window.addEventListener('keyup',function(e){
    if(e.key==='Control'&&ctrlTap){ctrlTap=false;var a=document.activeElement;if(!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))chainLine();}
});
window.addEventListener('blur',function(){ctrlTap=false;});
function chainLine(){
    var src,p;
    if(chain){src=chain.el;p=chain.p;}else{var ln=selLine();if(!ln)return;src=ln.el;p=ln.p;}
    if(lineLen(src)<2)return;
    var n=JSON.parse(JSON.stringify(src));n.id=uid();n.x=src.x2;n.y=src.y2;n.x2=src.x2;n.y2=src.y2;
    p.els.push(n);selEl=n.id;chain={p:p,el:n};
    markDirty();renderHotspots();renderProps();
    toast('Nueva recta: mueve el mouse y haz clic para fijarla. Ctrl: seguir con otra. Esc: cancelar.');
}
function cancelChain(){
    if(!chain)return;
    var id=chain.el.id,p=chain.p;p.els=p.els.filter(function(x){return x.id!==id;});
    selEl=null;chain=null;renderHotspots();renderProps();
}
var EL_NAMES={ell:'Círculo',rect:'Rectángulo',line:'Línea',text:'Texto'};
function hvPanel(p){
    var o=[['','Ninguno'],['tr','Flecha a la derecha de la zona'],['tl','Flecha a la izquierda de la zona'],['tt','Flecha arriba de la zona'],['tb','Flecha abajo de la zona'],['ring','Aro alrededor de la zona'],['glow','Resaltar la zona']];
    return '<label>Efecto al pasar el mouse<select data-f="hv">'+o.map(function(x){return '<option value="'+x[0]+'"'+((p.hv||'')===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></label>'+
        '<label>Color del efecto<input type="color" data-f="hc" value="'+(p.hc||'#7fa9d6')+'"></label>';
}
function elPanel(p,key){
    var els=p.els||[], e=els.find(function(x){return x.id===selEl;});
    function fld(l,k,t,v,x){return '<label>'+l+'<input type="'+t+'" data-el="'+k+'" value="'+esc(String(v))+'" '+(x||'')+'></label>';}
    var h='<details data-sec="'+(key||'el')+'"'+(secOpen[key||'el']?' open':'')+' style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Elementos sobre el slide</summary>'+
        '<p class="hint">Se muestran al hacer clic en la zona. Añade formas, líneas o textos y arrástralos directamente en la imagen (Supr los elimina). Con una recta seleccionada: Shift la endereza (pasos de 45°) y un toque de Ctrl la fija y empieza otra recta desde su extremo.</p>'+
        '<div class="btnrow"><button data-act="el-add" data-t="ell">◯ Círculo</button><button data-act="el-add" data-t="dot">● Punto</button><button data-act="el-add" data-t="rect">▭ Rectángulo</button><button data-act="el-add" data-t="line">╱ Línea</button><button data-act="el-add" data-t="text">T Texto</button></div>';
    if(els.length)h+='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">'+els.map(function(x,i){return '<button class="chip'+(x.id===selEl?' on':'')+'" data-act="el-sel" data-id="'+x.id+'">'+(i+1)+' · '+EL_NAMES[x.t]+'</button>';}).join('')+'</div>';
    if(e){
        if(e.t==='text'){
            h+='<label>Texto<textarea data-el="txt" rows="3">'+esc(e.txt)+'</textarea></label>'+
                fld('Tamaño (1 = pequeño, 3 = grande)','fs','number',e.fs,'step="0.1" min="0.8" max="12"')+fld('Color','col','color',e.col)+
                '<label><input type="checkbox" data-el="b"'+(e.b?' checked':'')+'> Negrita</label>'+
                '<label>Alineación<select data-el="al">'+['left','center','right'].map(function(a){return '<option value="'+a+'"'+(e.al===a?' selected':'')+'>'+{left:'Izquierda',center:'Centrado',right:'Derecha'}[a]+'</option>';}).join('')+'</select></label>';
        }else if(e.t==='line'){
            h+=fld('Color','str','color',e.str)+fld('Grosor (px)','sw','number',e.sw,'step="0.5" min="0.5" max="12"');
        }else{
            h+=fld('Relleno','fill','color',e.fill)+fld('Opacidad del relleno (%)','op','number',Math.round(e.op*100),'step="5" min="0" max="100"')+
                fld('Borde','str','color',e.str)+fld('Grosor del borde (px)','sw','number',e.sw,'step="0.5" min="0" max="12"');
        }
        h+='<div class="btnrow"><button data-act="el-dup">Duplicar</button><button data-act="el-front">Al frente</button><button data-act="el-del" class="danger">Eliminar</button></div>';
    }
    return h+'</details>';
}
function addEl(p,t){
    var sc=scr(), r=sc.w/sc.h;
    var e={id:uid(),t:t,x:40,y:40,w:12,h:12*r,x2:56,y2:40,fill:'#9fc3e6',str:'#3b6ea5',sw:2,op:.35,txt:'Texto',fs:2.2,col:'#1f3d6e',b:true,al:'left'};
    if(t==='dot'){e.t='ell';e.w=2;e.h=2*r;e.op=1;e.fill='#c9d9ec';}
    if(t==='rect')e.h=9;
    if(t==='line'){e.x=35;e.y=40;e.x2=55;e.y2=40;}
    if(t==='text'){e.w=30;e.h=4;}
    (p.els=p.els||[]).push(e);selEl=e.id;markDirty();renderHotspots();renderProps();
}
function delEl(p){chain=null;p.els=(p.els||[]).filter(function(x){return x.id!==selEl;});selEl=null;markDirty();renderHotspots();renderProps();}
$('#props').addEventListener('input',function(e){
    var t=e.target,p=curP(); if(!p||!t.dataset.el||!p.els)return;
    var el=p.els.find(function(x){return x.id===selEl;}); if(!el)return;
    var k=t.dataset.el, v=(t.type==='checkbox')?t.checked:t.value;
    if(t.type==='number'){v=parseFloat(v);if(isNaN(v))return;}
    if(k==='op')v=clamp(v,0,100)/100; else if(k==='sw')v=clamp(v,0,12); else if(k==='fs')v=clamp(v,0.8,12);
    el[k]=v;markDirty();renderHotspots();
});
$('#props').addEventListener('click',function(e){
    var b=e.target.closest('[data-act^="el-"]'), p=curP(); if(!b||!p)return;
    var k=b.dataset.act, els=p.els||[], i=els.findIndex(function(x){return x.id===selEl;});
    if(k==='el-add'){addEl(p,b.dataset.t);return;}
    if(k==='el-sel'){selEl=b.dataset.id;renderHotspots();renderProps();return;}
    if(i<0)return;
    if(k==='el-del'){delEl(p);return;}
    if(k==='el-dup'){var c=JSON.parse(JSON.stringify(els[i]));c.id=uid();c.x=Math.min(c.x+2,100-(c.w||0));c.y=Math.min(c.y+2,100-(c.h||0));if(c.t==='line'){c.x2=Math.min(c.x2+2,100);c.y2=Math.min(c.y2+2,100);}els.push(c);selEl=c.id;}
    else if(k==='el-front'){els.push(els.splice(i,1)[0]);}
    markDirty();renderHotspots();renderProps();
});
function defFl(p){var w=34,x=p.x+p.w/2+2;if(x+w>100)x=Math.max(0,p.x-p.w/2-2-w);return {x:round1(clamp(x,0,100-w)),y:round1(clamp(p.y-p.h/2,0,70)),w:w};}
function ensureFl(p){if(!p.fl)p.fl=defFl(p);return p.fl;}
function setFl(p,k,v){var f=ensureFl(p);if(k==='w')f.w=clamp(v,10,100);else if(k==='x')f.x=v;else f.y=v;f.x=clamp(f.x,0,100-f.w);f.y=clamp(f.y,0,100);}

function openPopEd(p){
    peP=p;
    $('#peTitle').value=p.popup.title;$('#peSize').value=p.popup.size;
    $('#peSize').parentNode.style.display=(p.action==='float')?'none':'';
    $('#peHead').textContent=(p.action==='float')?'Contenido del elemento flotante':'Contenido del pop-up';
    renderPeBlocks();renderPePreview();
    $('#popEd').hidden=false;
    setTimeout(function(){$('#peTitle').focus();},0);
}
function closePopEd(){
    if(!popEdOpen())return;
    $('#popEd').hidden=true;peP=null;
    renderProps();renderScreens();
}
function renderPeBlocks(){
    var bl=peP.popup.blocks;
    $('#peBlocks').innerHTML=bl.length?bl.map(function(b,i){
        var h='<div class="pb-h"><span class="pb-t">'+BLOCK_NAMES[b.type]+'</span><span class="spacer"></span>'+
            '<button data-pb="up" title="Subir"'+(i===0?' disabled':'')+'>↑</button><button data-pb="down" title="Bajar"'+(i===bl.length-1?' disabled':'')+'>↓</button>'+
            '<button data-pb="del" class="danger" title="Quitar bloque">✕</button></div>', body;
        if(b.type==='heading') body='<input data-pf="text" value="'+esc(b.text)+'" placeholder="Subtítulo de la sección">';
        else if(b.type==='text') body='<textarea data-pf="text" rows="5" placeholder="Escribe aquí el texto explicativo…">'+esc(b.text)+'</textarea>';
        else if(b.type==='note') body='<textarea data-pf="text" rows="3" placeholder="Dato curioso, advertencia o idea clave…">'+esc(b.text)+'</textarea>';
        else body='<div class="pb-img"><img src="'+b.blob+'" alt=""><div><button data-pb="replace">Cambiar imagen</button><small>'+b.w+' × '+b.h+' px</small></div></div>'+
            '<select data-pf="width" aria-label="Tamaño de la imagen">'+[['full','Ancho completo'],['md','Mediana (60 %)'],['sm','Pequeña (35 %)']].map(function(o){return '<option value="'+o[0]+'"'+((b.width||'full')===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+
            '<input data-pf="caption" value="'+esc(b.caption)+'" placeholder="Pie de figura (opcional). Ej. Fig. 1. Mapa de la zona arqueológica">'+
            '<input data-pf="alt" value="'+esc(b.alt)+'" placeholder="Descripción para lectores de pantalla (accesibilidad)">';
        return '<div class="pb" data-bi="'+i+'">'+h+body+'</div>';
    }).join(''):'<p class="hint">El pop-up está vacío. Agrega bloques con los botones de abajo.</p>';
}
function renderPePreview(){
    if(!peP)return;
    var box=$('#pePrev');
    box.style.setProperty('--itv-accent',P.theme.accent||'#5b3a8e');
    box.innerHTML='<div class="itv-pop-box itv-pop-'+peP.popup.size+'">'+itvPopupHTML(popData(peP.popup,function(b){return b.blob;}),'pe')+'</div>';
}
function schedulePePreview(){cancelAnimationFrame(peRaf);peRaf=requestAnimationFrame(renderPePreview);}

$('#peTitle').addEventListener('input',function(e){peP.popup.title=e.target.value;markDirty();schedulePePreview();});
$('#peSize').addEventListener('change',function(e){peP.popup.size=e.target.value;markDirty();renderPePreview();});
$('#peBlocks').addEventListener('input',function(e){
    var f=e.target.dataset.pf, wrap=e.target.closest('[data-bi]'); if(!f||!wrap)return;
    peP.popup.blocks[+wrap.dataset.bi][f]=e.target.value;markDirty();schedulePePreview();
});
$('#peBlocks').addEventListener('click',function(e){
    var b=e.target.closest('[data-pb]'), wrap=e.target.closest('[data-bi]'); if(!b||!wrap)return;
    var bl=peP.popup.blocks, i=+wrap.dataset.bi, act=b.dataset.pb;
    if(act==='replace'){peReplace=i;$('#peFile').multiple=false;$('#peFile').click();return;}
    if(act==='del'){
        var hasData=bl[i].type==='image'||String(bl[i].text||'').trim();
        if(hasData&&!confirm('¿Quitar este bloque?'))return;
        bl.splice(i,1);
    }else{
        var j=i+(act==='up'?-1:1); if(j<0||j>=bl.length)return;
        var t=bl[i];bl[i]=bl[j];bl[j]=t;
    }
    markDirty();renderPeBlocks();renderPePreview();
});
document.querySelector('#popEd .btnrow').addEventListener('click',function(e){
    var b=e.target.closest('[data-add]'); if(!b||!peP)return;
    var type=b.dataset.add;
    if(type==='image'){peReplace=-1;$('#peFile').multiple=true;$('#peFile').click();return;}
    peP.popup.blocks.push({id:uid(),type:type,text:''});
    markDirty();renderPeBlocks();renderPePreview();
    var all=$('#peBlocks').querySelectorAll('[data-pf="text"]'); if(all.length)all[all.length-1].focus();
});
async function addPopupImages(files){
    if(!peP)return;
    var list=Array.prototype.filter.call(files,function(f){return f.type.indexOf('image/')===0;});
    if(!list.length)return;
    try{
        busy('Preparando imagen…');
        for(var k=0;k<list.length;k++){
            var im=await prepPopupImage(list[k]);
            if(peReplace>=0&&peP.popup.blocks[peReplace]&&k===0){
                var b=peP.popup.blocks[peReplace];
                Object.assign(b,im);b.blob=blobOf(b.data,b.mime);
            }else{
                var nb={id:uid(),type:'image',width:'full',caption:'',alt:list[k].name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')};
                Object.assign(nb,im);nb.blob=blobOf(nb.data,nb.mime);
                peP.popup.blocks.push(nb);
            }
        }
    }catch(err){alert(err.message||err);}
    finally{busy(null);peReplace=-1;}
    markDirty();renderPeBlocks();renderPePreview();
}
$('#peFile').onchange=function(e){addPopupImages(e.target.files);e.target.value='';};
$('#peDone').onclick=closePopEd;
$('#popEd').addEventListener('mousedown',function(e){if(e.target===this)closePopEd();});
