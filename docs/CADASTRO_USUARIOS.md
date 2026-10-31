# Cadastro com confirmação de e-mail

> Histórico de uma estratégia substituída. O fluxo atual escolhido é [Entrar com Google](LOGIN_GOOGLE.md), sem SMTP ou aprovação administrativa. Não seguir as instruções de SMTP abaixo para a implantação atual.

Política atual de 31/10/2026: qualquer pessoa com e-mail válido poderá solicitar uma conta. O acesso será liberado após confirmar o código recebido por e-mail, sem aprovação administrativa ou lista de participantes. A implementação está preparada localmente; SMTP e publicação ainda estão pendentes.

## SMTP gratuito

O e-mail padrão do Supabase só atende endereços da equipe do projeto. Para participantes externos, configurar SMTP personalizado. Não adicionar estudantes à equipe administrativa para contornar esse limite.

Para o piloto, usar Brevo Free, que oferece até 300 envios por dia conforme a documentação consultada. Criar a conta gratuita, confirmar o endereço e concluir a ativação de envio transacional. Verificar um remetente; preferir domínio próprio autenticado quando houver acesso ao DNS. Com endereço gratuito, a Brevo pode substituir o remetente por um endereço do serviço. Conferir o remetente efetivo e a entrega antes de abrir o cadastro. Cotas e disponibilidade podem mudar; nenhum plano pago foi contratado.

Gerar uma chave SMTP em SMTP & API da Brevo. Em Authentication → Email/SMTP do Supabase, preencher:

| Campo | Valor |
| --- | --- |
| Host | smtp-relay.brevo.com |
| Porta | 587 |
| Usuário | Login SMTP mostrado pela Brevo |
| Senha | Chave SMTP gerada, não senha da conta nem chave API |
| E-mail remetente | Remetente verificado na Brevo |
| Nome remetente | Tutor Digital |

Guardar as credenciais somente no painel SMTP do Supabase. Não colocar no chat, Index, Apps Script ou repositório. Limites do Auth e do provedor são independentes.

## Confirmação e acesso

Durante a preparação, manter Allow new users to sign up desativado. Ativar Confirm Email, manter acesso anônimo desativado e configurar senha mínima de 12 caracteres no Supabase Auth.

Em Confirm signup, usar backend/supabase/manual/modelo_confirmacao_cadastro.html. O template envia {{ .Token }}; o estudante digita o código na tela do tutor. O fluxo usa /signup e /verify com tipo email. Não exige tokens de acesso em links do Apps Script.

Não instalar hook de aprovação. Se o hook antigo public.hook_tutor_before_user_created já estiver ativo, desativá-lo em Authentication → Hooks ou executar apenas backend/supabase/manual/08_cadastro_confirmacao_email.sql, que remove a exigência de lista. Não executar os antigos passos 06/07 para esta política; não reaplicar o instalador original do banco.

Em instalação nova, aplicar as migrações ordenadas: 202610310002_open_email_registration.sql substitui a política anterior. Registros históricos de aprovação são preservados, sem uso no cadastro.

## Atualização do Apps Script

Substituir Código.gs por apps-script/atualizacao-cadastro/Code_cadastro_email_r2.txt e Index.html por apps-script/atualizacao-cadastro/Index_cadastro_email_r2.txt. Preservar Logo.html. As cópias r1 são históricas, substituídas por estas.

Após configurar SMTP e confirmação, adicionar REGISTRATION_ENABLED=true às propriedades do script, preservando SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY. Salvar e atualizar a implantação para nova versão. O cadastro fica oculto enquanto a propriedade estiver desativada.

A implantação foi inicialmente compartilhada como Somente eu. Ajustar o público para permitir os participantes e manter Executar como Eu. Qualquer pessoa com uma Conta Google também exige conta Google; para participantes sem essa conta, selecionar o acesso público disponível e testar essa modalidade. A conta do Supabase continua obrigatória para o tutor e o histórico.

Habilitar Allow new users to sign up após preparar essas etapas. Não há aprovação administrativa. Para suspender novas contas, desativar a opção no Auth e definir REGISTRATION_ENABLED=false; ocultar o botão sozinho não bloqueia requisições diretas.

## Validação

42 verificações locais aprovadas, incluindo migração para cadastro sem lista, confirmação simulada, código inválido, login existente e proteções do banco. Senhas e códigos vão diretamente por HTTPS ao Supabase Auth, sem passar pelo Apps Script, Edge Function ou Groq. Campos sensíveis são limpos após tentativas e tokens ficam apenas em memória.

Testes remotos pendentes: cadastro com endereço externo à equipe, entrega da confirmação, recusa de acesso antes de confirmar, código incorreto, código correto, login posterior e histórico isolado entre duas contas reais. Resumo e avaliação também devem ser concluídos. Não houve envio real de e-mail nesta atualização.

Referências: [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [verificação OTP](https://supabase.com/docs/reference/javascript/auth-verifyotp), [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [Brevo/Supabase](https://developers.brevo.com/docs/supabase-smtp-integration), [domínios remetentes](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders).
