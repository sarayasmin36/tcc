const express = require('express');
const banco = require('../db');
const { exigirLogin } = require('../middleware/autenticado');

const router = express.Router();

// ============================
// VISUALIZAR PERFIL
// ============================
router.get('/perfil', exigirLogin, (req, res) => {
    const idUsuario = req.session.usuario.id_usuario;

    const sql = `
        SELECT
            id_usuario,
            tipo_usuario,
            nome,
            email
        FROM usuario
        WHERE id_usuario = ?
        LIMIT 1
    `;

    banco.query(sql, [idUsuario], (erro, usuarios) => {
        if (erro) {
            console.log('Erro ao buscar perfil:', erro);

            return res.render('perfil', {
                usuario: req.session.usuario,
                iniciaisUsuario: '',
                nomeUsuario: '',
                emailUsuario: '',
                tipoUsuario: '',
                tipoUsuarioFormatado: '',
                erro: 'Não foi possível carregar o perfil.',
                sucesso: null
            });
        }

        if (usuarios.length === 0) {
            return res.status(404).send('Usuário não encontrado.');
        }

        const usuario = usuarios[0];
        const partesNome = usuario.nome.trim().split(' ');
        const iniciaisUsuario = partesNome
            .map((parte) => parte.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase();

        let tipoUsuarioFormatado;

        if (usuario.tipo_usuario === 'TREINADOR') {
            tipoUsuarioFormatado = 'Treinador';
        } else {
            tipoUsuarioFormatado = 'Atleta';
        }

        res.render('perfil', {
            usuario: usuario,
            iniciaisUsuario: iniciaisUsuario,
            nomeUsuario: usuario.nome,
            emailUsuario: usuario.email,
            tipoUsuario: usuario.tipo_usuario,
            tipoUsuarioFormatado: tipoUsuarioFormatado,
            erro: null,
            sucesso: null
        });
    });
});

// ============================
// ATUALIZAR PERFIL
// ============================
router.post('/perfil', exigirLogin, (req, res) => {
    const nome = req.body.nome ? req.body.nome.trim() : '';
    const email = req.body.email ? req.body.email.trim() : '';
    const idUsuario = req.session.usuario.id_usuario;

    if (!nome || !email) {
        return res.render('perfil', {
            usuario: req.session.usuario,
            iniciaisUsuario: '',
            nomeUsuario: nome,
            emailUsuario: email,
            tipoUsuario: req.session.usuario.tipo_usuario,
            tipoUsuarioFormatado: req.session.usuario.tipo_usuario === 'TREINADOR'
                ? 'Treinador'
                : 'Atleta',
            erro: 'Preencha o nome e o e-mail.',
            sucesso: null
        });
    }

    const sql = `
        UPDATE usuario
        SET nome = ?, email = ?
        WHERE id_usuario = ?
    `;

    banco.query(
        sql,
        [nome, email, idUsuario],
        (erro, resultado) => {
            if (erro) {
                console.log('Erro ao atualizar perfil:', erro);

                return res.render('perfil', {
                    usuario: req.session.usuario,
                    iniciaisUsuario: nome
                        .split(' ')
                        .map((parte) => parte.charAt(0))
                        .slice(0, 2)
                        .join('')
                        .toUpperCase(),
                    nomeUsuario: nome,
                    emailUsuario: email,
                    tipoUsuario: req.session.usuario.tipo_usuario,
                    tipoUsuarioFormatado: req.session.usuario.tipo_usuario === 'TREINADOR'
                        ? 'Treinador'
                        : 'Atleta',
                    erro: 'Não foi possível atualizar o perfil. Verifique se o e-mail já está cadastrado.',
                    sucesso: null
                });
            }

            req.session.usuario.nome = nome;
            req.session.usuario.email = email;

            res.render('perfil', {
                usuario: req.session.usuario,
                iniciaisUsuario: nome
                    .split(' ')
                    .map((parte) => parte.charAt(0))
                    .slice(0, 2)
                    .join('')
                    .toUpperCase(),
                nomeUsuario: nome,
                emailUsuario: email,
                tipoUsuario: req.session.usuario.tipo_usuario,
                tipoUsuarioFormatado: req.session.usuario.tipo_usuario === 'TREINADOR'
                    ? 'Treinador'
                    : 'Atleta',
                erro: null,
                sucesso: resultado.affectedRows > 0
                    ? 'Perfil atualizado com sucesso.'
                    : 'Nenhuma alteração foi realizada.'
            });
        }
    );
});

module.exports = router;

