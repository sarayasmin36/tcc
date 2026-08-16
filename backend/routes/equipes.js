const express = require('express');

const router = express.Router();

router.get('/equipes', (req, res) => {
  res.render('equipes/listar', {
    usuario: req.session ? req.session.usuario : null,
    mensagem: null,
    erro: null,
    equipes: []
  });
});

router.get('/equipes/cadastro', (req, res) => {
  res.render('equipes/cadastro', {
    usuario: req.session ? req.session.usuario : null,
    erro: null,
    equipe: null
  });
});

router.post('/equipes', (req, res) => {
  const { nome, categoria, local, descricao } = req.body;

  res.render('equipes/cadastro', {
    usuario: req.session ? req.session.usuario : null,
    erro: null,
    equipe: { nome, categoria, local, descricao },
    sucesso: `Equipe ${nome || ''} cadastrada para teste.`
  });
});

module.exports = router;
