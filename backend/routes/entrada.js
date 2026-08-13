const express = require('express');

const router = express.Router();

router.get('/login', (req, res) => {
    res.render('entrada/login', {
        erro: null
    });
});

router.get('/registro-treinador', (req, res) => {
    res.render('entrada/registro-treinador', { erro: null });
});

router.get('/registro-atleta', (req, res) => {
    res.render('entrada/registro-atleta', { erro: null });
});

router.post('/registro', (req, res) => {
    const { nome, email, senha } = req.body;
    const tipo_usuario = 'TREINADOR';
        bcrypt.hash(senha, 10, (erroHash, senhaHash) => {
        if (erroHash) {
            console.error('Erro ao proteger a senha:', erroHash);
            return res.status(500).send('Erro ao processar a senha.');
        }

        const sql = `
            INSERT INTO usuario (nome, email, senha, tipo_usuario)
            VALUES (?, ?, ?, ?)
        `;

        conexao.query(
            sql,
            [nome, email, senhaHash, tipo_usuario],
            (erro, resultado) => {
                if (erro) {
                    console.error('Erro ao cadastrar treinador:', erro);
                    return res.status(500).send('Erro ao cadastrar treinador.');
                }

                console.log('Treinador salvo. ID:', resultado.insertId);
                res.send('Treinador cadastrado com sucesso!');
            }
        );
    });


});

module.exports = router;