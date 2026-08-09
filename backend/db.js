const mysql = require('mysql2');

const conexao = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tcc'
});

conexao.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err);
    } else {
        console.log('Conectado ao MySQL com sucesso!');
    }
});

module.exports = conexao;