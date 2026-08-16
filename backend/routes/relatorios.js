const express = require('express');

const router = express.Router();

router.get('/relatorios', (req, res) => {
  res.render('relatorios', {
    erro: null
  });
});

module.exports = router;
