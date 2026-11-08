const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('site-escola-gabriel-odorico-planilha-agenda/site-escola-gabriel-odorico-main/script.js', 'utf8');
function setup(csv, url = 'https://docs.google.com/published.csv', failure = false) {
    const status = { textContent: '' };
    const context = vm.createContext({
        window: { ESCOLA_CONFIG: { planilhaCsvUrl: url } },
        document: { getElementById: () => null, querySelectorAll: () => [], addEventListener() {} },
        URL, AbortSignal, Date, Intl,
        fetch: async () => { if (failure) throw Error('offline'); return { ok: true, text: async () => csv }; },
    });
    vm.runInContext(source.replace(/carregarConteudoDaPlanilha\(\);\s*$/, ""), context);
    vm.runInContext(`
        filtrarNoticias = () => { resultado.noticias = noticiasDaPlanilha; };
        exibirEventos = eventos => { resultado.eventos = eventos; };
        exibirContatos = contatos => { resultado.contatos = contatos; };
    `, Object.assign(context, { resultado: {} }));
    context.document.getElementById = id => ['feedStatus', 'agendaStatus'].includes(id) ? status : null;
    return { context, status, run: () => vm.runInContext('carregarConteudoDaPlanilha()', context) };
}
async function feed(csv, url, failure) {
    const s = setup(csv, url, failure);
    await s.run();
    return s;
}
test('CSV preserves quotes, commas and multiline descriptions', () => {
    const { context } = setup('');
    assert.equal(vm.runInContext('parseCsv(\'titulo,descricao\\r\\n"Reunião","Linha 1, detalhe\\nLinha 2 ""citada"""\')[1][1]', context), 'Linha 1, detalhe\nLinha 2 "citada"');
});
test('invalid dates and unsafe links are rejected', () => {
    const { context } = setup('');
    assert.equal(vm.runInContext('dataValida("2026-02-30")', context), null);
    assert.ok(vm.runInContext('dataValida("2028-02-29")', context));
    assert.equal(vm.runInContext('linkSeguro("javascript:alert(1)")', context), '');
    assert.equal(vm.runInContext('linkSeguro("tel:+553532951349")', context), 'tel:+553532951349');
});
test('published feed separates contacts, news and upcoming valid events', async () => {
    const { context, status } = await feed('tipo,titulo,data,descricao,local,link,publicado\naviso,Visível,2026-11-01,Texto,,,sim\nnoticia,Rascunho,2026-11-02,Texto,,,nao\nevento,Inválido,2026-02-30,Texto,,,sim\nevento,Futuro,2099-12-01,Texto,Escola,,sim\ncontato,Secretaria,,Horários,,tel:+553532951349,sim');
    assert.equal(context.resultado.noticias.length, 1);
    assert.equal(context.resultado.eventos[0].titulo, 'Futuro');
    assert.equal(context.resultado.contatos[0].titulo, 'Secretaria');
    assert.match(status.textContent, /1 evento\(s\) com data inválida/);
});
test('legacy columns and accented headers remain supported', async () => {
    const { context } = await feed('\uFEFFtipo,título,data,descrição,local\nnotícia,Legado,2026-11-01,Texto,');
    assert.equal(context.resultado.noticias[0].titulo, 'Legado');
});
test('empty publication clears content with an empty result', async () => {
    const { context } = await feed('tipo,titulo,descricao,publicado\naviso,Oculto,Texto,nao');
    assert.equal(context.resultado.noticias.length, 0);
    assert.equal(context.resultado.eventos.length, 0);
});
test('network errors preserve existing content', async () => {
    const { context, status } = await feed('', undefined, true);
    assert.deepEqual(context.resultado, {});
    assert.match(status.textContent, /conteúdo atual foi mantido/);
});
test('wrong CSV schema preserves existing content', async () => {
    const { context, status } = await feed('<html>Login Google</html>');
    assert.deepEqual(context.resultado, {});
    assert.match(status.textContent, /colunas tipo, titulo e descricao/);
});
test('non HTTPS feed is refused', async () => {
    const { status } = await feed('', 'http://example.com/feed.csv');
    assert.match(status.textContent, /precisa usar HTTPS/);
});
