# Escola Estadual Gabriel Odorico

Site estático com início, sobre, atividades, notícias, calendário e contatos.

A proposta nesta branch não foi publicada. Os eventos da planilha alimentam o calendário do próprio site; não há integração com Google Agenda.

## Configuração

O site está em `site-escola-gabriel-odorico-planilha-agenda/site-escola-gabriel-odorico-main/`.

1. Importe `modelo-planilha-escola.csv` no Google Planilhas e substitua os exemplos.
2. Publique apenas a aba de conteúdo em CSV. Todos os dados publicados ficam públicos, inclusive linhas marcadas como não exibidas.
3. Configure `planilhaCsvUrl` em `config.js`.
4. Leia `COMO_CONECTAR_PLANILHA.txt` para os campos, formatos e instruções completas.

A página Contatos conserva o e-mail institucional já informado no projeto. A conta Google conectada administra a planilha, sem substituir os contatos públicos da escola. Não coloque senhas no código.

A URL da aba Conteudos está configurada em config.js e sua leitura pública em CSV foi verificada. Os quatro exemplos estão marcados como nao; substitua-os antes de exibir conteúdos reais. Em falhas de leitura, o site conserva seu conteúdo estático. Com o CSV configurado, os tipos `noticia`, `aviso`, `evento` e `contato` alimentam as respectivas páginas. A coluna `publicado` controla a exibição; não protege dados privados. Os eventos aparecem por mês no calendário e os próximos quatro na página inicial.

## Verificação

Execute `node --test tests/feed.test.cjs` na raiz para verificar a leitura do CSV, compatibilidade com o modelo antigo, publicação, datas inválidas, contatos, links e falhas de rede.

A prévia foi inspecionada em desktop e em um quadro de 390 px para a página Contatos. O menu móvel e a navegação entre meses foram verificados. A leitura da planilha real foi verificada: cabeçalhos corretos, quatro exemplos ocultos e acesso público ao CSV funcionando. O site continua em proposta, sem implantação.
