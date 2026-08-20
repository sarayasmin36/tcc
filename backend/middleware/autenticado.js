function exigirLogin(req, res, next) {
    // Verifica se existe um usuário salvo na sessão.
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    // Permite que a rota continue.
    next();
}

function exigirTreinador(req, res, next) {
    // Primeiro verifica se existe alguém logado.
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    // Depois verifica se o usuário é um treinador.
    if (req.session.usuario.tipo_usuario !== 'TREINADOR') {
        return res.status(403).send('Acesso permitido somente para treinadores.');
    }

    // Permite que a rota continue.
    next();
}

module.exports = {
    exigirLogin,
    exigirTreinador
};