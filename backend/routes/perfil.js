const express = require('express');

const router = express.Router();

router.get('/perfil', (req, res) => {

    res.render('perfil', {
        usuario: null,
        erro: null,
        sucesso: null
    });

});

module.exports = router;
