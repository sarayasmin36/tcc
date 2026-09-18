const express = require('express');
const banco = require('../db');
const { exigirLogin } = require('../middleware/autenticado');
const router = express.Router();

router.get('/', exigirLogin, (req, res) => {
    const usuario = req.session.usuario;
    let filtroEquipe;
    let idUsuario;

    // Define quais equipes o usuário pode visualizar.
    if (usuario.tipo_usuario === 'ATLETA') {
        filtroEquipe = `
            e.id_equipe IN (
                SELECT me.id_equipe
                FROM membro_equipe me
                WHERE me.id_atleta = ?
                  AND me.status = 'ATIVO'
            )
        `;

        idUsuario = usuario.id_atleta;
    } else if (usuario.tipo_usuario === 'TREINADOR') {
        filtroEquipe = 'e.id_treinador = ?';
        idUsuario = usuario.id_treinador;
    } else {
        return res.status(403).send('Tipo de usuário não autorizado.');
    }

    // Busca os totais somente das equipes permitidas.
    const sqlTotais = `
        SELECT
            (
                SELECT COUNT(*)
                FROM equipe e
                WHERE ${filtroEquipe}
            ) AS totalEquipes,

            (
                SELECT COUNT(DISTINCT me.id_atleta)
                FROM membro_equipe me
                INNER JOIN equipe e
                    ON e.id_equipe = me.id_equipe
                WHERE ${filtroEquipe}
                  AND me.status = 'ATIVO'
            ) AS totalAtletas,

            (
                SELECT COUNT(DISTINCT p.id_campeonato)
                FROM partida p
                INNER JOIN participacao_partida pp
                    ON pp.id_partida = p.id_partida
                INNER JOIN equipe e
                    ON e.id_equipe = pp.id_equipe
                WHERE ${filtroEquipe}
            ) AS totalCampeonatos,

            (
                SELECT COUNT(DISTINCT pp.id_partida)
                FROM participacao_partida pp
                INNER JOIN equipe e
                    ON e.id_equipe = pp.id_equipe
                WHERE ${filtroEquipe}
            ) AS totalPartidas
    `;

    // Cada ponto de interrogação recebe o ID do usuário logado.
    banco.query(
        sqlTotais,
        [idUsuario, idUsuario, idUsuario, idUsuario],
        (erroTotais, totais) => {
            if (erroTotais) {
                console.log('Erro ao buscar totais:', erroTotais);
                return mostrarErro(res, 'Erro ao carregar os totais.');
            }

            // Busca somente as equipes permitidas para o usuário.
            const sqlEquipes = `
                SELECT
                    e.id_equipe,
                    e.nome,
                    e.categoria,
                    e.local,
                    e.codigo_acesso,
                    COUNT(
                        CASE
                            WHEN me.status = 'ATIVO' THEN 1
                        END
                    ) AS quantidade_atletas
                FROM equipe e
                LEFT JOIN membro_equipe me
                    ON me.id_equipe = e.id_equipe
                WHERE ${filtroEquipe}
                GROUP BY
                    e.id_equipe,
                    e.nome,
                    e.categoria,
                    e.local,
                    e.codigo_acesso,
                    e.criada_em
                ORDER BY e.criada_em DESC
                LIMIT 5
            `;

            banco.query(
                sqlEquipes,
                [idUsuario],
                (erroEquipes, equipes) => {
                    if (erroEquipes) {
                        console.log('Erro ao buscar equipes:', erroEquipes);
                        return mostrarErro(res, 'Erro ao carregar as equipes.');
                    }

                    // Busca somente partidas das equipes permitidas.
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
                        INNER JOIN participacao_partida pp
                            ON pp.id_partida = p.id_partida
                        INNER JOIN equipe e
                            ON e.id_equipe = pp.id_equipe
                        WHERE ${filtroEquipe}
                        GROUP BY
                            p.id_partida,
                            c.nome,
                            p.data_hora
                        ORDER BY p.data_hora DESC
                        LIMIT 5
                    `;

                    banco.query(
                        sqlPartidas,
                        [idUsuario],
                        (erroPartidas, partidas) => {
                            if (erroPartidas) {
                                console.log('Erro ao buscar partidas:', erroPartidas);
                                return mostrarErro(res, 'Erro ao carregar as partidas.');
                            }

                            // Prepara os dados no formato usado pela tela.
                            partidas = partidas.map((partida) => {
                                const nomes = partida.nomes_equipes
                                    ? partida.nomes_equipes.split(' x ')
                                    : [];

                                return {
                                    ...partida,
                                    nome_equipe: nomes[0] || 'Minha equipe',
                                    nome_equipe_adversaria: nomes[1] || 'Equipe adversária',
                                    situacao: partida.status || 'Agendada'
                                };
                            });

                            const dados = totais[0];

                            res.render('index', {
                                usuario: usuario,
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

// Exibe o painel com valores vazios quando alguma consulta falha.
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
