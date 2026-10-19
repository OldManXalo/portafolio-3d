/*
 * Datos de contacto del portafolio.
 * WhatsApp va en formato internacional sin "+" ni espacios (ej. 584121234567).
 * Los botones solo abren el correo o WhatsApp del visitante: la web no envía nada.
 */
window.CONTACTO = {
  correo: 'xalomrtnz@gmail.com',
  whatsapp: '584121125794',
  asunto: 'Quiero una web 3D',
  mensaje: 'Hola, vi tu portafolio y quiero hablar de una web para mi negocio.'
};

(function () {
  var c = window.CONTACTO;
  function poner() {
    var correo = document.getElementById('btn-correo');
    var wa = document.getElementById('btn-whatsapp');
    if (correo) correo.href = 'mailto:' + c.correo + '?subject=' + encodeURIComponent(c.asunto) +
      '&body=' + encodeURIComponent(c.mensaje);
    if (wa) wa.href = 'https://wa.me/' + c.whatsapp + '?text=' + encodeURIComponent(c.mensaje);
    var anio = document.getElementById('anio');
    if (anio) anio.textContent = new Date().getFullYear();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poner);
  else poner();
})();
