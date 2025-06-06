const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 5008;

// 1) Serve your global public files (e.g. CSS/images)
app.use(express.static(path.join(__dirname, 'public')));

// 2) Dynamically load every .js in /apps as an Express Router
const appsDir = path.join(__dirname, 'apps');
const modules = fs
  .readdirSync(appsDir)
  .filter(f => f.endsWith('.js'))
  .map(f => {
    const slug   = f.replace('.js', '');
    const router = require(path.join(appsDir, f));
    return { slug, router };
  });

// 3) Mount each router _and_ its static UI folder
modules.forEach(({ slug, router }) => {
  // API/UI under /apps/<slug>
  app.use(`/apps/${slug}`, router);
  // static HTML/CSS/JS under public/apps/<slug>
  app.use(
    `/apps/${slug}`,
    express.static(path.join(__dirname, 'public', 'apps', slug))
  );
});

// 4) Root index: build a list of links to each slug
app.get('/', (req, res) => {
  // If you’re using a template engine (EJS, Pug…), you could:
  //    return res.render('index', { apps: modules.map(m=>m.slug) });
  //
  // Or just send a quick HTML list:
  const list = modules
    .map(m => `<li><a href="/${m.slug}">${m.slug}</a></li>`)
    .join('\n');
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>App Library</title></head>
      <body>
        <h1>Available Apps</h1>
        <ul>${list}</ul>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
