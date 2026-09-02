const express = require('express');
const banco = require('../db');
const {
    exigirLogin,
    exigirTreinador
} = require('../middleware/autenticado');

const router = express.Router();

// ============================
// LISTAR RELATÓRIOS
// ============================

// Substitua a rota GET /relatorios atual por esta rota.
router.get('/relatorios', exigirLogin, (req, res) => {
    const usuario = req.session.usuario;
    let filtroEquipe;
    let parametroAcesso;

    if (usuario.tipo_usuario === 'TREINADOR') {
        filtroEquipe = 'e.id_treinador = ?';
        parametroAcesso = usuario.id_treinador;
    } else {
        filtroEquipe = `
            e.id_equipe IN (
                SELECT me.id_equipe
                FROM membro_equipe me
                WHERE me.id_atleta = ?
                  AND me.status = 'ATIVO'
            )
        `;
        parametroAcesso = usuario.id_atleta;
    }

    const sqlRelatorios = `
        SELECT
            a.id_atleta,
            COALESCE(a.nome, u.nome) AS nome_atleta,
            e.id_equipe,
            e.nome AS nome_equipe,
            COUNT(DISTINCT p.id_partida) AS total_partidas,
            COALESCE(SUM(da.ataques_certos), 0) AS ataques_certos,
            COALESCE(SUM(da.ataques_errados), 0) AS ataques_errados,
            COALESCE(SUM(da.levantamentos_certos), 0) AS levantamentos_certos,
            COALESCE(SUM(da.levantamentos_errados), 0) AS levantamentos_errados,
            COALESCE(SUM(da.saques_certos), 0) AS saques_certos,
            COALESCE(SUM(da.saques_errados), 0) AS saques_errados,
            COALESCE(SUM(da.aces), 0) AS aces,
            COALESCE(SUM(da.bloqueios_certos), 0) AS bloqueios_certos,
            COALESCE(SUM(da.bloqueios_errados), 0) AS bloqueios_errados,
            COALESCE(SUM(da.recepcoes_certas), 0) AS recepcoes_certas,
            COALESCE(SUM(da.recepcoes_erradas), 0) AS recepcoes_erradas
        FROM participacao_atleta pa
        INNER JOIN atleta a
            ON a.id_atleta = pa.id_atleta
        LEFT JOIN usuario u
            ON u.id_usuario = a.id_usuario
        INNER JOIN equipe e
            ON e.id_equipe = pa.id_equipe
        INNER JOIN partida p
            ON p.id_partida = pa.id_partida
        LEFT JOIN desempenho_atleta da
            ON da.id_participacao_atleta = pa.id_participacao_atleta
        WHERE ${filtroEquipe}
        GROUP BY
            a.id_atleta,
            COALESCE(a.nome, u.nome),
            e.id_equipe,
            e.nome
        ORDER BY COALESCE(a.nome, u.nome)
    `;

    banco.query(sqlRelatorios, [parametroAcesso], (erro, relatorios) => {
        if (erro) {
            console.error('Erro ao buscar relatórios:', erro);
            return res.render('relatorios', {
                usuario,
                relatorios: [],
                setsSalvos: [],
                acoes: [],
                erro: 'Não foi possível carregar os relatórios.',
                sucesso: null
            });
        }

        const filtroAcessoSets = usuario.tipo_usuario === 'TREINADOR'
            ? 'e2.id_treinador = ?'
            : 'pa2.id_atleta = ?';

        const sqlSets = `
            SELECT DISTINCT
                sp.id_set,
                sp.id_partida,
                sp.numero_set,
                sp.placar_casa,
                sp.placar_adversario,
                sp.vencedor
            FROM set_partida sp
            INNER JOIN participacao_atleta pa2
                ON pa2.id_partida = sp.id_partida
            INNER JOIN equipe e2
                ON e2.id_equipe = pa2.id_equipe
            WHERE ${filtroAcessoSets}
            ORDER BY sp.id_partida DESC, sp.numero_set ASC
        `;

        banco.query(sqlSets, [parametroAcesso], (erroSets, setsSalvos) => {
            if (erroSets) {
                console.error('Erro ao buscar sets:', erroSets);
                setsSalvos = [];
            }

            const filtroAcessoAcoes = usuario.tipo_usuario === 'TREINADOR'
                ? 'e3.id_treinador = ?'
                : 'pa3.id_atleta = ?';

            const sqlAcoes = `
                SELECT
                    ac.id_acao,
                    ac.id_partida,
                    ac.id_set,
                    ac.id_atleta,
                    COALESCE(a3.nome, u3.nome, 'Atleta') AS nome_atleta,
                    ac.fundamento,
                    ac.resultado,
                    sp3.numero_set
                FROM acao_partida ac
                INNER JOIN set_partida sp3
                    ON sp3.id_set = ac.id_set
                LEFT JOIN atleta a3
                    ON a3.id_atleta = ac.id_atleta
                LEFT JOIN usuario u3
                    ON u3.id_usuario = a3.id_usuario
                INNER JOIN participacao_atleta pa3
                    ON pa3.id_partida = ac.id_partida
                INNER JOIN equipe e3
                    ON e3.id_equipe = pa3.id_equipe
                WHERE ${filtroAcessoAcoes}
                GROUP BY
                    ac.id_acao,
                    ac.id_partida,
                    ac.id_set,
                    ac.id_atleta,
                    COALESCE(a3.nome, u3.nome, 'Atleta'),
                    ac.fundamento,
                    ac.resultado,
                    sp3.numero_set
                ORDER BY ac.id_partida DESC, sp3.numero_set ASC, ac.id_acao ASC
            `;

            banco.query(sqlAcoes, [parametroAcesso], (erroAcoes, acoes) => {
                if (erroAcoes) {
                    console.error('Erro ao buscar ações:', erroAcoes);
                    acoes = [];
                }

                return res.render('relatorios', {
                    usuario,
                    relatorios,
                    setsSalvos,
                    acoes,
                    erro: null,
                    sucesso: null
                });
            });
        });
    });
});

// ============================
// SALVAR DESEMPENHO DA ATLETA
// ============================
// O relatório é gerado a partir destes dados de desempenho.
router.post('/partidas/:id/desempenho', exigirTreinador, (req, res) => {
    const idPartida = req.params.id;
    const idParticipacaoAtleta = req.body.id_participacao_atleta;
    const idTreinador = req.session.usuario.id_treinador;

    const ataquesCertos = Number(req.body.ataques_certos || 0);
    const ataquesErrados = Number(req.body.ataques_errados || 0);
    const levantamentosCertos = Number(req.body.levantamentos_certos || 0);
    const levantamentosErrados = Number(req.body.levantamentos_errados || 0);
    const saquesCertos = Number(req.body.saques_certos || 0);
    const saquesErrados = Number(req.body.saques_errados || 0);
    const aces = Number(req.body.aces || 0);
    const bloqueiosCertos = Number(req.body.bloqueios_certos || 0);
    const bloqueiosErrados = Number(req.body.bloqueios_errados || 0);
    const recepcoesCertas = Number(req.body.recepcoes_certas || 0);
    const recepcoesErradas = Number(req.body.recepcoes_erradas || 0);

    if (!idParticipacaoAtleta) {
        return res.send('Informe a participação da atleta.');
    }

    const valores = [
        ataquesCertos,
        ataquesErrados,
        levantamentosCertos,
        levantamentosErrados,
        saquesCertos,
        saquesErrados,
        aces,
        bloqueiosCertos,
        bloqueiosErrados,
        recepcoesCertas,
        recepcoesErradas
    ];

    if (valores.some((valor) => !Number.isInteger(valor) || valor < 0)) {
        return res.send('Os valores do desempenho devem ser números válidos.');
    }

    const sqlParticipacao = `
        SELECT
            pa.id_participacao_atleta
        FROM participacao_atleta pa
        INNER JOIN equipe e
            ON e.id_equipe = pa.id_equipe
        WHERE pa.id_participacao_atleta = ?
          AND pa.id_partida = ?
          AND e.id_treinador = ?
        LIMIT 1
    `;

    banco.query(
        sqlParticipacao,
        [idParticipacaoAtleta, idPartida, idTreinador],
        (erroParticipacao, participacoes) => {
            if (erroParticipacao) {
                console.log(
                    'Erro ao verificar participação:',
                    erroParticipacao
                );
                return res.send('Erro ao verificar participação.');
            }

            if (participacoes.length === 0) {
                return res.status(403).send(
                    'Essa atleta não pertence a uma partida das suas equipes.'
                );
            }

            const sqlDesempenho = `
                SELECT id_desempenho
                FROM desempenho_atleta
                WHERE id_participacao_atleta = ?
                LIMIT 1
            `;

            banco.query(
                sqlDesempenho,
                [idParticipacaoAtleta],
                (erroDesempenho, desempenhos) => {
                    if (erroDesempenho) {
                        console.log(
                            'Erro ao buscar desempenho:',
                            erroDesempenho
                        );
                        return res.send('Erro ao buscar desempenho.');
                    }

                    if (desempenhos.length > 0) {
                        const sqlAtualizar = `
                            UPDATE desempenho_atleta
                            SET
                                ataques_certos = ?,
                                ataques_errados = ?,
                                levantamentos_certos = ?,
                                levantamentos_errados = ?,
                                saques_certos = ?,
                                saques_errados = ?,
                                aces = ?,
                                bloqueios_certos = ?,
                                bloqueios_errados = ?,
                                recepcoes_certas = ?,
                                recepcoes_erradas = ?
                            WHERE id_participacao_atleta = ?
                        `;

                        banco.query(
                            sqlAtualizar,
                            [
                                ...valores,
                                idParticipacaoAtleta
                            ],
                            (erroAtualizar) => {
                                if (erroAtualizar) {
                                    console.log(
                                        'Erro ao atualizar desempenho:',
                                        erroAtualizar
                                    );
                                    return res.send(
                                        'Não foi possível atualizar o desempenho.'
                                    );
                                }

                                res.redirect('/relatorios');
                            }
                        );
                    } else {
                        const sqlInserir = `
                            INSERT INTO desempenho_atleta
                                (
                                    id_participacao_atleta,
                                    ataques_certos,
                                    ataques_errados,
                                    levantamentos_certos,
                                    levantamentos_errados,
                                    saques_certos,
                                    saques_errados,
                                    aces,
                                    bloqueios_certos,
                                    bloqueios_errados,
                                    recepcoes_certas,
                                    recepcoes_erradas
                                )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        banco.query(
                            sqlInserir,
                            [
                                idParticipacaoAtleta,
                                ...valores
                            ],
                            (erroInserir) => {
                                if (erroInserir) {
                                    console.log(
                                        'Erro ao salvar desempenho:',
                                        erroInserir
                                    );
                                    return res.send(
                                        'Não foi possível salvar o desempenho.'
                                    );
                                }

                                res.redirect('/relatorios');
                            }
                        );
                    }
                }
            );
        }
    );
});


router.get('/partidas/:id/desempenho/acoes', exigirTreinador, (req, res) => {
    const idPartida = Number(req.params.id);
    const numeroSet = Number(req.query.numero_set || 1);

    const sql = `
        SELECT
            ac.id_acao,
            ac.id_partida,
            ac.id_set,
            ac.id_atleta,
            COALESCE(a.nome, u.nome) AS nome_atleta,
            ac.fundamento,
            ac.resultado,
            sp.numero_set
        FROM acao_partida ac
        INNER JOIN set_partida sp
            ON sp.id_set = ac.id_set
        INNER JOIN atleta a
            ON a.id_atleta = ac.id_atleta
        LEFT JOIN usuario u
            ON u.id_usuario = a.id_usuario
        WHERE ac.id_partida = ?
          AND sp.numero_set = ?
        ORDER BY ac.criado_em ASC
    `;

    banco.query(sql, [idPartida, numeroSet], (erro, acoes) => {
        if (erro) {
            console.error('Erro ao buscar ações:', erro);
            return res.status(500).json({
                erro: 'Não foi possível carregar as ações.'
            });
        }

        return res.json(acoes);
    });
});

router.delete('/partidas/:id/desempenho/acao/:idAcao', exigirTreinador, (req, res) => {
    const idPartida = Number(req.params.id);
    const idAcao = Number(req.params.idAcao);

    const sql = `
        DELETE FROM acao_partida
        WHERE id_acao = ?
          AND id_partida = ?
    `;

    banco.query(sql, [idAcao, idPartida], (erro, resultado) => {
        if (erro) {
            console.error('Erro ao apagar ação:', erro);
            return res.status(500).json({
                erro: 'Não foi possível apagar a ação.'
            });
        }

        return res.json({
            sucesso: resultado.affectedRows > 0
        });
    });
});

// =====================================
// REGISTRAR AÇÃO INDIVIDUAL
// =====================================
router.post(
    '/partidas/:id/desempenho/acao',
    exigirTreinador,
    (req, res) => {
        const idPartida = Number(req.params.id);
        const idAtleta = Number(req.body.id_atleta);
        const idSetInformado = Number(req.body.id_set || 0);
        const numeroSet = Number(req.body.numero_set || 0);
        const idTreinador = Number(
            req.session.usuario.id_treinador
        );

        const fundamento = String(
            req.body.fundamento || ''
        ).trim().toLowerCase();

        const resultadoRecebido = String(
            req.body.resultado || ''
        ).trim().toLowerCase();

        let resultado = resultadoRecebido;

        if (resultadoRecebido.includes('perfeito')) {
            resultado = 'perfeito';
        } else if (resultadoRecebido.includes('bom')) {
            resultado = 'bom';
        } else if (resultadoRecebido.includes('ruim')) {
            resultado = 'ruim';
        }

        const colunas = {
            passe: {
                perfeito: 'recepcoes_certas',
                bom: 'recepcoes_certas',
                ruim: 'recepcoes_erradas'
            },
            ataque: {
                perfeito: 'ataques_certos',
                bom: 'ataques_certos',
                ruim: 'ataques_errados'
            },
            defesa: {
                perfeito: 'recepcoes_certas',
                bom: 'recepcoes_certas',
                ruim: 'recepcoes_erradas'
            },
            levantamento: {
                perfeito: 'levantamentos_certos',
                bom: 'levantamentos_certos',
                ruim: 'levantamentos_errados'
            },
            saque: {
                perfeito: 'saques_certos',
                bom: 'saques_certos',
                ruim: 'saques_errados'
            },
            bloqueio: {
                perfeito: 'bloqueios_certos',
                bom: 'bloqueios_certos',
                ruim: 'bloqueios_errados'
            },
            falta: {
                perfeito: 'ataques_errados',
                bom: 'ataques_errados',
                ruim: 'ataques_errados'
            }
        };

        const coluna = colunas[fundamento]?.[resultado];

        if (!idPartida || !idAtleta || !idTreinador) {
            return res.status(400).json({
                erro: 'Partida, atleta ou treinador inválido.'
            });
        }

        if (!coluna) {
            return res.status(400).json({
                erro: 'Fundamento ou resultado inválido.'
            });
        }

        banco.beginTransaction((erroTransacao) => {
            if (erroTransacao) {
                console.error(
                    'Erro ao iniciar transação:',
                    erroTransacao
                );

                return res.status(500).json({
                    erro: 'Não foi possível iniciar o salvamento.'
                });
            }

            const responderErro = (
                status,
                mensagem,
                erro
            ) => {
                if (erro) {
                    console.error(mensagem, erro);
                }

                banco.rollback(() => {
                    if (!res.headersSent) {
                        return res.status(status).json({
                            erro: mensagem
                        });
                    }
                });
            };

            const sqlParticipacao = `
                SELECT
                    pa.id_participacao_atleta
                FROM participacao_atleta pa
                INNER JOIN equipe e
                    ON e.id_equipe = pa.id_equipe
                WHERE pa.id_atleta = ?
                  AND pa.id_partida = ?
                  AND e.id_treinador = ?
                LIMIT 1
            `;

            banco.query(
                sqlParticipacao,
                [
                    idAtleta,
                    idPartida,
                    idTreinador
                ],
                (erroParticipacao, participacoes) => {
                    if (erroParticipacao) {
                        return responderErro(
                            500,
                            'Erro ao verificar a participação da atleta.',
                            erroParticipacao
                        );
                    }

                    if (participacoes.length === 0) {
                        return responderErro(
                            403,
                            'A atleta não pertence a esta partida.'
                        );
                    }

                    const idParticipacaoAtleta =
                        participacoes[0].id_participacao_atleta;

                    const buscarSet = (continuar) => {
                        if (idSetInformado) {
                            return continuar(idSetInformado);
                        }

                        if (!numeroSet) {
                            return responderErro(
                                400,
                                'Informe o número ou o ID do set.'
                            );
                        }

                        const sqlSet = `
                            SELECT id_set
                            FROM set_partida
                            WHERE id_partida = ?
                              AND numero_set = ?
                            LIMIT 1
                        `;

                        banco.query(
                            sqlSet,
                            [idPartida, numeroSet],
                            (erroSet, sets) => {
                                if (erroSet) {
                                    return responderErro(
                                        500,
                                        'Erro ao buscar o set.',
                                        erroSet
                                    );
                                }

                                if (sets.length === 0) {
                                    return responderErro(
                                        400,
                                        'O set precisa ser salvo antes da ação.'
                                    );
                                }

                                return continuar(sets[0].id_set);
                            }
                        );
                    };

                    buscarSet((idSet) => {
                        const sqlAcao = `
                            INSERT INTO acao_partida
                                (
                                    id_partida,
                                    id_set,
                                    id_atleta,
                                    fundamento,
                                    resultado
                                )
                            VALUES (?, ?, ?, ?, ?)
                        `;

                        banco.query(
                            sqlAcao,
                            [
                                idPartida,
                                idSet,
                                idAtleta,
                                fundamento,
                                resultado
                            ],
                            (erroAcao, resultadoAcao) => {
                                if (erroAcao) {
                                    return responderErro(
                                        500,
                                        'Não foi possível salvar a ação.',
                                        erroAcao
                                    );
                                }

                                const sqlDesempenho = `
                                    INSERT INTO desempenho_atleta
                                        (
                                            id_participacao_atleta,
                                            ${coluna}
                                        )
                                    VALUES (?, 1)
                                    ON DUPLICATE KEY UPDATE
                                        ${coluna} = ${coluna} + 1
                                `;

                                banco.query(
                                    sqlDesempenho,
                                    [idParticipacaoAtleta],
                                    (erroDesempenho) => {
                                        if (erroDesempenho) {
                                            return responderErro(
                                                500,
                                                'Não foi possível atualizar o desempenho.',
                                                erroDesempenho
                                            );
                                        }

                                        banco.commit((erroCommit) => {
                                            if (erroCommit) {
                                                return responderErro(
                                                    500,
                                                    'Não foi possível confirmar o salvamento.',
                                                    erroCommit
                                                );
                                            }

                                            return res.status(201).json({
                                                sucesso: true,
                                                id_acao: resultadoAcao.insertId,
                                                id_set: idSet,
                                                mensagem: 'Ação salva com sucesso.'
                                            });
                                        });
                                    }
                                );
                            }
                        );
                    });
                }
            );
        });
    }
);

module.exports = router;
