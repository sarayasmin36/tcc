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

    const sql = `
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

    banco.query(sql, [parametroAcesso], (erro, relatorios) => {
        if (erro) {
            console.log('Erro ao buscar relatórios:', erro);

            return res.render('relatorios', {
                usuario: usuario,
                relatorios: [],
                erro: 'Não foi possível carregar os relatórios.',
                sucesso: null
            });
        }

        res.render('relatorios', {
            usuario: usuario,
            relatorios: relatorios,
            erro: null,
            sucesso: null
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

module.exports = router;


// ============================
// REGISTRAR UMA AÇÃO
// ============================
router.post('/partidas/:id/desempenho/acao', exigirTreinador, (req, res) => {
    const idPartida = req.params.id;
    const idAtleta = req.body.id_atleta;
    const fundamento = req.body.fundamento;
    const resultado = req.body.resultado;
    const idTreinador = req.session.usuario.id_treinador;

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

    const coluna = colunas[fundamento] && colunas[fundamento][resultado];

    if (!idAtleta || !coluna) {
        return res.status(400).json({
            erro: 'Atleta, fundamento ou resultado inválido.'
        });
    }

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
        [idAtleta, idPartida, idTreinador],
        (erroParticipacao, participacoes) => {
            if (erroParticipacao) {
                console.log(
                    'Erro ao verificar ação:',
                    erroParticipacao
                );
                return res.status(500).json({
                    erro: 'Erro ao verificar a participação da atleta.'
                });
            }

            if (participacoes.length === 0) {
                return res.status(403).json({
                    erro: 'A atleta não pertence a esta partida ou equipe.'
                });
            }

            const idParticipacaoAtleta =
                participacoes[0].id_participacao_atleta;

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
                        return res.status(500).json({
                            erro: 'Erro ao buscar desempenho.'
                        });
                    }

                    if (desempenhos.length === 0) {
                        const sqlInserir = `
                            INSERT INTO desempenho_atleta
                                (id_participacao_atleta, ${coluna})
                            VALUES (?, 1)
                        `;

                        banco.query(
                            sqlInserir,
                            [idParticipacaoAtleta],
                            (erroInserir) => {
                                if (erroInserir) {
                                    console.log(
                                        'Erro ao inserir desempenho:',
                                        erroInserir
                                    );
                                    return res.status(500).json({
                                        erro: 'Não foi possível salvar a ação.'
                                    });
                                }

                                res.json({
                                    mensagem: 'Ação salva com sucesso.'
                                });
                            }
                        );
                    } else {
                        const sqlAtualizar = `
                            UPDATE desempenho_atleta
                            SET ${coluna} = ${coluna} + 1
                            WHERE id_participacao_atleta = ?
                        `;

                        banco.query(
                            sqlAtualizar,
                            [idParticipacaoAtleta],
                            (erroAtualizar) => {
                                if (erroAtualizar) {
                                    console.log(
                                        'Erro ao atualizar desempenho:',
                                        erroAtualizar
                                    );
                                    return res.status(500).json({
                                        erro: 'Não foi possível atualizar a ação.'
                                    });
                                }

                                res.json({
                                    mensagem: 'Ação salva com sucesso.'
                                });
                            }
                        );
                    }
                }
            );
        }
    );
});

