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
  document
    .querySelectorAll('[data-atleta-partida]')
    .forEach((checkboxAtleta) => {
      const cartao = checkboxAtleta.closest(
        '[data-cartao-cadastro-atleta]'
      );

      const titular = cartao?.querySelector(
        '[data-titular-cadastro]'
      );

      const posicao = cartao?.querySelector(
        '[data-posicao-cadastro]'
      );

      function atualizarCampos() {
        const selecionado = checkboxAtleta.checked;

        if (titular) {
          titular.disabled = !selecionado;
        }

        if (posicao) {
          posicao.disabled = !selecionado;
        }

        cartao?.classList.toggle(
          'atleta-cadastro-selecionado',
          selecionado
        );
      }

      checkboxAtleta.addEventListener(
        'change',
        atualizarCampos
      );

      atualizarCampos();
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
  


  async function carregarAcoesDoSet(numeroSet) {
  const idPartida = window.location.pathname.split('/')[2];

  const resposta = await fetch(
    `/partidas/${idPartida}/desempenho/acoes?numero_set=${numeroSet}`
  );

  if (!resposta.ok) {
    throw new Error('Não foi possível carregar as ações do set.');
  }

  const acoes = await resposta.json();
  const lista = document.querySelector(
    '[data-lista-acoes-registradas]'
  );

  if (!lista) return;

  lista.innerHTML = '';

  if (acoes.length === 0) {
    lista.innerHTML = `
      <tr data-estado-acoes>
        <td colspan="4" class="estado-vazio">
          Nenhuma ação registrada neste set.
        </td>
      </tr>
    `;
    return;
  }

  acoes.forEach((acao) => {
    const linha = document.createElement('tr');

    linha.dataset.linhaAcao = '';
    linha.dataset.idAcao = acao.id_acao;
    linha.dataset.idAtleta = acao.id_atleta;
    linha.dataset.numeroSet = acao.numero_set;
    linha.dataset.fundamento = acao.fundamento;
    linha.dataset.resultado = acao.resultado;

    linha.innerHTML = `
      <td><strong data-acao-atleta>${escaparHtml(acao.nome_atleta || 'Atleta')}</strong></td>
      <td data-acao-fundamento>${escaparHtml(acao.fundamento || '')}</td>
      <td data-acao-resultado><span class="etiqueta verde">${escaparHtml(acao.resultado || '')}</span></td>
      <td>
        <button type="button" class="botao secundario" data-editar-acao data-id-acao="${acao.id_acao}">Editar</button>
        <button type="button" class="botao-remover-acao" data-remover-acao data-id-acao="${acao.id_acao}">Excluir</button>
      </td>
    `;

    lista.appendChild(linha);
  });
}


    async function carregarSetsSalvos(idPartida) {
    const resposta = await fetch(
      `/partidas/${idPartida}/desempenho/sets`
    );

    if (!resposta.ok) {
      throw new Error('Não foi possível carregar os sets salvos.');
    }

    return resposta.json();
  }



  const painel = document.querySelector('.tela-acompanhamento');
  if (!painel) return;

  const quantidadeSets = Number(painel.dataset.quantidadeSets || 3);
  
  const somenteLeitura = painel.dataset.somenteLeitura === 'true';
    let partidaEncerrada = false;
  let setsCarregados = false;

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
        bloqueio: 'Bloqueio'

  };

  const iconesFundamentos = {
    passe: '✋',
    ataque: '✴',
    defesa: '⬟',
    levantamento: '✹',
    saque: '◉',
        bloqueio: '▦'

  };

  function atualizarPlacar() {
    const casa = document.querySelector('[data-placar-casa]');
    const adversario = document.querySelector('[data-placar-adversario]');
    if (casa) casa.textContent = Math.max(0, estado.placarCasa);
    if (adversario) adversario.textContent = Math.max(0, estado.placarAdversario);
  }

  function totalSetsSalvos() {
    return estado.setsSalvos.length;
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

  const idPartida = window.location.pathname.split('/')[2];

  carregarSetsSalvos(idPartida)
  .then((sets) => {
        estado.setsSalvos = sets
      .map((set) => ({
        id: Number(set.id_set),
        numero: Number(set.numero_set),
        placarCasa: Number(set.placar_casa),
        placarAdversario: Number(set.placar_adversario),
        vencedor: set.vencedor
      }))
      .filter((set) => !(set.placarCasa === 0 && set.placarAdversario === 0));
    setsCarregados = true;

    renderizarSetsSalvos();

    atualizarControleEncerramento();
  })
  .catch((erro) => {
    console.error('Erro ao carregar sets:', erro);
  });


  const seletorSet = document.querySelector('[data-seletor-set]');
  const chaveSetAtual = `partida-${idPartida}-set-selecionado`;

  function atualizarTextoDoSet(numeroSet) {
    const setAtual = document.querySelector('[data-set-atual]');
    const setAcao = document.querySelector('[data-set-acao]');
    const tituloSet = document.querySelector('[data-titulo-set]');

    if (setAtual) setAtual.textContent = numeroSet;
    if (setAcao) setAcao.textContent = numeroSet;
    if (tituloSet) tituloSet.textContent = numeroSet;
  }

  if (seletorSet) {
    const setSalvo = window.sessionStorage.getItem(chaveSetAtual);
    const opcaoExiste = setSalvo
      && [...seletorSet.options].some((opcao) => opcao.value === setSalvo);

    if (opcaoExiste && seletorSet.value !== setSalvo) {
      seletorSet.value = setSalvo;
      atualizarTextoDoSet(setSalvo);
      carregarAcoesDoSet(Number(setSalvo))
        .catch((erro) => console.error('Erro ao restaurar ações do set:', erro));
    } else {
  atualizarTextoDoSet(seletorSet.value);

  carregarAcoesDoSet(Number(seletorSet.value))
    .catch((erro) => {
      console.error(
        'Erro ao carregar ações do set inicial:',
        erro
      );
    });
}


    seletorSet.addEventListener('change', () => {
      const setSelecionado = seletorSet.value;
      window.sessionStorage.setItem(chaveSetAtual, setSelecionado);
      atualizarTextoDoSet(setSelecionado);
      carregarAcoesDoSet(Number(setSelecionado))
        .catch((erro) => console.error('Erro ao carregar ações do set:', erro));
    });
  }

    function atualizarResumoEncerramento() {
    const placarCasaVisivel = Number(document.querySelector('[data-placar-casa]')?.textContent || estado.placarCasa);
    const placarAdversarioVisivel = Number(document.querySelector('[data-placar-adversario]')?.textContent || estado.placarAdversario);
    estado.placarCasa = placarCasaVisivel;
    estado.placarAdversario = placarAdversarioVisivel;
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
    const indicadorCasa = document.querySelector('[data-sets-casa]');
    const indicadorAdversario = document.querySelector('[data-sets-adversario]');

    const setsCasa = estado.setsSalvos.filter(
      (set) => set.vencedor === 'MINHA_EQUIPE'
    ).length;
    const setsAdversario = estado.setsSalvos.filter(
      (set) => set.vencedor === 'EQUIPE_ADVERSARIA'
    ).length;

    if (indicadorCasa) indicadorCasa.textContent = setsCasa;
    if (indicadorAdversario) indicadorAdversario.textContent = setsAdversario;
  }

  document.querySelector('[data-lista-sets-salvos]')?.addEventListener('click', async (evento) => {
    const botaoApagar = evento.target.closest('[data-apagar-set]');
    const botaoEditar = evento.target.closest('[data-editar-set]');
    const idPartidaAtual = window.location.pathname.split('/')[2];

    if (botaoApagar) {
      if (!window.confirm('Deseja apagar este set e todas as ações dele?')) return;

      try {
        const resposta = await fetch(
          `/partidas/${idPartidaAtual}/desempenho/set/${botaoApagar.dataset.idSet}`,
          { method: 'DELETE' }
        );
        const dados = await resposta.json();

        if (!resposta.ok || dados.erro) {
          throw new Error(dados.erro || 'Não foi possível apagar o set.');
        }

        botaoApagar.closest('[data-linha-set]')?.remove();
        estado.setsSalvos = estado.setsSalvos.filter(
          (set) => String(set.id) !== String(botaoApagar.dataset.idSet)
        );
        renderizarSetsSalvos();
        atualizarControleEncerramento();
        await carregarAcoesDoSet(Number(seletorSet?.value || 1));
        mostrarAviso('Set apagado com sucesso.', 'sucesso');
      } catch (erro) {
        mostrarAviso(erro.message, 'informacao');
      }
      return;
    }

    if (botaoEditar) {
      const set = estado.setsSalvos.find(
        (item) => String(item.id) === String(botaoEditar.dataset.idSet)
      );
      if (!set) return;

      const placarCasa = Number(window.prompt('Placar da minha equipe:', set.placarCasa));
      const placarAdversario = Number(window.prompt('Placar da equipe adversária:', set.placarAdversario));

      if (!Number.isInteger(placarCasa) || !Number.isInteger(placarAdversario) || placarCasa < 0 || placarAdversario < 0) {
        mostrarAviso('Placar inválido.', 'informacao');
        return;
      }

      const vencedor = placarCasa === placarAdversario
        ? 'EMPATE'
        : placarCasa > placarAdversario
          ? 'MINHA_EQUIPE'
          : 'EQUIPE_ADVERSARIA';

      try {
        const resposta = await fetch(
          `/partidas/${idPartidaAtual}/desempenho/set/${set.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              placar_casa: placarCasa,
              placar_adversario: placarAdversario,
              vencedor: vencedor
            })
          }
        );
        const dados = await resposta.json();

        if (!resposta.ok || dados.erro) {
          throw new Error(dados.erro || 'Não foi possível editar o set.');
        }

        const linha = botaoEditar.closest('[data-linha-set]');
        if (linha) {
          linha.children[1].textContent = `${placarCasa} × ${placarAdversario}`;
          linha.children[2].textContent = vencedor;
          botaoEditar.dataset.placarCasa = placarCasa;
          botaoEditar.dataset.placarAdversario = placarAdversario;
        }

        set.placarCasa = placarCasa;
        set.placarAdversario = placarAdversario;
        set.vencedor = vencedor;
        renderizarSetsSalvos();
        mostrarAviso('Set editado com sucesso.', 'sucesso');
      } catch (erro) {
        mostrarAviso(erro.message, 'informacao');
      }
    }
  });

  // As ações são salvas imediatamente no listener de [data-resultado-acao].
  // Não existe uma segunda fila ou botão de salvamento para duplicar o fluxo.

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

  document.querySelector('[data-confirmar-encerramento]')?.addEventListener('click', async () => {
  const numeroSet = Number(seletorSet?.value || 1);

  if (!setsCarregados) {
    mostrarAviso('Aguarde os sets registrados terminarem de carregar.', 'informacao');
    return;
  }

  if (estado.setsSalvos.some((set) => Number(set.numero) === numeroSet)) {
    mostrarAviso(
      `O Set ${numeroSet} já possui resultado. Use Editar ou Apagar.`,
      'informacao'
    );
    return;
  }

  let vencedor = 'EMPATE';

  if (estado.placarCasa > estado.placarAdversario) {
    vencedor = 'MINHA_EQUIPE';
  } else if (estado.placarAdversario > estado.placarCasa) {
    vencedor = 'EQUIPE_ADVERSARIA';
  }

  const partes = window.location.pathname.split('/');
  const idPartida = partes[2];
  const botaoConfirmar = document.querySelector(
    '[data-confirmar-encerramento]'
  );

  if (botaoConfirmar) {
    botaoConfirmar.disabled = true;
  }

  try {
    const resposta = await fetch(
      `/partidas/${idPartida}/desempenho/set`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numero_set: numeroSet,
          placar_casa: estado.placarCasa,
          placar_adversario: estado.placarAdversario,
          vencedor: vencedor
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok || dados.erro) {
      throw new Error(
        dados.erro || 'Não foi possível salvar o set.'
      );
    }

    estado.setsSalvos = estado.setsSalvos
      .filter((set) => Number(set.numero) !== numeroSet);
    estado.setsSalvos.push({
      id: Number(dados.id_set),
      numero: numeroSet,
      placarCasa: estado.placarCasa,
      placarAdversario: estado.placarAdversario,
      vencedor: vencedor
    });

    renderizarSetsSalvos();
    esconderResumoEncerramento();
    atualizarControleEncerramento();

    estado.placarCasa = 0;
    estado.placarAdversario = 0;
    atualizarPlacar();

    if (totalSetsSalvos() >= quantidadeSets) {
      mostrarAviso(
        `Set ${numeroSet} salvo no banco. Agora você pode encerrar a partida.`,
        'sucesso'
      );
      return;
    }

        mostrarAviso(
      `Set ${numeroSet} salvo no banco. Selecione manualmente o próximo set.`,
      'sucesso'
    );

  } catch (erro) {
    mostrarAviso(
      erro.message || 'Erro ao salvar o set.',
      'informacao'
    );
  } finally {
    if (botaoConfirmar) {
      botaoConfirmar.disabled = false;
    }
  }
});


  document.querySelectorAll('[data-alterar-placar]').forEach((botao) => {
    botao.disabled = somenteLeitura;
    botao.addEventListener('click', () => {
      const valor = Number(botao.dataset.valor || 0);
      if (botao.dataset.alterarPlacar === 'casa') estado.placarCasa += valor;
      if (botao.dataset.alterarPlacar === 'adversario') estado.placarAdversario += valor;
      atualizarPlacar();
    });
  });

  document.querySelectorAll('[data-selecionar-atleta-acao]').forEach((botao) => {
    botao.disabled = somenteLeitura;
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
    botao.disabled = somenteLeitura;
    botao.addEventListener('click', () => {
      if (!estado.atletaId) {
        mostrarAviso('Selecione um atleta antes de registrar a ação.', 'informacao');
        return;
      }

      estado.fundamento = botao.dataset.acaoFundamento;
            const painelResultados = document.querySelector('[data-painel-resultados]');
      const nomeAcao = document.querySelector('[data-nome-acao]');
      const iconeAcao = document.querySelector('[data-icone-acao]');
      document.querySelectorAll('[data-fundamentos-resultados]').forEach((lista) => {
        lista.hidden = lista.dataset.fundamentosResultados !== estado.fundamento;
      });

      if (nomeAcao) nomeAcao.textContent = nomesFundamentos[estado.fundamento] || estado.fundamento;

      if (iconeAcao) iconeAcao.textContent = iconesFundamentos[estado.fundamento] || '';
      if (painelResultados) {
        painelResultados.removeAttribute('hidden');
        painelResultados.classList.add('visivel');
      }
    });
  });

  document.querySelectorAll('[data-resultado-acao]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      if (!estado.atletaId || !estado.fundamento) return;

      if (somenteLeitura) {
        mostrarAviso('Atletas podem apenas visualizar o desempenho.', 'informacao');
        return;
      }

      const fundamento = estado.fundamento;
      const resultado = botao.dataset.resultadoAcao;
      const nomeAcao = nomesFundamentos[fundamento];
      const textoResultado = botao.textContent.trim();

      const numeroSet = Number(seletorSet?.value || 1);
      const linha = adicionarAcao(
        estado.atletaNome,
        nomeAcao,
        textoResultado
      );

      try {
        const idPartida = window.location.pathname.split('/')[2];
        const resposta = await fetch(
          `/partidas/${idPartida}/desempenho/acao`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id_atleta: Number(estado.atletaId),
              numero_set: numeroSet,
              fundamento: fundamento,
              resultado: resultado
            })
          }
        );

        const dados = await resposta.json();

        if (!resposta.ok || dados.erro) {
          throw new Error(
            dados.erro || 'Não foi possível salvar a ação.'
          );
        }

        if (linha && dados.id_acao) {
          linha.dataset.idAcao = dados.id_acao;
          linha.querySelector('[data-remover-acao]')
            ?.setAttribute('data-id-acao', dados.id_acao);
        }

        mostrarAviso(
          'Ação salva no banco com sucesso.',
          'sucesso'
        );
      } catch (erro) {
        linha?.remove();
        mostrarAviso(
          erro.message || 'Não foi possível salvar a ação.',
          'informacao'
        );
      }

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

  let acaoEmEdicao = null;
  const modalEditarAcao = document.querySelector('[data-modal-editar-acao]');
  const painelResultadosEdicao = document.querySelector('[data-editar-resultados]');

  function selecionarBotoesEdicao(seletor, atributo, valor) {
    document.querySelectorAll(seletor).forEach((botao) => {
      botao.classList.toggle('selecionado', String(botao.dataset[atributo]) === String(valor));
    });
  }

  function mostrarResultadosEdicao(fundamento, resultadoSelecionado) {
    if (!painelResultadosEdicao) return;
    painelResultadosEdicao.querySelectorAll('[data-resultados-fundamento]').forEach((grupo) => {
      const visivel = grupo.dataset.resultadosFundamento === fundamento;
      grupo.hidden = !visivel;
      if (visivel) {
        grupo.querySelectorAll('[data-editar-resultado]').forEach((botao) => {
          botao.classList.toggle('selecionado', botao.dataset.editarResultado === resultadoSelecionado);
        });
      }
    });
  }

  function fecharModalEditarAcao() {
    modalEditarAcao?.setAttribute('hidden', 'hidden');
    acaoEmEdicao = null;
  }

  function abrirModalEditarAcao(linha) {
    if (!modalEditarAcao) {
      mostrarAviso('Modal de edição não encontrado no desempenho.ejs.', 'informacao');
      return;
    }

    acaoEmEdicao = {
      linha,
      idAcao: linha.dataset.idAcao,
      idAtleta: linha.dataset.idAtleta || '',
      fundamento: linha.dataset.fundamento || '',
      resultado: linha.dataset.resultado || '',
      numeroSet: linha.dataset.numeroSet || seletorSet?.value || '1'
    };

    selecionarBotoesEdicao('[data-editar-atleta]', 'editarAtleta', acaoEmEdicao.idAtleta);
    selecionarBotoesEdicao('[data-editar-fundamento]', 'editarFundamento', acaoEmEdicao.fundamento);
    selecionarBotoesEdicao('[data-editar-set]', 'editarSet', acaoEmEdicao.numeroSet);
    mostrarResultadosEdicao(acaoEmEdicao.fundamento, acaoEmEdicao.resultado);
    modalEditarAcao.removeAttribute('hidden');
  }

  document.querySelectorAll('[data-editar-atleta]').forEach((botao) => {
    botao.addEventListener('click', () => {
      if (!acaoEmEdicao) return;
      acaoEmEdicao.idAtleta = botao.dataset.editarAtleta;
      selecionarBotoesEdicao('[data-editar-atleta]', 'editarAtleta', acaoEmEdicao.idAtleta);
    });
  });

  document.querySelectorAll('[data-editar-fundamento]').forEach((botao) => {
    botao.addEventListener('click', () => {
      if (!acaoEmEdicao) return;
      acaoEmEdicao.fundamento = botao.dataset.editarFundamento;
      acaoEmEdicao.resultado = '';
      selecionarBotoesEdicao('[data-editar-fundamento]', 'editarFundamento', acaoEmEdicao.fundamento);
      mostrarResultadosEdicao(acaoEmEdicao.fundamento, '');
    });
  });

  painelResultadosEdicao?.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-editar-resultado]');
    if (!botao || !acaoEmEdicao) return;
    acaoEmEdicao.resultado = botao.dataset.editarResultado;
    painelResultadosEdicao.querySelectorAll('[data-editar-resultado]').forEach((item) => item.classList.remove('selecionado'));
    botao.classList.add('selecionado');
  });

  document.querySelectorAll('[data-editar-set]').forEach((botao) => {
    botao.addEventListener('click', () => {
      if (!acaoEmEdicao) return;
      acaoEmEdicao.numeroSet = botao.dataset.editarSet;
      selecionarBotoesEdicao('[data-editar-set]', 'editarSet', acaoEmEdicao.numeroSet);
    });
  });

  document.querySelectorAll('[data-cancelar-edicao-acao]').forEach((botao) => {
    botao.addEventListener('click', fecharModalEditarAcao);
  });

  document.querySelector('[data-salvar-edicao-acao]')?.addEventListener('click', async () => {
    if (!acaoEmEdicao) return;
    const { linha, idAcao, idAtleta, fundamento, resultado, numeroSet } = acaoEmEdicao;
    if (!idAtleta || !fundamento || !resultado || !numeroSet) {
      mostrarAviso('Selecione atleta, fundamento, resultado e set.', 'informacao');
      return;
    }

    const idPartidaAtual = window.location.pathname.split('/')[2];
    const botaoSalvar = document.querySelector('[data-salvar-edicao-acao]');
    try {
      if (botaoSalvar) botaoSalvar.disabled = true;
      const resposta = await fetch(`/partidas/${idPartidaAtual}/desempenho/acao/${idAcao}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_atleta: Number(idAtleta), fundamento, resultado, numero_set: Number(numeroSet) })
      });
      const texto = await resposta.text();
      let dados;
      try { dados = JSON.parse(texto); } catch { throw new Error(texto || 'Resposta inválida do servidor.'); }
      if (!resposta.ok || !dados.sucesso) throw new Error(dados.erro || 'Não foi possível editar a ação.');

      linha.dataset.idAtleta = idAtleta;
      linha.dataset.fundamento = fundamento;
      linha.dataset.resultado = resultado;
      linha.dataset.numeroSet = numeroSet;
      linha.querySelector('[data-acao-atleta]')?.replaceChildren(document.createTextNode(document.querySelector(`[data-selecionar-atleta-acao][data-atleta-id="${idAtleta}"]`)?.textContent.trim() || 'Atleta'));
      linha.querySelector('[data-acao-fundamento]')?.replaceChildren(document.createTextNode(fundamento));
      const campoResultado = linha.querySelector('[data-acao-resultado]');
      if (campoResultado) { campoResultado.textContent = ''; const span = document.createElement('span'); span.className = 'etiqueta verde'; span.textContent = resultado; campoResultado.appendChild(span); }
      fecharModalEditarAcao();
      mostrarAviso('Ação editada com sucesso.', 'sucesso');
    } catch (erro) {
      mostrarAviso(erro.message || 'Não foi possível editar a ação.', 'informacao');
    } finally {
      if (botaoSalvar) botaoSalvar.disabled = false;
    }
  });

  if (listaAcoesRegistradas) {

    listaAcoesRegistradas.addEventListener('click', async (evento) => {
      const botaoEditar = evento.target.closest('[data-editar-acao]');
      const botaoRemover = evento.target.closest('[data-remover-acao]');
      const linha = evento.target.closest('[data-linha-acao]');

      if (botaoEditar && linha) {
        abrirModalEditarAcao(linha);
        return;
      }

      botaoRemover.closest('tr')?.remove();
      mostrarAviso('Ação excluída do set.', 'sucesso');
    });
  }

  function adicionarAcao(jogador, acao, resultado) {
    const lista = document.querySelector(
      '[data-lista-acoes-registradas]'
    );

    if (!lista) return null;

    document.querySelector('[data-estado-acoes]')?.remove();

    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td>
        <strong>${escaparHtml(jogador)}</strong>
      </td>
      <td>${escaparHtml(acao)}</td>
      <td>
        <span class="etiqueta etiqueta-verde">
          ${escaparHtml(resultado)}
        </span>
      </td>
      <td>
        <button
          type="button"
          class="botao secundario"
          data-editar-acao
          data-id-acao="">
          Editar
        </button>
        <button
          type="button"
          class="botao-remover-acao"
          data-remover-acao
          data-id-acao="">
          Remover
        </button>
      </td>
    `;

    lista.appendChild(linha);
    return linha;
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

document.addEventListener('DOMContentLoaded', () => {
  const botoesSubstituicao = document.querySelectorAll(
    '[data-substituir-atleta]'
  );

  if (botoesSubstituicao.length === 0) {
    return;
  }

  let atletaQueSai = null;

  botoesSubstituicao.forEach((botao) => {
    botao.addEventListener('click', async () => {
      const tipo = botao.dataset.tipoAtleta;
      const idAtleta = botao.dataset.idAtleta;
      const posicao = botao.dataset.posicao || '';

      if (tipo === 'sai') {
        atletaQueSai = {
          id: idAtleta,
          posicao
        };

        mostrarAviso(
          'Agora clique em “Entrar na quadra” no atleta reserva.',
          'informacao'
        );

        return;
      }

      if (tipo !== 'entra') {
        return;
      }

      if (!atletaQueSai) {
        mostrarAviso(
          'Primeiro escolha o atleta que sairá da quadra.',
          'informacao'
        );

        return;
      }

      const partesUrl = window.location.pathname.split('/');
      const idPartida = partesUrl[2];

      try {
        botao.disabled = true;

        const resposta = await fetch(
          `/partidas/${idPartida}/desempenho/substituicao`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id_atleta_sai: Number(atletaQueSai.id),
              id_atleta_entra: Number(idAtleta),
              posicao: Number(atletaQueSai.posicao)
            })
          }
        );

        const texto = await resposta.text();

        let dados;

        try {
          dados = JSON.parse(texto);
        } catch (erro) {
          throw new Error(
            texto || 'Resposta inválida do servidor.'
          );
        }

        if (!resposta.ok || dados.erro) {
          throw new Error(
            dados.erro || 'Não foi possível realizar a substituição.'
          );
        }

        mostrarAviso(
          'Substituição realizada com sucesso.',
          'sucesso'
        );

        window.location.reload();
      } catch (erro) {
        mostrarAviso(
          erro.message ||
            'Não foi possível realizar a substituição.',
          'informacao'
        );

        botao.disabled = false;
      }
    });
  });
});

document.addEventListener('click', async (evento) => {
  const botao = evento.target.closest(
    '[data-apagar-partida]'
  );

  if (!botao) {
    return;
  }

  const idPartida = botao.dataset.idPartida;

  const confirmou = window.confirm(
    'Tem certeza que deseja excluir esta partida? ' +
    'Todos os sets, ações e desempenhos serão apagados permanentemente.'
  );

  if (!confirmou) {
    return;
  }

  try {
    botao.disabled = true;

    const resposta = await fetch(
      `/partidas/${idPartida}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const texto = await resposta.text();

    let dados;

    try {
      dados = JSON.parse(texto);
    } catch {
      throw new Error(
        texto || 'Resposta inválida do servidor.'
      );
    }

    if (!resposta.ok || dados.erro) {
      throw new Error(
        dados.erro ||
          'Não foi possível excluir a partida.'
      );
    }

    botao.closest(
      '[data-partida-card], article, tr'
    )?.remove();

    mostrarAviso(
      'Partida excluída com sucesso.',
      'sucesso'
    );
  } catch (erro) {
    botao.disabled = false;

    mostrarAviso(
      erro.message ||
        'Não foi possível excluir a partida.',
      'informacao'
    );
  }
});

