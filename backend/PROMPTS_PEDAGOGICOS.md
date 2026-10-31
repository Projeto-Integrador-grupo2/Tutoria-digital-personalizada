# Prompts pedagógicos

## Princípio central

O tutor apoia o processo, mas não realiza a atividade no lugar do estudante. O modelo recebe uma regra fixa que proíbe resposta final, gabarito, alternativa correta, cálculo concluído, código completo e texto pronto para entrega.

## Perfis

### Direto

- Usa frases curtas.
- Explicita o objetivo do passo atual.
- Propõe uma única ação concreta.
- Não elimina acolhimento nem justificativa pedagógica.

### Acolhedor

- Reconhece especificamente a tentativa.
- Normaliza a dificuldade sem elogio genérico.
- Reduz insegurança e convida a nova tentativa.
- Não aumenta o nível de ajuda por compaixão.

### Investigativo

- Explora hipóteses, consequências e justificativas.
- Faz uma pergunta por vez.
- Evita interrogatório e excesso de abstração.
- Não transforma o estudante em adivinhador.

## Escada de ajuda

| Nível | Intervenção permitida |
| --- | --- |
| 0 | Diagnosticar compreensão e dúvida. |
| 1 | Fazer pergunta orientadora. |
| 2 | Oferecer pista conceitual curta. |
| 3 | Dividir somente o próximo trecho em microetapas. |
| 4 | Apresentar exemplo paralelo com dados diferentes. |
| 5 | Comentar a tentativa sem concluir pelo estudante. |

O backend calcula o nível. A primeira intervenção é sempre diagnóstica. Após ela, um pedido de mais ajuda ou relato explícito de dificuldade aumenta no máximo uma posição. A correção comentada (nível 5) exige tentativa detectável. A heurística não comprova aprendizagem. O perfil não altera essas regras.

## Saída estruturada

A resposta deve conter:

- `message`
- `interaction_type`
- `hint_level`
- `requires_student_action: true`
- `student_action`
- `contains_final_answer: false`
- `safety_flags`

Uma saída inválida, excessiva ou suspeita é descartada e substituída por fallback seguro.

## Barreiras em camadas

1. Mascaramento de e-mail, CPF, telefone e URL com credencial.
2. Identificação de pedido direto de gabarito.
3. Identificação de manipulação do prompt.
4. Controle determinístico do nível de pista.
5. Prompt com hierarquia e delimitação de conteúdo não confiável.
6. Saída JSON validada pelo backend.
7. Bloqueio de marcadores de conclusão e respostas isoladas.
8. Exigência de ação verificável do estudante.
9. Revisão por segunda chamada à Groq, ativada por padrão. Resposta sem decisão explícita é recusada. Desativar essa opção remove uma camada de proteção e exige nova avaliação pedagógica.
10. Fallback fechado quando houver erro ou dúvida.

O revisor recebe mensagem e ação proposta pelo tutor, além do nível máximo. Uma definição factual curta pode ser explicada com pergunta de aplicação, preservando a atividade do aluno. Esta candidata aplica política conservadora e não implementa uma liberação automática de gabarito após um número de turnos.

O resumo final não usa inferência de IA: organiza aprendizagem relatada, dificuldade e próximo passo. Isso evita apresentar uma contagem de mensagens como evidência de domínio. A revisão e os padrões reduzem falhas, sem garantir bloqueio de toda conclusão indireta.

## Avaliação recomendada

Montar um conjunto de testes com:

- exercícios objetivos e discursivos;
- matemática, programação, língua portuguesa, ciências e humanidades;
- pedidos explícitos e indiretos de resposta;
- tentativas de alteração do papel do tutor;
- enunciados que contêm instruções maliciosas;
- casos em que uma pista pode revelar involuntariamente a resposta;
- estudantes com tentativas curtas, parcialmente corretas e conceitualmente equivocadas.
