# Acesso com Google

Estratégia escolhida em 31/10/2026: o estudante entra ou cria o acesso usando sua conta Google, sem aprovação administrativa e sem SMTP. Substitui a proposta de cadastro por senha e código enviado por e-mail. O Google pode solicitar suas próprias verificações de segurança.

## 1. Credenciais no Google Cloud

No Google Cloud Console, criar ou selecionar um projeto para o Tutor Digital. Não é necessário habilitar faturamento para configurar este login. Em Google Auth Platform, configurar Branding, Audience e Data Access. Solicitar somente `openid`, `userinfo.email` e `userinfo.profile`; não solicitar acesso a Gmail, Drive ou outros dados.

O público atual é Externo e o status do OAuth é Testando. Com somente `openid`, e-mail e perfil, o Google prevê exceção à lista de usuários de teste e à expiração de autorização em sete dias. Não exigir aprovação manual de alunos nem contratar domínio apenas para continuar esse piloto. Essa exceção depende dos escopos efetivamente solicitados: adicionar outras permissões muda os requisitos. Ela não significa marca verificada ou status Em produção. A configuração do Apps Script e as restrições de contas institucionais são independentes. Referência: [Gerenciar público OAuth](https://support.google.com/cloud/answer/15549945?hl=en).

Em Clients, criar cliente do tipo Web application. Para este fluxo por redirecionamento, adicionar como Authorized redirect URI:

`https://bkaimbscytfurykpinzm.supabase.co/auth/v1/callback`

O retorno registrado no Google é o callback do Supabase, não a URL do Apps Script. Guardar Client ID e Client Secret para preenchimento direto no Supabase. Não enviar o segredo no chat nem incluí-lo nos arquivos do aplicativo.

## 2. Supabase Auth

Em Authentication → Sign In / Providers → Google, ativar o provedor e preencher Client ID e Client Secret. Manter a validação de nonce e de e-mail nas opções padrão seguras; não habilitar permissões para e-mails não verificados. Manter autenticação anônima desligada e permitir criação de novos usuários para admitir o primeiro acesso por Google.

Se o antigo Before User Created com lista de aprovação estiver ativo, desativá-lo ou aplicar a atualização 08 que remove a lista. Não instalar os passos antigos 06/07. Não alterar RLS nem o isolamento do histórico.

Em URL Configuration, cadastrar como Site URL a URL publicada atual do Apps Script, terminada em `/exec`. Em Redirect URLs, permitir essa mesma URL com o padrão de ticket. Para a implantação atual:

`https://script.google.com/macros/s/AKfycbygPMxPsRuyfGqUQYGlsNu8964WkWgr6m0zsHdp_dZc6Eihfv4YVPq7-ClbkKLSytf8Lw/exec?oauth_ticket=*`

O asterisco cobre somente o identificador transitório no retorno. Não liberar curingas para outros projetos Apps Script. Se criar outra implantação com URL diferente, atualizar esta configuração e a propriedade do próximo passo.

## 3. Apps Script

Substituir Código.gs e Index.html pelas cópias `apps-script/atualizacao-google/Code_google_r1.txt` e `Index_google_r1.txt`. Preservar Logo.html. Manter as propriedades SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY e definir:

| Propriedade | Valor |
| --- | --- |
| GOOGLE_LOGIN_ENABLED | true |
| REGISTRATION_ENABLED | false |
| OAUTH_CALLBACK_URL | URL completa da implantação atual, terminada em /exec, sem query |

Atualizar a implantação existente para uma nova versão. Ela deve executar como proprietário e permitir acesso aos participantes; Somente eu impede o uso por alunos. O login Google do tutor é separado da eventual autorização do Apps Script. Se selecionar acesso apenas para contas Google na hospedagem, testar também o retorno OAuth com outra conta.

O botão principal passa a ser Entrar com Google. A opção Já tenho acesso com senha preserva as contas anteriores, sem abrir cadastro por senha. O botão de cadastro por e-mail é ocultado quando o login Google está habilitado, mesmo que REGISTRATION_ENABLED tenha ficado true por engano. Para desativar o novo fluxo, definir GOOGLE_LOGIN_ENABLED=false; o login anterior reaparece.

## 4. Funcionamento e proteção

O clique abre outra aba antes das operações assíncronas. O navegador cria um verificador aleatório PKCE e envia apenas seu hash ao host. O Google retorna ao Supabase; o Supabase retorna um código ao Apps Script. O cache do Apps Script guarda por até cinco minutos um ticket, segredo de consulta e código de uso único. A função de consulta exige o segredo e consome o código uma única vez, com bloqueio contra leitura concorrente.

O verificador permanece em memória no navegador original. A troca do código por sessão é feita diretamente com Supabase Auth; senha Google, verificador PKCE e tokens do provedor Google não são enviados ao Apps Script. Os tokens da sessão Supabase ficam em memória e o token de acesso continua sendo enviado ao proxy do tutor para as chamadas autenticadas já existentes. Não há armazenamento em localStorage ou sessionStorage. O retorno renderizado não inclui o código. O cache pode expirar antecipadamente; nesse caso, o estudante reinicia o login.

Não fechar a aba original do tutor durante o login. No celular, concluir a autenticação e voltar a ela. Cancelamento e tempo esgotado não concedem acesso. Não depender de comunicação por opener/postMessage entre domínios diferentes. O resultado do login não é inferido pela conta que abriu a hospedagem: o backend continua validando a sessão Supabase e o proprietário dos registros.

## 5. Validação e pendências

46 verificações locais aprovadas, incluindo sucesso simulado do login Google, correspondência PKCE, código de uso único, segredo incorreto, expiração, erro do provedor, pop-up bloqueado, cancelamento e login legado. Fluxos anteriores de tutoria e banco continuam cobertos. O teste local não comprova configuração do provedor nem retorno entre as plataformas.

Antes de ampliar o piloto, testar remotamente: primeiro acesso Google cria conta; retorno entra no tutor; sair exige novo login; outra conta não vê o histórico anterior; cancelar no Google não entra; funcionamento no celular; reabertura após expiração. Testar contas existentes com o mesmo endereço: o Supabase pode vincular identidades com e-mail verificado, mas não presumir preservação sem conferir o usuário e o histórico. Não apagar nem recriar contas para contornar problemas.

Atualização da homologação em 31/10/2026: o responsável configurou e publicou o fluxo Google e confirmou acesso com duas contas, histórico recuperado na primeira e vazio na segunda, resumo e avaliação registrados. A conta do projeto foi confirmada como Owner no Supabase e no Google Cloud; a integração Groq foi testada após substituir a chave e revogar a antiga. São evidências relatadas no atendimento, não auditoria independente ou comprovação de eficácia pedagógica. SMTP da Brevo ou Gmail não é necessário para este fluxo.

Referências: [Google no Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [restrições do Apps Script](https://developers.google.com/apps-script/guides/html/restrictions).
