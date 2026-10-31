# Registro do projeto no GitHub

Data de preparação: 31/10/2026. Repositório indicado pelo responsável: https://github.com/Projeto-Integrador-grupo2/Tutoria-digital-personalizada.

## Conteúdo

Código-fonte da interface Apps Script e do backend Supabase/Groq, migrações PostgreSQL, testes, workflow de integração contínua, manual de uso e documentação técnica/acadêmica. Versão da candidata: 1.2.0-rc.1; interface: google-pkce-r1.

## Estado do piloto

O responsável realizou e confirmou no atendimento: entrada Google com duas contas, resposta contextual do tutor, recuperação do histórico, histórico vazio na segunda conta, resumo de autoavaliação e confirmação de avaliação. A nova conta do projeto foi confirmada como proprietária no Drive e Google Cloud e como Owner no Supabase. O uso da nova chave Groq foi confirmado no painel e a tutoria respondeu após revogar a chave antiga.

Esses relatos são verificações funcionais do piloto, não estudo de eficácia educacional nem auditoria completa de segurança. Revisão pedagógica multidisciplinar, teste no celular e demais verificações de acessibilidade continuam no plano de validação.

O público OAuth permanece Externo/Testando com somente openid, e-mail e perfil. O Google prevê exceção de acesso à lista de usuários de teste para esses escopos; não declarar o app como marca verificada ou Em produção. O requisito acadêmico de framework web continua a exigir comprovação pelo grupo.

## Publicação e rastreabilidade

O commit e seu hash serão a referência da entrega. O workflow em .github/workflows/tests.yml executa verificação de tipos, testes locais e API simulada; só declarar aprovação no GitHub após consultar a execução remota. A preparação local não equivale a push concluído. Não gerar retrospectivamente commits em nome dos integrantes para simular evolução do projeto.

Segredos, arquivos .env, dependências instaladas, ZIPs de distribuição e capturas locais de conversas de teste estão excluídos do envio pelo .gitignore. Identificadores públicos de implantação podem aparecer na documentação; não são credenciais. As prévias visuais de desenvolvimento não contêm contas ou conversas reais.

Não foi escolhida uma licença de código aberto pelo grupo nesta etapa; publicar o repositório não atribui automaticamente uma licença. Identificar corretamente a autoria de futuras contribuições e manter a administração do projeto sob a conta definida pelo grupo.
