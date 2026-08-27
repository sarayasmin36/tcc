const express = require('express');
const crypto = require('crypto');
const banco = require('../db');
const { exigirTreinador, exigirLogin } = require('../middleware/autenticado');

const router = express.Router();

router.get('/equipes', exigirLogin, (req, res) => {
  const usuario = req.session.usuario;
    let sql;
    let parametros;

    if (usuario.tipo_usuario === 'ATLETA') {
        sql = `
            SELECT
                e.id_equipe,
                e.nome,
                e.categoria,
                e.local,
                e.codigo_acesso,
                e.criada_em,
                COUNT(me2.id_membro) AS quantidadeAtletas
            FROM membro_equipe me
            INNER JOIN equipe e
                ON e.id_equipe = me.id_equipe
            LEFT JOIN membro_equipe me2
                ON me2.id_equipe = e.id_equipe
                AND me2.status = 'ATIVO'
            WHERE me.id_atleta = ?
                AND me.status = 'ATIVO'
            GROUP BY e.id_equipe
            ORDER BY e.criada_em DESC
        `;

        parametros = [usuario.id_atleta];
    } else if (usuario.tipo_usuario === 'TREINADOR') {
        sql = `
            SELECT
                e.id_equipe,
                e.nome,
                e.categoria,
                e.local,
                e.codigo_acesso,
                e.criada_em,
                COUNT(me.id_membro) AS quantidadeAtletas
            FROM equipe e
            LEFT JOIN membro_equipe me
                ON me.id_equipe = e.id_equipe
                AND me.status = 'ATIVO'
            WHERE e.id_treinador = ?
            GROUP BY e.id_equipe
            ORDER BY e.criada_em DESC
        `;

        parametros = [usuario.id_treinador];
    } else {
        return res.status(403).send('Tipo de usuário não autorizado.');
    }

    banco.query(sql, parametros, (erro, equipes) => {
        if (erro) {
            console.log('Erro ao buscar equipes:', erro);

            return res.render('equipes/listar', {
                usuario: usuario,
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
