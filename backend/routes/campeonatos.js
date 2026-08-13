const express = require('express');

const router = express.Router();

router.get('/campeonatos', (req, res) => {
    res.render('campeonatos/listar', {
        erro: null
    });
});

module.exports = router;