
const UI = {
 escape(value=''){
  return String(value)
   .replaceAll('&','&amp;')
   .replaceAll('<','&lt;')
   .replaceAll('>','&gt;')
   .replaceAll('"','&quot;')
   .replaceAll("'",'&#039;');
 },
 icon(name,size=20){
  const icons={
   home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>',
   today:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m9 16 2 2 4-5"/>',
   progress:'<path d="M4 19V9M10 19V5M16 19v-8M22 19V2"/>',
   heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/>',
   bike:'<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h3M10 7l3 10h5.5M10 7 5.5 17.5M10 7h4l-3 5H6"/>',
   arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
   check:'<path d="m5 12 4 4L19 6"/>',
   alert:'<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/>'
  };
  return `<svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.arrow}</svg>`;
 },
 card({className='',eyebrow='',title='',body='',action='',footer=''}={}){
  return `<section class="ds-card ${className}">
   ${eyebrow?`<div class="ds-eyebrow">${this.escape(eyebrow)}</div>`:''}
   ${title?`<h2 class="ds-card-title">${title}</h2>`:''}
   ${body}
   ${footer?`<div class="ds-card-footer">${footer}</div>`:''}
   ${action}
  </section>`;
 },
 button(label,onClick,variant='primary',icon='arrow'){
  return `<button class="ds-button ds-button-${variant}" onclick="${onClick}">
   <span>${this.escape(label)}</span>${icon?this.icon(icon,18):''}
  </button>`;
 },
 badge(label,tone='neutral'){
  return `<span class="ds-badge ds-badge-${tone}">${this.escape(label)}</span>`;
 },
 progress(value,label=''){
  const safe=Math.max(0,Math.min(100,Number(value)||0));
  return `<div class="ds-progress-wrap">
   <div class="ds-progress"><i style="width:${safe}%"></i></div>
   ${label?`<span>${this.escape(label)}</span>`:''}
  </div>`;
 }
};
