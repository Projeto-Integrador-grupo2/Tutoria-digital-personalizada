# Escopo do MVP

## Entrega mínima

O MVP deve permitir que um estudante autenticado:

1. leia e aceite o aviso de privacidade;
2. escolha um perfil do tutor;
3. informe disciplina e atividade;
4. apresente uma tentativa;
5. receba pergunta ou pista gradual;
6. solicite ajuda adicional após nova tentativa;
7. consulte e exclua seu histórico;
8. encerre a sessão e envie feedback.

## Perfis

| Perfil | Comportamento esperado |
| --- | --- |
| Direto | Frases objetivas, foco no próximo passo e baixa carga emocional |
| Acolhedor | Validação do esforço, linguagem segura e incentivo sem elogio vazio |
| Investigativo | Perguntas socráticas, comparação de hipóteses e explicitação do raciocínio |

Todos os perfis obedecem à mesma proibição de respostas prontas.

## Escada de ajuda

| Nível | Intervenção |
| --- | --- |
| 0 | Diagnóstico da compreensão e da dúvida |
| 1 | Pergunta orientadora |
| 2 | Pista conceitual |
| 3 | Divisão em microetapa |
| 4 | Exemplo paralelo com outros dados |
| 5 | Feedback comentado sobre a tentativa |

O backend controla o nível máximo. A IA não pode aumentá-lo por conta própria.

## Fora do MVP

- correção automática com nota;
- substituição do professor;
- geração integral de trabalhos;
- treinamento de modelo próprio;
- integração com sistema acadêmico institucional;
- painel analítico avançado para docentes;
- armazenamento de documentos pessoais;
- decisões automatizadas de alto impacto.

## Critérios de aceite

- funciona em navegador móvel e desktop;
- nenhum segredo aparece no frontend ou no repositório;
- usuário não acessa dados de outro usuário;
- pedido de resposta pronta produz orientação, não gabarito;
- histórico suporta paginação e exclusão;
- falha da IA produz fallback compreensível;
- testes automatizados e checklist de implantação são concluídos;
- aviso de privacidade corresponde aos dados realmente coletados.
