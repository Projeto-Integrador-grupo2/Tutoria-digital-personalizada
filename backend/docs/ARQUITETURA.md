# Arquitetura técnica — RC

Navegador HTML/JavaScript → Apps Script (hospedagem e proxy) → Supabase Edge Function → PostgreSQL/Groq. O navegador também autentica diretamente no Supabase Auth. Conta provisionada, cadastro público e acesso anônimo desativados para o piloto.

## Fronteiras de confiança

O navegador guarda tokens somente na memória e recebe apenas chave pública. O proxy encaminha JWT a destino fixo, sem chave administrativa. A Edge Function valida o JWT e consulta a sessão com cliente sujeito a RLS. Só depois usa cliente administrativo para escritas validadas.

Atividade, histórico e resposta da IA são dados externos. Entrada é limitada a 20 KB lidos incrementalmente; textos têm limites próprios e são mascarados. A geração e revisão usam contexto limitado. Não há execução de código do estudante, ferramentas do modelo ou acesso a URLs fornecidas pelo aluno.

## Concorrência e persistência

A sessão tem revisão incrementada em qualquer atualização. A persistência v3 trava a linha, verifica validade e revisão e grava duas mensagens numa transação. UUID repetido devolve resultado anterior; mesmo UUID com conteúdo diferente é rejeitado. Troca de perfil e encerramento usam atualização condicional pela revisão.

O histórico de mensagens ordena IDs; sessões ordenam data e ID. Os cursores de sessões devem ser usados em conjunto para preservar registros com mesma data.

## Privacidade

RLS: leitura exclusiva do proprietário, com validade temporal; clientes públicos não escrevem. Mensagens e avaliações dependem de sessão própria válida. Exclusão em cascata remove conteúdo. Eventos mínimos e quotas têm rotina de retenção própria. Não existe painel docente com acesso individual nesta candidata.

Resumo: organização determinística de três autorrelatos (aprendizagem, dificuldade e próximo passo), com máscara e limites. Não é avaliação automática da aprendizagem.

## Limites

Autenticação real, políticas de acesso institucional, custos/quotas, modelos, retenção agendada e implantação ainda exigem homologação. O cliente de Auth guarda identidade de acesso; os registros pedagógicos usam seu UUID. Máscaras por padrões não anonimizam texto livre com garantia.
