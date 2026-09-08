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

router.get('/equipes/:id/editar', exigirTreinador, (req, res) => {
    const idEquipe = Number(req.params.id);
    const idTreinador = Number(req.session.usuario.id_treinador);

    if (!idEquipe || !idTreinador) {
        return res.status(400).send('Equipe inválida.');
    }

    const sql = `
        SELECT
            e.id_equipe,
            e.id_treinador,
            e.nome,
            e.categoria,
            e.local,
            e.codigo_acesso,
            e.criada_em
        FROM equipe e
        WHERE e.id_equipe = ?
          AND e.id_treinador = ?
        LIMIT 1
    `;

    banco.query(sql, [idEquipe, idTreinador], (erro, equipes) => {
        if (erro) {
            console.error('Erro ao carregar equipe para edição:', erro);
            return res.status(500).render('equipes/editar', {
                usuario: req.session.usuario,
                equipe: null,
                erro: 'Não foi possível carregar a equipe.'
            });
        }

        if (!equipes.length) {
            return res.status(404).render('equipes/editar', {
                usuario: req.session.usuario,
                equipe: null,
                erro: 'Equipe não encontrada ou sem permissão.'
            });
        }

        return res.render('equipes/editar', {
            usuario: req.session.usuario,
            equipe: equipes[0],
            erro: null
        });
    });
});

router.post('/equipes/:id', exigirTreinador, (req, res) => {
    const idEquipe = Number(req.params.id);
    const idTreinador = Number(req.session.usuario.id_treinador);
    const nome = String(req.body.nome || '').trim();
    const categoria = String(req.body.categoria || '').trim();
    const local = String(req.body.local || '').trim();

    if (!idEquipe || !idTreinador || !nome) {
        return res.status(400).render('equipes/editar', {
            usuario: req.session.usuario,
            equipe: {
                id_equipe: idEquipe,
                nome,
                categoria,
                local
            },
            erro: 'Informe o nome da equipe.'
        });
    }

    const sql = `
        UPDATE equipe
        SET nome = ?,
            categoria = ?,
            local = ?
        WHERE id_equipe = ?
          AND id_treinador = ?
    `;

    banco.query(
        sql,
        [nome, categoria || null, local || null, idEquipe, idTreinador],
        (erro, resultado) => {
            if (erro) {
                console.error('Erro ao atualizar equipe:', erro);
                return res.status(500).render('equipes/editar', {
                    usuario: req.session.usuario,
                    equipe: {
                        id_equipe: idEquipe,
                        nome,
                        categoria,
                        local
                    },
                    erro: 'Não foi possível salvar as alterações.'
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).render('equipes/editar', {
                    usuario: req.session.usuario,
                    equipe: {
                        id_equipe: idEquipe,
                        nome,
                        categoria,
                        local
                    },
                    erro: 'Equipe não encontrada ou sem permissão.'
                });
            }

            return res.redirect('/equipes');
        }
    );
});

module.exports = router;
