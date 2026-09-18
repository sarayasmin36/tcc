'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const tela = document.querySelector('.tela-acompanhamento');
  if (!tela) return;

  const idPartida = location.pathname.split('/')[2];
  const seletorSet = document.querySelector('[data-seletor-set]');
  const listaAcoes = document.querySelector('[data-lista-acoes-registradas]');
  const listaSets = document.querySelector('[data-lista-sets-salvos]');
  const chaveSet = `partida-${idPartida}-set`;
  const estado = {
    atleta: '',
    fundamento: '',
    casa: Number(document.querySelector('[data-placar-casa]')?.textContent || 0),
    adversario: Number(document.querySelector('[data-placar-adversario]')?.textContent || 0),
    sets: []
  };

  const mostrar = (texto, tipo = 'informacao') => {
    const aviso = document.querySelector('#aviso-flutuante');
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.className = `aviso-flutuante visivel ${tipo}`;
    setTimeout(() => aviso.classList.remove('visivel'), 3000);
  };

  const json = async (resposta) => {
    const texto = await resposta.text();
    let dados;
    try { dados = JSON.parse(texto); } catch { throw new Error(texto || 'Resposta inválida do servidor.'); }
    if (!resposta.ok) throw new Error(dados.erro || 'Erro no servidor.');
    return dados;
  };

  function atualizarPlacar() {
    document.querySelector('[data-placar-casa]')?.replaceChildren(String(Math.max(0, estado.casa)));
    document.querySelector('[data-placar-adversario]')?.replaceChildren(String(Math.max(0, estado.adversario)));
  }

  function atualizarSetNaTela() {
    const numero = seletorSet?.value || '1';
    document.querySelector('[data-set-atual]')?.replaceChildren(numero);
    document.querySelector('[data-set-acao]')?.replaceChildren(numero);
    document.querySelector('[data-titulo-set]')?.replaceChildren(numero);
  }

  function renderizarSets() {
    const casa = estado.sets.filter((s) => s.vencedor === 'MINHA_EQUIPE').length;
    const adversario = estado.sets.filter((s) => s.vencedor === 'EQUIPE_ADVERSARIA').length;
    document.querySelector('[data-sets-casa]')?.replaceChildren(String(casa));
    document.querySelector('[data-sets-adversario]')?.replaceChildren(String(adversario));
  }

  async function carregarAcoes(numero, limpar = true) {
    if (!listaAcoes) return;
    const resposta = await fetch(`/partidas/${idPartida}/desempenho/acoes?numero_set=${numero}`);
    const acoes = await json(resposta);
    if (limpar) listaAcoes.innerHTML = '';
    if (!acoes.length) {
      listaAcoes.innerHTML = '<tr data-estado-acoes><td colspan="4" class="estado-vazio">Nenhuma ação registrada neste set.</td></tr>';
      return;
    }
    acoes.forEach(adicionarLinha);
  }

  function adicionarLinha(acao) {
    document.querySelector('[data-estado-acoes]')?.remove();
    const linha = document.createElement('tr');
    linha.dataset.linhaAcao = '';
    linha.dataset.idAcao = acao.id_acao || '';
    linha.dataset.idAtleta = acao.id_atleta || '';
    linha.dataset.numeroSet = acao.numero_set || seletorSet?.value || '1';
    linha.dataset.fundamento = acao.fundamento || '';
    linha.dataset.resultado = acao.resultado || '';
    linha.innerHTML = `
      <td><strong data-acao-atleta>${esc(acao.nome_atleta || 'Atleta')}</strong></td>
      <td data-acao-fundamento>${esc(acao.fundamento || '')}</td>
      <td data-acao-resultado><span class="etiqueta verde">${esc(acao.resultado || '')}</span></td>
      <td>
        <button type="button" class="botao secundario" data-editar-acao>Editar</button>
        <button type="button" class="botao-remover-acao" data-remover-acao>Remover</button>
      </td>`;
    listaAcoes?.appendChild(linha);
    return linha;
  }

  document.querySelectorAll('[data-alterar-placar]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const valor = Number(botao.dataset.valor || 0);
      if (botao.dataset.alterarPlacar === 'casa') estado.casa += valor;
      else estado.adversario += valor;
      atualizarPlacar();
    });
  });

  document.querySelectorAll('[data-selecionar-atleta-acao]').forEach((botao) => {
    botao.addEventListener('click', () => {
      document.querySelectorAll('[data-selecionar-atleta-acao]').forEach((b) => b.classList.remove('selecionado'));
      botao.classList.add('selecionado');
      estado.atleta = botao.dataset.atletaId || '';
      document.querySelector('[data-atleta-acao]')?.replaceChildren(botao.textContent.trim());
    });
  });

  document.querySelectorAll('[data-acao-fundamento]').forEach((botao) => {
    botao.addEventListener('click', () => {
      if (!estado.atleta) return mostrar('Selecione uma atleta.', 'informacao');
      estado.fundamento = botao.dataset.acaoFundamento;
      document.querySelectorAll('[data-fundamentos-resultados]').forEach((lista) => {
        lista.hidden = lista.dataset.fundamentosResultados !== estado.fundamento;
      });
      document.querySelector('[data-nome-acao]')?.replaceChildren(estado.fundamento);
      document.querySelector('[data-painel-resultados]')?.removeAttribute('hidden');
    });
  });

  document.querySelectorAll('[data-resultado-acao]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      if (!estado.atleta || !estado.fundamento) return;
      const numero = Number(seletorSet?.value || 1);
      const corpo = {
        id_atleta: Number(estado.atleta),
        numero_set: numero,
        fundamento: estado.fundamento,
        resultado: botao.dataset.resultadoAcao
      };
      try {
        const dados = await json(await fetch(`/partidas/${idPartida}/desempenho/acao`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
        }));
        adicionarLinha({ ...corpo, id_acao: dados.id_acao, numero_set: numero, nome_atleta: document.querySelector('[data-atleta-acao]')?.textContent });
        document.querySelector('[data-painel-resultados]')?.setAttribute('hidden', 'hidden');
        mostrar('Ação registrada.', 'sucesso');
      } catch (erro) { mostrar(erro.message, 'informacao'); }
    });
  });

  function escolherAtleta(nomeAtual) {
    const atletas = [...document.querySelectorAll('[data-selecionar-atleta-acao]')]
      .map((botao) => ({ id: botao.dataset.atletaId, nome: botao.textContent.trim() }));
    if (!atletas.length) return Promise.resolve(null);

    return new Promise((resolver) => {
      const fundo = document.createElement('div');
      fundo.style.cssText = 'position:fixed;inset:0;background:#0008;display:flex;align-items:center;justify-content:center;z-index:9999';
      const caixa = document.createElement('div');
      caixa.style.cssText = 'background:#fff;padding:24px;border-radius:12px;max-width:420px;width:90%;display:grid;gap:10px';
      caixa.innerHTML = `<h3>Escolha a atleta</h3><p>Atual: ${esc(nomeAtual || 'Nenhuma')}</p>`;

      const fechar = (valor) => { fundo.remove(); resolver(valor); };
      atletas.forEach((atleta) => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = atleta.nome;
        botao.className = 'botao secundario';
        botao.addEventListener('click', () => fechar(atleta));
        caixa.appendChild(botao);
      });

      const cancelar = document.createElement('button');
      cancelar.type = 'button';
      cancelar.textContent = 'Cancelar';
      cancelar.className = 'botao perigo';
      cancelar.addEventListener('click', () => fechar(null));
      caixa.appendChild(cancelar);
      fundo.appendChild(caixa);
      document.body.appendChild(fundo);
    });
  }

  function editarAcaoComBotoes(linha) {
    const modal = document.querySelector('[data-modal-editar-acao]');
    if (!modal) return Promise.reject(new Error('Adicione o modal de edição no EJS.'));

    const estadoEdicao = {
      atleta: linha.dataset.idAtleta,
      fundamento: linha.dataset.fundamento,
      resultado: linha.dataset.resultado,
      set: linha.dataset.numeroSet
    };

    const marcar = (seletor, atributo, valor) => {
      modal.querySelectorAll(seletor).forEach((botao) => {
        botao.classList.toggle('selecionado', botao.dataset[atributo] === String(valor));
      });
    };

    const resultados = {
      passe: [['perfeito', 'Passe preciso'], ['bom', 'Passe bom'], ['ruim', 'Passe errado']],
      ataque: [['perfeito', 'Ataque eficiente'], ['bom', 'Ataque bom'], ['ruim', 'Ataque errado']],
      defesa: [['perfeito', 'Defesa eficiente'], ['bom', 'Defesa boa'], ['ruim', 'Defesa errada']],
      levantamento: [['perfeito', 'Levantamento preciso'], ['bom', 'Levantamento bom'], ['ruim', 'Levantamento errado']],
      saque: [['ace', 'ACE'], ['bom', 'Saque bom'], ['errado', 'Saque errado']],
      bloqueio: [['perfeito', 'Bloqueio eficiente'], ['bom', 'Bloqueio bom'], ['ruim', 'Bloqueio errado']]
    };

    const listaResultados = modal.querySelector('[data-editar-resultados]');
    const atualizarResultados = () => {
      listaResultados.innerHTML = '';
      (resultados[estadoEdicao.fundamento] || []).forEach(([valor, texto]) => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'botao secundario';
        botao.dataset.editarResultado = valor;
        botao.textContent = texto;
        botao.addEventListener('click', () => {
          estadoEdicao.resultado = valor;
          marcar('[data-editar-resultado]', 'editarResultado', valor);
        });
        listaResultados.appendChild(botao);
      });
      marcar('[data-editar-resultado]', 'editarResultado', estadoEdicao.resultado);
    };

    modal.querySelectorAll('[data-editar-atleta]').forEach((botao) => botao.onclick = () => {
      estadoEdicao.atleta = botao.dataset.editarAtleta;
      marcar('[data-editar-atleta]', 'editarAtleta', estadoEdicao.atleta);
    });
    modal.querySelectorAll('[data-editar-fundamento]').forEach((botao) => botao.onclick = () => {
      estadoEdicao.fundamento = botao.dataset.editarFundamento;
      atualizarResultados();
      marcar('[data-editar-fundamento]', 'editarFundamento', estadoEdicao.fundamento);
    });
    modal.querySelectorAll('[data-editar-set]').forEach((botao) => botao.onclick = () => {
      estadoEdicao.set = botao.dataset.editarSet;
      marcar('[data-editar-set]', 'editarSet', estadoEdicao.set);
    });

    atualizarResultados();
    marcar('[data-editar-atleta]', 'editarAtleta', estadoEdicao.atleta);
    marcar('[data-editar-fundamento]', 'editarFundamento', estadoEdicao.fundamento);
    marcar('[data-editar-set]', 'editarSet', estadoEdicao.set);
    modal.hidden = false;

    return new Promise((resolver) => {
      modal.querySelector('[data-cancelar-edicao-acao]').onclick = () => {
        modal.hidden = true;
        resolver(null);
      };
      modal.querySelector('[data-salvar-edicao-acao]').onclick = () => {
        modal.hidden = true;
        resolver(estadoEdicao);
      };
    });
  }

  listaAcoes?.addEventListener('click', async (evento) => {
    const linha = evento.target.closest('[data-linha-acao]');
    if (!linha) return;
    const idAcao = linha.dataset.idAcao;

    if (evento.target.closest('[data-remover-acao]')) {
      if (!confirm('Deseja remover esta ação?')) return;
      try {
        const dados = await json(await fetch(`/partidas/${idPartida}/desempenho/acao/${idAcao}`, { method: 'DELETE' }));
        if (!dados.sucesso) throw new Error('Ação não encontrada.');
        linha.remove();
        mostrar('Ação removida.', 'sucesso');
      } catch (erro) { mostrar(erro.message, 'informacao'); }
      return;
    }

    if (evento.target.closest('[data-editar-acao]')) {
      const dados = await editarAcaoComBotoes(linha);
      if (!dados) return;
      try {
        await json(await fetch(`/partidas/${idPartida}/desempenho/acao/${idAcao}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_atleta: Number(dados.atleta),
            fundamento: dados.fundamento,
            resultado: dados.resultado,
            numero_set: Number(dados.set)
          })
        }));
        const nome = document.querySelector(`[data-selecionar-atleta-acao][data-atleta-id="${dados.atleta}"]`)?.textContent.trim() || 'Atleta';
        linha.dataset.idAtleta = dados.atleta;
        linha.dataset.fundamento = dados.fundamento;
        linha.dataset.resultado = dados.resultado;
        linha.dataset.numeroSet = dados.set;
        linha.querySelector('[data-acao-atleta]').textContent = nome;
        linha.querySelector('[data-acao-fundamento]').textContent = dados.fundamento;
        linha.querySelector('[data-acao-resultado]').textContent = dados.resultado;
        mostrar('Ação editada.', 'sucesso');
      } catch (erro) { mostrar(erro.message, 'informacao'); }
    }
  });

  listaSets?.addEventListener('click', async (evento) => {
    const editar = evento.target.closest('[data-editar-set]');
    const apagar = evento.target.closest('[data-apagar-set]');
    const linha = evento.target.closest('[data-linha-set]');
    if (!linha) return;

    if (apagar) {
      if (!confirm('Deseja apagar este set?')) return;
      try {
        const dados = await json(await fetch(`/partidas/${idPartida}/desempenho/set/${apagar.dataset.idSet}`, { method: 'DELETE' }));
        if (dados.sucesso === false) throw new Error(dados.erro || 'Não foi possível apagar o set.');
        linha.remove();
        estado.sets = estado.sets.filter((set) => String(set.id) !== String(apagar.dataset.idSet));
        renderizarSets();
        mostrar('Set apagado.', 'sucesso');
      } catch (erro) { mostrar(erro.message, 'informacao'); }
      return;
    }

    if (editar) {
      const atual = estado.sets.find((set) => String(set.id) === String(editar.dataset.idSet));
      const placar = linha.querySelector('[data-placar-set]')?.textContent.match(/\\d+/g) || [];
      const casa = Number(prompt('Placar da minha equipe:', placar[0] || atual?.casa || 0));
      const adversario = Number(prompt('Placar da equipe adversária:', placar[1] || atual?.adversario || 0));
      if (!Number.isInteger(casa) || !Number.isInteger(adversario) || casa < 0 || adversario < 0) {
        mostrar('Placar inválido.', 'informacao');
        return;
      }
      const vencedor = casa === adversario ? 'EMPATE' : casa > adversario ? 'MINHA_EQUIPE' : 'EQUIPE_ADVERSARIA';
      try {
        const dados = await json(await fetch(`/partidas/${idPartida}/desempenho/set/${editar.dataset.idSet}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placar_casa: casa, placar_adversario: adversario, vencedor })
        }));
        if (dados.sucesso === false) throw new Error(dados.erro || 'Não foi possível editar o set.');
        linha.querySelector('[data-placar-set]').textContent = `${casa} × ${adversario}`;
        linha.querySelector('[data-vencedor-set]').textContent = vencedor;
        if (atual) Object.assign(atual, { casa, adversario, vencedor });
        renderizarSets();
        mostrar('Set editado.', 'sucesso');
      } catch (erro) { mostrar(erro.message, 'informacao'); }
    }
  });

  document.querySelector('[data-seletor-set]')?.addEventListener('change', async () => {
    sessionStorage.setItem(chaveSet, seletorSet.value);
    atualizarSetNaTela();
    try { await carregarAcoes(Number(seletorSet.value)); } catch (erro) { mostrar(erro.message); }
  });

  document.querySelector('[data-encerrar-set]')?.addEventListener('click', () => {
    if (estado.casa === 0 && estado.adversario === 0) return mostrar('Adicione pontos antes de encerrar.', 'informacao');

    const numero = seletorSet?.value || '1';
    const placar = `${estado.casa} × ${estado.adversario}`;
    const vencedor = estado.casa === estado.adversario
      ? 'O set está empatado'
      : estado.casa > estado.adversario
        ? 'Minha equipe vence o set'
        : 'A equipe adversária vence o set';

    document.querySelector('[data-resumo-numero-set]')?.replaceChildren(numero);
    document.querySelector('[data-resumo-placar]')?.replaceChildren(placar);
    document.querySelector('[data-resumo-vencedor]')?.replaceChildren(vencedor);
    document.querySelector('[data-resumo-encerramento]')?.removeAttribute('hidden');
  });

  document.querySelector('[data-cancelar-encerramento]')?.addEventListener('click', () => {
    document.querySelector('[data-resumo-encerramento]')?.setAttribute('hidden', 'hidden');
  });

  document.querySelector('[data-confirmar-encerramento]')?.addEventListener('click', async () => {
    const numero = Number(seletorSet?.value || 1);
    if (estado.sets.some((s) => s.numero === numero)) return mostrar('Este set já está registrado.', 'informacao');
    const vencedor = estado.casa === estado.adversario ? 'EMPATE' : estado.casa > estado.adversario ? 'MINHA_EQUIPE' : 'EQUIPE_ADVERSARIA';
    try {
      const dados = await json(await fetch(`/partidas/${idPartida}/desempenho/set`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_set: numero, placar_casa: estado.casa, placar_adversario: estado.adversario, vencedor })
      }));
      estado.sets.push({ id: dados.id_set, numero, vencedor });
      renderizarSets();
      document.querySelector('[data-resumo-encerramento]')?.setAttribute('hidden', 'hidden');
      mostrar('Set salvo.', 'sucesso');
    } catch (erro) { mostrar(erro.message, 'informacao'); }
  });

  carregarSets();
  atualizarSetNaTela();
  atualizarPlacar();

  async function carregarSets() {
    try {
      const sets = await json(await fetch(`/partidas/${idPartida}/desempenho/sets`));
      estado.sets = sets.filter((s) => !(Number(s.placar_casa) === 0 && Number(s.placar_adversario) === 0)).map((s) => ({ id: Number(s.id_set), numero: Number(s.numero_set), vencedor: s.vencedor }));
      renderizarSets();
    } catch (erro) { console.error(erro); }
    const salvo = sessionStorage.getItem(chaveSet);
    if (salvo && [...seletorSet.options].some((opcao) => opcao.value === salvo)) {
      seletorSet.value = salvo;
      atualizarSetNaTela();
      try { await carregarAcoes(Number(salvo)); } catch (erro) { console.error(erro); }
    }
  }
});

function esc(valor) {
  const div = document.createElement('div');
  div.textContent = valor ?? '';
  return div.innerHTML;
}
