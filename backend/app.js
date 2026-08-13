const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const indexRoutes = require('./routes/index');
const entradaRoutes = require('./routes/entrada');
const atletasRoutes = require('./routes/atletas');
const campeonatosRoutes = require('./routes/campeonatos');
const equipesRoutes = require('./routes/equipes');
const partidasRoutes = require('./routes/partidas');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRoutes);
app.use('/', entradaRoutes);
app.use('/', atletasRoutes);
app.use('/', campeonatosRoutes);
app.use('/', equipesRoutes);
app.use('/', partidasRoutes);

module.exports = app;
