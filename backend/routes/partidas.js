const express = require('express');

const router = express.Router();

router.get('/partidas', (req, res) => {
    res.render('partidas/listar', {
        erro: null
    });
});

module.exports = router;