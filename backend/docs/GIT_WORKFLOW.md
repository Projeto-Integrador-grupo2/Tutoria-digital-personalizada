# Preparação e fluxo do repositório Git

## Decisões iniciais

Antes de criar o repositório, o grupo deve definir:

- organização ou conta proprietária;
- nome do repositório;
- integrantes com acesso;
- licença ou manutenção como código privado;
- responsável por revisar pull requests;
- branch principal protegida.

Nome sugerido: `tutor-digital-personalizado`.

## Opção A — criação pelo navegador

1. Crie um repositório privado vazio no provedor Git.
2. Não gere README, licença ou `.gitignore` automaticamente.
3. Envie o conteúdo desta pasta mantendo a estrutura.
4. Confirme que arquivos iniciados por ponto também foram enviados.
5. Verifique a execução do workflow `Testes do backend`.
6. Adicione os demais integrantes com o menor nível de acesso necessário.
7. Proteja a branch `main`.

Essa opção permite preparar o repositório sem depender de Windows ou instalação local.

## Opção B — criação com Git

Execute dentro da pasta do projeto:

```bash
git init
git branch -M main
git add .
git status
git commit -m "chore: estrutura inicial do backend"
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

Antes do `commit`, confirme que `git status` não mostra `.env`, ZIP, chave ou arquivo de dados.

## Proteção recomendada para `main`

- exigir pull request;
- exigir pelo menos uma aprovação;
- exigir que o workflow de testes seja concluído;
- impedir exclusão da branch;
- bloquear force push;
- exigir resolução das conversas de revisão;
- restringir implantação de produção aos responsáveis definidos.

## Organização por marcos

| Marco | Conteúdo |
| --- | --- |
| `v0.1.0` | Estrutura, banco e autenticação |
| `v0.2.0` | Integração inicial com GROQ |
| `v0.3.0` | Perfis e escada de pistas |
| `v0.4.0` | Histórico, erros e privacidade |
| `v0.5.0` | Frontend responsivo integrado |
| `v0.9.0` | Piloto interno pronto |
| `v1.0.0` | Versão avaliada no Projeto Integrador |

Os números acima organizam o desenvolvimento acadêmico. O backend empacotado atualmente mantém
seu próprio número técnico `1.2.0-rc.1`. Nesta consolidação, o CI fica na raiz do projeto e executa os comandos dentro de `backend/`. Esta documentação descreve o fluxo recomendado; não comprova a criação de commits ou de um remoto.

## Quadro de trabalho sugerido

Use as colunas:

1. Ideias
2. Planejado
3. Em desenvolvimento
4. Em revisão
5. Em teste
6. Concluído

Associe cada branch e pull request a uma issue. Registre critérios de aceite objetivos.

## Primeiro conjunto de issues

1. Integrar o frontend responsivo ao `tutor-api`.
2. Implementar tela de histórico paginado.
3. Implementar exclusão de sessão e de histórico completo.
4. Criar aviso de privacidade e fluxo de aceite.
5. Testar RLS com dois usuários.
6. Executar matriz adversarial contra respostas prontas.
7. Configurar rotina diária de retenção.
8. Validar acessibilidade por teclado e leitor de tela.
9. Definir indicadores do piloto e instrumento de avaliação.
10. Documentar modelo GROQ selecionado, custo e limites.

## Releases

Antes de criar uma release:

- atualizar `CHANGELOG.md` e versão;
- executar testes;
- aplicar o checklist de implantação;
- confirmar ausência de segredos;
- registrar migrações necessárias;
- criar tag anotada, por exemplo `v0.4.0`;
- anexar somente pacotes gerados a partir do commit marcado.
