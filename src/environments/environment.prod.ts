export const environment = {
  production: true,
  apiUrl: 'https://dev.notariabohorquezvega.com.pe/api',
  portalUrl: 'https://dev.notariabohorquezvega.com.pe/',
  websocket: {
    // Usamos el dominio principal, sin puerto adicional
    host: 'dev.notariabohorquezvega.com.pe',
    port: 443,
    key: 'messaging',
    forceTLS: true,
    encrypted: true,
    scheme: 'https'
  }
};
