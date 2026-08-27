const express = require('express');
const bcrypt = require('bcrypt');
const banco = require('../db');
const { exigirAtleta, exigirTreinador, exigirLogin } = require('../middleware/autenticado');

const router = express.Router();


// login

// ============================
// LISTAR ATLETAS
// ============================
router.get('/atletas', exigirTreinador, (req, res) => {
    const idTreinador = req.session.usuario.id_treinador;
    const idEquipe = req.query.equipe;

    let sql = `
        SELECT
            a.id_atleta,
            COALESCE(a.nome, u.nome) AS nome,
            u.email,
            a.numero_camisa,
            a.posicao,
            e.id_equipe,
            e.nome AS nome_equipe
        FROM atleta a
        LEFT JOIN usuario u
            ON u.id_usuario = a.id_usuario
        INNER JOIN membro_equipe me
            ON me.id_atleta = a.id_atleta
        INNER JOIN equipe e
            ON e.id_equipe = me.id_equipe
        WHERE e.id_treinador = ?
          AND me.status = 'ATIVO'
    `;

    const parametros = [idTreinador];

    if (idEquipe) {
        sql += ' AND e.id_equipe = ?';
        parametros.push(idEquipe);
    }

    sql += ' ORDER BY COALESCE(a.nome, u.nome)';

    banco.query(sql, parametros, (erro, atletas) => {
        if (erro) {
            console.log('Erro ao buscar atletas:', erro);

            return res.render('atletas/listar', {
                usuario: req.session.usuario,
                equipes: [],
                atletas: [],
                erro: 'Não foi possível carregar os atletas.',
                sucesso: null
            });
        }

        const sqlEquipes = `
            SELECT
                id_equipe,
                nome
            FROM equipe
            WHERE id_treinador = ?
            ORDER BY nome
        `;

        banco.query(sqlEquipes, [idTreinador], (erroEquipes, equipes) => {
            if (erroEquipes) {
                console.log('Erro ao buscar equipes:', erroEquipes);
                equipes = [];
            }

            res.render('atletas/listar', {
                usuario: req.session.usuario,
                equipes: equipes,
                atletas: atletas,
                erro: null,
                sucesso: null
            });
        });
    });
});


// post 

router.post('/atletas', exigirTreinador, (req, res) => {
    const nome = req.body.nome;
    const numeroCamisa = req.body.numero_camisa;
    const posicao = req.body.posicao;
    const idEquipe = req.body.id_equipe;
    const idTreinador = req.session.usuario.id_treinador;

    if (!nome || !numeroCamisa || !posicao || !idEquipe) {
        return res.send('Preencha todos os campos obrigatórios.');
    }

    // Verifica se a equipe pertence ao treinador logado.
    const sqlEquipe = `
        SELECT id_equipe
        FROM equipe
        WHERE id_equipe = ?
          AND id_treinador = ?
        LIMIT 1
    `;

    banco.query(
        sqlEquipe,
        [idEquipe, idTreinador],
        (erroEquipe, equipes) => {
            if (erroEquipe) {
                console.log('Erro ao verificar equipe:', erroEquipe);
                return res.send('Erro ao verificar equipe.');
            }

            if (equipes.length === 0) {
                return res.status(403).send(
                    'Você só pode cadastrar atletas nas suas equipes.'
                );
            }

            const sqlAtletaExistente = `
                SELECT
                    a.id_atleta,
                    a.nome,
                    me.id_equipe
                FROM atleta a
                INNER JOIN membro_equipe me
                    ON me.id_atleta = a.id_atleta
                WHERE LOWER(TRIM(a.nome)) = LOWER(TRIM(?))
                  AND me.status = 'ATIVO'
                LIMIT 1
            `;

            banco.query(
                sqlAtletaExistente,
                [nome],
                (erroAtletaExistente, atletasExistentes) => {
                    if (erroAtletaExistente) {
                        console.log(
                            'Erro ao verificar atleta existente:',
                            erroAtletaExistente
                        );
                        return res.send('Erro ao verificar atleta.');
                    }

                    if (atletasExistentes.length > 0) {
                        return res.send(
                            'Esta atleta já está vinculada a uma equipe.'
                        );
                    }

                    const sqlAtleta = `
                        INSERT INTO atleta
                            (nome, id_usuario, numero_camisa, posicao)
                        VALUES (?, NULL, ?, ?)
                    `;

                    banco.query(
                        sqlAtleta,
                        [nome, numeroCamisa, posicao],
                        (erroAtleta, resultadoAtleta) => {
                            if (erroAtleta) {
                                console.log(
                                    'Erro ao cadastrar atleta:',
                                    erroAtleta
                                );
                                return res.send(
                                    'Não foi possível cadastrar a atleta.'
                                );
                            }

                            const sqlMembro = `
                                INSERT INTO membro_equipe
                                    (id_atleta, id_equipe, status)
                                VALUES (?, ?, 'ATIVO')
                            `;

                            banco.query(
                                sqlMembro,
                                [resultadoAtleta.insertId, idEquipe],
                                (erroMembro) => {
                                    if (erroMembro) {
                                        console.log(
                                            'Erro ao vincular atleta:',
                                            erroMembro
                                        );
                                        return res.send(
                                            'A atleta foi criada, mas não foi vinculada à equipe.'
                                        );
                                    }

                                    res.redirect('/atletas');
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});


// atletas associação

router.get('/atletas/:id/criar-conta', exigirTreinador, (req, res) => {
    const idAtleta = req.params.id;
    const idTreinador = req.session.usuario.id_treinador;

    const sql = `
        SELECT
            a.id_atleta,
            a.nome
        FROM atleta a
        INNER JOIN membro_equipe me
            ON me.id_atleta = a.id_atleta
        INNER JOIN equipe e
            ON e.id_equipe = me.id_equipe
        WHERE a.id_atleta = ?
          AND e.id_treinador = ?
          AND me.status = 'ATIVO'
          AND a.id_usuario IS NULL
        LIMIT 1
    `;

    banco.query(
        sql,
        [idAtleta, idTreinador],
        (erro, atletas) => {
            if (erro) {
                console.log('Erro ao buscar atleta:', erro);
                return res.send('Erro ao buscar atleta.');
            }

            if (atletas.length === 0) {
                return res.status(403).send(
                    'Atleta não encontrada ou já possui conta.'
                );
            }

            res.render('atletas/criar-conta', {
                usuario: req.session.usuario,
                atleta: atletas[0],
                erro: null
            });
        }
    );
});

// post

router.post('/atletas/:id/criar-conta', exigirTreinador, (req, res) => {
    const idAtleta = req.params.id;
    const email = req.body.email;
    const senha = req.body.senha;
    const idTreinador = req.session.usuario.id_treinador;

    if (!email || !senha) {
        return res.send('Informe o e-mail e a senha.');
    }

    const sqlAtleta = `
        SELECT
            a.id_atleta,
            a.nome
        FROM atleta a
        INNER JOIN membro_equipe me
            ON me.id_atleta = a.id_atleta
        INNER JOIN equipe e
            ON e.id_equipe = me.id_equipe
        WHERE a.id_atleta = ?
          AND e.id_treinador = ?
          AND me.status = 'ATIVO'
          AND a.id_usuario IS NULL
        LIMIT 1
    `;

    banco.query(
        sqlAtleta,
        [idAtleta, idTreinador],
        (erroAtleta, atletas) => {
            if (erroAtleta) {
                console.log('Erro ao buscar atleta:', erroAtleta);
                return res.send('Erro ao buscar atleta.');
            }

            if (atletas.length === 0) {
                return res.status(403).send(
                    'Atleta não encontrada ou já possui conta.'
                );
            }

            bcrypt.hash(senha, 10, (erroHash, senhaHash) => {
                if (erroHash) {
                    console.log('Erro ao criptografar senha:', erroHash);
                    return res.send('Erro ao criar senha.');
                }

                const sqlUsuario = `
                    INSERT INTO usuario
                        (tipo_usuario, nome, email, senha_hash)
                    VALUES
                        ('ATLETA', ?, ?, ?)
                `;

                banco.query(
                    sqlUsuario,
                    [atletas[0].nome, email, senhaHash],
                    (erroUsuario, resultadoUsuario) => {
                        if (erroUsuario) {
                            console.log('Erro ao criar conta:', erroUsuario);
                            return res.send(
                                'Não foi possível criar a conta. Verifique se o e-mail já existe.'
                            );
                        }

                        const sqlAtualizar = `
                            UPDATE atleta
                            SET id_usuario = ?
                            WHERE id_atleta = ?
                        `;

                        banco.query(
                            sqlAtualizar,
                            [resultadoUsuario.insertId, idAtleta],
                            (erroAtualizar) => {
                                if (erroAtualizar) {
                                    console.log(
                                        'Erro ao associar a conta:',
                                        erroAtualizar
                                    );
                                    return res.send(
                                        'A conta foi criada, mas não foi associada à atleta.'
                                    );
                                }

                                res.redirect('/atletas');
                            }
                        );
                    }
                );
            });
        }
    );
});


// FORMULÁRIO DE CADASTRO

router.get('/atletas/cadastro', exigirTreinador, (req, res) => {
    const idTreinador = req.session.usuario.id_treinador;

    const sql = `
        SELECT
            id_equipe,
            nome
        FROM equipe
        WHERE id_treinador = ?
        ORDER BY nome
    `;

    banco.query(sql, [idTreinador], (erro, equipes) => {
        if (erro) {
            console.log('Erro ao buscar equipes:', erro);

            return res.render('atletas/cadastro', {
                usuario: req.session.usuario,
                erro: 'Não foi possível carregar as equipes.',
                sucesso: null,
                equipes: []
            });
        }

        res.render('atletas/cadastro', {
            usuario: req.session.usuario,
            erro: null,
            sucesso: null,
            equipes: equipes
        });
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
    // O ID vem da sessão criada no login.
    // Não usamos um ID recebido pela URL ou por um formulário.
    const idAtleta = req.session.usuario.id_atleta;

    // Primeiro encontramos a equipe à qual o atleta pertence.
    const sqlEquipe = `
        SELECT
            e.id_equipe,
            e.nome,
            e.categoria,
            e.local,
            e.codigo_acesso,
            e.id_treinador
        FROM membro_equipe me
        INNER JOIN equipe e
            ON e.id_equipe = me.id_equipe
        WHERE me.id_atleta = ?
          AND me.status = 'ATIVO'
        LIMIT 1
    `;

    banco.query(sqlEquipe, [idAtleta], (erroEquipe, equipes) => {
        // Verifica erro na consulta da equipe.
        if (erroEquipe) {
            console.log('Erro ao buscar equipe do atleta:', erroEquipe);
            return res.status(500).send('Erro ao carregar sua equipe.');
        }

        // Se o atleta não estiver vinculado, não há equipe para mostrar.
        if (equipes.length === 0) {
            return res.render('atletas/listar', {
                usuario: req.session.usuario,
                equipe: null,
                resumoEquipe: null,
                desempenhoAtleta: null,
                partidas: [],

                // Enviamos uma lista vazia somente para evitar erro no EJS.
                // Nenhum dado de outro atleta é enviado.
                atletas: [],

                equipes: [],
                erro: 'Você ainda não está vinculado a uma equipe.',
                sucesso: null
            });
        }

        // Guarda os dados da equipe encontrada.
        const equipe = equipes[0];
        const idEquipe = equipe.id_equipe;

        // Este SELECT mostra apenas números gerais da equipe.
        // Ele não retorna nomes nem dados individuais dos atletas.
        const sqlResumoEquipe = `
            SELECT
                (
                    SELECT COUNT(*)
                    FROM membro_equipe
                    WHERE id_equipe = ?
                      AND status = 'ATIVO'
                ) AS totalAtletas,
                (
                    SELECT COUNT(*)
                    FROM participacao_partida
                    WHERE id_equipe = ?
                ) AS totalPartidas,
                (
                    SELECT COUNT(*)
                    FROM participacao_partida
                    WHERE id_equipe = ?
                      AND resultado = 'VITORIA'
                ) AS vitorias,
                (
                    SELECT COUNT(*)
                    FROM participacao_partida
                    WHERE id_equipe = ?
                      AND resultado = 'DERROTA'
                ) AS derrotas,
                (
                    SELECT COUNT(*)
                    FROM participacao_partida
                    WHERE id_equipe = ?
                      AND resultado = 'EMPATE'
                ) AS empates
        `;

        banco.query(
            sqlResumoEquipe,
            [idEquipe, idEquipe, idEquipe, idEquipe, idEquipe],
            (erroResumo, resultadosResumo) => {
                // Verifica erro ao buscar os números gerais da equipe.
                if (erroResumo) {
                    console.log('Erro ao buscar resumo da equipe:', erroResumo);
                    return res.status(500).send('Erro ao carregar o resumo da equipe.');
                }

                // Busca somente o desempenho do atleta logado.
                // O filtro usa idAtleta da sessão.
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
                    (erroDesempenho, resultadosDesempenho) => {
                        // Se ainda não houver desempenho cadastrado,
                        // enviamos valores vazios para a página continuar funcionando.
                        if (erroDesempenho) {
                            console.log('Erro ao buscar desempenho do atleta:', erroDesempenho);
                            resultadosDesempenho = [{}];
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
                            // Se não houver partidas, enviamos uma lista vazia.
                            if (erroPartidas) {
                                console.log('Erro ao buscar partidas:', erroPartidas);
                                partidas = [];
                            }

                            // Envia somente a própria equipe, o resumo,
                            // as partidas e o desempenho do atleta logado.
                            res.render('atletas/listar', {
                                usuario: req.session.usuario,
                                equipe: equipe,
                                resumoEquipe: resultadosResumo[0],
                                desempenhoAtleta: resultadosDesempenho[0],
                                partidas: partidas,

                                // Importante: não enviar os outros atletas.
                                atletas: [],

                                equipes: [equipe],
                                erro: null,
                                sucesso: null
                            });
                        });
                    }
                );
            }
        );
    });
});

module.exports = router;
