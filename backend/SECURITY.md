# Política de segurança

## Versões mantidas

Durante o desenvolvimento do protótipo, somente a versão mais recente recebe correções. O número
da versão está no `package.json` e no endpoint `health`.

## Como relatar uma vulnerabilidade

Não abra uma issue pública quando o problema puder expor dados, chaves, autenticação, RLS ou
barreiras pedagógicas. Relate diretamente ao responsável técnico definido pelo grupo ou use o canal
privado de segurança do repositório, quando habilitado.

O relato deve conter:

- descrição e impacto provável;
- passos mínimos de reprodução com dados sintéticos;
- ação e endpoint afetados;
- identificador da versão;
- sugestão de correção, se houver.

Não envie chaves, tokens, dados reais ou cópias integrais de conversas.

## Resposta a incidentes

1. Interromper a coleta afetada, se houver risco aos participantes.
2. Revogar e substituir credenciais potencialmente expostas.
3. Restringir acesso aos registros necessários para investigação.
4. Corrigir em branch privada e adicionar teste de regressão.
5. Avaliar impacto nos dados, backups e serviços externos.
6. Registrar decisão, responsáveis e datas.
7. Comunicar instituição e titulares quando o procedimento aplicável exigir.

## Segredos

- Segredos devem existir somente no painel do Supabase ou em ambiente local ignorado pelo Git.
- `GROQ_API_KEY`, `SUPABASE_SECRET_KEY` e `SUPABASE_SERVICE_ROLE_KEY` nunca podem usar prefixo
  destinado ao frontend.
- Uma chave encontrada em commit deve ser considerada comprometida, mesmo que o commit seja
  apagado depois.
- A correção é revogar a chave, gerar outra e verificar logs de uso; reescrever o histórico Git não
  substitui a rotação.

## Limitações conhecidas

Barreiras linguísticas não garantem bloqueio absoluto de respostas prontas. O piloto exige testes
adversariais contínuos, revisão humana e atualização dos casos de regressão.
