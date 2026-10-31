# Publicação da candidata 1.2.0-rc.1

Estado inicial em 30/10/2026: publicação solicitada; destinos ainda não identificados. Não há `.clasp.json`, projeto Supabase vinculado ou credenciais de implantação configurados localmente.

Destino informado pelo titular: `bkaimbscytfurykpinzm`, painel https://supabase.com/dashboard/project/bkaimbscytfurykpinzm. URL da API: https://bkaimbscytfurykpinzm.supabase.co. Configuração pública de destino registrada em `backend/deployment.target.json`. Isso não comprova aplicação de migrações nem publicação da função.

O titular confirmou que a consulta de tabelas do esquema public retornou zero linhas. Para a orientação pelo painel, foi preparado `backend/supabase/manual/01_instalar_banco.sql`, reunindo as três migrações em uma transação. A execução local no PostgreSQL embarcado criou as cinco tabelas com RLS. Execução no projeto remoto ainda depende do resultado informado pelo titular. A importação manual não registra versões no histórico do Supabase CLI; confira essa diferença antes de um futuro `db push`.

Atualização: o titular enviou resultado do SQL Editor com `api_usage_windows`, `feedback`, `messages`, `privacy_events` e `tutoring_sessions`, todas com `rls_ativo=true`. A instalação do banco foi confirmada por essa evidência. Para publicação via editor, `backend/supabase/manual/tutor-api.ts` reúne os módulos da Edge Function em um arquivo gerado com esbuild. Mantenha as alterações nos módulos originais e regenere esse arquivo; não contém segredos. Deploy da função ainda não confirmado.

Publicação do backend confirmada após o titular salvar a configuração sem verificação JWT legada no gateway: POST `health` no endpoint `https://bkaimbscytfurykpinzm.supabase.co/functions/v1/tutor-api` retornou HTTP 200, status `ok` e versão `1.2.0-rc.1`. POST `list_sessions` sem Authorization retornou HTTP 401 com `missing_bearer_token`. Esses testes confirmam disponibilidade do handler e rejeição de operação privada sem token; não validam ainda Groq, persistência autenticada ou interface Apps Script. Próxima etapa: segredos da IA e configuração de acesso do piloto.

O titular informou ter cadastrado `GROQ_API_KEY` diretamente nos segredos, sem compartilhar seu valor. Para o plano gratuito, a documentação consultada lista `openai/gpt-oss-20b`; usar esse modelo em `GROQ_MODEL` e `GROQ_REVIEW_MODEL`, com `GROQ_ENABLE_REVIEW=true`. Os módulos e o arquivo manual foram adaptados para orçamento de raciocínio limitado nos modelos GPT-OSS, sem retorno de raciocínio interno. Essa adaptação local ainda precisa ser republicada pelo editor antes do teste real da IA. Fonte: https://console.groq.com/docs/rate-limits e https://console.groq.com/docs/reasoning.

Após o titular confirmar novo deploy pelo editor, os testes `health` e `list_sessions` retornaram HTTP 503, código `BOOT_ERROR`, mensagem `Function failed to start (please check logs)`. A disponibilidade anteriormente confirmada deixou de passar. A causa ainda não foi identificada; consultar o evento de inicialização nos logs antes de avançar. As três variáveis de modelo foram salvas pelo titular, mas a integração real com Groq permanece sem validação.

Diagnóstico recebido dos logs: `Identifier 'model' has already been declared` em `index.ts:609:9`. O arquivo local não reproduziu esse erro de sintaxe; o conteúdo efetivo publicado ainda precisa ser substituído e confirmado. Foi gerada uma cópia completa `backend/supabase/manual/02_tutor-api_validado.ts`, com identificador `build: groq20b-r1` na ação health. Essa cópia passou por análise sintática do Node e execução local no Deno, retornando health 200 e list_sessions sem token 401. SHA-256: `05947c2342cd6a16bcf66912adad7970117f42d68f9766a6c10e2702f7989127`. Republicação remota pendente; não afirmar que o incidente foi resolvido até testar o novo build no endpoint.

Incidente de inicialização resolvido e verificado após a substituição integral pelo titular: o endpoint remoto retornou health HTTP 200 com `build: groq20b-r1`, e list_sessions sem token retornou HTTP 401 com `missing_bearer_token`. O build validado está ativo. Ainda faltam validação autenticada da persistência/Groq, restrição de cadastro, provisionamento das contas e publicação do Apps Script.

Avanço informado pelo titular na orientação manual: cadastro público e autenticação anônima desativados, conta de teste criada no Supabase Auth, arquivos Code.gs/Index.html/Logo.html inseridos no Apps Script, propriedades SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY salvas. O titular concluiu a autorização de conexão externa e forneceu a implantação https://script.google.com/macros/s/AKfycby1yUnAsHgk6M-P5qK-vNJz60R1Vf7-ADatCINHbCbDmm2L0lHt31shsGJYP_pUeUfIfQ/exec, criada sob orientação de acesso inicial Somente eu. Essas configurações foram informadas pelo titular, sem inspeção administrativa independente. Próximo teste: abrir o Web App com a conta Google proprietária e autenticar no tutor com a conta criada no Supabase; ainda falta validar tutoria, histórico e Groq reais.

Em 31/10/2026, captura do Web App apresentou logo quebrado, campos de disciplina/perfil vazios e textos de carregamento. A causa exata no navegador não foi confirmada. Correção local `logo-r2`: doGet valida o conteúdo de Logo.html e o injeta diretamente no atributo src; o cliente não depende mais de script text/plain para a imagem, usa escopo isolado e apresenta campos antes do retorno do host. Falhas de inicialização/configuração recebem aviso explícito. Foram aprovados 29 testes locais, incluindo renderização de template simulada e fluxo de interface com colisão de nomes globais. Cópias para colagem sem prévia HTML em `apps-script/atualizacao-logo/Code_logo_r2.txt` e `Index_logo_r2.txt`. É necessário substituir os conteúdos de Código.gs e Index.html e selecionar Nova versão em Gerenciar implantações; correção remota ainda pendente.

O titular informou uma nova implantação após a orientação de correção do logo. Endereço atual para teste: https://script.google.com/macros/s/AKfycbys-RsIipANlTy7jy9VueC3ChDaFOBY-_KEyTvBnUevZig_uK0_5KXRYEyhZYxw8Yr3Ag/exec. A configuração pública de destino foi atualizada. Aparência, inicialização e login dessa implantação ainda precisam ser confirmados; o endereço anterior permanece apenas no histórico deste relatório.

Captura posterior confirmou logo visível, seletores preenchidos, Conta conectada e uma troca de mensagens. A resposta foi fallback local, acompanhada de aviso de indisponibilidade da IA. O titular confirmou a presença de GROQ_API_KEY; isso ainda não comprova sua validade nem acesso ao modelo. Foi preparado o build `groq20b-diag-r2`, arquivo `backend/supabase/manual/03_tutor-api_diagnostico.txt`, para diagnosticar a próxima tentativa. Logs `tutor_ai_diagnostic` contêm somente request_id, etapa, status HTTP e categorias autorizadas: configuração, autenticação, acesso, limite, timeout, JSON, truncamento e validação. Não registram mensagem bruta, chave ou conversa. Checagem TypeScript, 31 verificações Node e 10 cenários de API simulada aprovados. Publicação desse build e teste real da Groq permanecem pendentes.

O build de diagnóstico foi confirmado remoto via health 200. Log de 31/10/2026 00:21:30 fornecido pelo titular: `ai_output_rejected`, HTTP do provedor 200, `interaction_level_mismatch`. Logo, a chamada à Groq produziu saída, rejeitada pelo contrato local entre tipo e nível; o aviso genérico de indisponibilidade não distinguia esse caso. O prompt apresentava todas as alternativas de interaction_type enquanto o validador exigia um único tipo por nível. Correção `groq20b-schema-r3`: mapeamento central compartilhado, exemplo JSON com o tipo correto, JSON Schema específico por nível e modo estrito por padrão para GPT-OSS, incluindo revisão com esquema próprio. Mantidas as barreiras contra resposta pronta, escalada e pares incompatíveis. Passaram checagem TypeScript, 32 verificações Node e 11 cenários de API simulada. Arquivo para republicar: `backend/supabase/manual/04_tutor-api_formato_corrigido.txt`. Validação real após republicação ainda pendente.

O titular republicou o build `groq20b-schema-r3`, confirmado por teste remoto health HTTP 200. Em 31/10/2026, a captura `docs/evidencias/teste-tutoria-real-2026-10-31.png` confirmou logo, login, disciplina/perfil preenchidos, aviso de retenção e uma resposta diagnóstica contextual à tentativa de identificar coeficientes de equação do segundo grau, sem aviso de indisponibilidade. Esta é uma evidência de fluxo real bem-sucedido, limitada a esse caso. Ainda verificar progressão, histórico retomado, encerramento, feedback, isolamento com duas contas reais e agendamento de retenção antes de ampliar o piloto.

Progressão real 0 → 1 confirmada pela captura `docs/evidencias/teste-nivel-1-2026-10-31.png`: após relato de dificuldade e pedido de mais ajuda, Ajuda atual exibiu Pergunta orientadora. O tutor perguntou qual método de resolução o estudante costuma usar, apresentando opções sem resolver a equação. Pista conceitual e demais fluxos continuam pendentes de verificação no piloto.

Progressão real 1 → 2 confirmada pela captura `docs/evidencias/teste-nivel-2-2026-10-31.png`: Ajuda atual exibiu Pista conceitual. O tutor explicou a ligação de a, b e c ao discriminante b² − 4ac e pediu participação, sem substituir os coeficientes ou apresentar raízes. O fluxo observado já inclui diagnóstico, pergunta orientadora e pista conceitual; ainda verificar microetapas, resistência a resposta pronta e os fluxos de histórico/encerramento/avaliação.

O teste 2 → 3 mudou o rótulo para Microetapas, mas revelou uma falha semântica: após o estudante relatar dificuldade para começar, o tutor afirmou que ele já havia calculado o discriminante. Evidência: `docs/evidencias/teste-nivel-3-inconsistencia-2026-10-31.png`. Não considerar esse caso aprovado pedagogicamente. Correção local `groq20b-grounding-r4`: instruções exigem evidência nas mensagens do estudante para atribuir etapas concluídas; o revisor recebe histórico e regras em mensagem de sistema, pode bloquear progresso inventado e desconsideração da dificuldade atual, com categorias fixas. Checagem TypeScript, 33 verificações Node e 12 cenários de API simulada aprovados, incluindo rejeição antes de persistir a afirmação indevida quando sinalizada pelo revisor simulado. Isso não comprova acurácia do modelo real; repetir o caso após republicar `backend/supabase/manual/05_tutor-api_progresso_corrigido.txt`.

Build `groq20b-grounding-r4` confirmado remotamente por health 200. O titular recuperou a sessão original pelo histórico, com atividade, mensagens e nível Microetapas preservados (`teste-historico-retomado-2026-10-31.png`). No reenvio da dúvida sobre b = −5 e b², o tutor passou a abordar o sinal sem presumir o discriminante concluído (`teste-microetapas-retomado-2026-10-31.png`). Ressalva observada: antecipou o resultado parcial (−5)² = 25, embora não tenha apresentado as raízes nem concluído a equação. Registrar essa intervenção para revisão docente da quantidade de ajuda no nível 3; não declarar eficácia pedagógica geral a partir desse caso. Próximos testes: pedido explícito de resposta pronta, encerramento, resumo e avaliação.

Barreira contra pedido explícito de gabarito confirmada neste caso: ao receber "Só a resposta final dessa equação, sem explicação", o tutor devolveu orientação local exigindo uma ação do estudante, sem revelar as raízes. Evidência `docs/evidencias/teste-pedido-resposta-pronta-2026-10-31.png`. Esse resultado cobre um pedido direto, não comprova resistência universal a manipulações ou garantia de eficácia pedagógica. Seguem pendentes encerramento/resumo/avaliação e os demais itens de homologação já registrados.

Em seguida o titular solicitou incluir outros usuários ou uma área de cadastro. Foi preparada a interface `registration-r1`, com autocadastro autorizado por e-mail, senha definida pelo participante e confirmação por código; a visibilidade é controlada pela propriedade REGISTRATION_ENABLED, desativada por padrão. Migração incremental `202610310001_controlled_registration.sql` cria lista privada por hash e hook Before User Created. O código não altera a função de tutoria já publicada. Passaram 41 verificações locais, inclusive manutenção dos fluxos anteriores, autorização/expiração/RLS e cadastro/OTP simulados. A prévia do cadastro foi inspecionada no navegador. Nenhum novo participante foi incluído, nenhuma mensagem enviada e nenhum ajuste remoto aplicado. SMTP, hook e implantação manual ainda precisam de configuração. Guia em docs/CADASTRO_USUARIOS.md; o teste pendente de encerramento foi preservado como trabalho restante.

## Destinos necessários

- Projeto Supabase separado do banco legado, ou um projeto existente já compatível com as migrações da candidata.
- Projeto Google Apps Script da instituição, ou projeto novo na conta escolhida.
- Chave Groq configurada diretamente nos segredos da Edge Function. Não publicar a chave no chat, no código, no Apps Script ou no Git.

O acesso inicial é privado ou restrito ao domínio institucional, conforme suporte da conta Google. A publicação não autoriza ampliar automaticamente o público para acesso anônimo.

## Sequência de implantação

1. Autenticar as ferramentas e identificar os projetos. Quando existir banco, verificar tabelas e histórico de migrações antes de aplicar SQL.
2. Conferir as migrações pendentes com `supabase db push --dry-run` e aplicar somente após confirmar a compatibilidade do destino.
3. Configurar Groq e parâmetros do backend nos segredos do Supabase. Manter autenticação explícita do handler e a revisão pedagógica.
4. Publicar a função `tutor-api` e verificar `health`, negação de acesso sem JWT e origem não autorizada.
5. Vincular o Apps Script por `.clasp.json`. O `.claspignore` limita o envio a Code.gs, Index.html, Logo.html e appsscript.json; o PNG da prévia fica somente local.
6. Definir URL Supabase e chave pública nas propriedades do script. Provisionar as contas autorizadas no Supabase Auth e manter cadastro público/anônimo desativados.
7. Publicar versão do Web App com o acesso institucional disponível e verificar o endereço `/exec`.
8. Testar login, atividade, diagnóstico, pistas, histórico, encerramento, avaliação e exclusão com contas de teste autorizadas.
9. Agendar a limpeza de dados vencidos e registrar o agendamento, IDs de implantação e URLs de acesso, sem credenciais.

## Comandos de ferramentas

As ferramentas oficiais podem ser executadas pelo npm, sem instalação global:

```powershell
# Dentro de backend/
npm exec --yes --package supabase -- supabase login
npm exec --yes --package supabase -- supabase projects list
npm exec --yes --package supabase -- supabase link --project-ref PROJECT_REF
npm exec --yes --package supabase -- supabase db push --dry-run

# Dentro de apps-script/
npm exec --yes --package @google/clasp -- clasp login
```

As etapas de login e consentimento são concluídas pelo titular da conta. Não registrar tokens no relatório de publicação. IDs, acesso e comandos finais dependem dos projetos identificados; esta página não comprova que o deploy já ocorreu.

Referências oficiais: [Supabase deploy](https://supabase.com/docs/guides/functions/deploy), [Google clasp](https://developers.google.com/apps-script/guides/clasp) e [Google Web Apps](https://developers.google.com/apps-script/guides/web).

Política atual de cadastro (31/10/2026): confirmação por e-mail sem aprovação administrativa. Substitui a lista anterior; não executar os passos antigos 06/07. Guia vigente: docs/CADASTRO_USUARIOS.md. Cópias Code_cadastro_email_r2.txt e Index_cadastro_email_r2.txt preparadas. 42 testes locais aprovados; SMTP e publicação pendentes.

## Login Google preparado — 31/10/2026

Estratégia escolhida: primeiro acesso com Google sem SMTP nem aprovação administrativa. A interface usa PKCE com verificador em memória, retorno por código transitório no Apps Script e consulta com segredo separado. Código de uso único e validade de até cinco minutos; tokens da sessão não ficam no cache do host. Mantido login por senha de contas existentes. 46 testes locais aprovados, incluindo pop-up bloqueado, cancelamento, erro, expiração e proteção do retorno. Prévia visual em docs/evidencias/preview-login-google.png. Cópias em apps-script/atualizacao-google e guia vigente docs/LOGIN_GOOGLE.md. Configuração do provedor, atualização da implantação e teste entre plataformas continuam pendentes; nenhuma conta remota foi criada. As instruções anteriores de SMTP são históricas e não são necessárias para o fluxo escolhido.

## Homologação relatada e preparação do GitHub — 31/10/2026

O responsável confirmou: nova implantação Apps Script sob a conta do projeto; propriedade do arquivo no Drive e Owner no Google Cloud e Supabase; login Google de duas contas, histórico recuperado e isolado, resumo e avaliação; atividade da nova chave Groq no painel e tutoria após revogar a chave antiga. URL vigente em backend/deployment.target.json. Público OAuth Externo/Testando com escopos básicos; aplica-se a exceção documentada pelo Google à lista de usuários de teste. Não há marca verificada nem status OAuth Em produção. Manual de uso em docs/MANUAL_USUARIO.md. Repositório indicado: https://github.com/Projeto-Integrador-grupo2/Tutoria-digital-personalizada. Preparação local aprovada em tipos, 46 testes e 12 etapas de API simulada. Envio depende da autenticação GitHub e será confirmado pelo commit remoto.
