// Frontend/JavaScript/config.js
// Detección automática de entorno:
//   Desarrollo  → frontend en npx serve (puerto 8080) + backend en localhost:3000
//   Producción/LAN → Express sirve frontend y API desde el mismo origen
(function () {
  const devMode =
    window.location.hostname === "localhost" && window.location.port === "8080";
  // En dev usamos localhost:3000 explícito.
  // En cualquier otro caso (LAN, producción) usamos el mismo origen del navegador,
  // así el otro PC apunta a 192.168.2.3:3000 y no a su propio localhost.
  window.RINKBOT_API_BASE = devMode
    ? "http://localhost:3000"
    : window.location.origin;
})();
