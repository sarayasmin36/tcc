const express = require('express');
const path = require('path');
const session = require('express-session');

const entradaRoutes = require('./routes/entrada');
const atletasRoutes = require('./routes/atletas');
const equipesRoutes = require('./routes/equipes');
const partidasRoutes = require('./routes/partidas');
const campeonatosRoutes = require('./routes/campeonatos');
const indexRoutes = require('./routes/index');
const relatoriosRoutes = require('./routes/relatorios');
const perfilRoutes = require('./routes/perfil');

const app = express();

app.use(session({
    secret: 'chave_secreta',
    resave: false,
    saveUninitialized: false
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('view cache');



app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', entradaRoutes);
app.use('/', atletasRoutes);
app.use('/', equipesRoutes);
app.use('/', partidasRoutes);
app.use('/', campeonatosRoutes);
app.use('/', relatoriosRoutes);
app.use('/', perfilRoutes);

app.use('/', indexRoutes);


app.use((req, res) => {
  res.status(404).send(`Página não encontrada: ${req.method} ${req.originalUrl}`);
});

module.exports = app;
