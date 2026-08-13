const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', {
        usuario: null,
        totalAtletas: 0,
        totalEquipes: 0,
        totalCampeonatos: 0,
        totalPartidas: 0,
        partidas: [],
        equipes: []
    });
});

module.exports = router;
