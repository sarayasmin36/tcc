const express = require('express');
const banco = require('../db');
const bcrypt = require('bcrypt');
const router = express.Router();

// login

router.get('/login', (req, res) => {
  res.render('entrada/login', {
    erro: null,
    sucesso: null
  });
});

router.post('/login', (req, res) => {
    // Recebe os dados enviados pelo formulário da tela /login.
    const email = req.body.email;
    const senha = req.body.senha;

    // Verifica se os dois campos foram preenchidos.
    if (!email || !senha) {
        return res.render('entrada/login', {
            erro: 'Informe o e-mail e a senha.',
            sucesso: null
        });
    }

    // Busca o usuário pelo e-mail.
    // O LEFT JOIN permite encontrar tanto treinador quanto atleta.
    const sql = `
        SELECT
            u.id_usuario,
            u.nome,
            u.email,
            u.senha_hash,
            u.tipo_usuario,
            t.id_treinador,
            a.id_atleta
        FROM usuario u
        LEFT JOIN treinador t
            ON t.id_usuario = u.id_usuario
        LEFT JOIN atleta a
            ON a.id_usuario = u.id_usuario
        WHERE u.email = ?
        LIMIT 1
    `;

    banco.query(sql, [email], (erro, resultados) => {
        // Trata erro de comunicação com o banco.
        if (erro) {
            console.log('Erro ao buscar usuário:', erro);

            return res.render('entrada/login', {
                erro: 'Não foi possível realizar o login.',
                sucesso: null
            });
        }

        // Se não encontrou o e-mail, não continua.
        if (resultados.length === 0) {
            return res.render('entrada/login', {
                erro: 'E-mail ou senha incorretos.',
                sucesso: null
            });
        }

        // Guarda o usuário encontrado.
        const usuario = resultados[0];

        // Compara a senha digitada com a senha_hash do banco.
        bcrypt.compare(senha, usuario.senha_hash, (erroSenha, senhaCorreta) => {
            if (erroSenha || !senhaCorreta) {
                return res.render('entrada/login', {
                    erro: 'E-mail ou senha incorretos.',
                    sucesso: null
                });
            }

            // Salva na sessão somente os dados necessários para autorização.
            req.session.usuario = {
                id_usuario: usuario.id_usuario,
                nome: usuario.nome,
                email: usuario.email,
                tipo_usuario: usuario.tipo_usuario,
                id_treinador: usuario.id_treinador || null,
                id_atleta: usuario.id_atleta || null
            };

            // Redireciona cada tipo de usuário para sua própria área.
            if (usuario.tipo_usuario === 'TREINADOR') {
                return res.redirect('/');
            }

            if (usuario.tipo_usuario === 'ATLETA') {
                return res.redirect('/');
            }

            // Bloqueia tipos de usuário que não estão previstos.
            req.session.destroy(() => {
                res.render('entrada/login', {
                    erro: 'Tipo de usuário não autorizado.',
                    sucesso: null
                });
            });
        });
    });
});

//treinador bd
 
router.get('/registro-treinador', (req, res) => {
  res.render('entrada/registro-treinador', {
    erro: null,
    sucesso: null
  });
});

router.post('/registro-treinador', (req, res) => {

    const nome = req.body.nome;
    const email = req.body.email;
    const senha = req.body.senha;

    // Cria uma proteção para a senha antes de salvá-la.
    bcrypt.hash(senha, 10, (erroHash, senhaHash) => {

        // Verifica se aconteceu um erro ao criar o hash.
        if (erroHash) {
            console.log('Erro ao proteger a senha:', erroHash);

            return res.render('entrada/registro-treinador', {
                erro: 'Não foi possível proteger a senha.',
                sucesso: null
            });
        }

        const sqlUsuario = `
            INSERT INTO usuario
                (tipo_usuario, nome, email, senha_hash)
            VALUES
                (?, ?, ?, ?)
        `;

        banco.query(
            sqlUsuario,
            ['TREINADOR', nome, email, senhaHash],
            (erroUsuario, resultadoUsuario) => {

                // Verifica se o usuário não pôde ser inserido.
                if (erroUsuario) {
                    console.log('Erro ao cadastrar usuário:', erroUsuario);

                    return res.render('entrada/registro-treinador', {
                        erro: 'Não foi possível cadastrar. Talvez este e-mail já esteja cadastrado.',
                        sucesso: null
                    });
                }


                const idUsuario = resultadoUsuario.insertId;

                // Comando para criar o registro específico do treinador.
                const sqlTreinador = `
                    INSERT INTO treinador
                        (id_usuario)
                    VALUES
                        (?)
                `;

                // Insere o treinador usando o id do usuário recém-criado. banco.query() serve para enviar um comando SQL para o MySQL e receber a resposta. 
                banco.query(
                    sqlTreinador,
                    [idUsuario],
                    (erroTreinador) => {

                        // Verifica se houve erro ao criar o treinador.
                        if (erroTreinador) {
                            console.log('Erro ao cadastrar treinador:', erroTreinador);

                            return res.render('entrada/registro-treinador', {
                                erro: 'O usuário foi criado, mas o treinador não pôde ser registrado.',
                                sucesso: null
                            });
                        }

                        // Mostra uma mensagem de sucesso na mesma tela.
                        res.render('entrada/registro-treinador', {
                            erro: null,
                            sucesso: 'Treinador cadastrado com sucesso! Agora você pode fazer login.'
                        });
                    }
                );
            }
        );
    });
});


module.exports = router;