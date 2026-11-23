(() => {
  'use strict';

  const FISCAL_DB_NAME = 'IndAguaFiscalDB';
  const FISCAL_DB_VERSION = 1;
  const FISCAL_STORES = {
    clientes: 'fiscal_clientes',
    produtos: 'fiscal_produtos',
    empresa: 'fiscal_emitente'
  };
  const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  const UF_OPTIONS = [{ value: '', label: 'Selecione a UF' }, ...UFS.map(uf => ({ value: uf, label: uf }))];
  let fiscalDB = null;
  let fiscalDBPromise = null;
  let fiscalActiveKind = '';

  const FISCAL_FIELDS = {
    clientes: [
      { key: 'tipoPessoa', label: 'Tipo de pessoa', type: 'select', required: true, group: 'Identificação', options: [{ value: '', label: 'Selecione' }, { value: 'PF', label: 'Pessoa física' }, { value: 'PJ', label: 'Pessoa jurídica' }] },
      { key: 'nome', label: 'Nome completo ou razão social', type: 'text', required: true, maxLength: 160, group: 'Identificação' },
      { key: 'nomeFantasia', label: 'Nome fantasia', type: 'text', maxLength: 160, group: 'Identificação' },
      { key: 'documento', label: 'CPF ou CNPJ', type: 'text', required: true, maxLength: 20, group: 'Identificação', hint: 'CPF aceita 11 dígitos. CNPJ aceita o formato numérico e o alfanumérico vigente.' },
      { key: 'inscricaoEstadual', label: 'Inscrição estadual', type: 'text', maxLength: 40, group: 'Identificação' },
      { key: 'indicadorICMS', label: 'Indicador de contribuinte do ICMS', type: 'select', required: true, group: 'Identificação', options: [{ value: '', label: 'Selecione — não presumimos a condição' }, { value: 'CONTRIBUINTE', label: 'Contribuinte do ICMS' }, { value: 'ISENTO', label: 'Contribuinte isento' }, { value: 'NAO_CONTRIBUINTE', label: 'Não contribuinte' }] },
      { key: 'inscricaoMunicipal', label: 'Inscrição municipal (opcional)', type: 'text', maxLength: 40, group: 'Identificação' },
      { key: 'email', label: 'E-mail', type: 'email', maxLength: 160, group: 'Contato' },
      { key: 'telefone', label: 'Telefone', type: 'tel', maxLength: 24, group: 'Contato' },
      { key: 'cep', label: 'CEP', type: 'text', inputmode: 'numeric', maxLength: 9, group: 'Endereço', hint: '8 dígitos; hífen opcional.' },
      { key: 'logradouro', label: 'Logradouro', type: 'text', maxLength: 160, group: 'Endereço' },
      { key: 'numero', label: 'Número', type: 'text', maxLength: 30, group: 'Endereço' },
      { key: 'complemento', label: 'Complemento', type: 'text', maxLength: 100, group: 'Endereço' },
      { key: 'bairro', label: 'Bairro', type: 'text', maxLength: 100, group: 'Endereço' },
      { key: 'municipio', label: 'Município', type: 'text', maxLength: 120, group: 'Endereço' },
      { key: 'codigoMunicipio', label: 'Código IBGE do município', type: 'text', inputmode: 'numeric', maxLength: 7, group: 'Endereço', hint: 'Se informado, deve conter 7 dígitos.' },
      { key: 'uf', label: 'UF', type: 'select', group: 'Endereço', options: UF_OPTIONS },
      { key: 'pais', label: 'País', type: 'text', required: true, maxLength: 80, defaultValue: 'Brasil', group: 'Endereço' },
      { key: 'codigoPais', label: 'Código do país', type: 'text', inputmode: 'numeric', required: true, maxLength: 4, defaultValue: '1058', group: 'Endereço' },
      { key: 'observacoes', label: 'Observações fiscais (opcional)', type: 'textarea', maxLength: 1000, group: 'Observações' }
    ],
    produtos: [
      { key: 'descricao', label: 'Descrição fiscal do produto', type: 'text', required: true, maxLength: 180, group: 'Identificação' },
      { key: 'gtin', label: 'Código de barras GTIN/EAN', type: 'text', inputmode: 'numeric', maxLength: 14, group: 'Identificação', hint: 'Opcional; se informado, use 8, 12, 13 ou 14 dígitos.' },
      { key: 'gtinAusente', label: 'Produto sem GTIN/EAN', type: 'checkbox', group: 'Identificação' },
      { key: 'ncm', label: 'NCM', type: 'text', required: true, inputmode: 'numeric', maxLength: 8, group: 'Classificação', hint: 'Informe o código conforme a documentação do produto; deve conter 8 dígitos.' },
      { key: 'cest', label: 'CEST (opcional)', type: 'text', inputmode: 'numeric', maxLength: 7, group: 'Classificação', hint: 'Se informado, deve conter 7 dígitos.' },
      { key: 'origem', label: 'Origem da mercadoria', type: 'text', maxLength: 120, group: 'Classificação', hint: 'Informe conforme a documentação do produto. Nenhum código de origem é presumido.' },
      { key: 'classificacao', label: 'Classificação do item', type: 'select', required: true, group: 'Classificação', options: [{ value: '', label: 'Selecione' }, { value: 'PRODUTO_ACABADO', label: 'Produto acabado' }, { value: 'MERCADORIA_REVENDA', label: 'Mercadoria para revenda' }, { value: 'MATERIA_PRIMA', label: 'Matéria-prima' }, { value: 'EMBALAGEM', label: 'Embalagem' }, { value: 'OUTRO', label: 'Outra classificação' }] },
      { key: 'classificacaoOutra', label: 'Descreva a outra classificação', type: 'text', maxLength: 100, group: 'Classificação' },
      { key: 'unidadeComercial', label: 'Unidade comercial', type: 'text', required: true, maxLength: 12, group: 'Unidades' },
      { key: 'unidadeTributavel', label: 'Unidade tributável', type: 'text', required: true, maxLength: 12, group: 'Unidades' },
      { key: 'fatorConversao', label: 'Quantidade tributável por unidade comercial / fator', type: 'number', min: '0.000001', step: 'any', group: 'Unidades', hint: 'Opcional; informe apenas se conhecido.' },
      { key: 'valorReferencia', label: 'Valor unitário de referência (opcional)', type: 'number', min: '0', step: '0.01', group: 'Outras informações' },
      { key: 'informacoesComplementares', label: 'Informações complementares (opcional)', type: 'textarea', maxLength: 1000, group: 'Outras informações' },
      { key: 'situacao', label: 'Situação', type: 'select', required: true, defaultValue: 'ATIVO', group: 'Outras informações', options: [{ value: 'ATIVO', label: 'Ativo' }, { value: 'INATIVO', label: 'Inativo' }] }
    ],
    empresa: [
      { key: 'razaoSocial', label: 'Razão social', type: 'text', required: true, maxLength: 180, group: 'Identificação do emitente' },
      { key: 'nomeFantasia', label: 'Nome fantasia', type: 'text', maxLength: 180, group: 'Identificação do emitente' },
      { key: 'cnpj', label: 'CNPJ', type: 'text', required: true, maxLength: 20, group: 'Identificação do emitente', hint: 'Aceita CNPJ numérico e alfanumérico vigente, com dígitos verificadores.' },
      { key: 'inscricaoEstadual', label: 'Inscrição estadual', type: 'text', maxLength: 40, group: 'Identificação do emitente' },
      { key: 'inscricaoMunicipal', label: 'Inscrição municipal (se aplicável)', type: 'text', maxLength: 40, group: 'Identificação do emitente' },
      { key: 'regimeTributario', label: 'Regime tributário', type: 'select', group: 'Identificação do emitente', options: [{ value: '', label: 'Selecione — não presumido' }, { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' }, { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' }, { value: 'LUCRO_REAL', label: 'Lucro Real' }] },
      { key: 'cnaePrincipal', label: 'CNAE principal', type: 'text', inputmode: 'numeric', maxLength: 7, group: 'Identificação do emitente', hint: 'Se informado, deve conter 7 dígitos.' },
      { key: 'cep', label: 'CEP', type: 'text', inputmode: 'numeric', maxLength: 9, group: 'Endereço' },
      { key: 'logradouro', label: 'Logradouro', type: 'text', maxLength: 160, group: 'Endereço' },
      { key: 'numero', label: 'Número', type: 'text', maxLength: 30, group: 'Endereço' },
      { key: 'complemento', label: 'Complemento', type: 'text', maxLength: 100, group: 'Endereço' },
      { key: 'bairro', label: 'Bairro', type: 'text', maxLength: 100, group: 'Endereço' },
      { key: 'municipio', label: 'Município', type: 'text', maxLength: 120, group: 'Endereço' },
      { key: 'codigoMunicipio', label: 'Código IBGE do município', type: 'text', inputmode: 'numeric', maxLength: 7, group: 'Endereço' },
      { key: 'uf', label: 'UF', type: 'select', group: 'Endereço', options: UF_OPTIONS },
      { key: 'codigoPais', label: 'Código do país', type: 'text', inputmode: 'numeric', required: true, maxLength: 4, defaultValue: '1058', group: 'Endereço' },
      { key: 'telefone', label: 'Telefone', type: 'tel', maxLength: 24, group: 'Contato' },
      { key: 'emailFiscal', label: 'E-mail fiscal', type: 'email', maxLength: 160, group: 'Contato' }
    ]
  };

  const KIND_META = {
    clientes: { title: 'Clientes Fiscais', singular: 'cliente fiscal', store: FISCAL_STORES.clientes, codePrefix: 'CF' },
    produtos: { title: 'Produtos Fiscais', singular: 'produto fiscal', store: FISCAL_STORES.produtos, codePrefix: 'PF' },
    empresa: { title: 'Dados da Empresa', singular: 'emitente', store: FISCAL_STORES.empresa, codePrefix: 'EMIT' }
  };

  function fEsc(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function fiscalId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return `fiscal-${window.crypto.randomUUID()}`;
    return `fiscal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  function fiscalCode(prefix) {
    const entropy = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID().replaceAll('-', '').slice(0, 10)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    return `${prefix}-${entropy.toUpperCase()}`;
  }

  function openFiscalDB() {
    if (fiscalDB) return Promise.resolve(fiscalDB);
    if (fiscalDBPromise) return fiscalDBPromise;
    fiscalDBPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('Este navegador não oferece armazenamento local compatível com o módulo fiscal.'));
        return;
      }
      const request = indexedDB.open(FISCAL_DB_NAME, FISCAL_DB_VERSION);
      request.onupgradeneeded = event => {
        const database = event.target.result;
        Object.values(FISCAL_STORES).forEach(name => {
          if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: 'id' });
        });
      };
      request.onsuccess = () => {
        fiscalDB = request.result;
        fiscalDB.onversionchange = () => { fiscalDB.close(); fiscalDB = null; fiscalDBPromise = null; };
        resolve(fiscalDB);
      };
      request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento fiscal local.'));
      request.onblocked = () => reject(new Error('O armazenamento fiscal está ocupado por outra aba. Feche as outras abas do aplicativo e tente novamente.'));
    }).catch(error => {
      fiscalDBPromise = null;
      throw error;
    });
    return fiscalDBPromise;
  }

  function fiscalRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Falha na consulta ao armazenamento fiscal.'));
    });
  }

  function fiscalTransaction(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
      const tx = fiscalDB.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      try { result = operation(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('Falha ao salvar dados fiscais.'));
      tx.onabort = () => reject(tx.error || new Error('Operação fiscal cancelada.'));
    });
  }

  function setFiscalScreen(screenId) {
    if (typeof window.showScreen === 'function') window.showScreen(screenId);
  }

  function fieldMarkup(field, idPrefix) {
    const id = `${idPrefix}-${field.key}`;
    const req = field.required ? ' required' : '';
    const maxlength = field.maxLength ? ` maxlength="${field.maxLength}"` : '';
    const inputmode = field.inputmode ? ` inputmode="${field.inputmode}"` : '';
    const min = field.min ? ` min="${field.min}"` : '';
    const step = field.step ? ` step="${field.step}"` : '';
    let control;
    if (field.type === 'select') {
      control = `<select id="${id}" name="${field.key}"${req}>${(field.options || []).map(option => `<option value="${fEsc(option.value)}">${fEsc(option.label)}</option>`).join('')}</select>`;
    } else if (field.type === 'textarea') {
      control = `<textarea id="${id}" name="${field.key}" rows="3"${maxlength}${req}></textarea>`;
    } else if (field.type === 'checkbox') {
      return `<label class="fiscal-checkline"><input id="${id}" name="${field.key}" type="checkbox"><span>${fEsc(field.label)}</span></label>`;
    } else {
      const initial = field.defaultValue != null ? ` value="${fEsc(field.defaultValue)}"` : '';
      control = `<input id="${id}" name="${field.key}" type="${field.type}"${field.type === 'number' ? `${min}${step}` : `${inputmode}${maxlength}`}${initial}${req}>`;
    }
    return `<div class="field fiscal-field"><label for="${id}">${fEsc(field.label)}</label>${control}${field.hint ? `<small class="fiscal-field-hint">${fEsc(field.hint)}</small>` : ''}</div>`;
  }

  function formMarkup(kind) {
    const idPrefix = `fiscal-${kind}`;
    const fields = FISCAL_FIELDS[kind];
    const groups = [];
    fields.forEach(field => {
      const group = field.group || 'Dados';
      let bucket = groups.find(item => item.name === group);
      if (!bucket) { bucket = { name: group, fields: [] }; groups.push(bucket); }
      bucket.fields.push(field);
    });
    const sections = groups.map(group => `<fieldset class="fiscal-fieldset"><legend>${fEsc(group.name)}</legend><div class="fiscal-form-grid">${group.fields.map(field => fieldMarkup(field, idPrefix)).join('')}</div></fieldset>`).join('');
    const buttonLabel = kind === 'empresa' ? 'Salvar dados do emitente' : `Salvar ${KIND_META[kind].singular}`;
    return `<form id="fiscal-form-${kind}" class="fiscal-form" novalidate><input type="hidden" name="id"><input type="hidden" name="codigo"><div id="fiscal-form-message-${kind}" class="fiscal-form-message" role="status"></div>${sections}<div class="form-actions"><button class="btn-primary" type="submit">${buttonLabel}</button><button class="btn-secondary" type="button" data-fiscal-action="cancel-edit">Limpar formulário</button></div></form>`;
  }

  function hubMarkup() {
    return `<div class="dashboard-grid fiscal-hub-grid">
      <button class="card dashboard-card compact-card" type="button" data-fiscal-open="clientes"><span class="card-icon icon-blue">👤</span><span class="card-title">Clientes Fiscais</span><span class="card-text">Cadastro independente do comercial</span></button>
      <button class="card dashboard-card compact-card" type="button" data-fiscal-open="produtos"><span class="card-icon icon-green">🧾</span><span class="card-title">Produtos Fiscais</span><span class="card-text">Cadastro independente do estoque e vendas</span></button>
      <button class="card dashboard-card compact-card" type="button" data-fiscal-open="empresa"><span class="card-icon icon-navy">🏢</span><span class="card-title">Dados da Empresa</span><span class="card-text">Cadastro único do emitente</span></button>
      <button class="card dashboard-card compact-card fiscal-disabled-card" type="button" disabled aria-disabled="true"><span class="card-icon icon-slate">📄</span><span class="card-title">Emitir NF-e</span><span class="card-text">Em desenvolvimento</span></button>
      <button class="card dashboard-card compact-card fiscal-disabled-card" type="button" disabled aria-disabled="true"><span class="card-icon icon-slate">📊</span><span class="card-title">Contabilidade</span><span class="card-text">Em desenvolvimento</span></button>
      <button class="card dashboard-card compact-card fiscal-disabled-card" type="button" disabled aria-disabled="true"><span class="card-icon icon-slate">🔒</span><span class="card-title">Backup Fiscal</span><span class="card-text">Em desenvolvimento</span></button>
    </div>`;
  }

  function kindDescription(kind) {
    if (kind === 'clientes') return 'Os registros desta tela são exclusivamente fiscais; não alteram clientes comerciais, crédito, vendas ou comodatos.';
    if (kind === 'produtos') return 'Este cadastro não modifica produtos operacionais, preços, custos, estoque ou movimentações.';
    return 'Há um único cadastro de emitente. Nenhum dado da empresa é presumido ou preenchido automaticamente, exceto Brasil e seu código de país como padrão.';
  }

  function panelMarkup(kind) {
    const meta = KIND_META[kind];
    if (kind === 'empresa') {
      return `<div class="fiscal-pane-head"><div><h3>${fEsc(meta.title)}</h3><p>${fEsc(kindDescription(kind))}</p></div><button class="btn-secondary" type="button" data-fiscal-action="hub">Voltar à Central Fiscal</button></div><div id="fiscal-company-state" class="fiscal-state-note">Carregando dados locais do emitente…</div><div class="fiscal-layout fiscal-layout-company"><section class="card fiscal-form-card"><h4>Dados do emitente</h4>${formMarkup(kind)}</section></div>`;
    }
    return `<div class="fiscal-pane-head"><div><h3>${fEsc(meta.title)}</h3><p>${fEsc(kindDescription(kind))}</p></div><button class="btn-secondary" type="button" data-fiscal-action="hub">Voltar à Central Fiscal</button></div><div class="fiscal-layout"><section class="card fiscal-form-card"><h4 id="fiscal-form-heading-${kind}">Novo ${fEsc(meta.singular)}</h4>${formMarkup(kind)}</section><section class="card fiscal-list-card"><div class="section-head"><h4 class="section-title">Cadastros existentes</h4><span class="pill" id="fiscal-count-${kind}">0 itens</span></div><div class="field fiscal-search"><label for="fiscal-search-${kind}">Pesquisar</label><input id="fiscal-search-${kind}" type="search" placeholder="Código, nome ou documento" autocomplete="off"></div><div id="fiscal-list-${kind}" class="fiscal-entity-list"><div class="empty-list">Carregando…</div></div></section></div>`;
  }

  async function openFiscal(kind) {
    await openFiscalDB();
    fiscalActiveKind = kind;
    const hub = document.getElementById('fiscal-hub');
    const pane = document.getElementById('fiscal-pane');
    const body = document.getElementById('fiscal-pane-body');
    hub.classList.add('hidden');
    pane.classList.remove('hidden');
    body.innerHTML = panelMarkup(kind);
    const form = document.getElementById(`fiscal-form-${kind}`);
    form.addEventListener('submit', event => saveFiscalRecord(event, kind));
    if (kind === 'produtos') document.getElementById('fiscal-produtos-classificacaoOutra')?.closest('.field')?.classList.add('hidden');
    if (kind !== 'empresa') {
      document.getElementById(`fiscal-search-${kind}`).addEventListener('input', () => renderFiscalList(kind));
      await renderFiscalList(kind);
    } else {
      await loadFiscalEmitter();
    }
  }

  function resetFiscalForm(kind) {
    const form = document.getElementById(`fiscal-form-${kind}`);
    if (!form) return;
    form.reset();
    form.elements.namedItem('id').value = '';
    form.elements.namedItem('codigo').value = '';
    (FISCAL_FIELDS[kind] || []).forEach(field => {
      const control = form.elements.namedItem(field.key);
      if (!control) return;
      if (field.type === 'checkbox') control.checked = Boolean(field.defaultValue);
      else if (field.defaultValue != null) control.value = String(field.defaultValue);
    });
    const message = document.getElementById(`fiscal-form-message-${kind}`);
    if (message) message.textContent = '';
    if (kind === 'clientes') fiscalUpdateDocumentControl(form);
    if (kind === 'produtos') fiscalUpdateGTINControl(form);
    if (kind === 'produtos') document.getElementById('fiscal-produtos-classificacaoOutra')?.closest('.field')?.classList.add('hidden');
    if (kind !== 'empresa') {
      const heading = document.getElementById(`fiscal-form-heading-${kind}`);
      if (heading) heading.textContent = `Novo ${KIND_META[kind].singular}`;
      const submit = form.querySelector('[type="submit"]');
      if (submit) submit.textContent = `Salvar ${KIND_META[kind].singular}`;
    }
  }

  function fiscalUpdateDocumentControl(form) {
    const type = form.elements.namedItem('tipoPessoa')?.value || '';
    const input = form.elements.namedItem('documento');
    const label = form.querySelector('label[for="fiscal-clientes-documento"]');
    if (label) label.textContent = type === 'PF' ? 'CPF' : type === 'PJ' ? 'CNPJ' : 'CPF ou CNPJ';
    if (input) {
      input.placeholder = type === 'PF' ? '000.000.000-00' : type === 'PJ' ? '00.000.000/0000-00 ou formato alfanumérico' : 'Informe após selecionar o tipo de pessoa';
      input.inputMode = type === 'PF' ? 'numeric' : 'text';
    }
  }

  function fiscalUpdateGTINControl(form) {
    const absent = form.elements.namedItem('gtinAusente');
    const gtin = form.elements.namedItem('gtin');
    if (!absent || !gtin) return;
    gtin.disabled = absent.checked;
    if (absent.checked) gtin.value = '';
  }

  function fillFiscalForm(kind, record) {
    const form = document.getElementById(`fiscal-form-${kind}`);
    if (!form) return;
    resetFiscalForm(kind);
    form.elements.namedItem('id').value = record.id || '';
    form.elements.namedItem('codigo').value = record.codigo || '';
    (FISCAL_FIELDS[kind] || []).forEach(field => {
      const control = form.elements.namedItem(field.key);
      if (!control) return;
      if (field.type === 'checkbox') control.checked = Boolean(record[field.key]);
      else control.value = record[field.key] == null ? '' : String(record[field.key]);
    });
    if (kind === 'clientes') fiscalUpdateDocumentControl(form);
    if (kind === 'produtos') {
      fiscalUpdateGTINControl(form);
      const other = document.getElementById('fiscal-produtos-classificacaoOutra')?.closest('.field');
      if (other) other.classList.toggle('hidden', form.elements.namedItem('classificacao').value !== 'OUTRO');
    }
    if (kind !== 'empresa') {
      const heading = document.getElementById(`fiscal-form-heading-${kind}`);
      if (heading) heading.textContent = `Editar ${KIND_META[kind].singular}`;
      const submit = form.querySelector('[type="submit"]');
      if (submit) submit.textContent = `Atualizar ${KIND_META[kind].singular}`;
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function readFiscalForm(kind, existing) {
    const form = document.getElementById(`fiscal-form-${kind}`);
    const data = {};
    (FISCAL_FIELDS[kind] || []).forEach(field => {
      const control = form.elements.namedItem(field.key);
      if (!control) return;
      if (field.type === 'checkbox') data[field.key] = control.checked;
      else if (field.type === 'number') data[field.key] = control.value === '' ? null : Number(control.value);
      else data[field.key] = String(control.value || '').trim();
    });
    if (kind === 'clientes') {
      data.documento = fiscalNormalizeDocument(data.documento, data.tipoPessoa);
      data.cep = fiscalDigits(data.cep);
      data.codigoMunicipio = fiscalDigits(data.codigoMunicipio);
    } else if (kind === 'empresa') {
      data.cnpj = fiscalNormalizeDocument(data.cnpj, 'PJ');
      data.cep = fiscalDigits(data.cep);
      data.codigoMunicipio = fiscalDigits(data.codigoMunicipio);
    } else {
      data.gtin = fiscalDigits(data.gtin);
      data.ncm = fiscalDigits(data.ncm);
      data.cest = fiscalDigits(data.cest);
    }
    data.id = kind === 'empresa' ? 'fiscal_emitente_principal' : (existing?.id || fiscalId());
    data.codigo = kind === 'empresa' ? 'EMITENTE-1' : (existing?.codigo || fiscalCode(KIND_META[kind].codePrefix));
    data.criadoEm = existing?.criadoEm || new Date().toISOString();
    data.atualizadoEm = new Date().toISOString();
    return data;
  }

  function fiscalDigits(value) { return String(value || '').replace(/\D/g, ''); }

  function fiscalNormalizeDocument(value, type) {
    const raw = String(value || '').trim().toUpperCase();
    return type === 'PJ' ? raw.replace(/[.\-/\s]/g, '') : raw.replace(/[.\-\s]/g, '');
  }

  function fiscalHasOnlyDigits(value, allowDash = false) {
    return allowDash ? /^[\d\s-]*$/.test(String(value || '')) : /^\d*$/.test(String(value || ''));
  }

  function fiscalHasOnlyDocumentChars(value, allowLetters = false) {
    return allowLetters ? /^[A-Z0-9.\-/\s]*$/i.test(String(value || '')) : /^[\d.\-\s]*$/.test(String(value || ''));
  }

  function fiscalDocumentFormatValid(value, type) {
    const raw = String(value || '').trim();
    if (type === 'PF') return /^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(raw);
    return /^([A-Z0-9]{12}\d{2}|[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2})$/i.test(raw);
  }

  function validarGTIN(value) {
    const gtin = fiscalDigits(value);
    if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(gtin)) return false;
    const digits = gtin.slice(0, -1).split('').reverse().map(Number);
    const soma = digits.reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
    const dv = (10 - (soma % 10)) % 10;
    return dv === Number(gtin.at(-1));
  }

  function validarCPF(value) {
    const cpf = fiscalDigits(value);
    if (!/^\d{11}$/.test(cpf) || /^([0-9])\1{10}$/.test(cpf)) return false;
    const dv = position => {
      let sum = 0;
      for (let i = 0; i < position - 1; i++) sum += Number(cpf[i]) * (position - i);
      const rem = (sum * 10) % 11;
      return rem === 10 ? 0 : rem;
    };
    return dv(10) === Number(cpf[9]) && dv(11) === Number(cpf[10]);
  }

  // Receita Federal: valor do caractere = código ASCII - 48; módulo 11, pesos 2..9 da direita para a esquerda.
  function validarCNPJ(value) {
    const cnpj = String(value || '').toUpperCase();
    if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^([0-9])\1{13}$/.test(cnpj)) return false;
    const calculaDV = base => {
      let soma = 0;
      let peso = 2;
      for (let i = base.length - 1; i >= 0; i--) {
        const valor = base.charCodeAt(i) - 48;
        if (valor < 0 || valor > 42) return -1;
        soma += valor * peso;
        peso = peso === 9 ? 2 : peso + 1;
      }
      const resto = soma % 11;
      return resto === 0 || resto === 1 ? 0 : 11 - resto;
    };
    const dv1 = calculaDV(cnpj.slice(0, 12));
    const dv2 = calculaDV(cnpj.slice(0, 12) + String(dv1));
    return dv1 === Number(cnpj[12]) && dv2 === Number(cnpj[13]);
  }

  function validateFiscalRecord(kind, data, form) {
    if (kind === 'clientes') {
      if (!data.tipoPessoa) return 'Selecione se o cliente fiscal é pessoa física ou jurídica.';
      if (!data.nome) return 'Informe o nome completo ou a razão social.';
      if (!fiscalHasOnlyDocumentChars(form.elements.namedItem('documento').value, data.tipoPessoa === 'PJ') || !fiscalDocumentFormatValid(form.elements.namedItem('documento').value, data.tipoPessoa)) return 'Formato de CPF/CNPJ inválido. Use o número sem máscara ou a máscara convencional.';
      if (data.tipoPessoa === 'PF' && !validarCPF(data.documento)) return 'CPF inválido. Confira os 11 dígitos verificadores.';
      if (data.tipoPessoa === 'PJ' && !validarCNPJ(data.documento)) return 'CNPJ inválido. Confira o formato e os dígitos verificadores.';
      if (!data.indicadorICMS) return 'Selecione o indicador de contribuinte do ICMS; essa condição não é presumida.';
    }
    if (kind === 'empresa') {
      if (!data.razaoSocial) return 'Informe a razão social do emitente.';
      if (!fiscalHasOnlyDocumentChars(form.elements.namedItem('cnpj').value, true) || !fiscalDocumentFormatValid(form.elements.namedItem('cnpj').value, 'PJ')) return 'Formato de CNPJ inválido. Use o número sem máscara ou a máscara convencional.';
      if (!validarCNPJ(data.cnpj)) return 'CNPJ inválido. Confira o formato e os dígitos verificadores.';
    }
    if (kind === 'produtos') {
      if (!data.descricao) return 'Informe a descrição fiscal do produto.';
      if (!data.gtin && !data.gtinAusente) return 'Informe o GTIN/EAN ou marque “Produto sem GTIN/EAN”.';
      for (const key of ['gtin', 'ncm', 'cest']) if (!fiscalHasOnlyDigits(form.elements.namedItem(key).value)) return `${key.toUpperCase()} deve conter somente dígitos.`;
      if (data.gtin && !validarGTIN(data.gtin)) return 'GTIN/EAN inválido. Confira o comprimento e o dígito verificador.';
      if (!data.ncm || !/^\d{8}$/.test(data.ncm)) return 'Informe o NCM do produto com 8 dígitos, conforme sua documentação.';
      if (data.cest && !/^\d{7}$/.test(data.cest)) return 'CEST, quando informado, deve conter 7 dígitos.';
      if (data.classificacao === 'OUTRO' && !data.classificacaoOutra) return 'Descreva a outra classificação do item.';
      if (data.fatorConversao != null && (!Number.isFinite(data.fatorConversao) || data.fatorConversao <= 0)) return 'O fator de conversão, quando informado, deve ser maior que zero.';
      if (data.valorReferencia != null && (!Number.isFinite(data.valorReferencia) || data.valorReferencia < 0)) return 'O valor de referência deve ser zero ou maior.';
    }
    const cep = kind === 'clientes' || kind === 'empresa' ? data.cep : '';
    if ((kind === 'clientes' || kind === 'empresa') && form.elements.namedItem('cep').value && !/^\d{5}-?\d{3}$/.test(form.elements.namedItem('cep').value.trim())) return 'CEP deve conter 8 dígitos, com hífen opcional após o quinto dígito.';
    if (cep && !/^\d{8}$/.test(cep)) return 'CEP, quando informado, deve conter 8 dígitos.';
    if ((kind === 'clientes' || kind === 'empresa') && !fiscalHasOnlyDigits(form.elements.namedItem('codigoMunicipio').value)) return 'Código IBGE do município deve conter somente dígitos.';
    if (data.codigoMunicipio && !/^\d{7}$/.test(data.codigoMunicipio)) return 'Código IBGE do município, quando informado, deve conter 7 dígitos.';
    if ((kind === 'clientes' || kind === 'empresa') && !fiscalHasOnlyDigits(form.elements.namedItem('codigoPais').value)) return 'Código do país deve conter somente dígitos.';
    if ((kind === 'clientes' || kind === 'empresa') && data.codigoPais && !/^\d{4}$/.test(data.codigoPais)) return 'Código do país deve conter 4 dígitos.';
    if (kind === 'empresa' && !fiscalHasOnlyDigits(form.elements.namedItem('cnaePrincipal').value)) return 'CNAE principal deve conter somente dígitos.';
    if (kind === 'empresa' && data.cnaePrincipal && !/^\d{7}$/.test(data.cnaePrincipal)) return 'CNAE principal, quando informado, deve conter 7 dígitos.';
    const phone = kind === 'clientes' ? data.telefone : kind === 'empresa' ? data.telefone : '';
    if (phone) {
      const digits = fiscalDigits(phone);
      if (digits.length < 8 || digits.length > 15 || !/^\+?[\d\s().-]+$/.test(phone)) return 'Telefone fora do formato esperado. Informe de 8 a 15 dígitos.';
    }
    if (kind === 'clientes' || kind === 'empresa') {
      const email = kind === 'clientes' ? data.email : data.emailFiscal;
      const emailControl = form.elements.namedItem(kind === 'clientes' ? 'email' : 'emailFiscal');
      if (email && emailControl && !emailControl.validity.valid) return 'E-mail fora do formato esperado.';
      const uf = data.uf;
      if (uf && !UFS.includes(uf)) return 'Selecione uma UF válida.';
    }
    return '';
  }

  async function saveFiscalRecord(event, kind) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const id = form.elements.namedItem('id').value;
    const storeName = KIND_META[kind].store;
    const existing = id ? await fiscalRequest(fiscalDB.transaction(storeName, 'readonly').objectStore(storeName).get(id)) : null;
    const message = document.getElementById(`fiscal-form-message-${kind}`);
    if (id && !existing) {
      resetFiscalForm(kind);
      if (message) { message.textContent = 'Este cadastro foi excluído ou não está mais disponível. O formulário foi limpo; consulte a lista antes de continuar.'; message.className = 'fiscal-form-message error'; }
      if (kind !== 'empresa') await renderFiscalList(kind);
      return;
    }
    const data = readFiscalForm(kind, existing);
    const validationError = validateFiscalRecord(kind, data, form);
    if (validationError) {
      if (message) { message.textContent = validationError; message.className = 'fiscal-form-message error'; }
      else alert(validationError);
      return;
    }
    if (kind === 'clientes') {
      const all = await fiscalRequest(fiscalDB.transaction(storeName, 'readonly').objectStore(storeName).getAll());
      const duplicate = all.find(item => item.id !== data.id && item.tipoPessoa === data.tipoPessoa && item.documento === data.documento);
      if (duplicate) {
        if (message) { message.textContent = 'Já existe um cliente fiscal com este documento.'; message.className = 'fiscal-form-message error'; }
        return;
      }
    }
    try {
      await fiscalTransaction(storeName, 'readwrite', store => store.put(data));
      if (kind === 'empresa') {
        await loadFiscalEmitter();
        if (message) { message.textContent = 'Dados do emitente salvos neste dispositivo.'; message.className = 'fiscal-form-message success'; }
      } else {
        resetFiscalForm(kind);
        await renderFiscalList(kind);
      }
    } catch (error) {
      if (message) { message.textContent = `Não foi possível salvar: ${error.message}`; message.className = 'fiscal-form-message error'; }
      else alert(`Não foi possível salvar os dados fiscais: ${error.message}`);
    }
  }

  async function renderFiscalList(kind) {
    const storeName = KIND_META[kind].store;
    const list = document.getElementById(`fiscal-list-${kind}`);
    if (!list) return;
    const query = String(document.getElementById(`fiscal-search-${kind}`)?.value || '').trim().toLocaleLowerCase('pt-BR');
    let records = await fiscalRequest(fiscalDB.transaction(storeName, 'readonly').objectStore(storeName).getAll());
    records.sort((a, b) => String(a.nome || a.descricao || '').localeCompare(String(b.nome || b.descricao || ''), 'pt-BR'));
    if (query) records = records.filter(record => Object.values(record).some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(query)));
    const count = document.getElementById(`fiscal-count-${kind}`);
    if (count) count.textContent = `${records.length} ${records.length === 1 ? 'item' : 'itens'}`;
    if (!records.length) {
      list.innerHTML = `<div class="empty-list">${query ? 'Nenhum cadastro fiscal corresponde à pesquisa.' : 'Nenhum cadastro fiscal ainda.'}</div>`;
      return;
    }
    list.innerHTML = records.map(record => fiscalRecordCard(kind, record)).join('');
  }

  function fiscalRecordCard(kind, record) {
    const fields = FISCAL_FIELDS[kind];
    const title = kind === 'produtos' ? record.descricao : record.nome;
    const fieldsHtml = fields.filter(field => field.key !== 'nome' && field.key !== 'descricao' && field.key !== 'gtinAusente' && ((field.key === 'gtin' && record.gtinAusente) || (record[field.key] !== '' && record[field.key] != null && record[field.key] !== false))).map(field => {
      let value = record[field.key];
      if (field.key === 'documento' && record.tipoPessoa === 'PF') value = fiscalFormatCPF(value);
      if ((field.key === 'documento' && record.tipoPessoa === 'PJ') || field.key === 'cnpj') value = fiscalFormatCNPJ(value);
      if (field.key === 'cep') value = fiscalFormatCEP(value);
      if (field.key === 'fatorConversao' || field.key === 'valorReferencia') value = String(value);
      if (field.type === 'select') value = (field.options || []).find(option => option.value === record[field.key])?.label || value;
      if (field.key === 'gtin' && record.gtinAusente) value = 'Sem GTIN/EAN';
      return `<div class="fiscal-detail-row"><span>${fEsc(field.label)}</span><strong>${fEsc(value)}</strong></div>`;
    }).join('');
    return `<article class="entity-item fiscal-entity-item"><div class="fiscal-entity-top"><div><h4 class="entity-name">${fEsc(title || 'Sem nome')}</h4><p class="fiscal-code">Código fiscal: ${fEsc(record.codigo)}</p></div>${kind === 'produtos' ? `<span class="fiscal-status ${record.situacao === 'ATIVO' ? 'active' : 'inactive'}">${record.situacao === 'ATIVO' ? 'Ativo' : 'Inativo'}</span>` : ''}</div><details class="fiscal-details"><summary>Consultar ficha completa</summary><div class="fiscal-details-grid">${fieldsHtml || '<span>Sem informações adicionais.</span>'}</div></details><div class="row-actions fiscal-actions"><button class="btn-small" type="button" data-fiscal-edit="${fEsc(record.id)}">Editar</button><button class="btn-danger" type="button" data-fiscal-delete="${fEsc(record.id)}">Excluir</button></div></article>`;
  }

  function fiscalFormatCPF(value) {
    const digits = fiscalDigits(value);
    return /^\d{11}$/.test(digits) ? `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}` : value;
  }

  function fiscalFormatCNPJ(value) {
    const text = String(value || '').replace(/[.\-/\s]/g, '').toUpperCase();
    return text.length === 14 ? `${text.slice(0,2)}.${text.slice(2,5)}.${text.slice(5,8)}/${text.slice(8,12)}-${text.slice(12)}` : value;
  }

  function fiscalFormatCEP(value) {
    const digits = fiscalDigits(value);
    return digits.length === 8 ? `${digits.slice(0,5)}-${digits.slice(5)}` : value;
  }

  async function editFiscalRecord(kind, id) {
    const record = await fiscalRequest(fiscalDB.transaction(KIND_META[kind].store, 'readonly').objectStore(KIND_META[kind].store).get(id));
    if (record) fillFiscalForm(kind, record);
  }

  async function deleteFiscalRecord(kind, id) {
    const storeName = KIND_META[kind].store;
    const record = await fiscalRequest(fiscalDB.transaction(storeName, 'readonly').objectStore(storeName).get(id));
    if (!record) return;
    const description = kind === 'produtos' ? record.descricao : record.nome;
    if (!confirm(`Excluir o cadastro fiscal “${description}”? Esta ação não pode ser desfeita.`)) return;
    await fiscalTransaction(storeName, 'readwrite', store => store.delete(id));
    const form = document.getElementById(`fiscal-form-${kind}`);
    if (form?.elements.namedItem('id')?.value === id) resetFiscalForm(kind);
    await renderFiscalList(kind);
  }

  async function loadFiscalEmitter() {
    const record = await fiscalRequest(fiscalDB.transaction(FISCAL_STORES.empresa, 'readonly').objectStore(FISCAL_STORES.empresa).get('fiscal_emitente_principal'));
    const state = document.getElementById('fiscal-company-state');
    if (state) state.textContent = record ? `Emitente salvo localmente. Última atualização: ${new Date(record.atualizadoEm).toLocaleString('pt-BR')}.` : 'Nenhum dado fiscal da empresa foi preenchido. Preencha apenas informações confirmadas; não faremos suposições.';
    const form = document.getElementById('fiscal-form-empresa');
    if (!form) return;
    resetFiscalForm('empresa');
    if (record) fillFiscalForm('empresa', record);
  }

  function setFiscalError(message) {
    const panel = document.getElementById('fiscal-pane-body');
    if (panel) panel.innerHTML = `<div class="fiscal-form-message error" role="alert">${fEsc(message)}</div><button class="btn-secondary" type="button" data-fiscal-action="hub">Voltar à Central Fiscal</button>`;
  }

  function bindFiscalUI() {
    const button = document.getElementById('btn-nfe');
    const root = document.getElementById('central-fiscal-screen');
    if (!button || !root) return;
    button.addEventListener('click', () => {
      const hub = document.getElementById('fiscal-hub');
      const pane = document.getElementById('fiscal-pane');
      hub.classList.remove('hidden');
      pane.classList.add('hidden');
      fiscalActiveKind = '';
      setFiscalScreen('central-fiscal-screen');
    });
    document.getElementById('btn-fiscal-dashboard-back')?.addEventListener('click', () => setFiscalScreen('dashboard-screen'));
    root.addEventListener('click', async event => {
      const openButton = event.target.closest('[data-fiscal-open]');
      if (openButton) {
        try { await openFiscal(openButton.dataset.fiscalOpen); }
        catch (error) { setFiscalError(error.message || 'Falha ao abrir o armazenamento fiscal.'); }
        return;
      }
      if (event.target.closest('[data-fiscal-action="hub"]')) {
        document.getElementById('fiscal-pane').classList.add('hidden');
        document.getElementById('fiscal-hub').classList.remove('hidden');
        fiscalActiveKind = '';
        return;
      }
      if (event.target.closest('[data-fiscal-action="cancel-edit"]') && fiscalActiveKind) {
        resetFiscalForm(fiscalActiveKind);
        return;
      }
      const edit = event.target.closest('[data-fiscal-edit]');
      if (edit && fiscalActiveKind) {
        try { await editFiscalRecord(fiscalActiveKind, edit.dataset.fiscalEdit); }
        catch (error) { alert(`Não foi possível consultar o cadastro fiscal: ${error.message}`); }
        return;
      }
      const remove = event.target.closest('[data-fiscal-delete]');
      if (remove && fiscalActiveKind) {
        try { await deleteFiscalRecord(fiscalActiveKind, remove.dataset.fiscalDelete); }
        catch (error) { alert(`Não foi possível excluir o cadastro fiscal: ${error.message}`); }
      }
    });
    root.addEventListener('change', event => {
      if (event.target.id === 'fiscal-clientes-tipoPessoa') fiscalUpdateDocumentControl(event.target.form);
      if (event.target.id === 'fiscal-produtos-gtinAusente') fiscalUpdateGTINControl(event.target.form);
      if (event.target.id === 'fiscal-produtos-classificacao') {
        const other = document.getElementById('fiscal-produtos-classificacaoOutra')?.closest('.field');
        if (other) other.classList.toggle('hidden', event.target.value !== 'OUTRO');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', bindFiscalUI, { once: true });
})();
