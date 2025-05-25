const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Global middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auto-load apps
const appsDir = path.join(__dirname, 'apps');
const apps = fs
  .readdirSync(appsDir)
  .filter(f => fs.statSync(path.join(appsDir, f)).isDirectory())
  .map(slug => {
    const appPath = path.join(appsDir, slug);
    const router = require(appPath);
    return { slug, router };
  });

// Mount app routes and static files
apps.forEach(({ slug, router }) => {
  app.use(`/apps/${slug}`, router);
  app.use(`/apps/${slug}`, express.static(path.join(__dirname, 'public', 'apps', slug)));
});

// Root route
app.get('/', (req, res) => {
  const appsList = apps
    .map(({ slug }) => `<li><a href="/apps/${slug}">${slug}</a></li>`)
    .join('\n');
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>App Library</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          ul { list-style-type: none; padding: 0; }
          li { margin: 10px 0; }
          a { text-decoration: none; color: #007bff; font-size: 18px; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Available Apps</h1>
        <ul>${appsList}</ul>
      </body>
    </html>
  `);
});

// Global error handler
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});
