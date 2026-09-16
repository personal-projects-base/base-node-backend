# Regras de desenvolvimento

Estas regras são obrigatórias para qualquer agente ou assistente que trabalhe neste
repositório.

## Fonte de verdade do Gonthera

Antes de analisar, gerar ou alterar código relacionado ao Gonthera CLI, consulte
sempre a documentação atual:

<https://labs.smartverse.com.br/docs/ia/gonthera/NODE.md>

- Não trabalhe apenas com memória, suposições ou uma cópia antiga da documentação.
- Observe a versão descrita no documento e confirme sua compatibilidade com o JAR
  usado pelo projeto.
- Em caso de divergência, a documentação do Gonthera e os arquivos de configuração
  `.gonthera` têm precedência sobre exemplos antigos existentes no projeto.
- Se a documentação não puder ser acessada, interrompa o trabalho relacionado ao
  Gonthera e solicite que o responsável humano faça o acesso manual ou forneça o
  conteúdo atualizado.

## Execução de comandos e falhas

- Cada comando deve ser executado no máximo uma vez.
- Se um comando falhar, não repita o mesmo comando e não tente variações destinadas
  a contornar a falha.
- Na primeira falha operacional, interrompa as execuções dependentes, informe o
  comando e o erro ao responsável humano e solicite que ele execute manualmente o
  comando necessário e compartilhe o resultado.
- Não crie ciclos de tentativa, espera e nova tentativa.
- Um resultado negativo esperado de uma consulta, como uma busca sem ocorrências,
  não é falha operacional quando essa ausência é uma resposta válida.

## Testes

- Não crie, altere nem execute testes unitários por iniciativa própria.
- Ignore a suíte de testes unitários até que o responsável humano solicite sua
  criação, alteração ou execução explicitamente.
- Validações estruturais indispensáveis do Gonthera, como validação da configuração
  e geração de código, não são testes unitários. Ainda assim, cada comando permanece
  sujeito à regra de tentativa única.

## Geração de código

- Priorize sempre código gerado pelo Gonthera CLI.
- Modele entidades, enums, endpoints, mensageria e demais contratos nos arquivos
  `.gonthera` e regenere a saída em vez de reproduzir manualmente recursos que o
  Gonthera oferece.
- Valide a configuração antes de gerar, respeitando os comandos e a sequência
  definidos na documentação atual.
- Trate `src/generated` e `prisma/schema.prisma` como saídas descartáveis. Nunca os
  use como fonte para uma alteração manual permanente.
- Não edite templates internos, formatos ou contratos do gerador com base em
  adivinhação. Siga estritamente as capacidades documentadas para a versão em uso.

## Customizações da aplicação

Quando o Gonthera não gerar o comportamento necessário, implemente a customização
somente nos pontos de extensão previstos na documentação:

- mantenha regras de negócio, services, repositories customizados, middleware,
  configuração concreta e rotas próprias fora de `src/generated`;
- use subclasses e factories para controllers abstratos quando esse for o mecanismo
  indicado pelo Gonthera;
- não faça o código gerado importar arquivos do consumidor;
- preserve o contrato HTTP, DTOs, relacionamentos, transações e OpenAPI definidos
  pelo gerador;
- não exponha detalhes internos do Prisma, chaves estrangeiras sintéticas ou campos
  auxiliares do banco nos contratos públicos;
- documente claramente toda customização necessária e o motivo pelo qual ela não
  pôde ser atendida pela geração padrão.

## Decisão de implementação

Siga esta ordem para qualquer mudança:

1. consultar a documentação atual do Gonthera CLI;
2. verificar se a mudança pode ser expressa em `.gonthera`;
3. preferir configuração e geração de código;
4. usar um ponto de extensão documentado quando a geração não for suficiente;
5. escrever código manual apenas para a parte que realmente pertence ao consumidor;
6. não executar testes unitários sem solicitação explícita.
