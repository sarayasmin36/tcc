const express = require('express');
const router = express.Router();

router.get('/equipes', (req, res) => {
    res.render('equipes/listar', {
        usuario: req.session ? req.session.usuario : null,
        mensagem: null,
        equipes: []
    });
});

module.exports = router;