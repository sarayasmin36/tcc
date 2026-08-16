const express = require('express');

const router = express.Router();

router.get('/partidas', (req, res) => {
  res.render('partidas/listar', {
    partidas: [],
    erro: null
  });
});

router.get('/partidas/cadastro', (req, res) => {
  res.render('partidas/cadastro', {
    equipes: [],
    erro: null
  });
});

router.get('/partidas/:id/desempenho', (req, res) => {
  res.render('partidas/desempenho_novo', {
    partida: {
      id_partida: req.params.id,
      nome_equipe: 'Minha equipe',
      nome_equipe_adversaria: 'Equipe adversária',
      quantidade_sets: 3,
      sets_salvos: 0,
      set_atual: 1,
      pontos_minha_equipe: 0,
      pontos_adversario: 0,
      sets_minha_equipe: 0,
      sets_adversario: 0,
      equipe_sacando: 'Minha equipe'
    },
    atletas: [
      {
        id_atleta: 1,
        nome: 'Sara',
        numero_camisa: 14,
        posicao_inicial: 1,
        posicao: 'Levantadora'
      },
      {
        id_atleta: 2,
        nome: 'Ana',
        numero_camisa: 8,
        posicao_inicial: 2,
        posicao: 'Ponteira'
      }
    ],
    acoes: [],
    somenteLeitura: false,
    erro: null
  });
});

module.exports = router;
