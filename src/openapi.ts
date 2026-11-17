const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "API da Agenda de Shows",
    version: "1.0.0",
    description: "Documentação da API para agenda de shows, contratantes, locais e pagamentos.",
    contact: { name: "Equipe da Agenda de Shows" },
  },
  servers: [{ url: "/api", description: "API atual" }],
  tags: [
    { name: "Autenticação" },
    { name: "Shows" },
    { name: "Pagamentos" },
    { name: "Contratantes" },
    { name: "Locais" },
    { name: "Saúde" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Saúde"],
        summary: "Verifica se a API está ativa",
        responses: {
          "200": {
            description: "API ativa",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    service: { type: "string", example: "agenda-de-shows" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Autenticação"],
        summary: "Autentica um usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "admin@banda.com" },
                  password: { type: "string", minLength: 6, example: "admin123" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login realizado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/Usuario" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/DadosInvalidos" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Autenticação"],
        summary: "Cria uma conta comum e inicia a sessão",
        description: "O cadastro público sempre cria um usuário com perfil USER; não é possível definir ou solicitar perfil de administrador. A senha deve ter pelo menos 12 caracteres.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nome", "email", "password"],
                properties: {
                  nome: { type: "string", minLength: 1, maxLength: 100 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 12 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Conta comum criada e autenticada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/Usuario" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/DadosInvalidos" },
          "409": { description: "E-mail já cadastrado" },
        },
      },
    },
    "/auth/change-password": {
      post: {
        tags: ["Autenticação"],
        summary: "Altera a senha do usuário autenticado",
        description: "Exige a senha atual e uma nova senha com no mínimo 12 caracteres. A alteração encerra todas as sessões atuais do usuário.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string", minLength: 1 },
                  newPassword: { type: "string", minLength: 12 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Senha alterada; todas as sessões anteriores foram invalidadas." },
          "400": { description: "Senha atual incorreta ou dados inválidos." },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
        },
      },
    },
    "/auth/users": {
      get: {
        tags: ["Autenticação"],
        summary: "Lista usuários (somente administrador)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Usuários sem dados de senha",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Usuario" } } } },
          },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
      post: {
        tags: ["Autenticação"],
        summary: "Cria uma conta de usuário comum com senha de pelo menos 12 caracteres (somente administrador)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nome", "email", "password"],
                properties: {
                  nome: { type: "string", minLength: 1, maxLength: 100 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 12 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Conta comum criada", content: { "application/json": { schema: { $ref: "#/components/schemas/Usuario" } } } },
          "400": { $ref: "#/components/responses/DadosInvalidos" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
          "409": { description: "E-mail já cadastrado" },
        },
      },
    },
    "/shows": {
      get: {
        tags: ["Shows"],
        summary: "Lista agenda resumida ou detalhes completos conforme o perfil",
        description: "Usuários comuns recebem apenas título, cidade, data, horários, status e local do show. Administradores também recebem dados pessoais, financeiros e metadados de documentos.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Agenda resumida para usuários comuns; detalhes completos para administradores.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    oneOf: [
                      { $ref: "#/components/schemas/AgendaResumida" },
                      { $ref: "#/components/schemas/Show" },
                    ],
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
        },
      },
      post: {
        tags: ["Shows"],
        summary: "Cadastra um show (somente administrador)",
        description: "Não permite sobreposição de horário com outro show não cancelado. Um evento pode ocorrer no mesmo dia de outro se seus horários não se sobrepuserem.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NovoShow" },
            },
          },
        },
        responses: {
          "201": { description: "Show cadastrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Show" } } } },
          "400": { $ref: "#/components/responses/DadosInvalidos" },
          "409": { $ref: "#/components/responses/ConflitoAgenda" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
    },
    "/shows/{id}": {
      put: {
        tags: ["Shows"],
        summary: "Atualiza um show (somente administrador)",
        description: "Não permite sobreposição de horário com outro show não cancelado. Um evento pode ocorrer no mesmo dia de outro se seus horários não se sobrepuserem.",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/NovoShow" } } },
        },
        responses: {
          "200": { description: "Show atualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Show" } } } },
          "400": { $ref: "#/components/responses/DadosInvalidos" },
          "409": { $ref: "#/components/responses/ConflitoAgenda" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
      delete: {
        tags: ["Shows"],
        summary: "Remove um show e seus pagamentos (somente administrador)",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: {
          "204": { description: "Show removido" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
    },
    "/shows/{id}/pagamentos": {
      get: {
        tags: ["Pagamentos"],
        summary: "Lista pagamentos de um show (somente administrador)",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: {
          "200": { description: "Lista de pagamentos", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Pagamento" } } } } },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
      post: {
        tags: ["Pagamentos"],
        summary: "Registra pagamento parcial e comprovante (somente administrador)",
        description: "Não permite que os pagamentos acumulados ultrapassem o valor fechado do show. O comprovante é opcional e aceita PDF, JPG, PNG ou WEBP de até 8 MB.",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["valor", "dataPagamento"],
                properties: {
                  valor: { type: "number", exclusiveMinimum: 0, example: 800 },
                  dataPagamento: { type: "string", format: "date-time" },
                  comprovante: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Pagamento registrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Pagamento" } } } },
          "400": { $ref: "#/components/responses/DadosInvalidos" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
    },
    "/pagamentos/{pagamentoId}/comprovante": {
      get: {
        tags: ["Pagamentos"],
        summary: "Abre o comprovante de um pagamento (somente administrador)",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/PagamentoId" }],
        responses: {
          "200": { description: "Arquivo PDF ou imagem" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
          "404": { description: "Comprovante não encontrado" },
        },
      },
    },
    "/pagamentos/{pagamentoId}": {
      delete: {
        tags: ["Pagamentos"],
        summary: "Remove um pagamento e seu comprovante (somente administrador)",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/PagamentoId" }],
        responses: {
          "204": { description: "Pagamento removido" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
    },
    "/shows/{id}/contratos": {
      get: {
        tags: ["Shows"],
        summary: "Lista contratos anexados ao show (somente administrador)",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: {
          "200": { description: "Lista de contratos", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Contrato" } } } } },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
          "404": { description: "Show não encontrado" },
        },
      },
      post: {
        tags: ["Shows"],
        summary: "Anexa contratos PDF ao show (somente administrador)",
        description: "Aceita até 10 PDFs por envio, com tamanho máximo de 8 MB por arquivo.",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["contratos"],
                properties: {
                  contratos: { type: "array", items: { type: "string", format: "binary" }, maxItems: 10 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Contratos anexados", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Contrato" } } } } },
          "400": { $ref: "#/components/responses/DadosInvalidos" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
          "404": { description: "Show não encontrado" },
        },
      },
    },
    "/contratos/{contratoId}/arquivo": {
      get: {
        tags: ["Shows"],
        summary: "Baixa um contrato do show (somente administrador)",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/ContratoId" }],
        responses: {
          "200": { description: "Arquivo PDF" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
          "404": { description: "Contrato ou arquivo não encontrado" },
        },
      },
    },
    "/contratos/{contratoId}": {
      delete: {
        tags: ["Shows"],
        summary: "Remove um contrato do show (somente administrador)",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/ContratoId" }],
        responses: {
          "204": { description: "Contrato removido" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
          "404": { description: "Contrato não encontrado" },
        },
      },
    },
    "/contratantes": {
      get: {
        tags: ["Contratantes"],
        summary: "Lista contratantes (somente administrador)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Lista de contratantes", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Contratante" } } } } },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
    },
    "/locais": {
      get: {
        tags: ["Locais"],
        summary: "Lista locais (somente administrador)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Lista de locais", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Local" } } } } },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
      post: {
        tags: ["Locais"],
        summary: "Cadastra um local (somente administrador)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nome", "endereco", "cidade"],
                properties: {
                  nome: { type: "string", example: "Casa de Shows Central" },
                  endereco: { type: "string", example: "Rua das Bandas, 100" },
                  cidade: { type: "string", example: "São Paulo" },
                  capacidade: { type: "integer", minimum: 1, nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Local cadastrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Local" } } } },
          "400": { $ref: "#/components/responses/DadosInvalidos" },
          "401": { $ref: "#/components/responses/NaoAutorizado" },
          "403": { $ref: "#/components/responses/AcessoNegado" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Faça login e informe o token JWT retornado.",
      },
    },
    parameters: {
      Id: { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
      PagamentoId: { name: "pagamentoId", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
      ContratoId: { name: "contratoId", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
    },
    responses: {
      DadosInvalidos: {
        description: "Dados inválidos ou regra de negócio não atendida",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Erro" } } },
      },
      ConflitoAgenda: {
        description: "O horário solicitado se sobrepõe a outro show não cancelado.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Erro" } } },
      },
      NaoAutorizado: {
        description: "Token ausente, inválido ou credenciais inválidas",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Erro" } } },
      },
      AcessoNegado: {
        description: "A operação exige perfil de administrador",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Erro" } } },
      },
    },
    schemas: {
      Erro: {
        type: "object",
        properties: { erro: { type: "string" } },
      },
      Usuario: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nome: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["ADMIN", "USER"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AgendaResumida: {
        type: "object",
        properties: {
          id: { type: "integer" },
          titulo: { type: "string" },
          cidade: { type: "string" },
          data: { type: "string", format: "date-time" },
          dataFim: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["CONFIRMADO", "EM_REVISAO", "CANCELADO", "REALIZADO"] },
          localEvento: { type: "string", nullable: true },
          local: {
            type: "object",
            nullable: true,
            properties: { nome: { type: "string" } },
          },
        },
      },
      Contratante: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nome: { type: "string" },
          tipoDocumento: { type: "string", enum: ["CPF", "CNPJ", "RG"], default: "CPF" },
          cpf: { type: "string", nullable: true, description: "Número do CPF, CNPJ ou RG conforme o tipoDocumento." },
          email: { type: "string", format: "email", nullable: true },
          telefone: { type: "string", nullable: true },
          empresa: { type: "string", nullable: true },
        },
      },
      Local: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nome: { type: "string" },
          endereco: { type: "string" },
          cidade: { type: "string" },
          capacidade: { type: "integer", nullable: true },
        },
      },
      NovoShow: {
        type: "object",
        required: ["titulo", "cidade", "data", "dataFim", "tipoLocal", "responsavelVenda", "valorShow"],
        properties: {
          titulo: { type: "string", example: "Show de verão" },
          cidade: { type: "string", example: "São Paulo" },
          data: { type: "string", format: "date-time" },
          dataFim: { type: "string", format: "date-time" },
          tipoLocal: { type: "string", enum: ["PUBLICO", "PRIVADO"] },
          responsavelVenda: { type: "string" },
          status: { type: "string", enum: ["CONFIRMADO", "EM_REVISAO", "CANCELADO", "REALIZADO"], default: "CONFIRMADO" },
          valorShow: { type: "number", minimum: 0, example: 8000 },
          valorCusto: { type: "number", minimum: 0, example: 1500, description: "Custo associado ao show; usado para calcular o lucro." },
          tipoEntrada: { type: "string", enum: ["VALOR", "PERCENTUAL"], nullable: true },
          valorEntrada: { type: "number", minimum: 0, nullable: true, example: 10, description: "Valor ou percentual da entrada, conforme tipoEntrada." },
          numeroParcelas: { type: "integer", minimum: 1, nullable: true, description: "Campo legado para compatibilidade com planos antigos." },
          pagamentosPrevistos: {
            type: "array",
            maxItems: 50,
            description: "Grupos de pagamentos combinados além da entrada. Cada grupo tem quantidade e valor por parcela; não se registram datas previstas.",
            items: {
              type: "object",
              required: ["descricao", "valor", "quantidade"],
              properties: {
                descricao: { type: "string", minLength: 1, maxLength: 100 },
                valor: { type: "number", exclusiveMinimum: 0 },
                quantidade: { type: "integer", minimum: 1, maximum: 500, default: 1 },
              },
            },
          },
          observacoes: { type: "string", nullable: true },
          contratanteId: { type: "integer", nullable: true },
          contratante: {
            type: "object",
            required: ["nome", "cpf"],
            properties: {
              nome: { type: "string" },
              tipoDocumento: { type: "string", enum: ["CPF", "CNPJ", "RG"], default: "CPF" },
              cpf: { type: "string", description: "CPF com 11 dígitos, CNPJ com 14 dígitos ou RG. CPF/CNPJ têm a pontuação removida; o RG preserva o formato informado." },
              email: { type: "string", format: "email" },
              telefone: { type: "string" },
            },
          },
          localEvento: { type: "string", maxLength: 200, nullable: true, description: "Nome ou endereço do local digitado diretamente no cadastro do evento." },
          localId: { type: "integer", nullable: true },
        },
      },
      Show: {
        allOf: [
          { $ref: "#/components/schemas/NovoShow" },
          {
            type: "object",
            properties: {
              id: { type: "integer" },
              inicioPlanoPagamento: { type: "string", format: "date-time", nullable: true },
              pagamentosPrevistos: { type: "array", items: { $ref: "#/components/schemas/PagamentoPrevisto" } },
              contratante: { allOf: [{ $ref: "#/components/schemas/Contratante" }], nullable: true },
              local: { allOf: [{ $ref: "#/components/schemas/Local" }], nullable: true },
              pagamentos: { type: "array", items: { $ref: "#/components/schemas/Pagamento" } },
              contratos: { type: "array", items: { $ref: "#/components/schemas/Contrato" } },
            },
          },
        ],
      },
      Pagamento: {
        type: "object",
        properties: {
          id: { type: "integer" },
          showId: { type: "integer" },
          valor: { type: "number", example: 800 },
          dataPagamento: { type: "string", format: "date-time" },
          comprovanteNome: { type: "string", nullable: true },
          comprovanteTipo: { type: "string", nullable: true },
        },
      },
      PagamentoPrevisto: {
        type: "object",
        properties: {
          id: { type: "integer" },
          descricao: { type: "string" },
          valor: { type: "number" },
          quantidade: { type: "integer" },
          isEntrada: { type: "boolean" },
        },
      },
      Contrato: {
        type: "object",
        properties: {
          id: { type: "integer" },
          showId: { type: "integer" },
          nome: { type: "string" },
          arquivoTipo: { type: "string", example: "application/pdf" },
          tamanhoBytes: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
} satisfies import("swagger-ui-express").JsonObject;

export default openApiDocument;
