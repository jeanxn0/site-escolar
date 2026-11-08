// Cole aqui o link CSV publicado da aba Conteudos no Google Planilhas.
const GOOGLE_SHEETS_CSV_URL = window.ESCOLA_CONFIG?.planilhaCsvUrl || "";
let eventosDaPlanilha = [];
let noticiasDaPlanilha = [];
let projetosDaPlanilha = [];
let limparCarrosseisProjetos = [];
let conteudoCarregado = false;

const menuMobile = document.getElementById("menuMobile");
const menu = document.getElementById("menu");

if (menuMobile && menu) {
    menuMobile.addEventListener("click", function () {
        const aberto = menu.classList.toggle("aberto");
        menuMobile.setAttribute("aria-expanded", String(aberto));
        menuMobile.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    });
}

document.querySelectorAll(".menu a").forEach(function (link) {
    link.addEventListener("click", function () {
        if (menu && menuMobile) {
            menu.classList.remove("aberto");
            menuMobile.setAttribute("aria-expanded", "false");
            menuMobile.setAttribute("aria-label", "Abrir menu");
        }
    });
});

function configurarAcessibilidade() {
    const painel = document.getElementById("preferenciasAcessibilidade");
    if (!painel) return;
    const chave = "escolaGOAcessibilidadeV2";
    const padrao = { escala: 1, contraste: false, cores: false, movimento: false, espaco: false, links: false };
    const controles = [
        ["altoContraste", "contraste", "alto-contraste", "Alto contraste"],
        ["coresAcessiveis", "cores", "cores-acessiveis", "Cores alternativas"],
        ["reduzirAnimacoes", "movimento", "reduzir-animacoes", "Reduzir movimentos"],
        ["espacarTexto", "espaco", "texto-espacado", "Mais espaço no texto"],
        ["destacarLinks", "links", "links-destacados", "Destacar links"]
    ];
    let preferencias = { ...padrao };
    try {
        const salvas = JSON.parse(localStorage.getItem(chave) || "null");
        if (salvas && typeof salvas === "object") {
            if (Number.isFinite(salvas.escala)) preferencias.escala = Math.min(2, Math.max(1, salvas.escala));
            controles.forEach(([,campo]) => { preferencias[campo] = salvas[campo] === true; });
        }
    } catch { /* As opções continuam funcionando sem armazenamento local. */ }
    const status = document.getElementById("statusAcessibilidade");
    function aplicar(mensagem, salvar = true) {
        document.documentElement.style.setProperty("--escala-texto", preferencias.escala);
        document.body.classList.toggle("texto-ampliado", preferencias.escala > 1.2);
        controles.forEach(([id, campo, classe]) => {
            document.body.classList.toggle(classe, preferencias[campo]);
            document.getElementById(id)?.setAttribute("aria-pressed", String(preferencias[campo]));
        });
        const medida = document.getElementById("escalaFonte");
        if (medida) medida.textContent = `${Math.round(preferencias.escala * 100)}%`;
        document.getElementById("diminuirFonte").disabled = preferencias.escala <= 1;
        document.getElementById("aumentarFonte").disabled = preferencias.escala >= 2;
        let lembrete = "";
        if (salvar) {
            try { localStorage.setItem(chave, JSON.stringify(preferencias)); }
            catch { lembrete = " Preferência aplicada apenas nesta página; o navegador não permitiu salvar."; }
        }
        if (status && mensagem) status.textContent = mensagem + lembrete;
    }
    function alterarFonte(delta) {
        preferencias.escala = Math.round(Math.min(2, Math.max(1, preferencias.escala + delta)) * 10) / 10;
        aplicar(`Texto em ${Math.round(preferencias.escala * 100)}%.`);
    }
    document.getElementById("aumentarFonte")?.addEventListener("click", () => alterarFonte(0.1));
    document.getElementById("diminuirFonte")?.addEventListener("click", () => alterarFonte(-0.1));
    document.getElementById("restaurarFonte")?.addEventListener("click", () => { preferencias.escala = 1; aplicar("Texto em 100%."); });
    controles.forEach(([id,campo,,nome]) => document.getElementById(id)?.addEventListener("click", () => {
        preferencias[campo] = !preferencias[campo];
        aplicar(`${nome}: ${preferencias[campo] ? "ativado" : "desativado"}.`);
    }));
    document.getElementById("restaurarPreferencias")?.addEventListener("click", () => {
        preferencias = { ...padrao }; aplicar("Preferências restauradas.");
    });
    painel.addEventListener("keydown", event => {
        if (event.key === "Escape") { painel.open = false; painel.querySelector("summary").focus(); }
    });
    aplicar("", false);
}
configurarAcessibilidade();

function configurarCarrosselNoticias() {
    const lista = document.getElementById("carrosselNoticias");
    const anterior = document.getElementById("noticiaAnterior");
    const proxima = document.getElementById("proximaNoticia");
    const posicao = document.getElementById("posicaoCarrossel");

    if (!lista || !anterior || !proxima || !posicao) return;

    function atualizarControles() {
        const cards = Array.from(lista.querySelectorAll(".noticia"));
        const total = cards.length;
        const passo = cards[0]
            ? cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(lista).gap || "0")
            : 0;
        const gap = parseFloat(getComputedStyle(lista).gap || "0");
        const visiveis = passo > 0 ? Math.max(1, Math.floor((lista.clientWidth + gap) / passo)) : total;
        const maximo = Math.max(0, lista.scrollWidth - lista.clientWidth);
        const inicio = total && passo > 0
            ? Math.min(total - visiveis, Math.round(lista.scrollLeft / passo))
            : 0;
        const fim = Math.min(total, inicio + visiveis);

        anterior.disabled = lista.scrollLeft <= 1;
        proxima.disabled = lista.scrollLeft >= maximo - 1;
        posicao.textContent = total
            ? `${inicio + 1}–${fim} de ${total} ${total === 1 ? "notícia" : "notícias"}`
            : "Nenhuma notícia disponível";
    }

    function rolar(direcao) {
        const primeiroCard = lista.firstElementChild;
        if (!primeiroCard) return;
        const passo = primeiroCard.getBoundingClientRect().width + parseFloat(getComputedStyle(lista).gap || "0");
        const movimentoReduzido = document.body.classList.contains("reduzir-animacoes")
            || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        lista.scrollBy({
            left: direcao * passo,
            behavior: movimentoReduzido ? "auto" : "smooth"
        });
    }

    anterior.addEventListener("click", function () {
        rolar(-1);
    });

    proxima.addEventListener("click", function () {
        rolar(1);
    });

    lista.addEventListener("scroll", atualizarControles, { passive: true });
    window.addEventListener("resize", atualizarControles);
    atualizarControles();
}

function parseCsv(texto) {
    const linhas = [];
    let linha = [];
    let campo = "";
    let entreAspas = false;

    for (let i = 0; i < texto.length; i += 1) {
        const caractere = texto[i];

        if (entreAspas) {
            if (caractere === '"' && texto[i + 1] === '"') {
                campo += '"';
                i += 1;
            } else if (caractere === '"') {
                entreAspas = false;
            } else {
                campo += caractere;
            }
        } else if (caractere === '"' && campo.length === 0) {
            entreAspas = true;
        } else if (caractere === ",") {
            linha.push(campo.trim());
            campo = "";
        } else if (caractere === "\n" || caractere === "\r") {
            linha.push(campo.trim());
            linhas.push(linha);
            linha = [];
            campo = "";
            if (caractere === "\r" && texto[i + 1] === "\n") i += 1;
        } else {
            campo += caractere;
        }
    }

    if (campo.length > 0 || linha.length > 0) {
        linha.push(campo.trim());
        linhas.push(linha);
    }

    return linhas;
}

function dataValida(valor) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (!partes) return null;
    const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]), 12);
    return data.getFullYear() === Number(partes[1]) && data.getMonth() === Number(partes[2]) - 1
        && data.getDate() === Number(partes[3]) ? data : null;
}

function formatarData(valor) {
    const data = dataValida(valor);
    return data ? data.toLocaleDateString("pt-BR") : valor;
}

function linkSeguro(valor) {
    try {
        const url = new URL(valor);
        return ["https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
}

function criarTexto(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    elemento.textContent = texto;
    return elemento;
}

function exibirNoticias(noticias) {
    const lista = document.querySelector(".noticias");
    if (!lista) return;

    lista.replaceChildren();
    if (!noticias.length) lista.append(criarTexto("p", "estado-vazio", "Nenhum comunicado encontrado."));
    noticias.forEach(function (noticia) {
        const artigo = criarTexto("article", "noticia", "");
        let imagem;
        if (lista.id === "carrosselNoticias") {
            imagem = document.createElement("img");
            imagem.src = "Foto.png";
            imagem.alt = "";
            imagem.className = "imagem-noticia";
        } else {
            imagem = criarTexto("div", "imagem-placeholder", "");
            imagem.setAttribute("aria-hidden", "true");
        }

        const conteudo = criarTexto("div", "noticia-conteudo", "");
        conteudo.append(
            criarTexto("small", "etiqueta", `${noticia.tipo === "aviso" ? "Aviso" : "Notícia"} · ${formatarData(noticia.data) || "Comunicado"}`),
            criarTexto("h3", "", noticia.titulo),
            criarTexto("p", "", noticia.descricao)
        );
        if (noticia.link && linkSeguro(noticia.link)) {
            const link = criarTexto("a", "", "Saiba mais →");
            link.href = linkSeguro(noticia.link);
            conteudo.append(link);
        }
        artigo.append(imagem, conteudo);
        lista.append(artigo);
    });
    if (lista.id === "carrosselNoticias") {
        lista.scrollLeft = 0;
        lista.dispatchEvent(new Event("scroll"));
    }
}

function exibirEventos(eventos) {
    const lista = document.getElementById("listaEventosEscola") || document.querySelector(".eventos");
    if (!lista) return;

    lista.querySelectorAll(".evento").forEach(function (evento) {
        evento.remove();
    });

    lista.querySelectorAll(".estado-vazio").forEach(item => item.remove());
    if (!eventos.length) lista.append(criarTexto("p", "estado-vazio", "Nenhum evento neste período."));
    eventos.forEach(function (evento) {
        const item = criarTexto("div", "evento", "");
        const data = criarTexto("div", "data", "");
        data.append(
            criarTexto("strong", "", dataValida(evento.data)?.getDate() || "•"),
            criarTexto("span", "", dataValida(evento.data)?.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase() || "EVENTO")
        );

        const conteudo = document.createElement("div");
        conteudo.append(
            criarTexto("h3", "", evento.titulo),
            criarTexto(
                "p",
                "",
                [formatarData(evento.data), evento.descricao, evento.local].filter(Boolean).join(" - ")
            )
        );
        item.append(data, conteudo);
        lista.insertBefore(item, lista.querySelector(":scope > .botao"));
    });
}

function configurarCalendario() {
    const grade = document.getElementById("gradeCalendario");
    const titulo = document.getElementById("tituloCalendario");
    const listaFeriados = document.getElementById("listaFeriados");
    const semFeriados = document.getElementById("semFeriados");
    const tituloFeriados = document.getElementById("tituloFeriados");
    const botaoAnterior = document.getElementById("mesAnterior");
    const botaoProximo = document.getElementById("mesProximo");

    if (!grade || !titulo || !listaFeriados || !semFeriados || !tituloFeriados) return;

    const feriados = [
        { data: "2026-01-01", nome: "Confraternização Universal" },
        { data: "2026-04-03", nome: "Sexta-feira Santa" },
        { data: "2026-04-21", nome: "Tiradentes" },
        { data: "2026-05-01", nome: "Dia do Trabalho" },
        { data: "2026-09-07", nome: "Independência do Brasil" },
        { data: "2026-10-12", nome: "Nossa Senhora Aparecida" },
        { data: "2026-11-02", nome: "Finados" },
        { data: "2026-11-15", nome: "Proclamação da República" },
        { data: "2026-11-20", nome: "Dia Nacional de Zumbi e da Consciência Negra" },
        { data: "2026-12-25", nome: "Natal" }
    ];
    const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
    const nomeData = new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    let mesAtual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    function renderizar() {
        const ano = mesAtual.getFullYear();
        const mes = mesAtual.getMonth();
        const primeiroDia = new Date(ano, mes, 1).getDay();
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const feriadosDoMes = feriados.filter(function (feriado) {
            const data = new Date(`${feriado.data}T12:00:00`);
            return data.getFullYear() === ano && data.getMonth() === mes;
        });

        titulo.textContent = nomeMes.format(mesAtual);
        tituloFeriados.textContent = `Feriados em ${nomeMes.format(mesAtual)}`;
        grade.replaceChildren();
        listaFeriados.replaceChildren();

        for (let espaco = 0; espaco < primeiroDia; espaco += 1) {
            const celulaVazia = criarTexto("div", "dia-calendario vazio", "");
            celulaVazia.setAttribute("aria-hidden", "true");
            grade.append(celulaVazia);
        }

        const eventosDoMes = eventosDaPlanilha.filter(evento => {
            const data = dataValida(evento.data);
            return data && data.getFullYear() === ano && data.getMonth() === mes;
        });

        if (conteudoCarregado) exibirEventos(eventosDoMes);
        for (let dia = 1; dia <= diasNoMes; dia += 1) {
            const feriado = feriadosDoMes.find(function (item) {
                return Number(item.data.slice(8, 10)) === dia;
            });
            const celula = criarTexto(
                "div",
                `dia-calendario${feriado ? " feriado" : ""}`,
                String(dia)
            );
            celula.setAttribute("role", "listitem");
            const hoje = new Date();
            if (dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()) {
                celula.classList.add("dia-hoje");
                celula.setAttribute("aria-current", "date");
            }
            celula.setAttribute(
                "aria-label",
                feriado
                    ? `${nomeData.format(new Date(ano, mes, dia))}: ${feriado.nome}, feriado nacional`
                    : nomeData.format(new Date(ano, mes, dia))
            );
            if (feriado) {
                celula.append(criarTexto("span", "marcador-feriado", ""));
            }
            const eventosDia = eventosDoMes.filter(evento => Number(evento.data.slice(8, 10)) === dia);
            if (eventosDia.length) {
                celula.classList.add("dia-com-evento");
                celula.title = eventosDia.map(evento => evento.titulo).join("; ");
                celula.setAttribute("aria-label", `${celula.getAttribute("aria-label")}; ${eventosDia.map(evento => evento.titulo).join(", ")}`);
                celula.append(criarTexto("span", "marcador-evento", "•"));
            }
            grade.append(celula);
        }

        feriadosDoMes.forEach(function (feriado) {
            const data = new Date(`${feriado.data}T12:00:00`);
            const item = criarTexto("article", "feriado-mes", "");
            item.append(
                criarTexto("strong", "", `${data.getDate()} de ${new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(data)} — ${feriado.nome}`),
                criarTexto("p", "", "Feriado nacional.")
            );
            listaFeriados.append(item);
        });

        semFeriados.hidden = feriadosDoMes.length > 0;
    }

    botaoAnterior?.addEventListener("click", function () {
        mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1);
        renderizar();
    });
    botaoProximo?.addEventListener("click", function () {
        mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1);
        renderizar();
    });

    renderizar();
    return renderizar;
}

const atualizarCalendario = configurarCalendario();

async function carregarConteudoDaPlanilha() {
    const statusNoticias = document.getElementById("feedStatus");
    const statusAgenda = document.getElementById("agendaStatus");
    const statusProjetos = document.getElementById("projetosStatus");

    if (!GOOGLE_SHEETS_CSV_URL) return;
    if (statusNoticias) statusNoticias.textContent = "Carregando comunicados…";
    if (statusAgenda) statusAgenda.textContent = "Carregando agenda…";
    if (statusProjetos) statusProjetos.textContent = "Carregando projetos…";

    try {
        const url = new URL(GOOGLE_SHEETS_CSV_URL);
        if (url.protocol !== "https:") {
            throw new Error("A URL da planilha precisa usar HTTPS.");
        }

        const resposta = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!resposta.ok) {
            throw new Error(`A planilha respondeu com status ${resposta.status}.`);
        }

        const linhas = parseCsv((await resposta.text()).replace(/^\uFEFF/, ""));
        const normalizar = (valor) => valor
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
        const cabecalhos = linhas.shift()?.map(normalizar) || [];
        const indices = {
            tipo: cabecalhos.indexOf("tipo"),
            titulo: cabecalhos.indexOf("titulo"),
            data: cabecalhos.indexOf("data"),
            descricao: cabecalhos.indexOf("descricao"),
            local: cabecalhos.indexOf("local"),
            link: cabecalhos.indexOf("link"),
            publicado: cabecalhos.indexOf("publicado"),
            fotos: cabecalhos.indexOf("fotos"),
            textoFotos: cabecalhos.indexOf("texto_fotos")
        };

        if (indices.tipo < 0 || indices.titulo < 0 || indices.descricao < 0) {
            throw new Error("A planilha precisa ter as colunas tipo, titulo e descricao.");
        }

        const registros = linhas
            .filter((linha) => linha.some(Boolean))
            .map((linha) => ({
                tipo: normalizar(linha[indices.tipo] || ""),
                titulo: linha[indices.titulo] || "",
                data: indices.data >= 0 ? linha[indices.data] || "" : "",
                descricao: linha[indices.descricao] || "",
                local: indices.local >= 0 ? linha[indices.local] || "" : "",
                link: indices.link >= 0 ? linha[indices.link] || "" : "",
                publicado: indices.publicado >= 0 ? normalizar(linha[indices.publicado] || "") : "sim",
                fotos: indices.fotos >= 0 ? linha[indices.fotos] || "" : "",
                textoFotos: indices.textoFotos >= 0 ? linha[indices.textoFotos] || "" : ""
            }))
            .filter((registro) => registro.titulo && ["sim", "true", "1"].includes(registro.publicado));

        const noticias = registros.filter((registro) =>
            ["noticia", "aviso"].includes(registro.tipo)
        );
        const eventosInvalidos = registros.filter(registro => registro.tipo === "evento" && !dataValida(registro.data)).length;
        const eventos = registros.filter((registro) => registro.tipo === "evento" && dataValida(registro.data))
            .sort((a, b) => a.data.localeCompare(b.data));
        noticias.sort((a, b) => b.data.localeCompare(a.data));
        conteudoCarregado = true;
        noticiasDaPlanilha = noticias;
        document.querySelectorAll(".filtros-noticias input, .filtros-noticias select").forEach(campo => campo.disabled = false);
        filtrarNoticias();
        exibirContatos(registros.filter(registro => registro.tipo === "contato"));

        projetosDaPlanilha = registros.filter(registro => registro.tipo === "projeto")
            .sort((a,b) => b.data.localeCompare(a.data));
        filtrarProjetos();
        const campoProjetos = document.getElementById("buscaProjetos");
        if (campoProjetos) campoProjetos.disabled = false;
        if (statusProjetos) statusProjetos.textContent = "Projetos atualizados pela planilha da escola.";
        eventosDaPlanilha = eventos;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        exibirEventos(document.getElementById("gradeCalendario") ? eventos : eventos.filter(evento => dataValida(evento.data) >= hoje).slice(0, 4));
        if (atualizarCalendario) atualizarCalendario();
        if (statusNoticias) statusNoticias.textContent = "Conteúdo atualizado pela planilha da escola.";
        if (statusAgenda) statusAgenda.textContent = `Agenda atualizada pela planilha.${eventosInvalidos ? ` ${eventosInvalidos} evento(s) com data inválida não foram exibidos.` : ""} No calendário, os eventos são filtrados por mês.`;
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido.";
        const aviso = `Não foi possível atualizar o conteúdo: ${mensagem} O conteúdo atual foi mantido.`;
        if (statusNoticias) statusNoticias.textContent = aviso;
        if (statusAgenda) statusAgenda.textContent = aviso;
        if (statusProjetos) statusProjetos.textContent = aviso;
    }
}

function filtrarNoticias() {
    const busca = (document.getElementById("buscaNoticias")?.value || "").toLocaleLowerCase("pt-BR");
    const tipo = document.getElementById("tipoNoticia")?.value || "";
    exibirNoticias(noticiasDaPlanilha.filter(item => (!tipo || item.tipo === tipo)
        && `${item.titulo} ${item.descricao}`.toLocaleLowerCase("pt-BR").includes(busca)));
}

function exibirContatos(contatos) {
    const lista = document.getElementById("contatosExtras");
    if (!lista) return;
    lista.replaceChildren();
    contatos.forEach(contato => {
        const card = criarTexto("article", "contato-card", "");
        card.append(criarTexto("h3", "", contato.titulo), criarTexto("p", "", contato.descricao));
        const href = linkSeguro(contato.link);
        if (href) {
            const link = criarTexto("a", "", `Acessar ${contato.titulo} →`);
            link.href = href;
            card.append(link);
        }
        lista.append(card);
    });
}

function urlImagemSegura(valor) {
    try {
        const url = new URL(valor);
        return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
}

function fotosDoProjeto(projeto) {
    const descricoes = (projeto.textoFotos || "").split(/\r?\n/);
    const vistas = new Set();
    return (projeto.fotos || "").split(/\r?\n/)
        .map((url,indice) => ({ url: urlImagemSegura(url.trim()), alt: descricoes[indice]?.trim() || `Registro do projeto ${projeto.titulo}, foto ${indice + 1}.` }))
        .filter(foto => {
            if (!foto.url || vistas.has(foto.url)) return false;
            const host = new URL(foto.url).hostname;
            if (["drive.google.com", "photos.google.com", "photos.app.goo.gl"].includes(host)) return false;
            vistas.add(foto.url); return true;
        });
}

function criarFotoProjeto(foto) {
    const figura = document.createElement("figure");
    const link = criarTexto("a", "foto-projeto-link", "");
    link.href = foto.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Ampliar foto em nova aba: ${foto.alt}`);
    const imagem = document.createElement("img");
    imagem.src = foto.url;
    imagem.alt = foto.alt;
    imagem.loading = "lazy";
    imagem.decoding = "async";
    imagem.referrerPolicy = "no-referrer";
    imagem.addEventListener("error", () => {
        figura.replaceChildren(criarTexto("p", "foto-indisponivel", "Foto indisponível. Consulte o álbum do projeto, se houver."));
    }, { once: true });
    link.append(imagem);
    figura.append(link);
    return figura;
}

function criarCarrosselProjeto(fotos, titulo) {
    const grupo = criarTexto("div", "carrossel-projeto", "");
    grupo.setAttribute("role", "group");
    grupo.setAttribute("aria-label", `Fotos de ${titulo}`);
    const slides = criarTexto("div", "slides-projeto", "");
    slides.tabIndex = 0;
    slides.setAttribute("aria-label", `Fotos de ${titulo}. Use as setas esquerda e direita para navegar.`);
    fotos.forEach((foto, indice) => {
        const figura = criarFotoProjeto(foto);
        figura.setAttribute("role", "group");
        figura.setAttribute("aria-label", `Foto ${indice + 1} de ${fotos.length}`);
        slides.append(figura);
    });
    grupo.append(slides);
    if (fotos.length <= 1) return grupo;
    const controles = criarTexto("div", "controles-projeto", "");
    const anterior = criarTexto("button", "", "←");
    const proxima = criarTexto("button", "", "→");
    [anterior,proxima].forEach(botao => botao.type = "button");
    anterior.setAttribute("aria-label", `Foto anterior de ${titulo}`);
    proxima.setAttribute("aria-label", `Próxima foto de ${titulo}`);
    const posicao = criarTexto("span", "", `1 de ${fotos.length} fotos`);
    posicao.setAttribute("role", "status");
    posicao.setAttribute("aria-live", "polite");
    function atualizar() {
        const largura = slides.clientWidth;
        const indice = largura > 0 ? Math.max(0, Math.min(fotos.length - 1, Math.round(slides.scrollLeft / largura))) : 0;
        anterior.disabled = indice === 0;
        proxima.disabled = indice === fotos.length - 1;
        posicao.textContent = `${indice + 1} de ${fotos.length} fotos`;
    }
    function irPara(indice) {
        const reduzido = document.body.classList.contains("reduzir-animacoes")
            || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        slides.scrollTo({left:Math.max(0,Math.min(fotos.length - 1,indice)) * slides.clientWidth, behavior:reduzido ? "auto" : "smooth"});
    }
    function avancar(delta) { irPara(Math.round(slides.scrollLeft / (slides.clientWidth || 1)) + delta); }
    anterior.addEventListener("click", () => avancar(-1));
    proxima.addEventListener("click", () => avancar(1));
    slides.addEventListener("scroll", atualizar, {passive:true});
    slides.addEventListener("keydown", event => {
        if (event.target !== slides || !["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Home") irPara(0);
        else if (event.key === "End") irPara(fotos.length - 1);
        else avancar(event.key === "ArrowRight" ? 1 : -1);
    });
    window.addEventListener("resize", atualizar);
    limparCarrosseisProjetos.push(() => window.removeEventListener("resize", atualizar));
    anterior.disabled = true;
    controles.append(anterior,posicao,proxima);
    grupo.append(controles);
    return grupo;
}

function exibirProjetos(projetos) {
    const lista = document.getElementById("listaProjetos");
    if (!lista) return;
    limparCarrosseisProjetos.forEach(limpar => limpar());
    limparCarrosseisProjetos = [];
    lista.replaceChildren();
    const contador = document.getElementById("resultadoProjetos");
    if (contador) contador.textContent = `${projetos.length} ${projetos.length === 1 ? "projeto encontrado" : "projetos encontrados"}`;
    if (!projetos.length) lista.append(criarTexto("p", "estado-vazio", "Nenhum projeto encontrado. Novos registros serão compartilhados em breve."));
    projetos.forEach(projeto => {
        const card = criarTexto("article", "card-projeto", "");
        const fotos = fotosDoProjeto(projeto);
        if (fotos.length) card.append(criarCarrosselProjeto(fotos,projeto.titulo));
        const conteudo = criarTexto("div", "conteudo-projeto", "");
        conteudo.append(criarTexto("small", "etiqueta", ["Projeto escolar", formatarData(projeto.data), projeto.local].filter(Boolean).join(" · ")),
            criarTexto("h3", "", projeto.titulo), criarTexto("p", "", projeto.descricao));
        const album = urlImagemSegura(projeto.link || "");
        if (album) {
            const link = criarTexto("a", "link-album", "Abrir álbum ou página do projeto ↗");
            link.href = album; link.target = "_blank"; link.rel = "noopener noreferrer";
            conteudo.append(link);
        }
        card.append(conteudo); lista.append(card);
    });
}

function filtrarProjetos() {
    const busca = (document.getElementById("buscaProjetos")?.value || "").toLocaleLowerCase("pt-BR");
    exibirProjetos(projetosDaPlanilha.filter(projeto => `${projeto.titulo} ${projeto.descricao} ${projeto.local}`.toLocaleLowerCase("pt-BR").includes(busca)));
}
document.getElementById("buscaProjetos")?.addEventListener("input", filtrarProjetos);

document.getElementById("buscaNoticias")?.addEventListener("input", filtrarNoticias);
document.getElementById("tipoNoticia")?.addEventListener("change", filtrarNoticias);
menuMobile?.setAttribute("aria-controls", "menu");
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menu?.classList.contains("aberto")) {
        menu.classList.remove("aberto");
        menuMobile.setAttribute("aria-expanded", "false");
        menuMobile.setAttribute("aria-label", "Abrir menu");
        menuMobile.focus();
    }
});
document.querySelector(".pular-conteudo")?.addEventListener("click", () => document.getElementById("conteudo")?.focus());
configurarCarrosselNoticias();
carregarConteudoDaPlanilha();
