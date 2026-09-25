const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8001',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`🔄 Proxy: ${req.method} ${req.url} -> http://127.0.0.1:8001${req.url}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`✅ Response: ${proxyRes.statusCode} ${req.url}`);
      },
      onError: (err, req, res) => {
        console.error(`❌ Proxy Error: ${err.message} for ${req.url}`);
      }
    })
  );
};
