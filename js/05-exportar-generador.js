/* Armado de datos, index.html y archivos del ZIP, y HTML de la vista previa */
function buildData(P,paths,imgSrc){
    function nameOf(id){
        for(var i=0;i<P.screens.length;i++) if(P.screens[i].id===id) return P.screens[i].name;
        return '';
    }
    return {
        title:P.title,
        theme:{transition:P.theme.transition,accent:P.theme.accent||'#5b3a8e'},
        screens:P.screens.map(function(s,i){
            return {
                id:s.id, name:s.name, alt:s.name,
                src:paths[i],
                hotspots:s.hotspots.map(function(p){
                    var b={shape:p.shape,n:p.n,rot:p.rot,pts:p.pts,x:round2(p.x),y:round2(p.y),w:round2(p.w),h:round2(p.h)};
                    var o={x:b.x,y:b.y,w:b.w,h:b.h,action:p.action};
                    var clip=clipFor(b); if(clip) o.clip=clip;
                    if(p.hv){o.hv=p.hv;o.hc=p.hc||'#7fa9d6';}
                    var vsd=visFor(p); if(vsd)o.vs=vsd;
                    if(p.action==='goto'){ o.target=p.target; o.label='Ir a: '+nameOf(p.target); }
                    else if(p.action==='link'){ o.url=p.url; o.label='Abrir enlace'; }
                    else if(p.action==='close'){ o.label='Cerrar interactivo'; }
                    else if(p.action==='float'){
                        var fq=p.fl||{x:5,y:5,w:34};
                        o.popup=popData(p.popup,imgSrc);
                        o.fl={x:round2(fq.x),y:round2(fq.y),w:round2(fq.w)};
                        o.els=(p.els||[]).map(function(e){var c={};Object.keys(e).forEach(function(k){if(k!=='id')c[k]=(typeof e[k]==='number')?round2(e[k]):e[k];});return c;});
                        o.label='Mostrar elementos flotantes'+(o.popup.title?': '+o.popup.title:'');
                    }
                    else if(p.action==='popup'){
                        o.popup=popData(p.popup,imgSrc);
                        o.label='Abrir información'+(o.popup.title?': '+o.popup.title:'');
                    }
                    return o;
                })
            };
        })
    };
}
function genJS(P,paths,imgSrc){
    var json=JSON.stringify(buildData(P,paths,imgSrc),null,1).replace(/</g,'\\u003c');
    return '/* Interactivo generado con el Generador de interactivos · ESTur IPN */\n'+
        '(function(){\n'+
        'var DATA = '+json+';\n\n'+
        itvEsc.toString()+'\n'+itvMd.toString()+'\n'+itvPopupHTML.toString()+'\n'+itvOvHTML.toString()+'\n'+itvVisHTML.toString()+'\n\n'+
        '('+itvRuntime.toString()+')(DATA);\n'+
        '})();\n';
}
function genHTML(P){
    return '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'+
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'+
        '<title>'+P.title.replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];})+'</title>\n'+
        '<link rel="stylesheet" href="style.css">\n</head>\n<body style="margin:0;background:transparent">\n'+
        '<div class="itv" id="itv"></div>\n<script src="script.js"><\/script>\n</body>\n</html>\n';
}
function buildFiles(P){
    var enc=new TextEncoder(), files=[], paths=[], popPaths=new Map(), k=0;
    P.screens.forEach(function(s,i){
        var n=('0'+(i+1)).slice(-2)+'-'+slug(s.name)+'.'+mimeExt(s.mime);
        paths.push('assets/'+n);
        files.push({name:'assets/'+n,data:dataURLtoBytes(s.data)});
    });
    /* Imágenes de los pop-ups (las repetidas se guardan una sola vez) */
    P.screens.forEach(function(s){ s.hotspots.forEach(function(p){
        if((p.action!=='popup'&&p.action!=='float')||!p.popup) return;
        p.popup.blocks.forEach(function(b){
            if(b.type!=='image'||!b.data||popPaths.has(b.data)) return;
            k++;
            var n='assets/popup-'+('0'+k).slice(-2)+'.'+mimeExt(b.mime);
            popPaths.set(b.data,n);
            files.push({name:n,data:dataURLtoBytes(b.data)});
        });
    }); });
    return [
        {name:'index.html',data:enc.encode(genHTML(P))},
        {name:'style.css',data:enc.encode(EXPORT_CSS)},
        {name:'script.js',data:enc.encode(genJS(P,paths,function(b){return popPaths.get(b.data);}))},
        {name:slug(P.title)+'.itv.json',data:enc.encode(serializeProject())}
    ].concat(files);
}
function buildPreviewHTML(P){
    var paths=P.screens.map(function(s){return s.blob;});
    var js=genJS(P,paths,function(b){return b.blob;}).replace(/<\/script/gi,'<\\/script');
    return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
        '<style>'+EXPORT_CSS+'</style></head><body style="margin:0"><div class="itv" id="itv"></div><script>'+js+'<\/script></body></html>';
}
