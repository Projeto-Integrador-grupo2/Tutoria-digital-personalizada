# Relato técnico e acadêmico da versão candidata

## Identificação e problema

Tutoria digital personalizada para apoio à aprendizagem autônoma em diferentes disciplinas. Projeto Integrador, referência final: Quinzena 2 — Rafael Nunes e Richard Avante. Versão de software 1.2.0-rc.1, consolidada em 30 de outubro de 2026.

A proposta responde à necessidade de orientação durante o estudo, especialmente quando o aluno não sabe iniciar ou justificar um procedimento. O protótipo solicita participação e oferece pistas graduais em vez de concluir imediatamente a atividade.

## Objetivos e delimitação

Implementar um tutor geral acessível por interface móvel; personalizar a comunicação nos perfis direto, acolhedor e investigativo; preservar perguntas, tentativas, histórico e autorreflexão; reduzir respostas prontas e exposição de dados.

Perfis representam escolhas de comunicação. Não são diagnósticos de personalidade. O protótipo não atribui notas, substitui docentes, integra registros acadêmicos ou comprova desempenho escolar.

## Método de desenvolvimento

Evolução incremental dos pacotes v1.1: comparação dos artefatos; revisão de regras e fronteiras de confiança; implementação da candidata; testes automatizados de regras, banco e API simulada; inspeção da interface; registro das evidências e limitações.

A interface usa HTML e JavaScript no Apps Script. O backend usa TypeScript no runtime Deno das Supabase Edge Functions, PostgreSQL, Supabase Auth e API Groq. O controle de versão tem estrutura e CI preparados; o histórico Git real deve ser mantido pelo grupo. O requisito de framework web ainda precisa de comprovação específica: hospedagem em Apps Script, isoladamente, não o satisfaz.

## Decisões pedagógicas

A primeira intervenção identifica o entendimento e a dificuldade. As ajudas percorrem diagnóstico, pergunta orientadora, pista conceitual, microetapas, exemplo paralelo e correção comentada. A progressão depende de pedido de ajuda ou relato de dificuldade e avança no máximo um nível. A correção comentada requer tentativa detectável.

O perfil altera estilo, não política de segurança. Atividades e mensagens permanecem conteúdo não confiável no prompt. Saídas têm estrutura validada e revisão adicional; resultados rejeitados são substituídos por orientação local. Essas barreiras são heurísticas e probabilísticas, não prova formal de ausência de respostas prontas.

## Dados e ética de avaliação

Registros pedagógicos usam UUID de conta, sessão, disciplina, atividade, perfil, mensagem, nível, horário, status e avaliação opcional. A identidade de acesso permanece no Auth. Não se envia e-mail de acesso ao modelo. A máscara por padrões reduz exposição, mas não identifica todo dado pessoal, nome ou contexto sensível em texto livre.

O encerramento exige relato do estudante sobre aprendizagem, dificuldade e próximo passo. O resumo registra autorrelato; não demonstra aprendizagem nem infere estado psicológico.

## Plano de avaliação com participantes

Após homologação técnica e autorização institucional, aplicar tarefas equivalentes em diferentes disciplinas e observar: compreensão das pistas, necessidade de intervenção docente, tentativas produzidas pelo aluno, facilidade de uso em celular e percepção de utilidade, clareza, adequação do perfil e autonomia (escala 1–5).

Registrar quantidade de participantes, critérios de inclusão, procedimento, instrumentos e perdas antes da análise. Comparações entre perfis devem considerar tamanho da amostra, disciplina e dificuldade das tarefas. Não atribuir causalidade a médias de percepção sem desenho que a sustente.

A avaliação opcional é independente da participação na sessão. Definir aviso de privacidade final, retenção, canal de direitos e procedimentos para menores com a instituição antes de coletar dados reais.

## Resultados desta etapa e limitações

Foram produzidos software candidato, testes reproduzíveis e documentação. A evidência disponível é técnica e local, descrita em VALIDACAO_RC.md. Não houve experimento com estudantes, estimativa de ganho de aprendizagem ou validação de eficácia pedagógica.

Permanecem homologação em nuvem, revisão docente de casos multidisciplinares, teste com leitores de tela e comprovação do requisito de framework web. Texto e materiais acadêmicos finais devem manter essa distinção entre funcionalidade implementada e resultado educacional observado.

## Referências de implementação

- Documento de requisitos fornecido pelo grupo: Quinzena 2 — Rafael Nunes e Richard Avante; síntese em referencias-finais.md.
- Pacotes v1.1 do grupo, registrados em ORIGEM_PACOTES.json.
- [Supabase — autenticação de Edge Functions](https://supabase.com/docs/guides/functions/auth).
- [Groq — saídas estruturadas](https://console.groq.com/docs/structured-outputs).

As referências técnicas orientam a integração. Elas não constituem evidência de eficácia educacional.
