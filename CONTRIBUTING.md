# Contribuir com o Tutor Digital

Repositório: https://github.com/Projeto-Integrador-grupo2/Tutoria-digital-personalizada.

Use sua própria identidade Git para registrar contribuições. A conta administrativa compartilhada do projeto não deve substituir a autoria individual dos integrantes. O primeiro envio representa a consolidação dos arquivos existentes, não um histórico reconstruído de desenvolvimento.

1. Crie uma branch a partir da principal, por exemplo `feat/descricao-curta` ou `fix/descricao-curta`.
2. Faça a alteração e atualize a documentação correspondente.
3. Em backend, execute `npm ci`, `npm run check`, `npm test` e `npm run test:api`.
4. Revise o diff para impedir inclusão de credenciais, arquivos .env, dados de estudantes ou capturas de URLs com códigos de login.
5. Faça commit com descrição objetiva e abra pull request explicando problema, mudança e validação.

O workflow do GitHub valida código e contratos simulados; não altera Apps Script, banco ou Edge Functions de produção. Implantar requer o procedimento documentado e validação no ambiente remoto. Não reaplique SQL de instalação em banco já utilizado.

Leia [segurança](SECURITY.md), [arquitetura](backend/docs/ARQUITETURA.md) e [limites da candidata](docs/VALIDACAO_RC.md). Consulte `docs/LOGIN_GOOGLE.md` e `backend/deployment.target.json` para configuração vigente; documentos cronológicos podem conter URLs e estratégias substituídas.
