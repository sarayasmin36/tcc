const express = require('express');

const router = express.Router();

router.get('/login', (req, res) => {
    res.render('entrada/login', {
        erro: null
    });
});

router.get('/registro', (req, res) => {
    res.render('entrada/registro', {
        erro: null
    });
});

router.post('/registro', (req, res) => {
    const { nome, email, senha } = req.body;
    const tipo_usuario = 'TREINADOR';

    console.log('Nome:', nome);
    console.log('E-mail:', email);
    console.log('Senha:', senha);
    console.log('Tipo:', tipo_usuario);

    res.send('Cadastro recebido com sucesso!');
});

module.exports = router;