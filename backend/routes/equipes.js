const express = require('express');
const crypto = require('crypto');
const banco = require('../db');
const { exigirTreinador } = require('../middleware/autenticado');

const router = express.Router();

router.get('/equipes', exigirTreinador, (req, res) => {
  const idTreinador = req.session.usuario.id_treinador;
  
  const sql = `
        SELECT
            id_equipe,
            nome,
            categoria,
            local,
            codigo_acesso,
            criada_em
        FROM equipe
        WHERE id_treinador = ?
        ORDER BY criada_em DESC
    `;

    banco.query(sql, [idTreinador], (erro, equipes) => {
        if (erro) {
            console.log('Erro ao buscar equipes:', erro);

            return res.render('equipes/listar', {
                usuario: req.session.usuario,
                mensagem: null,
                erro: 'Não foi possível carregar as equipes.',
                equipes: []
            });
        }


  res.render('equipes/listar', {
    usuario: req.session.usuario,
    mensagem: null,
    erro: null,
    equipes: equipes
    });
  });
});

router.get('/equipes/cadastro', exigirTreinador, (req, res) => {
  res.render('equipes/cadastro', {
    usuario: req.session.usuario,
    erro: null,
    equipe: null
  });
});

router.post('/equipes', exigirTreinador, (req, res) => {
    const nome = req.body.nome;
    const categoria = req.body.categoria;
    const local = req.body.local;
    const descricao = req.body.descricao;

    const idTreinador = req.session.usuario.id_treinador;

    const codigoAcesso = crypto
        .randomBytes(5)
        .toString('hex')
        .toUpperCase();

    const sql = `
        INSERT INTO equipe
            (id_treinador, nome, codigo_acesso, categoria, local)
        VALUES
            (?, ?, ?, ?, ?)
    `;

    banco.query(
        sql,
        [idTreinador, nome, codigoAcesso, categoria, local],
        (erro) => {
            if (erro) {
                console.log('Erro ao cadastrar equipe:', erro);

                return res.render('equipes/cadastro', {
                    usuario: req.session.usuario,
                    erro: 'Não foi possível cadastrar a equipe.',
                    equipe: {
                        nome: nome,
                        categoria: categoria,
                        local: local,
                        descricao: descricao
                    }
                });
            }

            res.redirect('/equipes');
        }
    );
});

module.exports = router;
