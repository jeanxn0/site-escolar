# Escola Estadual Gabriel Odorico

Site estático com início, sobre, atividades, notícias, calendário e contatos.

A proposta nesta branch não foi publicada. Os eventos da planilha alimentam o calendário do próprio site; não há integração com Google Agenda.

## Configuração

O site está em `site-escola-gabriel-odorico-planilha-agenda/site-escola-gabriel-odorico-main/`.

1. Importe `modelo-planilha-escola.csv` no Google Planilhas e substitua os exemplos.
2. Publique apenas a aba de conteúdo em CSV. Todos os dados publicados ficam públicos, inclusive linhas marcadas como não exibidas.
3. Configure `planilhaCsvUrl` em `config.js`.
4. Leia `COMO_CONECTAR_PLANILHA.txt` para os campos, formatos e instruções completas.

A página Contatos conserva o e-mail institucional já informado no projeto. Uma nova conta Gmail ainda não foi criada. O responsável deverá escolher o endereço e concluir a configuração e verificação do Google. Não coloque senhas no código.

Sem a URL real do CSV, o site conserva seu conteúdo estático. Com o CSV configurado, os tipos `noticia`, `aviso`, `evento` e `contato` alimentam as respectivas páginas. A coluna `publicado` controla a exibição; não protege dados privados. Os eventos aparecem por mês no calendário e os próximos quatro na página inicial.

## Verificação

Execute `node --test tests/feed.test.cjs` na raiz para verificar a leitura do CSV, compatibilidade com o modelo antigo, publicação, datas inválidas, contatos, links e falhas de rede.

A prévia foi inspecionada em desktop e em um quadro de 390 px para a página Contatos. O menu móvel e a navegação entre meses foram verificados. A conexão com uma planilha real depende do link publicado fornecido pela escola.
