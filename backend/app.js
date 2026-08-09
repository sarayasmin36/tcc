const express = require('express');
const bodyParser = require('body-parser');

const indexRoutes = require('./routes/index');
const entradaRoutes = require('./routes/entrada');

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', indexRoutes);
app.use('/', entradaRoutes);

module.exports = app;
