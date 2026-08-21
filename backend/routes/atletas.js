const express = require('express');
const bcrypt = require('bcrypt');
const banco = require('../db');
const { exigirAtleta } = require('../middleware/autenticado');

const router = express.Router();


// login

router.get('/atletas', exigirAtleta, (req, res) => {
    const idAtleta = req.session.usuario.id_atleta;

    const sqlEquipe = `
        SELECT
            e.id_equipe,
            e.nome,
            e.categoria,
            e.local,
            e.descricao,
            e.codigo_acesso
        FROM membro_equipe me
        INNER JOIN equipe e
            ON e.id_equipe = me.id_equipe
        WHERE me.id_atleta = ?
          AND me.status = 'ATIVO'
        LIMIT 1
    `;

    banco.query(sqlEquipe, [idAtleta], (erroEquipe, equipes) => {
        // Trata erro ao buscar a equipe.
        if (erroEquipe) {
            console.log('Erro ao buscar equipe do atleta:', erroEquipe);

            return res.status(500).send('Erro ao carregar a equipe.');
        }

        // Caso o atleta não esteja vinculado a nenhuma equipe.
        if (equipes.length === 0) {
            return res.render('atletas/listar', {
                usuario: req.session.usuario,
                equipe: null,
                equipes: [],
                atletas: [],
                partidas: [],
                resumoEquipe: null,
                desempenhoAtleta: null,
                erro: 'Você ainda não está vinculado a uma equipe.',
                sucesso: null
            });
        }

        // Guarda a única equipe do atleta.
        const equipe = equipes[0];
        const idEquipe = equipe.id_equipe;

        // O atleta poderá visualizar a equipe, mas não outras equipes.
        const sqlAtletasEquipe = `
            SELECT
                a.id_atleta,
                u.nome,
                a.numero_camisa,
                a.posicao
            FROM membro_equipe me
            INNER JOIN atleta a
                ON a.id_atleta = me.id_atleta
            INNER JOIN usuario u
                ON u.id_usuario = a.id_usuario
            WHERE me.id_equipe = ?
              AND me.status = 'ATIVO'
            ORDER BY a.numero_camisa
        `;

        banco.query(sqlAtletasEquipe, [idEquipe], (erroAtletas, atletas) => {
            // Se houver erro, usa uma lista vazia para não quebrar o EJS.
            if (erroAtletas) {
                console.log('Erro ao buscar atletas da equipe:', erroAtletas);
                atletas = [];
            }

            // Busca o resumo geral da equipe.
            const sqlResumoEquipe = `
                SELECT
                    COUNT(*) AS totalAtletas
                FROM membro_equipe
                WHERE id_equipe = ?
                  AND status = 'ATIVO'
            `;

            banco.query(sqlResumoEquipe, [idEquipe], (erroResumo, resumo) => {
                // Trata erro do resumo.
                if (erroResumo) {
                    console.log('Erro ao buscar resumo da equipe:', erroResumo);

                    return res.status(500).send('Erro ao carregar o resumo da equipe.');
                }

                // Busca o desempenho do atleta que está logado.
                // O filtro usa id_atleta da sessão e id_equipe encontrada no banco.
                const sqlDesempenhoAtleta = `
                    SELECT
                        COALESCE(SUM(d.ataques_certos), 0) AS ataques_certos,
                        COALESCE(SUM(d.ataques_errados), 0) AS ataques_errados,
                        COALESCE(SUM(d.levantamentos_certos), 0) AS levantamentos_certos,
                        COALESCE(SUM(d.levantamentos_errados), 0) AS levantamentos_errados,
                        COALESCE(SUM(d.saques_certos), 0) AS saques_certos,
                        COALESCE(SUM(d.saques_errados), 0) AS saques_errados,
                        COALESCE(SUM(d.bloqueios_certos), 0) AS bloqueios_certos,
                        COALESCE(SUM(d.bloqueios_errados), 0) AS bloqueios_errados,
                        COALESCE(SUM(d.aces), 0) AS aces,
                        COALESCE(SUM(d.recepcoes_certas), 0) AS recepcoes_certas,
                        COALESCE(SUM(d.recepcoes_erradas), 0) AS recepcoes_erradas
                    FROM desempenho_atleta d
                    WHERE d.id_atleta = ?
                      AND d.id_equipe = ?
                `;

                banco.query(
                    sqlDesempenhoAtleta,
                    [idAtleta, idEquipe],
                    (erroDesempenho, desempenho) => {
                        // Se ainda não existem estatísticas, envia valores vazios.
                        if (erroDesempenho) {
                            console.log('Erro ao buscar desempenho do atleta:', erroDesempenho);
                            desempenho = [{}];
                        }

                        // Busca as partidas somente da equipe do atleta.
                        const sqlPartidas = `
                            SELECT
                                p.id_partida,
                                p.data_hora,
                                pp.placar,
                                pp.resultado
                            FROM participacao_partida pp
                            INNER JOIN partida p
                                ON p.id_partida = pp.id_partida
                            WHERE pp.id_equipe = ?
                            ORDER BY p.data_hora DESC
                        `;

                        banco.query(sqlPartidas, [idEquipe], (erroPartidas, partidas) => {
                            // Se não houver partidas, manda uma lista vazia ao EJS.
                            if (erroPartidas) {
                                console.log('Erro ao buscar partidas:', erroPartidas);
                                partidas = [];
                            }

                            // Envia todos os dados para a tela do atleta.
                            return res.render('atletas/listar', {
                                usuario: req.session.usuario,
                                equipe: equipe,
                                equipes: [equipe],
                                atletas: atletas,
                                partidas: partidas,
                                resumoEquipe: resumo[0],
                                desempenhoAtleta: desempenho[0],
                                erro: null,
                                sucesso: null
                            });
                        });
                    }
                );
            });
        });
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

router.get('/registro-atleta', (req, res) => {
    res.render('entrada/registro-atleta', {
        erro: null,
        sucesso: null
    });
});

router.post('/registro-atleta', (req, res) => {
    // Os nomes correspondem aos campos do seu EJS.
    const nome = req.body.nome;
    const email = req.body.email;
    const senha = req.body.senha;
    const codigoConvite = req.body.codigo_convite;
    const numeroCamisa = req.body.numero_camisa;
    const posicao = req.body.posicao;

    // Verifica se os campos foram preenchidos.
    if (
        !nome ||
        !email ||
        !senha ||
        !codigoConvite ||
        numeroCamisa === undefined ||
        numeroCamisa === '' ||
        !posicao
    ) {
        return res.render('entrada/registro-atleta', {
            erro: 'Preencha todos os campos.',
            sucesso: null
        });
    }

    // Procura a equipe pelo código informado pelo atleta.
    const sqlEquipe = `
        SELECT id_equipe
        FROM equipe
        WHERE codigo_acesso = ?
        LIMIT 1
    `;

    // Padroniza o código antes da busca.
    const codigoFormatado = codigoConvite.trim().toUpperCase();

    banco.query(sqlEquipe, [codigoFormatado], (erroEquipe, equipes) => {
        if (erroEquipe) {
            console.log('Erro ao procurar equipe:', erroEquipe);

            return res.render('entrada/registro-atleta', {
                erro: 'Não foi possível verificar o código da equipe.',
                sucesso: null
            });
        }

        // Impede cadastro com código inválido.
        if (equipes.length === 0) {
            return res.render('entrada/registro-atleta', {
                erro: 'Código da equipe inválido.',
                sucesso: null
            });
        }

        const idEquipe = equipes[0].id_equipe;

        // Criptografa a senha antes do INSERT.
        bcrypt.hash(senha, 10, (erroHash, senhaHash) => {
            if (erroHash) {
                console.log('Erro ao criptografar senha:', erroHash);

                return res.render('entrada/registro-atleta', {
                    erro: 'Não foi possível criar a senha.',
                    sucesso: null
                });
            }

            // Cria o usuário geral com tipo ATLETA.
            const sqlUsuario = `
                INSERT INTO usuario
                    (tipo_usuario, nome, email, senha_hash)
                VALUES
                    ('ATLETA', ?, ?, ?)
            `;

            banco.query(
                sqlUsuario,
                [nome, email, senhaHash],
                (erroUsuario, resultadoUsuario) => {
                    if (erroUsuario) {
                        console.log('Erro ao cadastrar usuário atleta:', erroUsuario);

                        return res.render('entrada/registro-atleta', {
                            erro: 'Não foi possível cadastrar. Talvez este e-mail já esteja cadastrado.',
                            sucesso: null
                        });
                    }

                    const idUsuario = resultadoUsuario.insertId;

                    // Cria os dados específicos do atleta.
                    const sqlAtleta = `
                        INSERT INTO atleta
                            (id_usuario, numero_camisa, posicao)
                        VALUES
                            (?, ?, ?)
                    `;

                    banco.query(
                        sqlAtleta,
                        [idUsuario, numeroCamisa, posicao],
                        (erroAtleta, resultadoAtleta) => {
                            if (erroAtleta) {
                                console.log('Erro ao cadastrar atleta:', erroAtleta);

                                return res.render('entrada/registro-atleta', {
                                    erro: 'Não foi possível cadastrar os dados do atleta.',
                                    sucesso: null
                                });
                            }

                            const idAtleta = resultadoAtleta.insertId;

                            // Cria o vínculo entre atleta e equipe.
                            const sqlMembro = `
                                INSERT INTO membro_equipe
                                    (id_atleta, id_equipe, status)
                                VALUES
                                    (?, ?, 'ATIVO')
                            `;

                            banco.query(
                                sqlMembro,
                                [idAtleta, idEquipe],
                                (erroMembro) => {
                                    if (erroMembro) {
                                        console.log('Erro ao vincular atleta:', erroMembro);

                                        return res.render('entrada/registro-atleta', {
                                            erro: 'Não foi possível vincular o atleta à equipe.',
                                            sucesso: null
                                        });
                                    }

                                    // Volta para o login geral.
                                    res.render('entrada/login', {
                                        erro: null,
                                        sucesso: 'Cadastro realizado. Faça login para continuar.'
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});


router.get('/atleta', exigirAtleta, (req, res) => {
    // Recupera o ID do atleta que fez login.
    // Esse valor vem da sessão criada no POST /login.
    const idAtleta = req.session.usuario.id_atleta;

    // Busca a equipe vinculada ao atleta.
    // O vínculo é feito pela tabela membro_equipe.
    const sql = `
        SELECT
            e.id_equipe,
            e.nome,
            e.categoria,
            e.local,
            e.codigo_acesso
        FROM membro_equipe me
        INNER JOIN equipe e
            ON e.id_equipe = me.id_equipe
        WHERE me.id_atleta = ?
          AND me.status = 'ATIVO'
        LIMIT 1
    `;

    // Executa a consulta usando o ID do atleta logado.
    banco.query(sql, [idAtleta], (erro, resultados) => {
        // Trata possível erro do MySQL.
        if (erro) {
            console.log('Erro ao buscar equipe do atleta:', erro);

            return res.status(500).send('Erro ao carregar a equipe.');
        }

        // Caso o atleta ainda não esteja em uma equipe.
        if (resultados.length === 0) {
            return res.render('atletas/listar', {
                usuario: req.session.usuario,
                equipe: null,
                equipes: [],
                atletas: [],
                partidas: [],
                erro: 'Você ainda não está vinculado a uma equipe.',
                sucesso: null
            });
        }

        // Guarda os dados da equipe encontrada.
        const equipe = resultados[0];

        // Renderiza a tela da equipe do atleta.
        res.render('atletas/listar', {
            usuario: req.session.usuario,
            equipe: equipe,
            equipes: [equipe],
            atletas: [],
            partidas: [],
            erro: null,
            sucesso: null
        });
    });
});
module.exports = router;
