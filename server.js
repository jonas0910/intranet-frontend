const express = require('express');
const path = require('path');
const app = express();
const PORT = 4200;

// Servir archivos estáticos desde src/assets
app.use('/assets', express.static(path.join(__dirname, 'src/assets')));

// Servir la aplicación Angular
app.use(express.static(path.join(__dirname, 'dist/intranet-frontend/browser')));

// Para todas las rutas de Angular, servir index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/intranet-frontend/browser/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📁 Assets servidos desde: src/assets`);
  console.log(`🌐 Aplicación servida desde: dist/intranet-frontend/browser`);
});
