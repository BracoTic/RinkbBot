export const environment = {
  production: false,
  // En dev el Angular dev-server proxea /api/* → localhost:3000 (proxy.conf.json)
  // En prod Express sirve dist/ y atiende /api/* él mismo
  // → mismo valor en ambos entornos, sin cambiar una sola línea de código
  apiBase: '/api',
};
