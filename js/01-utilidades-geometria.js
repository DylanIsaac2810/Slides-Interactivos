/* Utilidades y geometría de zonas (compartidas por el editor y la exportación) */
function slug(s){
    return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'recurso';
}
function dataURLtoBytes(u){
    var i=u.indexOf(','), bin=atob(u.slice(i+1)), a=new Uint8Array(bin.length);
    for(var k=0;k<bin.length;k++) a[k]=bin.charCodeAt(k);
    return a;
}
function mimeExt(m){
    return ({'image/png':'png','image/jpeg':'jpg','image/jpg':'jpg','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg'})[m]||'png';
}
function round1(n){ return Math.round(n*10)/10; }
function round2(n){ return Math.round(n*100)/100; }

/* Polígono regular de n lados normalizado al cuadro (0-100 %). rot = giro en grados; con rot=0 un vértice apunta hacia arriba. */
function regularPts(n,rot){
    var a0=-90+rot, pts=[], i, a, x, y, mnx=1e9, mxx=-1e9, mny=1e9, mxy=-1e9;
    for(i=0;i<n;i++){
        a=(a0+360*i/n)*Math.PI/180; x=Math.cos(a); y=Math.sin(a);
        pts.push([x,y]);
        if(x<mnx)mnx=x; if(x>mxx)mxx=x; if(y<mny)mny=y; if(y>mxy)mxy=y;
    }
    return pts.map(function(q){return [(q[0]-mnx)/(mxx-mnx)*100,(q[1]-mny)/(mxy-mny)*100];});
}
/* Valor CSS clip-path de una zona (relativo a su propio cuadro, por eso es responsivo). Vacío = rectángulo. */
function defVs(){return {fill:'#2e6da4',op:.9,str:'#ffffff',sw:2,txt:'Botón',col:'#ffffff',fs:15,b:true,rad:14,sh:true};}
function visPts(p){
    var pts;
    if(p.shape==='custom'){var l=p.x-p.w/2,t=p.y-p.h/2,w=Math.max(p.w,0.01),h=Math.max(p.h,0.01);pts=p.pts.map(function(q){return [(q[0]-l)/w*100,(q[1]-t)/h*100];});}
    else pts=regularPts(p.n,p.rot);
    return pts.map(function(q){return round2(q[0])+','+round2(q[1]);}).join(' ');
}
function visFor(p){
    if(!p.vis)return null;
    var v=Object.assign(defVs(),p.vs||{}), k=p.shape==='rect'?'rect':(p.shape==='ellipse'?'ellipse':'poly');
    v.k=k; v.pts=(k==='poly')?visPts(p):'';
    return v;
}
function itvVisHTML(p){
    var v=p.vs; if(!v) return '';
    function rgba(c,a){var n=parseInt(String(c).slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}
    var st='left:'+(p.x-p.w/2)+'%;top:'+(p.y-p.h/2)+'%;width:'+p.w+'%;height:'+p.h+'%', sh=v.sh?' itv-vsh':'', body;
    if(v.k==='poly') body='<svg class="itv-vs'+sh+'" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="'+itvEsc(v.pts)+'" fill="'+itvEsc(v.fill)+'" fill-opacity="'+v.op+'" stroke="'+itvEsc(v.str)+'" stroke-width="'+v.sw+'" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
    else body='<span class="itv-vs'+sh+'" style="background:'+rgba(v.fill,v.op)+';border:'+v.sw+'px solid '+itvEsc(v.str)+';border-radius:'+(v.k==='ellipse'?'50%':v.rad+'cqw')+'"></span>';
    if(String(v.txt||'').trim()) body+='<span class="itv-vt" style="font-size:'+v.fs+'cqw;color:'+itvEsc(v.col)+';font-weight:'+(v.b?700:400)+'">'+itvEsc(v.txt).replace(/\n/g,'<br>')+'</span>';
    return '<span class="itv-vb" style="'+st+'">'+body+'</span>';
}
function clipFor(p){
    if(p.shape==='rect') return '';
    if(p.shape==='ellipse') return 'ellipse(50% 50% at 50% 50%)';
    var pts;
    if(p.shape==='custom'){
        var l=p.x-p.w/2, t=p.y-p.h/2, w=Math.max(p.w,0.01), h=Math.max(p.h,0.01);
        pts=p.pts.map(function(q){return [(q[0]-l)/w*100,(q[1]-t)/h*100];});
    } else pts=regularPts(p.n,p.rot);
    return 'polygon('+pts.map(function(q){return round2(q[0])+'% '+round2(q[1])+'%';}).join(',')+')';
}
