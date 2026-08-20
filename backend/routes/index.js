const express = require('express');
const banco = require('../db');
const { exigirTreinador } = require('../middleware/autenticado');
const router = express.Router();

router.get('/', exigirTreinador, (req, res) => {
    const idTreinador = req.session.usuario.id_treinador;

    const sqlTotais = `
        SELECT
            (
                SELECT COUNT(*)
                FROM equipe
                WHERE id_treinador = ?
            ) AS totalEquipes,
            (
                SELECT COUNT(DISTINCT me.id_atleta)
                FROM membro_equipe me
                INNER JOIN equipe e
                    ON e.id_equipe = me.id_equipe
                WHERE e.id_treinador = ?
                  AND me.status = 'ATIVO'
            ) AS totalAtletas,
            (
                SELECT COUNT(DISTINCT p.id_campeonato)
                FROM partida p
                INNER JOIN participacao_partida pp
                    ON pp.id_partida = p.id_partida
                INNER JOIN equipe e
                    ON e.id_equipe = pp.id_equipe
                WHERE e.id_treinador = ?
            ) AS totalCampeonatos,
            (
                SELECT COUNT(DISTINCT pp.id_partida)
                FROM participacao_partida pp
                INNER JOIN equipe e
                    ON e.id_equipe = pp.id_equipe
                WHERE e.id_treinador = ?
            ) AS totalPartidas
    `;

    banco.query(
        sqlTotais,
        [idTreinador, idTreinador, idTreinador, idTreinador],
        (erroTotais, totais) => {
            if (erroTotais) {
                console.log('Erro ao buscar totais:', erroTotais);
                return mostrarErro(res, 'Erro ao carregar os totais.');
            }

            const sqlPartidas = `
                SELECT
                    p.id_partida,
                    c.nome AS campeonato,
                    p.data_hora,
                    GROUP_CONCAT(e.nome SEPARATOR ' x ') AS nomes_equipes,
                    MAX(pp.resultado) AS status
                FROM partida p
                INNER JOIN campeonato c
                    ON c.id_campeonato = p.id_campeonato
                LEFT JOIN participacao_partida pp
                    ON pp.id_partida = p.id_partida
                LEFT JOIN equipe e
                    ON e.id_equipe = pp.id_equipe
                WHERE e.id_treinador = ?
                GROUP BY
                    p.id_partida,
                    c.nome,
                    p.data_hora
                ORDER BY p.data_hora DESC
                LIMIT 5
            `;

            banco.query(
                sqlPartidas,
                [idTreinador],
                (erroPartidas, partidas) => {
                    if (erroPartidas) {
                        console.log('Erro ao buscar partidas:', erroPartidas);
                        return mostrarErro(res, 'Erro ao carregar as partidas.');
                    }

                    const sqlEquipes = `
                        SELECT
                            e.id_equipe,
                            e.nome,
                            COUNT(
                                CASE
                                    WHEN me.status = 'ATIVO' THEN 1
                                END
                            ) AS quantidade_atletas
                        FROM equipe e
                        LEFT JOIN membro_equipe me
                            ON me.id_equipe = e.id_equipe
                        WHERE e.id_treinador = ?
                        GROUP BY
                            e.id_equipe,
                            e.nome,
                            e.criada_em
                        ORDER BY e.criada_em DESC
                        LIMIT 5
                    `;

                    banco.query(
                        sqlEquipes,
                        [idTreinador],
                        (erroEquipes, equipes) => {
                            if (erroEquipes) {
                                console.log('Erro ao buscar equipes:', erroEquipes);
                                return mostrarErro(res, 'Erro ao carregar as equipes.');
                            }

                            partidas = partidas.map((partida) => {
                                if (partida.nomes_equipes) {
                                    const nomes = partida.nomes_equipes.split(' x ');

                                    return {
                                        ...partida,
                                        nome_equipe: nomes[0] || 'Minha equipe',
                                        nome_equipe_adversaria: nomes[1] || 'Equipe adversária',
                                        situacao: partida.status || 'Agendada'
                                    };
                                }

                                return {
                                    ...partida,
                                    nome_equipe: 'Minha equipe',
                                    nome_equipe_adversaria: 'Equipe adversária',
                                    situacao: partida.status || 'Agendada'
                                };
                            });

                            const dados = totais[0];

                            res.render('index', {
                                usuario: req.session.usuario,
                                totalEquipes: dados.totalEquipes,
                                totalAtletas: dados.totalAtletas,
                                totalCampeonatos: dados.totalCampeonatos,
                                totalPartidas: dados.totalPartidas,
                                partidas: partidas,
                                equipes: equipes,
                                erro: null,
                                sucesso: null
                            });
                        }
                    );
                }
            );
        }
    );
});

function mostrarErro(res, mensagem) {
    res.render('index', {
        usuario: null,
        totalEquipes: 0,
        totalAtletas: 0,
        totalCampeonatos: 0,
        totalPartidas: 0,
        partidas: [],
        equipes: [],
        erro: mensagem,
        sucesso: null
    });
}

module.exports = router;
