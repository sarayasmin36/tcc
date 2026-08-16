const express = require('express');

const router = express.Router();

router.get('/atletas', (req, res) => {
  res.render('atletas/listar', {
    usuario: req.session ? req.session.usuario : null,
    erro: null,
    atletas: [],
    equipes: []
  });
});

router.get('/atletas/cadastro', (req, res) => {
  res.render('atletas/cadastro', {
    usuario: req.session ? req.session.usuario : null,
    erro: null,
    sucesso: null,
    equipes: []
  });
});

router.post('/atletas', (req, res) => {
  const {
    nome,
    email,
    numero_camisa,
    posicao,
    id_equipe,
    observacoes
  } = req.body;

  res.render('atletas/cadastro', {
    usuario: req.session ? req.session.usuario : null,
    erro: null,
    sucesso: `Atleta ${nome || ''} cadastrado para teste.`,
    equipes: id_equipe
      ? [{ id: id_equipe, nome: 'Equipe selecionada' }]
      : [],
    atleta: {
      nome,
      email,
      numero_camisa,
      posicao,
      id_equipe,
      observacoes
    }
  });
});

module.exports = router;
