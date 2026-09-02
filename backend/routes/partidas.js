const express = require('express');
const banco = require('../db');
const {
    exigirLogin,
    exigirTreinador
} = require('../middleware/autenticado');

const router = express.Router();

// ============================
// LISTAR PARTIDAS
// ============================
router.get('/partidas', exigirLogin, (req, res) => {
    const usuario = req.session.usuario;
    let filtroEquipe;
    let parametroEquipe;

    if (usuario.tipo_usuario === 'TREINADOR') {
        filtroEquipe = 'e.id_treinador = ?';
        parametroEquipe = usuario.id_treinador;
    } else {
        filtroEquipe = `
            e.id_equipe IN (
                SELECT me.id_equipe
                FROM membro_equipe me
                WHERE me.id_atleta = ?
                  AND me.status = 'ATIVO'
            )
        `;
        parametroEquipe = usuario.id_atleta;
    }

    const sql = `
        SELECT
            p.id_partida,
            c.nome AS campeonato,
            e.nome AS nome_equipe,
            p.nome_equipe_adversaria,
            p.local_partida,
            p.observacoes,
            p.quantidade_sets,
            p.status,
            DATE_FORMAT(p.data_hora, '%d/%m/%Y') AS data_partida,
            DATE_FORMAT(p.data_hora, '%H:%i') AS hora_partida
        FROM partida p
        INNER JOIN campeonato c
            ON c.id_campeonato = p.id_campeonato
        INNER JOIN participacao_partida pp
            ON pp.id_partida = p.id_partida
        INNER JOIN equipe e
            ON e.id_equipe = pp.id_equipe
        WHERE ${filtroEquipe}
        ORDER BY p.data_hora DESC
    `;

    banco.query(sql, [parametroEquipe], (erro, partidas) => {
        if (erro) {
            console.log('Erro ao buscar partidas:', erro);

            return res.render('partidas/listar', {
                usuario: usuario,
                partidas: [],
                erro: 'Não foi possível carregar as partidas.'
            });
        }

        res.render('partidas/listar', {
            usuario: usuario,
            partidas: partidas,
            erro: null
        });
    });
});

// ============================
// FORMULÁRIO DE CADASTRO
// ============================
router.get('/partidas/cadastro', exigirTreinador, (req, res) => {
    const idTreinador = req.session.usuario.id_treinador;

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

            return res.render('partidas/cadastro', {
                usuario: req.session.usuario,
                equipes: [],
                atletas: [],
                erro: 'Não foi possível carregar as equipes.'
            });
        }

        const sqlAtletas = `
            SELECT DISTINCT
                a.id_atleta,
                COALESCE(a.nome, u.nome) AS nome,
                a.numero_camisa,
                a.posicao,
                me.id_equipe
            FROM atleta a
            LEFT JOIN usuario u
                ON u.id_usuario = a.id_usuario
            INNER JOIN membro_equipe me
                ON me.id_atleta = a.id_atleta
            INNER JOIN equipe e
                ON e.id_equipe = me.id_equipe
            WHERE e.id_treinador = ?
              AND me.status = 'ATIVO'
            ORDER BY COALESCE(a.nome, u.nome)
        `;

        banco.query(
            sqlAtletas,
            [idTreinador],
            (erroAtletas, atletas) => {
                if (erroAtletas) {
                    console.log('Erro ao buscar atletas:', erroAtletas);
                    atletas = [];
                }

                res.render('partidas/cadastro', {
                    usuario: req.session.usuario,
                    equipes: equipes,
                    atletas: atletas,
                    erro: null
                });
            }
        );
    });
});

// ============================
// SALVAR PARTIDA
// ============================
router.post('/partidas', exigirTreinador, (req, res) => {
    const equipeCasaId = req.body.equipe_casa_id;
    const nomeEquipeAdversaria = req.body.nome_equipe_adversaria || null;
    const nomeCampeonato = req.body.campeonato || 'Amistoso';
    const quantidadeSets = req.body.quantidade_sets || 3;
    const dataPartida = req.body.data_partida;
    const horaPartida = req.body.hora_partida || '00:00';
    const localPartida = req.body.local || null;
    const observacoes = req.body.observacoes || null;
    const escalacao = req.body.escalacao || {};
    const idTreinador = req.session.usuario.id_treinador;

    if (!equipeCasaId || !nomeCampeonato || !dataPartida) {
        return res.send('Preencha a equipe, o campeonato e a data.');
    }

    const dataHora = `${dataPartida} ${horaPartida}:00`;

    const sqlEquipe = `
        SELECT id_equipe
        FROM equipe
        WHERE id_equipe = ?
          AND id_treinador = ?
        LIMIT 1
    `;

    banco.query(
        sqlEquipe,
        [equipeCasaId, idTreinador],
        (erroEquipe, equipes) => {
            if (erroEquipe) {
                console.log('Erro ao verificar equipe:', erroEquipe);
                return res.send('Erro ao verificar equipe.');
            }

            if (equipes.length === 0) {
                return res.status(403).send(
                    'Você só pode criar partidas para suas equipes.'
                );
            }

            const sqlCampeonato = `
                SELECT id_campeonato
                FROM campeonato
                WHERE nome = ?
                LIMIT 1
            `;

            banco.query(
                sqlCampeonato,
                [nomeCampeonato],
                (erroCampeonato, campeonatos) => {
                    if (erroCampeonato) {
                        console.log(
                            'Erro ao buscar campeonato:',
                            erroCampeonato
                        );
                        return res.send('Erro ao buscar campeonato.');
                    }

                    if (campeonatos.length > 0) {
                        salvarPartida(campeonatos[0].id_campeonato);
                    } else {
                        const sqlNovoCampeonato = `
                            INSERT INTO campeonato
                                (
                                    nome,
                                    modalidade,
                                    local,
                                    data_inicio,
                                    data_fim
                                )
                            VALUES (?, 'QUADRA', ?, ?, ?)
                        `;

                        banco.query(
                            sqlNovoCampeonato,
                            [
                                nomeCampeonato,
                                localPartida,
                                dataHora,
                                dataHora
                            ],
                            (erroNovoCampeonato, resultadoCampeonato) => {
                                if (erroNovoCampeonato) {
                                    console.log(
                                        'Erro ao criar campeonato:',
                                        erroNovoCampeonato
                                    );
                                    return res.send(
                                        'Não foi possível criar o campeonato.'
                                    );
                                }

                                salvarPartida(resultadoCampeonato.insertId);
                            }
                        );
                    }

                    function salvarPartida(idCampeonato) {
                        const sqlPartida = `
                        INSERT INTO partida
                            (
                                id_campeonato,
                                nome_equipe_adversaria,
                                local_partida,
                                observacoes,
                                quantidade_sets,
                                status,
                                data_hora
                            )
                        VALUES (?, ?, ?, ?, ?, 'AGENDADA', ?)
                    `;

                    banco.query(
                        sqlPartida,
                        [
                            idCampeonato,
                            nomeEquipeAdversaria,
                            localPartida,
                            observacoes,
                            quantidadeSets,
                            dataHora
                        ],
                        (erroPartida, resultadoPartida) => {
                            if (erroPartida) {
                                console.log(
                                    'Erro ao cadastrar partida:',
                                    erroPartida
                                );
                                return res.send(
                                    'Não foi possível cadastrar a partida.'
                                );
                            }

                            const idPartida = resultadoPartida.insertId;

                            const sqlParticipacao = `
                                INSERT INTO participacao_partida
                                    (id_partida, id_equipe, placar, resultado)
                                VALUES (?, ?, NULL, 'PENDENTE')
                            `;

                            banco.query(
                                sqlParticipacao,
                                [idPartida, equipeCasaId],
                                (erroParticipacao) => {
                                    if (erroParticipacao) {
                                        console.log(
                                            'Erro ao vincular equipe à partida:',
                                            erroParticipacao
                                        );
                                        return res.send(
                                            'A partida foi criada, mas a equipe não foi vinculada.'
                                        );
                                    }

                                    const idsAtletas = Object.keys(escalacao)
                                        .filter((idAtleta) => {
                                            return Number(idAtleta) > 0 &&
                                                escalacao[idAtleta].participa;
                                        });

                                    if (idsAtletas.length === 0) {
                                        return res.redirect('/partidas');
                                    }

                                    let pendentes = idsAtletas.length;
                                    let houveErro = null;

                                    idsAtletas.forEach((idAtleta) => {
                                        const titular = escalacao[idAtleta].titular
                                            ? 1
                                            : 0;

                                        const sqlAtletaPartida = `
                                            INSERT INTO participacao_atleta
                                                (
                                                    id_atleta,
                                                    id_partida,
                                                    id_equipe,
                                                    titular
                                                )
                                            SELECT
                                                me.id_atleta,
                                                ?,
                                                me.id_equipe,
                                                ?
                                            FROM membro_equipe me
                                            INNER JOIN equipe e
                                                ON e.id_equipe = me.id_equipe
                                            WHERE me.id_atleta = ?
                                              AND me.id_equipe = ?
                                              AND e.id_treinador = ?
                                              AND me.status = 'ATIVO'
                                        `;

                                        banco.query(
                                            sqlAtletaPartida,
                                            [
                                                idPartida,
                                                titular,
                                                idAtleta,
                                                equipeCasaId,
                                                idTreinador
                                            ],
                                            (erroAtletaPartida, resultado) => {
                                                if (erroAtletaPartida) {
                                                    console.log(
                                                        'Erro ao salvar atleta na escalação:',
                                                        erroAtletaPartida
                                                    );

                                                    houveErro =
                                                        `Atleta ${idAtleta}: ${erroAtletaPartida.sqlMessage || erroAtletaPartida.message}`;
                                                } else if (resultado.affectedRows === 0) {
                                                    houveErro =
                                                        `Atleta ${idAtleta} não pertence à equipe escolhida ou não está com vínculo ATIVO.`;
                                                }

                                                pendentes -= 1;

                                                if (pendentes === 0) {
                                                    if (houveErro) {
                                                        return res.send(
                                                            `Erro ao salvar a escalação: ${houveErro}`
                                                        );
                                                    }

                                                    res.redirect('/partidas');
                                                }
                                            }
                                        );
                                    });
                                }
                            );
                        }
                    );
                }
                    }
            );
        }
    );
});

// ============================
// VISUALIZAR DESEMPENHO
// ============================
router.get('/partidas/:id/desempenho', exigirLogin, (req, res) => {
    const idPartida = req.params.id;
    const usuario = req.session.usuario;
    let filtroEquipe;
    let parametroEquipe;

    if (usuario.tipo_usuario === 'TREINADOR') {
        filtroEquipe = 'e.id_treinador = ?';
        parametroEquipe = usuario.id_treinador;
    } else {
        filtroEquipe = `
            e.id_equipe IN (
                SELECT me.id_equipe
                FROM membro_equipe me
                WHERE me.id_atleta = ?
                  AND me.status = 'ATIVO'
            )
        `;
        parametroEquipe = usuario.id_atleta;
    }

    const sqlPartida = `
        SELECT
            p.id_partida,
            e.id_equipe,
            e.nome AS nome_equipe,
            p.nome_equipe_adversaria,
            p.quantidade_sets,
            p.status,
            pp.placar,
            pp.resultado
        FROM partida p
        INNER JOIN participacao_partida pp
            ON pp.id_partida = p.id_partida
        INNER JOIN equipe e
            ON e.id_equipe = pp.id_equipe
        WHERE p.id_partida = ?
          AND ${filtroEquipe}
        LIMIT 1
    `;

    banco.query(
        sqlPartida,
        [idPartida, parametroEquipe],
        (erroPartida, partidas) => {
            if (erroPartida) {
                console.log('Erro ao buscar partida:', erroPartida);
                return res.send('Erro ao buscar partida.');
            }

            if (partidas.length === 0) {
                return res.status(404).send('Partida não encontrada.');
            }

            const partida = partidas[0];

            const sqlAtletas = `
                SELECT
                    a.id_atleta,
                    COALESCE(a.nome, u.nome) AS nome,
                    a.numero_camisa,
                    a.posicao,
                    pa.titular
                FROM participacao_atleta pa
                INNER JOIN atleta a
                    ON a.id_atleta = pa.id_atleta
                LEFT JOIN usuario u
                    ON u.id_usuario = a.id_usuario
                INNER JOIN membro_equipe me
                    ON me.id_atleta = pa.id_atleta
                   AND me.id_equipe = pa.id_equipe
                WHERE pa.id_partida = ?
                  AND pa.id_equipe = ?
                  AND me.status = 'ATIVO'
                ORDER BY pa.titular DESC, COALESCE(a.nome, u.nome)
            `;

                    banco.query(
                sqlAtletas,
                [idPartida, partida.id_equipe],
                (erroAtletas, atletas) => {
                    if (erroAtletas) {
                        console.log('Erro ao buscar atletas:', erroAtletas);
                        atletas = [];
                    }

                    let proximaPosicaoTitular = 1;

                    atletas.forEach((atleta) => {
                        if (
                            Number(atleta.titular) === 1 &&
                            !atleta.posicao_inicial &&
                            proximaPosicaoTitular <= 6
                        ) {
                            atleta.posicao_inicial = proximaPosicaoTitular;
                            proximaPosicaoTitular += 1;
                        }
                    });

                    res.render('partidas/desempenho', {
                        usuario: usuario,
                        partida: {
                            id_partida: partida.id_partida,
                            nome_equipe: partida.nome_equipe,
                            nome_equipe_adversaria: partida.nome_equipe_adversaria,
                            quantidade_sets: partida.quantidade_sets || 3,
                            sets_salvos: 0,
                            set_atual: 1,
                            pontos_minha_equipe: 0,
                            pontos_adversario: 0,
                            sets_minha_equipe: 0,
                            sets_adversario: 0,
                            equipe_sacando: partida.nome_equipe
                        },
                        atletas: atletas,
                        acoes: [],
                        somenteLeitura: usuario.tipo_usuario === 'ATLETA',
                        erro: null
                    });
                }
            );
        }
    );
});

module.exports = router;

