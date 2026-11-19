# Generador de interactivos para Moodle

Herramienta visual para crear recursos educativos interactivos sin programar.
Desarrollada para la Escuela Superior de Turismo (ESTur) del IPN.

Se sube una imagen o un PDF como "pantalla", se dibujan zonas clicables
transparentes encima y se configura qué hace cada una. El resultado se exporta
como un ZIP listo para usarse en Moodle.

## Características

- Pantallas a partir de imágenes o de páginas de un PDF.
- Zonas clicables transparentes: rectángulo, elipse, polígonos regulares
  (triángulo, rombo, pentágono, hexágono, etc.) y polígono libre, donde cada
  clic es un vértice. Las coordenadas se guardan en porcentaje, por lo que el
  resultado es responsivo.
- Acciones de cada zona:
    - Ir a otra pantalla.
    - Abrir un enlace.
    - Cerrar el interactivo.
    - Ventana emergente (pop-up) con texto, imágenes y figuras.
    - Elemento flotante sobre el slide, sin oscurecer ni bloquear el resto.
- Animación de transición entre pantallas (ninguna, desvanecer, deslizar, zoom).
- Guardar y abrir proyectos (`.itv.json`) para seguir editando después, y
  autoguardado de respaldo en el navegador (IndexedDB).
- Vista previa antes de exportar.
- Exportación a ZIP limpio: `index.html`, `style.css`, `script.js` y `assets/`.

## Estructura del proyecto

```
generador-interactivos/
├── editor.html                      Página del editor (solo estructura HTML)
├── css/
│   └── editor.css                   Estilos del editor
└── js/                              Scripts clásicos, se cargan en este orden
    ├── 01-utilidades-geometria.js   Utilidades y geometría de las zonas
    ├── 02-zip.js                    Generador de ZIP (CRC32, sin compresión)
    ├── 03-exportar-css.js           Plantilla del style.css exportado
    ├── 04-exportar-runtime.js       Código que se incrusta en el script.js exportado
    ├── 05-exportar-generador.js     Armado de index.html, datos y vista previa
    ├── 06-editor-base.js            Estado, carga de imágenes/PDF, lista de pantallas
    ├── 07-editor-formas-lienzo.js   Formas, lienzo y panel de propiedades
    ├── 08-editor-popups.js          Elementos del slide, pop-ups y elementos flotantes
    ├── 09-proyectos-autoguardado.js Guardar/abrir proyectos y autoguardado
    ├── 10-botones-teclado.js        Botones, arrastrar archivos, validación, atajos
    └── 11-iniciar.js                Arranque de la aplicación
```

### Importante

- Los scripts **no son módulos**: comparten el mismo ámbito global y dependen
  del orden. No cambies el orden de los `<script defer>` en `editor.html`.
- `04-exportar-runtime.js` se serializa con `Function.prototype.toString()` y
  se incrusta en el `script.js` que se exporta. Las funciones `itv...` de ese
  archivo deben seguir siendo autocontenidas (no pueden usar variables
  definidas fuera de ellas).
- Los archivos usan codificación UTF-8 sin BOM y sangría de 4 espacios.

## Requisitos

- Un navegador moderno (Chrome, Edge o Firefox actuales).
- No requiere instalación ni compilación. Es HTML, CSS y JavaScript puro.
- Para importar PDF se carga pdf.js (versión 3.11.174) desde cdnjs, por lo que
  se necesita conexión a internet en ese paso. Ver "Seguridad".

## Uso rápido

1. Abre `editor.html` en el navegador (desde el servidor, o con doble clic en local).
2. Pulsa **+ Subir imagen o PDF** para crear las pantallas.
3. Elige una forma y pulsa **Colocar zona**, o **Dibujar polígono libre**.
4. Selecciona la zona y configura su acción en el panel derecho.
5. Pulsa **Vista previa** para probar el recorrido.
6. Pulsa **Guardar** (Ctrl+S) para conservar el proyecto y seguir editando después.
7. Pulsa **Exportar ZIP** cuando esté terminado.

## Publicar el recurso exportado en Moodle

1. Descomprime el ZIP exportado.
2. En Moodle, sube la carpeta como recurso de paquete de contenido o página
   según lo que use la plataforma, o súbela al servidor y enlázala con un iframe.
3. Prueba siempre primero en un curso de pruebas.

## Instalación en un servidor (FileZilla)

1. Conéctate por **SFTP** (puerto 22). Usa FTPS si SFTP no está disponible.
2. Crea una carpeta propia, separada de Moodle, por ejemplo `generador-interactivos/`.
3. Sube la carpeta completa respetando nombres y subcarpetas. Los servidores
   Linux distinguen mayúsculas de minúsculas.
4. Modo de transferencia: Automático o Binario.
5. Abre `https://TU-DOMINIO/generador-interactivos/editor.html` y revisa que no
   haya errores en la consola del navegador (F12).

Notas:

- Guardar con selector de ubicación (`showSaveFilePicker`) solo funciona con
  HTTPS o `localhost`. En HTTP el navegador descargará el archivo.
- Después de actualizar archivos, recarga con Ctrl+F5 para evitar versiones en caché.

## Seguridad

Recomendaciones para producción:

- No alojarlo dentro del Moodle. Usar un dominio o subcarpeta aparte.
- Restringir el acceso con contraseña o lista de IPs: es una herramienta del equipo.
- Usar HTTPS y redirigir desde HTTP.
- Subir pdf.js a tu propio servidor con una versión corregida. La 3.11.174 está
  afectada por la vulnerabilidad CVE-2024-4367 (corregida en la 4.2.67).
- Validar que los enlaces de las zonas usen solo `http://` o `https://`.
- Añadir cabeceras de seguridad (CSP, `X-Content-Type-Options`, HSTS, etc.).
- Desactivar el listado de carpetas y no dejar respaldos en el servidor.
- En equipos compartidos, descartar el autoguardado al terminar.

## Formato del proyecto guardado

Archivo `.itv.json` con `format: "itv-project"` y un número de versión. Al
abrirlo, el editor valida y limpia el contenido antes de usarlo.

## Mantenimiento

- Cada archivo agrupa un tema. Para cambiar una función, búscala por el nombre
  del archivo según la estructura de arriba.
- Antes de cambiar el orden o dividir más los archivos, revisa que ninguna
  instrucción se ejecute antes de que exista la función que usa.
- Conviene versionar el código con Git y guardar copias del servidor antes de
  cada actualización.

## Créditos

Escuela Superior de Turismo, Instituto Politécnico Nacional (IPN).