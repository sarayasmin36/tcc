'use strict';

document.addEventListener('DOMContentLoaded', () => {
  configurarMenuLateral();
  destacarPaginaAtual();
  configurarBuscas();
  configurarFormularios();
  configurarDesempenho();
  configurarEscalacaoInicial();
  configurarPartidaAoVivo();
});

function configurarMenuLateral() {
  const corpo = document.body;
  const botaoAbrir = document.querySelector('#botao-menu-mobile');
  const botaoFechar = document.querySelector('#botao-fechar-menu');
  const camadaMenu = document.querySelector('#camada-menu');
  const barraLateral = document.querySelector('#barra-lateral');
  const linksMenu = document.querySelectorAll('#barra-lateral a');

  if (!botaoAbrir || !barraLateral) return;

  function fecharMenu() {
    corpo.classList.remove('menu-aberto');
    botaoAbrir.setAttribute('aria-expanded', 'false');
    barraLateral.setAttribute('aria-hidden', 'true');
    if (camadaMenu) camadaMenu.setAttribute('aria-hidden', 'true');
  }

  function abrirMenu() {
    corpo.classList.add('menu-aberto');
    botaoAbrir.setAttribute('aria-expanded', 'true');
    barraLateral.setAttribute('aria-hidden', 'false');
    if (camadaMenu) camadaMenu.setAttribute('aria-hidden', 'false');
  }

  botaoAbrir.addEventListener('click', () => {
    corpo.classList.contains('menu-aberto') ? fecharMenu() : abrirMenu();
  });

  if (botaoFechar) botaoFechar.addEventListener('click', fecharMenu);
  if (camadaMenu) camadaMenu.addEventListener('click', fecharMenu);

  linksMenu.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 800) fecharMenu();
    });
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 800) fecharMenu();
  });

  if (window.innerWidth <= 800) fecharMenu();
  else barraLateral.setAttribute('aria-hidden', 'false');
}

function destacarPaginaAtual() {
  const caminhoAtual = window.location.pathname.replace(/\/$/, '') || '/';

  document.querySelectorAll('.navegacao a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    const caminhoLink = href.replace(/\/$/, '') || '/';
    const corresponde = caminhoLink === '/'
      ? caminhoAtual === '/'
      : caminhoAtual === caminhoLink || caminhoAtual.startsWith(`${caminhoLink}/`);

    link.classList.toggle('ativo', corresponde);
    if (corresponde) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function configurarBuscas() {
  configurarFiltro('[data-filtro-equipes]', '[data-nome-equipe]', '#estado-vazio-equipes', 'data-nome-equipe');
  configurarFiltro('[data-filtro-atletas]', '[data-nome-atleta]', '#estado-vazio-atletas', 'data-nome-atleta');
  configurarFiltro('[data-filtro-partidas]', '[data-partida-busca]', '#estado-vazio-partidas', 'data-partida-busca');
}

function configurarFiltro(seletorEntrada, seletorItens, seletorVazio, atributoBusca) {
  const entrada = document.querySelector(seletorEntrada);
  const itens = Array.from(document.querySelectorAll(seletorItens));
  const estadoVazio = document.querySelector(seletorVazio);

  if (!entrada || itens.length === 0) return;

  entrada.addEventListener('input', () => {
    const termo = entrada.value.trim().toLocaleLowerCase('pt-BR');
    let visiveis = 0;

    itens.forEach((item) => {
      const texto = item.getAttribute(atributoBusca)?.toLocaleLowerCase('pt-BR')
        || item.textContent.toLocaleLowerCase('pt-BR');
      const corresponde = texto.includes(termo);
      item.classList.toggle('oculto', !corresponde);
      if (corresponde) visiveis += 1;
    });

    if (estadoVazio) estadoVazio.classList.toggle('oculto', visiveis !== 0);
  });
}

function configurarFormularios() {
  const formularioPerfil = document.querySelector('#formulario-perfil');

  if (formularioPerfil) {
    formularioPerfil.addEventListener('submit', (evento) => {
      evento.preventDefault();
      mostrarAviso('Alterações preparadas para salvar.', 'sucesso');
    });
  }

  document.querySelectorAll('form[data-sem-rota]').forEach((formulario) => {
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      mostrarAviso('Este formulário ainda aguarda a integração com o servidor.', 'informacao');
    });
  });
}

function configurarEscalacaoInicial() {
  document.querySelectorAll('[data-atleta-partida]').forEach((seletor) => {
    const cartao = seletor.closest('[data-cartao-cadastro-atleta]');
    const titular = cartao?.querySelector('[data-titular-cadastro]');
    const posicao = cartao?.querySelector('[data-posicao-cadastro]');

    seletor.addEventListener('change', () => {
      const selecionado = seletor.checked;
      if (titular) titular.disabled = !selecionado;
      if (posicao) posicao.disabled = !selecionado;

      if (!selecionado) {
        if (titular) titular.checked = false;
        if (posicao) posicao.value = '';
      }

      cartao?.classList.toggle('atleta-cadastro-selecionado', selecionado);
    });
  });
}

function configurarDesempenho() {
  const formulario = document.querySelector('.formulario-desempenho');
  const seletores = document.querySelectorAll('[data-selecionar-atleta]');
  const linhas = document.querySelectorAll('[data-linha-desempenho]');

  if (!formulario || seletores.length === 0) return;

  const somenteLeitura = formulario.dataset.somenteLeitura === 'true';

  seletores.forEach((seletor) => {
    const cartao = seletor.closest('[data-cartao-atleta]');
    const idAtleta = seletor.dataset.atletaId || cartao?.dataset.atletaId || '';
    const titular = cartao?.querySelector('[data-campo-titular]');

    function atualizar() {
      const selecionado = seletor.checked;
      if (titular) titular.disabled = somenteLeitura || !selecionado;
      if (!selecionado && titular) titular.checked = false;

      linhas.forEach((linha) => {
        if (linha.dataset.atletaId !== idAtleta) return;
        linha.classList.toggle('atleta-selecionado', selecionado);
        linha.querySelectorAll('[data-estatistica-atleta]').forEach((campo) => {
          campo.disabled = somenteLeitura || !selecionado;
          if (!selecionado && !somenteLeitura) campo.value = '0';
        });
      });
    }

    seletor.disabled = somenteLeitura;
    seletor.addEventListener('change', atualizar);
    atualizar();
  });
}

function configurarPartidaAoVivo() {
  const painel = document.querySelector('.tela-acompanhamento');
  if (!painel) return;

  const quantidadeSets = Number(painel.dataset.quantidadeSets || 3);
  const setsSalvosIniciais = Number(painel.dataset.setsSalvos || 0);
  let partidaEncerrada = false;

  const estado = {
    atletaId: '',
    atletaNome: '',
    fundamento: '',
    placarCasa: Number(document.querySelector('[data-placar-casa]')?.textContent || 0),
    placarAdversario: Number(document.querySelector('[data-placar-adversario]')?.textContent || 0),
    setsSalvos: []
  };

  const nomesFundamentos = {
    passe: 'Passe',
    ataque: 'Ataque',
    defesa: 'Defesa',
    levantamento: 'Levantamento',
    saque: 'Saque',
    bloqueio: 'Bloqueio',
    falta: 'Falta'
  };

  const iconesFundamentos = {
    passe: '✋',
    ataque: '✴',
    defesa: '⬟',
    levantamento: '✹',
    saque: '◉',
    bloqueio: '▦',
    falta: '⊘'
  };

  function atualizarPlacar() {
    const casa = document.querySelector('[data-placar-casa]');
    const adversario = document.querySelector('[data-placar-adversario]');
    if (casa) casa.textContent = Math.max(0, estado.placarCasa);
    if (adversario) adversario.textContent = Math.max(0, estado.placarAdversario);
  }

  function totalSetsSalvos() {
    return setsSalvosIniciais + estado.setsSalvos.length;
  }

  function atualizarControleEncerramento() {
    const botaoEncerrarPartida = document.querySelector('[data-encerrar-partida]');
    const indicadorSetsSalvos = document.querySelector('[data-sets-salvos]');
    const indicadorQuantidadeSets = document.querySelector('[data-quantidade-sets]');

    if (indicadorSetsSalvos) indicadorSetsSalvos.textContent = totalSetsSalvos();
    if (indicadorQuantidadeSets) indicadorQuantidadeSets.textContent = quantidadeSets;

    if (botaoEncerrarPartida) {
      botaoEncerrarPartida.disabled = totalSetsSalvos() < quantidadeSets || partidaEncerrada;
    }
  }

  const seletorSet = document.querySelector('[data-seletor-set]');

  if (seletorSet) {
    seletorSet.addEventListener('change', () => {
      const setSelecionado = seletorSet.value;
      const setAtual = document.querySelector('[data-set-atual]');
      const setAcao = document.querySelector('[data-set-acao]');
      const tituloSet = document.querySelector('[data-titulo-set]');

      if (setAtual) setAtual.textContent = setSelecionado;
      if (setAcao) setAcao.textContent = setSelecionado;
      if (tituloSet) tituloSet.textContent = setSelecionado;
    });
  }

  function atualizarResumoEncerramento() {
    const numeroSet = Number(seletorSet?.value || 1);
    const resumoPlacar = document.querySelector('[data-resumo-placar]');
    const resumoNumero = document.querySelector('[data-resumo-numero-set]');
    const resumoVencedor = document.querySelector('[data-resumo-vencedor]');

    if (resumoPlacar) {
      resumoPlacar.textContent = `${estado.placarCasa} × ${estado.placarAdversario}`;
    }

    if (resumoNumero) {
      resumoNumero.textContent = numeroSet;
    }

    if (resumoVencedor) {
      if (estado.placarCasa === estado.placarAdversario) {
        resumoVencedor.textContent = 'O set está empatado';
      } else if (estado.placarCasa > estado.placarAdversario) {
        resumoVencedor.textContent = 'Minha equipe vence o set';
      } else {
        resumoVencedor.textContent = 'A equipe adversária vence o set';
      }
    }
  }

  function mostrarResumoEncerramento() {
    atualizarResumoEncerramento();
    const resumo = document.querySelector('[data-resumo-encerramento]');
    if (resumo) {
      resumo.removeAttribute('hidden');
      resumo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function esconderResumoEncerramento() {
    const resumo = document.querySelector('[data-resumo-encerramento]');
    if (resumo) resumo.setAttribute('hidden', 'hidden');
  }

  function renderizarSetsSalvos() {
    const lista = document.querySelector('[data-lista-sets-salvos]');
    if (!lista) return;

    lista.innerHTML = '';

    if (estado.setsSalvos.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'texto-secundario';
      vazio.textContent = 'Nenhum set encerrado.';
      lista.appendChild(vazio);
      return;
    }

    estado.setsSalvos.forEach((setSalvo) => {
      const cartao = document.createElement('article');
      cartao.className = 'cartao-set-salvo';
      cartao.innerHTML = `
        <strong>Set ${setSalvo.numero}</strong>
        <span>${setSalvo.placarCasa} × ${setSalvo.placarAdversario}</span>
        <small>${setSalvo.vencedor}</small>
      `;
      lista.appendChild(cartao);
    });
  }

  document.querySelector('[data-encerrar-partida]')?.addEventListener('click', () => {
    if (totalSetsSalvos() < quantidadeSets) {
      mostrarAviso(`É necessário salvar os ${quantidadeSets} sets antes de encerrar a partida.`, 'informacao');
      return;
    }

    if (!window.confirm('Deseja realmente encerrar esta partida?')) return;

    partidaEncerrada = true;
    document.querySelector('[data-status-partida]')?.removeAttribute('hidden');
    document.querySelectorAll('[data-alterar-placar], [data-acao-fundamento], [data-selecionar-atleta-acao], [data-encerrar-set]').forEach((elemento) => {
      elemento.disabled = true;
    });

    atualizarControleEncerramento();
    mostrarAviso('Partida encerrada.', 'sucesso');
  });

  document.querySelector('[data-encerrar-set]')?.addEventListener('click', () => {
    if (estado.placarCasa === 0 && estado.placarAdversario === 0) {
      mostrarAviso('Adicione pontos antes de encerrar o set.', 'informacao');
      return;
    }

    mostrarResumoEncerramento();
  });

  document.querySelector('[data-cancelar-encerramento]')?.addEventListener('click', esconderResumoEncerramento);

  document.querySelector('[data-confirmar-encerramento]')?.addEventListener('click', () => {
    const numeroSet = Number(seletorSet?.value || 1);
    let vencedor = 'Empate';

    if (estado.placarCasa > estado.placarAdversario) vencedor = 'Minha equipe';
    if (estado.placarAdversario > estado.placarCasa) vencedor = 'Equipe adversária';

    estado.setsSalvos.push({
      numero: numeroSet,
      placarCasa: estado.placarCasa,
      placarAdversario: estado.placarAdversario,
      vencedor
    });

    renderizarSetsSalvos();
    esconderResumoEncerramento();
    atualizarControleEncerramento();

    estado.placarCasa = 0;
    estado.placarAdversario = 0;
    atualizarPlacar();

    if (totalSetsSalvos() >= quantidadeSets) {
      mostrarAviso(`Set ${numeroSet} salvo. Agora você pode encerrar a partida.`, 'sucesso');
      return;
    }

    const proximoSet = Math.min(quantidadeSets, numeroSet + 1);
    if (seletorSet) {
      seletorSet.value = String(proximoSet);
      seletorSet.dispatchEvent(new Event('change'));
    }

    mostrarAviso(`Set ${numeroSet} salvo. Set ${proximoSet} iniciado.`, 'sucesso');
  });

  document.querySelectorAll('[data-alterar-placar]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const valor = Number(botao.dataset.valor || 0);
      if (botao.dataset.alterarPlacar === 'casa') estado.placarCasa += valor;
      if (botao.dataset.alterarPlacar === 'adversario') estado.placarAdversario += valor;
      atualizarPlacar();
    });
  });

  document.querySelectorAll('[data-selecionar-atleta-acao]').forEach((botao) => {
    botao.addEventListener('click', () => {
      document.querySelectorAll('[data-selecionar-atleta-acao]').forEach((item) => item.classList.remove('selecionado'));
      botao.classList.add('selecionado');
      estado.atletaId = botao.dataset.atletaId || '';
      estado.atletaNome = botao.textContent.trim();
      const destino = document.querySelector('[data-atleta-acao]');
      if (destino) destino.textContent = estado.atletaNome;
    });
  });

  document.querySelectorAll('[data-acao-fundamento]').forEach((botao) => {
    botao.addEventListener('click', () => {
      if (!estado.atletaId) {
        mostrarAviso('Selecione um atleta antes de registrar a ação.', 'informacao');
        return;
      }

      estado.fundamento = botao.dataset.acaoFundamento;
      const painelResultados = document.querySelector('[data-painel-resultados]');
      const nomeAcao = document.querySelector('[data-nome-acao]');
      const iconeAcao = document.querySelector('[data-icone-acao]');

      if (nomeAcao) nomeAcao.textContent = nomesFundamentos[estado.fundamento] || estado.fundamento;
      if (iconeAcao) iconeAcao.textContent = iconesFundamentos[estado.fundamento] || '';
      if (painelResultados) {
        painelResultados.removeAttribute('hidden');
        painelResultados.classList.add('visivel');
      }
    });
  });

  document.querySelectorAll('[data-resultado-acao]').forEach((botao) => {
    botao.addEventListener('click', () => {
      if (!estado.atletaId || !estado.fundamento) return;
      adicionarAcao(estado.atletaNome, nomesFundamentos[estado.fundamento], botao.textContent.trim());
      const painelResultados = document.querySelector('[data-painel-resultados]');
      if (painelResultados) {
        painelResultados.setAttribute('hidden', 'hidden');
        painelResultados.classList.remove('visivel');
      }
      estado.fundamento = '';
    });
  });

  document.querySelector('[data-cancelar-acao]')?.addEventListener('click', () => {
    estado.fundamento = '';
    const painelResultados = document.querySelector('[data-painel-resultados]');
    if (painelResultados) {
      painelResultados.setAttribute('hidden', 'hidden');
      painelResultados.classList.remove('visivel');
    }
  });

  const listaAcoesRegistradas = document.querySelector('[data-lista-acoes-registradas]');

  if (listaAcoesRegistradas) {
    listaAcoesRegistradas.addEventListener('click', (evento) => {
      const botaoRemover = evento.target.closest('[data-remover-acao]');

      if (!botaoRemover) {
        return;
      }

      const linha = botaoRemover.closest('tr');
      const confirmou = window.confirm('Deseja excluir esta ação do set?');

      if (confirmou && linha) {
        linha.remove();
        mostrarAviso('Ação excluída do set.', 'sucesso');
      }
    });
  }

  function adicionarAcao(jogador, acao, resultado) {
    const lista = document.querySelector('[data-lista-acoes-registradas]');
    if (!lista) return;
    document.querySelector('[data-estado-acoes]')?.remove();

    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td><strong>${escaparHtml(jogador)}</strong></td>
      <td>${escaparHtml(acao)}</td>
      <td><span class="etiqueta etiqueta-verde">${escaparHtml(resultado)}</span></td>
      <td><button type="button" class="botao-remover-acao" data-remover-acao>Remover</button></td>
    `;
    lista.appendChild(linha);
  }

  atualizarControleEncerramento();
}

function escaparHtml(valor) {
  const elemento = document.createElement('div');
  elemento.textContent = valor;
  return elemento.innerHTML;
}

function mostrarAviso(mensagem, tipo = 'informacao') {
  const aviso = document.querySelector('#aviso-flutuante');
  if (!aviso) return;

  aviso.textContent = mensagem;
  aviso.className = `aviso-flutuante visivel ${tipo}`;
  window.clearTimeout(window.timerAvisoVoleiStats);
  window.timerAvisoVoleiStats = window.setTimeout(() => aviso.classList.remove('visivel'), 3500);
}

function formatarNumero(numero) {
  const valor = Number(numero);
  return Number.isNaN(valor) ? '0' : valor.toLocaleString('pt-BR');
}

function confirmarAcao(mensagem) {
  return window.confirm(mensagem);
}
