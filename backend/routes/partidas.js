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
    .filter((chave) => {
        return (
            chave.startsWith('atleta_') &&
            escalacao[chave] &&
            String(
                escalacao[chave].participa || ''
            ) === '1'
        );
    })
    .map((chave) => {
        return Number(
            chave.replace('atleta_', '')
        );
    })
    .filter((idAtleta) => {
        return Number.isInteger(idAtleta) &&
            idAtleta > 0;
    });


                                    let pendentes = idsAtletas.length;
                                    let houveErro = null;

                                    idsAtletas.forEach((idAtleta) => {
    const chaveAtleta = `atleta_${idAtleta}`;

    const dadosAtleta =
        escalacao[chaveAtleta] || {};

  const titular =
    String(dadosAtleta.titular) === '1'
      ? 1
      : 0;

  const posicaoNumero = Number(
    dadosAtleta.posicao
  );

  const posicaoInicial =
    titular === 1 &&
    Number.isInteger(posicaoNumero) &&
    posicaoNumero >= 1 &&
    posicaoNumero <= 6
      ? posicaoNumero
      : null;


    const sqlAtletaPartida = `
        INSERT INTO participacao_atleta
        (
            id_atleta,
            id_partida,
            id_equipe,
            titular,
            posicao_inicial
        )
        SELECT
            me.id_atleta,
            ?,
            me.id_equipe,
            ?,
            ?
        FROM membro_equipe me
        INNER JOIN equipe e
            ON e.id_equipe = me.id_equipe
        WHERE me.id_atleta = ?
          AND me.id_equipe = ?
          AND e.id_treinador = ?
          AND me.status = 'ATIVO'
    `;

    const parametros = [
        idPartida,
        titular,
        posicaoInicial,
        Number(idAtleta),
        Number(equipeCasaId),
        Number(idTreinador)
    ];

    banco.query(
        sqlAtletaPartida,
        parametros,
        (erroAtletaPartida, resultado) => {
            if (erroAtletaPartida) {
                console.error(
                    'Erro ao salvar atleta:',
                    idAtleta,
                    erroAtletaPartida
                );

                houveErro =
                    `Atleta ${idAtleta}: ${
                        erroAtletaPartida.sqlMessage ||
                        erroAtletaPartida.message
                    }`;
            } else if (resultado.affectedRows === 0) {
                houveErro =
                    `Atleta ${idAtleta} não foi encontrado como membro ATIVO da equipe ${equipeCasaId}.`;
            }

            pendentes -= 1;

            if (pendentes === 0) {
                if (houveErro) {
                    return res.status(400).send(
                        `Erro ao salvar a escalação: ${houveErro}`
                    );
                }

                return res.redirect('/partidas');
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

// salvar set

router.get('/partidas/:id/desempenho/sets', exigirLogin, (req, res) => {
    const idPartida = Number(req.params.id);

    const sql = `
        SELECT
            id_set,
            numero_set,
            placar_casa,
            placar_adversario,
            vencedor
        FROM set_partida
        WHERE id_partida = ?
        ORDER BY numero_set ASC
    `;

    banco.query(sql, [idPartida], (erro, sets) => {
        if (erro) {
            console.error('Erro ao buscar sets:', erro);
            return res.status(500).json({
                erro: 'Não foi possível carregar os sets.'
            });
        }

        return res.json(sets);
    });
});

router.post('/partidas/:id/desempenho/set', exigirLogin, (req, res) => {
    const idPartida = Number(req.params.id);
    const numeroSet = Number(req.body.numero_set);
    const placarCasa = Number(req.body.placar_casa);
    const placarAdversario = Number(req.body.placar_adversario);
    const vencedor = String(req.body.vencedor || 'EMPATE');

    if (!idPartida || !numeroSet) {
        return res.status(400).json({
            erro: 'Partida ou número do set inválido.'
        });
    }

    if (
        !Number.isInteger(placarCasa) ||
        !Number.isInteger(placarAdversario) ||
        placarCasa < 0 ||
        placarAdversario < 0
    ) {
        return res.status(400).json({
            erro: 'Placar inválido.'
        });
    }

    const vencedoresPermitidos = [
        'MINHA_EQUIPE',
        'EQUIPE_ADVERSARIA',
        'EMPATE'
    ];

    if (!vencedoresPermitidos.includes(vencedor)) {
        return res.status(400).json({
            erro: 'Vencedor inválido.'
        });
    }

    const sql = `
        INSERT INTO set_partida
            (
                id_partida,
                numero_set,
                placar_casa,
                placar_adversario,
                vencedor
            )
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            placar_casa = VALUES(placar_casa),
            placar_adversario = VALUES(placar_adversario),
            vencedor = VALUES(vencedor)
    `;

    banco.query(
        sql,
        [
            idPartida,
            numeroSet,
            placarCasa,
            placarAdversario,
            vencedor
        ],
        (erro, resultado) => {
            if (erro) {
                console.error('Erro ao salvar set:', erro);
                return res.status(500).json({
                    erro: 'Não foi possível salvar o set no banco.'
                });
            }

            return res.status(201).json({
                sucesso: true,
                id_set: resultado.insertId || null
            });
        }
    );
});

// editar set 

router.put('/partidas/:id/desempenho/set/:idSet', exigirTreinador, (req, res) => {
    const idPartida = Number(req.params.id);
    const idSet = Number(req.params.idSet);
    const placarCasa = Number(req.body.placar_casa);
    const placarAdversario = Number(req.body.placar_adversario);
    const vencedor = String(req.body.vencedor || 'EMPATE');

    if (!idPartida || !idSet) {
        return res.status(400).json({
            erro: 'Partida ou set inválido.'
        });
    }

    const sql = `
        UPDATE set_partida
        SET
            placar_casa = ?,
            placar_adversario = ?,
            vencedor = ?
        WHERE id_set = ?
          AND id_partida = ?
    `;

    banco.query(
        sql,
        [
            placarCasa,
            placarAdversario,
            vencedor,
            idSet,
            idPartida
        ],
        (erro, resultado) => {
            if (erro) {
                console.error('Erro ao editar set:', erro);
                return res.status(500).json({
                    erro: 'Não foi possível editar o set.'
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    erro: 'Set não encontrado.'
                });
            }

            return res.json({ sucesso: true });
        }
    );
});

router.delete('/partidas/:id/desempenho/set/:idSet', exigirTreinador, (req, res) => {
    const idPartida = Number(req.params.id);
    const idSet = Number(req.params.idSet);

    const sql = `
        DELETE FROM set_partida
        WHERE id_set = ?
          AND id_partida = ?
    `;

    banco.query(
        sql,
        [idSet, idPartida],
        (erro, resultado) => {
            if (erro) {
                console.error('Erro ao apagar set:', erro);
                return res.status(500).json({
                    erro: 'Não foi possível apagar o set.'
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    erro: 'Set não encontrado.'
                });
            }

            return res.json({ sucesso: true });
        }
    );
});


// ============================
// VISUALIZAR DESEMPENHO
// ============================
// =====================================
// TELA DE DESEMPENHO
// SOMENTE TREINADOR
// =====================================
router.get(
    '/partidas/:id/desempenho',
    exigirTreinador,
    (req, res) => {
        const idPartida = Number(req.params.id);
        const idTreinador = Number(
            req.session.usuario.id_treinador
        );

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
              AND e.id_treinador = ?
            LIMIT 1
        `;

        banco.query(
            sqlPartida,
            [idPartida, idTreinador],
            (erroPartida, partidas) => {
                if (erroPartida) {
                    console.error(
                        'Erro ao buscar partida:',
                        erroPartida
                    );
                    return res.status(500).send(
                        'Erro ao buscar partida.'
                    );
                }

                if (partidas.length === 0) {
                    return res.status(404).send(
                        'Partida não encontrada ou sem permissão.'
                    );
                }

                const partida = partidas[0];

                const sqlAtletas = `
    SELECT
        a.id_atleta,
        COALESCE(a.nome, u.nome) AS nome,
        a.numero_camisa,
        a.posicao,
        pa.titular,
        pa.posicao_inicial
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
    ORDER BY
        pa.posicao_inicial ASC,
        COALESCE(a.nome, u.nome)
`;


                banco.query(
                    sqlAtletas,
                    [idPartida, partida.id_equipe],
                    (erroAtletas, atletas) => {
                        if (erroAtletas) {
                            console.error(
                                'Erro ao buscar atletas:',
                                erroAtletas
                            );
                            atletas = [];
                        }

                        const sqlSets = `
                            SELECT
                                id_set,
                                id_partida,
                                numero_set,
                                placar_casa,
                                placar_adversario,
                                vencedor
                            FROM set_partida
                            WHERE id_partida = ?
                            ORDER BY numero_set ASC
                        `;

                        banco.query(
                            sqlSets,
                            [idPartida],
                            (erroSets, setsSalvos) => {
                                if (erroSets) {
                                    console.error(
                                        'Erro ao buscar sets:',
                                        erroSets
                                    );
                                    setsSalvos = [];
                                }

                                const sqlAcoes = `
    SELECT
        ac.id_acao,
        ac.id_partida,
        ac.id_set,
        ac.id_atleta,
        COALESCE(
            a2.nome,
            u2.nome,
            'Atleta'
        ) AS nome_atleta,
        ac.fundamento,
        ac.resultado,
        sp.numero_set
    FROM acao_partida ac
    INNER JOIN set_partida sp
        ON sp.id_set = ac.id_set
    LEFT JOIN atleta a2
        ON a2.id_atleta = ac.id_atleta
    LEFT JOIN usuario u2
        ON u2.id_usuario = a2.id_usuario
    WHERE ac.id_partida = ?
    ORDER BY ac.id_acao ASC
`;


                                banco.query(
                                    sqlAcoes,
                                    [idPartida],
                                    (erroAcoes, acoes) => {
                                        if (erroAcoes) {
                                            console.error(
                                                'Erro ao buscar ações:',
                                                erroAcoes
                                            );
                                            acoes = [];
                                        }

                                        // ESTE É O ÚNICO res.render DA ROTA.
                                        return res.render(
                                            'partidas/desempenho',
                                            {
                                                usuario: req.session.usuario,
                                                partida: {
                                                    id_partida: partida.id_partida,
                                                    nome_equipe: partida.nome_equipe,
                                                    nome_equipe_adversaria:
                                                        partida.nome_equipe_adversaria,
                                                    quantidade_sets:
                                                        partida.quantidade_sets || 3,
                                                    sets_salvos:
                                                        setsSalvos.length,
                                                    set_atual:
                                                        setsSalvos.length + 1,
                                                    pontos_minha_equipe: 0,
                                                    pontos_adversario: 0,
                                                    sets_minha_equipe:
                                                        setsSalvos.filter(
                                                            (set) => set.vencedor === 'MINHA_EQUIPE'
                                                        ).length,
                                                    sets_adversario:
                                                        setsSalvos.filter(
                                                            (set) => set.vencedor === 'EQUIPE_ADVERSARIA'
                                                        ).length,
                                                    equipe_sacando:
                                                        partida.nome_equipe
                                                },
                                                atletas: atletas,
                                                acoes: acoes,
                                                listaAcoes: acoes,
                                                setsSalvos: setsSalvos,
                                                somenteLeitura: false,
                                                erro: null
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    }
);

router.put(
    '/partidas/:id/desempenho/substituicao',
    exigirTreinador,
    (req, res) => {
        const idPartida = Number(req.params.id);
        const idAtletaSai = Number(req.body.id_atleta_sai);
        const idAtletaEntra = Number(req.body.id_atleta_entra);
        const posicao = Number(req.body.posicao);

        if (
            !idPartida ||
            !idAtletaSai ||
            !idAtletaEntra ||
            idAtletaSai === idAtletaEntra ||
            !Number.isInteger(posicao) ||
            posicao < 1 ||
            posicao > 6
        ) {
            return res.status(400).json({
                erro: 'Dados inválidos para a substituição.'
            });
        }

        const sqlSaida = `
            SELECT
                id_participacao_atleta
            FROM participacao_atleta
            WHERE id_partida = ?
              AND id_atleta = ?
              AND titular = 1
              AND posicao_inicial = ?
            LIMIT 1
        `;

        banco.query(
            sqlSaida,
            [
                idPartida,
                idAtletaSai,
                posicao
            ],
            (erroSaida, atletasSaida) => {
                if (erroSaida) {
                    console.error(
                        'Erro ao localizar atleta que sai:',
                        erroSaida
                    );

                    return res.status(500).json({
                        erro: 'Erro ao localizar o atleta que sairá.'
                    });
                }

                if (atletasSaida.length === 0) {
                    return res.status(400).json({
                        erro: 'O atleta selecionado não está como titular nessa posição.'
                    });
                }

                const sqlEntrada = `
                    SELECT
                        id_participacao_atleta
                    FROM participacao_atleta
                    WHERE id_partida = ?
                      AND id_atleta = ?
                      AND titular = 0
                    LIMIT 1
                `;

                banco.query(
                    sqlEntrada,
                    [
                        idPartida,
                        idAtletaEntra
                    ],
                    (erroEntrada, atletasEntrada) => {
                        if (erroEntrada) {
                            console.error(
                                'Erro ao localizar atleta que entra:',
                                erroEntrada
                            );

                            return res.status(500).json({
                                erro: 'Erro ao localizar o atleta que entrará.'
                            });
                        }

                        if (atletasEntrada.length === 0) {
                            return res.status(400).json({
                                erro: 'O atleta selecionado não está no banco.'
                            });
                        }

                        const idParticipacaoSai =
                            atletasSaida[0].id_participacao_atleta;

                        const idParticipacaoEntra =
                            atletasEntrada[0].id_participacao_atleta;

                        const sqlAtualizarSai = `
                            UPDATE participacao_atleta
                            SET
                                titular = 0,
                                posicao_inicial = NULL
                            WHERE id_participacao_atleta = ?
                        `;

                        banco.query(
                            sqlAtualizarSai,
                            [idParticipacaoSai],
                            (erroAtualizarSai) => {
                                if (erroAtualizarSai) {
                                    console.error(
                                        'Erro ao retirar atleta:',
                                        erroAtualizarSai
                                    );

                                    return res.status(500).json({
                                        erro: 'Não foi possível retirar o atleta da quadra.'
                                    });
                                }

                                const sqlAtualizarEntra = `
                                    UPDATE participacao_atleta
                                    SET
                                        titular = 1,
                                        posicao_inicial = ?
                                    WHERE id_participacao_atleta = ?
                                `;

                                banco.query(
                                    sqlAtualizarEntra,
                                    [
                                        posicao,
                                        idParticipacaoEntra
                                    ],
                                    (erroAtualizarEntra) => {
                                        if (erroAtualizarEntra) {
                                            console.error(
                                                'Erro ao colocar atleta:',
                                                erroAtualizarEntra
                                            );

                                            return res.status(500).json({
                                                erro: 'Não foi possível colocar o atleta na quadra.'
                                            });
                                        }

                                        return res.json({
                                            sucesso: true,
                                            mensagem:
                                                'Substituição realizada com sucesso.'
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    }
);

router.get(
    '/partidas/:id/desempenho/acoes',
    exigirTreinador,
    (req, res) => {
        const idPartida = Number(req.params.id);
        const numeroSet = Number(
            req.query.numero_set || 1
        );

        if (
            !Number.isInteger(idPartida) ||
            idPartida <= 0 ||
            !Number.isInteger(numeroSet) ||
            numeroSet <= 0
        ) {
            return res.status(400).json({
                erro: 'Partida ou set inválido.'
            });
        }

        const sql = `
            SELECT
                ac.id_acao,
                ac.id_partida,
                ac.id_set,
                ac.id_atleta,
                COALESCE(
                    a.nome,
                    u.nome,
                    'Atleta'
                ) AS nome_atleta,
                ac.fundamento,
                ac.resultado,
                sp.numero_set
            FROM acao_partida ac
            INNER JOIN set_partida sp
                ON sp.id_set = ac.id_set
            INNER JOIN partida p
                ON p.id_partida = ac.id_partida
            INNER JOIN participacao_partida pp
                ON pp.id_partida = p.id_partida
            INNER JOIN equipe e
                ON e.id_equipe = pp.id_equipe
            LEFT JOIN atleta a
                ON a.id_atleta = ac.id_atleta
            LEFT JOIN usuario u
                ON u.id_usuario = a.id_usuario
            WHERE ac.id_partida = ?
              AND sp.numero_set = ?
              AND e.id_treinador = ?
            ORDER BY ac.id_acao ASC
        `;

        const idTreinador = Number(
            req.session.usuario.id_treinador
        );

        banco.query(
            sql,
            [
                idPartida,
                numeroSet,
                idTreinador
            ],
            (erro, acoes) => {
                if (erro) {
                    console.error(
                        'Erro ao carregar ações do set:',
                        erro
                    );

                    return res.status(500).json({
                        erro: 'Não foi possível carregar as ações.'
                    });
                }

                return res.json(acoes);
            }
        );
    }
);

// =====================================
// EXCLUIR PARTIDA COMPLETA
// =====================================
router.delete('/partidas/:id', exigirTreinador, (req, res) => {
    const idPartida = Number(req.params.id);

    if (!idPartida) {
        return res.status(400).json({
            erro: 'ID da partida inválido.'
        });
    }

    const comandos = [
    `
        DELETE da
        FROM desempenho_atleta da
        INNER JOIN participacao_atleta pa
            ON pa.id_participacao_atleta =
               da.id_participacao_atleta
        WHERE pa.id_partida = ?
    `,

    `
        DELETE FROM acao_partida
        WHERE id_partida = ?
    `,

    `
        DELETE FROM set_partida
        WHERE id_partida = ?
    `,

    `
        DELETE FROM participacao_atleta
        WHERE id_partida = ?
    `,

    `
        DELETE FROM participacao_partida
        WHERE id_partida = ?
    `,

    `
        DELETE FROM partida
        WHERE id_partida = ?
    `
];



    let indice = 0;

    function executarProximo() {
        if (indice >= comandos.length) {
            return res.json({
                sucesso: true,
                mensagem: 'Partida excluída com sucesso.'
            });
        }

        const sql = comandos[indice];
        indice += 1;

        banco.query(sql, [idPartida], (erro) => {
            if (erro) {
                console.error('Erro ao excluir partida:', erro);

                return res.status(500).json({
                    erro:
                        erro.sqlMessage ||
                        'Não foi possível excluir a partida.'
                });
            }

            executarProximo();
        });
    }

    executarProximo();
});


module.exports = router;