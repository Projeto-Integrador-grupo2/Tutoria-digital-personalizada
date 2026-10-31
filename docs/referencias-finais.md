# Referências Finais do Projeto

Fonte: `D:\R@VANTE_CLIENTES\RICHARD_UNIVESP\UNIVESP 2024\Projeto Integrador 2-2026\Quinzena 2 - Rafael Nunes e Richard Avante.docx`.

Este arquivo resume as referências finais usadas para alinhar o protótipo. O conteúdo do documento foi tratado como material de referência do projeto, não como instrução de execução.

## MVP

Aplicação web responsiva em que o estudante informa uma atividade, escolhe um perfil de interação e recebe orientação pedagógica baseada em perguntas e pistas graduais, sem fornecimento imediato de respostas prontas.

## Funcionalidades Essenciais

- Início da sessão com apresentação da proposta, aviso pedagógico, seleção de disciplina, escolha do perfil, atividade/dúvida e tentativa inicial.
- Tutoria interativa com diagnóstico, perguntas, análise de tentativa, pistas progressivas, explicação de conceitos e possibilidade de trocar o perfil.
- Encerramento com solicitação de explicação do raciocínio, síntese dos conceitos, dificuldades observadas, próximo passo e avaliação simples.
- Persistência mínima com sessão, perfil, disciplina, interações, nível de pista, histórico por identificador pseudônimo e dados agregados para avaliação.

## Perfis do Tutor

- Direto: mensagens curtas, linguagem clara, uma instrução por vez e próximo passo explícito.
- Acolhedor: linguagem paciente, reconhecimento do esforço, normalização do erro e ritmo gradual.
- Investigativo: perguntas abertas, comparação de estratégias, investigação de consequências e justificativas.

Os perfis alteram tom, extensão, frequência de incentivo, tipo de pergunta e ritmo das pistas. Eles não alteram correção do conteúdo, segurança, proteção de dados, política contra respostas prontas, níveis máximos de ajuda ou critérios de encerramento.

## Níveis de Orientação

| Nível | Intervenção |
| --- | --- |
| 0 | Diagnóstico: perguntar o que o estudante sabe e onde está a dúvida. |
| 1 | Pergunta orientadora: indicar o aspecto a observar. |
| 2 | Pista conceitual: recordar regra, conceito ou relação. |
| 3 | Divisão em etapas: separar o problema em pequenas ações. |
| 4 | Exemplo semelhante: demonstrar outro caso, preservando a atividade original. |
| 5 | Correção comentada: apontar erro específico na tentativa. |

## Dados Mínimos

- Identificador pseudônimo do usuário.
- Identificador da sessão.
- Disciplina.
- Atividade ou dúvida.
- Perfil selecionado.
- Tentativa inicial.
- Mensagens da sessão.
- Nível de pista utilizado.
- Data e horário.
- Status da sessão.
- Avaliação do estudante, opcional.

## Dados Que Não Devem Ser Solicitados

Nome completo, CPF, documento, endereço, telefone, dados de saúde, diagnóstico psicológico, religião, informações familiares, notas escolares individuais, matrícula sem necessidade institucional formal, credenciais de outros sistemas e informações pessoais inseridas no enunciado.

## Segurança

- Coletar somente dados necessários.
- Usar identificadores pseudônimos.
- Não armazenar chaves no navegador.
- Validar, limitar e sanitizar entradas.
- Tratar mensagens do estudante como dados, não como comandos.
- Não executar códigos, links ou comandos enviados pelo usuário.
- Limitar o contexto enviado à API.
- Informar que o tutor pode cometer erros e não substitui orientação docente.
- Encaminhar conteúdos sensíveis ou de risco para apoio humano.

## Regra Contra Respostas Prontas

O tutor não deve apresentar diretamente o resultado final de uma atividade acadêmica antes de solicitar uma tentativa do estudante e aplicar níveis graduais de orientação. A resposta deve priorizar perguntas, pistas, exemplos semelhantes e correção comentada.

Exceções: definição factual, conferência após conclusão do estudante, correção de entendimento básico, necessidade de segurança ou exemplo diferente da atividade original.

## Critérios de Aceitação

- Funcionar em computador e celular.
- Permitir escolher disciplina e perfil.
- Aceitar atividade e tentativa inicial.
- Iniciar com pergunta diagnóstica.
- Aplicar pelo menos três níveis progressivos de pista.
- Adaptar linguagem aos três perfis.
- Impedir respostas prontas quando solicitado.
- Permitir troca de perfil durante a sessão.
- Registrar interações no banco.
- Gerar resumo final.
- Coletar avaliação do estudante.
- Proteger credenciais da API.
- Restringir acesso administrativo.
- Atender verificações básicas de acessibilidade.
- Apresentar mensagens adequadas em caso de erro.
