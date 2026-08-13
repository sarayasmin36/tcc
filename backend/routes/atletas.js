const express = require('express');

const router = express.Router();

router.get('/atletas', (req, res) => {
    res.render('atletas/listar', {
        erro: null
    });
});

module.exports = router;