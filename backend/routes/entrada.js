const express = require('express');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('entrada/login', {
    erro: null,
    sucesso: null
  });
});

router.get('/registro-treinador', (req, res) => {
  res.render('entrada/registro-treinador', {
    erro: null,
    sucesso: null
  });
});

router.get('/registro-atleta', (req, res) => {
  res.render('entrada/registro-atleta', {
    erro: null,
    sucesso: null
  });
});

// Rotas temporárias para testar o frontend antes da integração com o banco.
// A pessoa responsável pelo backend deverá substituir o conteúdo pelos INSERTs,
// autenticação, hash de senha e criação de sessão.
router.post('/login', (req, res) => {
  const { email } = req.body;

  res.render('entrada/login', {
    erro: null,
    sucesso: `Login recebido para ${email || 'usuário sem e-mail'}.`
  });
});

router.post('/registro-treinador', (req, res) => {
  const { nome, email } = req.body;

  res.render('entrada/registro-treinador', {
    erro: null,
    sucesso: `Cadastro de treinador recebido para ${nome || email || 'novo usuário'}.`
  });
});

router.post('/registro-atleta', (req, res) => {
  const { nome, email, codigo_convite } = req.body;

  res.render('entrada/registro-atleta', {
    erro: null,
    sucesso: `Cadastro de atleta recebido${codigo_convite ? ` com o código ${codigo_convite}` : ''}.`
  });
});

module.exports = router;