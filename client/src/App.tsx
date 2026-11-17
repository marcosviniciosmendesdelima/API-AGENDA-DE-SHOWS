import { useEffect, useMemo, useRef, useState } from "react";

type User = {
  id: number;
  nome: string;
  email: string;
  role: "ADMIN" | "USER";
};

type Contratante = {
  id: number;
  nome: string;
  cpf?: string | null;
  tipoDocumento?: TipoDocumento;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
};

type Local = {
  id: number;
  nome: string;
  cidade: string;
  endereco: string;
  capacidade?: number | null;
};

type Show = {
  id: number;
  titulo: string;
  cidade: string;
  data: string;
  dataFim: string;
  tipoLocal: "PUBLICO" | "PRIVADO";
  responsavelVenda: string | null;
  status: "CONFIRMADO" | "EM_REVISAO" | "CANCELADO" | "REALIZADO";
  valorShow: number | string;
  valorCusto: number | string;
  tipoEntrada?: "VALOR" | "PERCENTUAL" | null;
  valorEntrada?: number | string | null;
  observacoes?: string | null;
  contratanteId?: number | null;
  localEvento?: string | null;
  localId?: number | null;
  contratante?: Contratante | null;
  local?: Local | null;
  pagamentos: Payment[];
  contratos: Contract[];
};

type AgendaShow = Pick<Show, "id" | "titulo" | "cidade" | "data" | "dataFim" | "status" | "localEvento"> & {
  local?: Pick<Local, "nome"> | null;
} | Show;

type AccountUser = Pick<User, "id" | "nome" | "email" | "role"> & {
  createdAt: string;
};

type Contract = {
  id: number;
  showId: number;
  nome: string;
  arquivoTipo: string;
  tamanhoBytes: number;
  createdAt: string;
};

type Payment = {
  id: number;
  valor: number | string;
  dataPagamento: string;
  comprovanteNome?: string | null;
  comprovanteTipo?: string | null;
};

type LoginPayload = {
  email: string;
  password: string;
};

type AuthMode = "login" | "register";

type TipoDocumento = "CPF" | "CNPJ" | "RG";

type ShowDraft = {
  titulo: string;
  cidade: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  tipoLocal: Show["tipoLocal"];
  responsavelVenda: string;
  valorShow: string;
  valorCusto: string;
  status: Show["status"];
  observacoes: string;
  contratanteId: number | "";
  contratanteNome: string;
  contratanteTipoDocumento: TipoDocumento;
  contratanteCpf: string;
  contratanteEmail: string;
  contratanteTelefone: string;
  localEvento: string;
  localId: number | "";
};

const emptyDraft: ShowDraft = {
  titulo: "",
  cidade: "",
  data: "",
  horarioInicio: "",
  horarioFim: "",
  tipoLocal: "PRIVADO",
  responsavelVenda: "",
  valorShow: "",
  valorCusto: "",
  status: "CONFIRMADO",
  observacoes: "",
  contratanteId: "",
  contratanteNome: "",
  contratanteTipoDocumento: "CPF",
  contratanteCpf: "",
  contratanteEmail: "",
  contratanteTelefone: "",
  localEvento: "",
  localId: "",
};

function formatDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseValorMonetario(value: string): number | null {
  const input = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!input || !/^[\d.,]+$/.test(input)) return null;

  let inteiro: string;
  let fracao = "";
  if (input.includes(",")) {
    const partes = input.split(",");
    if (partes.length !== 2 || !/^\d*$/.test(partes[1] ?? "")) return null;
    [inteiro, fracao = ""] = partes;
    if (inteiro.includes(".") && !/^\d{1,3}(?:\.\d{3})+$/.test(inteiro)) return null;
    inteiro = inteiro.replaceAll(".", "");
  } else if (input.includes(".")) {
    const partes = input.split(".");
    if (partes.length === 2 && /^\d+$/.test(partes[0] ?? "") && /^\d{1,2}$/.test(partes[1] ?? "")) {
      [inteiro, fracao = ""] = partes;
    } else if (/^\d{1,3}(?:\.\d{3})+$/.test(input)) {
      inteiro = input.replaceAll(".", "");
    } else if (partes.length === 2 && /^\d*$/.test(partes[0] ?? "") && /^\d+$/.test(partes[1] ?? "")) {
      [inteiro, fracao = ""] = partes;
    } else {
      return null;
    }
  } else {
    inteiro = input;
  }

  const amount = Number(`${inteiro || "0"}.${fracao || "0"}`);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : null;
}

function parsePercentual(value: string): number | null {
  return parseValorMonetario(value.trim().replace(/%$/, ""));
}

function formatDocumentoFiscal(value: string, tipo: TipoDocumento) {
  if (tipo === "RG") {
    return value.replace(/[^A-Za-z0-9 ./-]/g, "").slice(0, 30);
  }

  const digits = value.replace(/\D/g, "").slice(0, tipo === "CPF" ? 11 : 14);
  if (tipo === "CPF") {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function configuracaoDocumento(tipo: TipoDocumento) {
  switch (tipo) {
    case "CPF":
      return { maxLength: 14, placeholder: "000.000.000-00" };
    case "CNPJ":
      return { maxLength: 18, placeholder: "00.000.000/0000-00" };
    case "RG":
      return { maxLength: 30, placeholder: "Número do RG" };
  }
}

function isAdminShow(show: AgendaShow): show is Show {
  return "valorShow" in show;
}

class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.erro ?? data?.error ?? "Operação falhou.";
    throw new ApiRequestError(message, response.status);
  }

  return data as T;
}

function App() {
  type SecaoAgenda = "calendario" | "cadastro" | "eventos" | "usuarios" | "conta";

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("showband-token"));
  const [shows, setShows] = useState<AgendaShow[]>([]);
  const [contratantes, setContratantes] = useState<Contratante[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [usuarios, setUsuarios] = useState<AccountUser[]>([]);
  const [usuarioDraft, setUsuarioDraft] = useState({ nome: "", email: "", password: "" });
  const [savingUser, setSavingUser] = useState(false);
  const [entryPercentDraft, setEntryPercentDraft] = useState("10");
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [loginData, setLoginData] = useState<LoginPayload>({
    email: "",
    password: "",
  });
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [registerName, setRegisterName] = useState("");
  const [draft, setDraft] = useState<ShowDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingContracts, setPendingContracts] = useState<File[]>([]);
  const [savingShow, setSavingShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAgenda>("calendario");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [showToFocusId, setShowToFocusId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const upcoming = useMemo(
    () => shows.filter((show) => new Date(show.data).getTime() >= Date.now() && show.status !== "CANCELADO"),
    [shows],
  );
  const valorShowDraftCentavos = Math.round((parseValorMonetario(draft.valorShow) ?? 0) * 100);
  const percentualEntradaDraft = parsePercentual(entryPercentDraft) ?? 0;
  const entradaDraftCentavos = Math.round(valorShowDraftCentavos * percentualEntradaDraft / 100);
  const saldoDraftCentavos = Math.max(0, valorShowDraftCentavos - entradaDraftCentavos);
  const moedaDraft = (valorCentavos: number) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valorCentavos / 100);

  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);

  useEffect(() => {
    if (!message || message.endsWith("...")) return;

    const timeout = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (secaoAtiva !== "eventos" || showToFocusId === null) return;

    const animationFrame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`show-${showToFocusId}`);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [secaoAtiva, showToFocusId]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const storedUser = localStorage.getItem("showband-user");
    if (storedUser) {
      const activeUser = JSON.parse(storedUser) as User;
      setUser(activeUser);
      void loadData(activeUser);
      return;
    }

    void loadData();
  }, [token]);

  async function loadData(activeUser = user, showLoading = true) {
    if (!token) return;

    if (showLoading) setLoading(true);
    setError(null);

    try {
      const showsResponse = await apiRequest<AgendaShow[]>("/shows", {}, token);
      setShows(showsResponse);

      if (activeUser?.role === "ADMIN") {
        const [contratantesResponse, locaisResponse, usuariosResponse] = await Promise.all([
          apiRequest<Contratante[]>("/contratantes", {}, token),
          apiRequest<Local[]>("/locais", {}, token),
          apiRequest<AccountUser[]>("/auth/users", {}, token),
        ]);
        setContratantes(contratantesResponse);
        setLocais(locaisResponse);
        setUsuarios(usuariosResponse);
      } else {
        setContratantes([]);
        setLocais([]);
        setUsuarios([]);
      }
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 401) {
        handleLogout("Sua sessão expirou. Faça login novamente.");
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar dados.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage("Entrando...");

    try {
      const result = await apiRequest<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginData),
      });

      localStorage.setItem("showband-token", result.token);
      localStorage.setItem("showband-user", JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      setMessage(null);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Erro ao fazer login.");
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage("Criando sua conta...");

    try {
      const result = await apiRequest<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          nome: registerName,
          email: loginData.email,
          password: loginData.password,
        }),
      });

      localStorage.setItem("showband-token", result.token);
      localStorage.setItem("showband-user", JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      setMessage(null);
    } catch (registerError) {
      setMessage(null);
      setError(registerError instanceof Error ? registerError.message : "Erro ao criar conta.");
    }
  }

  function handleLogout(reason?: string, showExitFeedback = false) {
    localStorage.removeItem("showband-token");
    localStorage.removeItem("showband-user");
    setToken(null);
    setUser(null);
    setShows([]);
    setContratantes([]);
    setLocais([]);
    setUsuarios([]);
    setDraft(emptyDraft);
    setEntryPercentDraft("10");
    setPendingContracts([]);
    setSecaoAtiva("calendario");
    setMessage(null);
    setError(reason ?? null);
    if (showExitFeedback) {
      setLogoutLoading(true);
      window.setTimeout(() => setLogoutLoading(false), 800);
    }
  }

  function navigateTo(section: SecaoAgenda) {
    setSecaoAtiva(section);
    if (section === "calendario") setSelectedCalendarDate(null);
    setShowToFocusId(null);
    setMenuAberto(false);
    setMessage(null);
    setError(null);
  }

  function handleCalendarDateSelection(data: string) {
    setSelectedCalendarDate(data);
    setDraft((current) => ({ ...current, data }));
    const show = shows.find((current) => (
      current.status !== "CANCELADO" && formatDateTimeLocal(current.data).slice(0, 10) === data
    ));

    if (!show) return;

    navigateTo("eventos");
    setShowToFocusId(show.id);
  }

  function fillDraft(show: Show) {
    setPendingContracts([]);
    setEditingId(show.id);
    const valorEntrada = Number(show.valorEntrada ?? 0);
    const percentualEntrada = show.tipoEntrada === "PERCENTUAL"
      ? valorEntrada
      : show.tipoEntrada === "VALOR" && Number(show.valorShow) > 0
        ? valorEntrada / Number(show.valorShow) * 100
        : 10;
    setEntryPercentDraft(String(Math.round(percentualEntrada * 100) / 100));
    navigateTo("cadastro");
    setDraft({
      titulo: show.titulo,
      cidade: show.cidade,
      data: formatDateTimeLocal(show.data).slice(0, 10),
      horarioInicio: formatDateTimeLocal(show.data).slice(11, 16),
      horarioFim: formatDateTimeLocal(show.dataFim).slice(11, 16),
      tipoLocal: show.tipoLocal,
      responsavelVenda: show.responsavelVenda ?? "",
      valorShow: String(show.valorShow),
      valorCusto: String(show.valorCusto ?? 0),
      status: show.status,
      observacoes: show.observacoes ?? "",
      contratanteId: show.contratanteId ?? "",
      contratanteNome: show.contratante?.nome ?? "",
      contratanteTipoDocumento: show.contratante?.tipoDocumento
        ?? (show.contratante?.cpf?.replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF"),
      contratanteCpf: show.contratante?.cpf ?? "",
      contratanteEmail: show.contratante?.email ?? "",
      contratanteTelefone: show.contratante?.telefone ?? "",
      localEvento: show.localEvento ?? show.local?.nome ?? "",
      localId: show.localId ?? "",
    });
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSavingUser(true);
    setError(null);
    setMessage("Criando usuário...");
    try {
      await apiRequest<AccountUser>("/auth/users", {
        method: "POST",
        body: JSON.stringify(usuarioDraft),
      }, token);
      setUsuarioDraft({ nome: "", email: "", password: "" });
      setMessage("Usuário criado. Compartilhe a senha inicial com segurança.");
      await loadData(user);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Erro ao criar usuário.");
    } finally {
      setSavingUser(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }

    setSavingPassword(true);
    setError(null);
    setMessage("Alterando senha...");
    try {
      await apiRequest<{ mensagem: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordDraft.currentPassword,
          newPassword: passwordDraft.newPassword,
        }),
      }, token);

      handleLogout();
      setAuthMode("login");
      setLoginData({ email: user.email, password: "" });
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Senha alterada. Entre novamente com sua nova senha.");
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Erro ao alterar senha.");
      setMessage(null);
    } finally {
      setSavingPassword(false);
    }
  }

  async function saveShow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) return;

    setError(null);
    setMessage(editingId ? "Atualizando show..." : "Cadastrando show...");
    const numeroDocumento = draft.contratanteCpf.replace(/\D/g, "");
    if (draft.contratanteTipoDocumento === "RG") {
      if (draft.contratanteCpf && !/^[A-Za-z0-9][A-Za-z0-9 ./-]{0,29}$/.test(draft.contratanteCpf)) {
        setMessage(null);
        setError("O RG deve conter letras ou números e pode incluir espaços, pontos, barras ou hífens.");
        return;
      }
    } else {
      const tamanhoDocumento = draft.contratanteTipoDocumento === "CPF" ? 11 : 14;
      if (numeroDocumento && numeroDocumento.length !== tamanhoDocumento) {
        setMessage(null);
        setError(`O ${draft.contratanteTipoDocumento} deve conter ${tamanhoDocumento} números.`);
        return;
      }
    }

    const valorShow = parseValorMonetario(draft.valorShow);
    if (valorShow === null) {
      setMessage(null);
      setError("Informe um valor válido em reais. Valores com mais de duas casas decimais serão arredondados para centavos.");
      return;
    }
    const valorCusto = parseValorMonetario(draft.valorCusto || "0");
    if (valorCusto === null) {
      setMessage(null);
      setError("Informe um valor de custo válido em reais.");
      return;
    }

    const percentualEntrada = parsePercentual(entryPercentDraft);
    if (percentualEntrada === null || percentualEntrada < 10 || percentualEntrada > 100) {
      setMessage(null);
      setError("Informe um percentual de entrada entre 10% e 100%.");
      return;
    }

    const data = new Date(`${draft.data}T${draft.horarioInicio}`);
    const dataFim = new Date(`${draft.data}T${draft.horarioFim}`);
    if (dataFim <= data) {
      dataFim.setDate(dataFim.getDate() + 1);
    }

    const payload = {
      titulo: draft.titulo,
      cidade: draft.cidade,
      data: data.toISOString(),
      dataFim: dataFim.toISOString(),
      tipoLocal: draft.tipoLocal,
      responsavelVenda: draft.responsavelVenda,
      valorShow,
      valorCusto,
      tipoEntrada: "PERCENTUAL",
      valorEntrada: percentualEntrada,
      numeroParcelas: null,
      pagamentosPrevistos: [],
      status: draft.status,
      observacoes: draft.observacoes || null,
      contratanteId: draft.contratanteId === "" ? null : Number(draft.contratanteId),
      contratante: {
        nome: draft.contratanteNome,
        tipoDocumento: draft.contratanteTipoDocumento,
        cpf: draft.contratanteCpf,
        email: draft.contratanteEmail,
        telefone: draft.contratanteTelefone,
      },
      localEvento: draft.localEvento.trim() || null,
      localId: draft.localId === "" ? null : Number(draft.localId),
    };

    setSavingShow(true);
    try {
      const isEditing = editingId !== null;
      const savedShow = isEditing
        ? await apiRequest<Show>(`/shows/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }, token)
        : await apiRequest<Show>("/shows", {
          method: "POST",
          body: JSON.stringify(payload),
        }, token);

      const contractsWereAttached = pendingContracts.length > 0;
      if (contractsWereAttached) {
        const contractsBody = new FormData();
        pendingContracts.forEach((file) => contractsBody.append("contratos", file));
        try {
          await apiRequest<Contract[]>(`/shows/${savedShow.id}/contratos`, {
            method: "POST",
            body: contractsBody,
          }, token);
        } catch (contractError) {
          if (!isEditing) setEditingId(savedShow.id);
          await loadData();
          setMessage("O evento foi salvo, mas os contratos não foram anexados. Tente salvar novamente.");
          setError(contractError instanceof Error ? contractError.message : "Erro ao anexar contratos.");
          return;
        }
      }

      setDraft(emptyDraft);
      setEntryPercentDraft("10");
      setEditingId(null);
      setPendingContracts([]);
      setMessage(editingId ? "Show atualizado com sucesso." : "Show cadastrado com sucesso.");
      await loadData();
      if (contractsWereAttached) setSecaoAtiva("eventos");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao salvar show.");
    } finally {
      setSavingShow(false);
    }
  }

  async function deleteShow(id: number) {
    if (!token || !window.confirm("Deseja remover este show?")) return;

    try {
      await apiRequest(`/shows/${id}`, { method: "DELETE" }, token);
      await loadData();
      setMessage("Show removido.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro ao remover show.");
    }
  }

  function contratosDoShow(id: number) {
    const show = shows.find((item) => item.id === id);
    return show && isAdminShow(show) ? show.contratos : [];
  }

  async function baixarContrato(contract: Contract) {
    if (!token) return;

    try {
      const response = await fetch(`/api/contratos/${contract.id}/arquivo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Não foi possível baixar o contrato (${response.status}).`);
      }

      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = contract.nome;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Erro ao baixar contrato.");
    }
  }

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (logoutLoading) {
    return (
      <main className="loader-area logout-loader-area" role="status" aria-live="polite">
        <div className="loader">
          <span className="loader-spinner" aria-hidden="true" />
          <span>
            <strong>Encerrando sua sessão</strong>
            <small>Até logo!</small>
          </span>
        </div>
      </main>
    );
  }

  if (!token || !user) {
    const isRegistering = authMode === "register";

    return (
      <div className="auth-shell">
        <div className="auth-card">
          <span className="eyebrow">Banda • Gestão de Agenda</span>
          <h1>Agenda de Shows</h1>
          <p>{isRegistering
            ? "Crie sua conta para consultar a agenda de shows."
            : "Entre para acessar a agenda de shows."}</p>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-form">
            {isRegistering && (
              <label>
                Nome
                <input
                  type="text"
                  value={registerName}
                  maxLength={100}
                  autoComplete="name"
                  required
                  onChange={(event) => setRegisterName(event.target.value)}
                />
              </label>
            )}
            <label>
              E-mail
              <input
                type="email"
                value={loginData.email}
                autoComplete="email"
                required
                onChange={(event) => setLoginData((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                value={loginData.password}
                minLength={isRegistering ? 12 : 6}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                required
                onChange={(event) => setLoginData((current) => ({ ...current, password: event.target.value }))}
              />
              {isRegistering && <small className="form-hint">Use pelo menos 12 caracteres. Maiúsculas e símbolos são permitidos, mas não obrigatórios.</small>}
            </label>
            <button type="submit">{isRegistering ? "Criar conta" : "Entrar"}</button>
          </form>

          <div className="auth-mode-switch">
            <span>{isRegistering ? "Já tem uma conta?" : "Ainda não tem uma conta?"}</span>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setAuthMode(isRegistering ? "login" : "register");
                setMessage(null);
                setError(null);
              }}
            >
              {isRegistering ? "Entrar" : "Criar conta"}
            </button>
          </div>

          {message && <p className="message success">{message}</p>}
          {error && <p className="message error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav
        className={`side-menu${menuAberto ? " expanded" : ""}`}
        aria-label="Navegação principal"
      >
        <button
          type="button"
          className="side-menu-toggle"
          aria-label={menuAberto ? "Recolher menu" : "Expandir menu"}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="side-menu-label">Menu</span>
        </button>
        <button
          type="button"
          className={`side-menu-link${secaoAtiva === "calendario" ? " active" : ""}`}
          aria-current={secaoAtiva === "calendario" ? "page" : undefined}
          onClick={() => navigateTo("calendario")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
          <span className="side-menu-label">Calendário</span>
        </button>
        {user.role === "ADMIN" && <button
          type="button"
          className={`side-menu-link${secaoAtiva === "cadastro" ? " active" : ""}`}
          aria-current={secaoAtiva === "cadastro" ? "page" : undefined}
          onClick={() => navigateTo("cadastro")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="side-menu-label">Cadastrar show</span>
        </button>}
        <button
          type="button"
          className={`side-menu-link${secaoAtiva === "eventos" ? " active" : ""}`}
          aria-current={secaoAtiva === "eventos" ? "page" : undefined}
          onClick={() => navigateTo("eventos")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 19V5m0 14h17M8 15l4-4 3 2 5-6" />
          </svg>
          <span className="side-menu-label">Próximos eventos</span>
        </button>
        {user.role === "ADMIN" && <button
          type="button"
          className={`side-menu-link${secaoAtiva === "usuarios" ? " active" : ""}`}
          aria-current={secaoAtiva === "usuarios" ? "page" : undefined}
          onClick={() => navigateTo("usuarios")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-3v6m3-3h-6" />
          </svg>
          <span className="side-menu-label">Usuários</span>
        </button>}
        <button
          type="button"
          className={`side-menu-link${secaoAtiva === "conta" ? " active" : ""}`}
          aria-current={secaoAtiva === "conta" ? "page" : undefined}
          onClick={() => navigateTo("conta")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
          </svg>
          <span className="side-menu-label">Minha conta</span>
        </button>
      </nav>

      <header className="topbar">
        <div>
          <span className="eyebrow">Painel da banda</span>
          <h2>Agenda de Shows</h2>
          <small>{user.nome} · {user.role === "ADMIN" ? "Administrador" : "Acesso à agenda"}</small>
        </div>

        <div className="topbar-actions">
          {installPrompt && (
            <button type="button" className="secondary" onClick={handleInstall}>
              Instalar app
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <main className="loader-area" role="status" aria-live="polite">
          <div className="loader">
            <span className="loader-spinner" aria-hidden="true" />
            <span>
              <strong>Sincronizando sua agenda</strong>
              <small>Buscando as informações mais recentes</small>
            </span>
          </div>
        </main>
      ) : <>
        {secaoAtiva === "calendario" && (
          <div className="navigation-target">
            <AgendaCalendario shows={shows} selectedDate={selectedCalendarDate ?? ""} onSelectDate={handleCalendarDateSelection} />
          </div>
        )}

        {secaoAtiva !== "calendario" && (
        <main className="content">
        <section className="layout-grid navigation-view">
          {user.role === "ADMIN" && secaoAtiva === "cadastro" && <div className="panel">
            <div className="panel-header">
              <h3>{editingId ? "Editar show" : "Novo show"}</h3>
            </div>

            <form onSubmit={saveShow} className="show-form">
              <label>
                Título
                <input
                  value={draft.titulo}
                  onChange={(event) => setDraft((current) => ({ ...current, titulo: event.target.value }))}
                  required
                />
              </label>

              <label>
                Cidade
                <input
                  value={draft.cidade}
                  onChange={(event) => setDraft((current) => ({ ...current, cidade: event.target.value }))}
                  required
                />
              </label>

              <label>
                Tipo de Evento
                <select
                  value={draft.tipoLocal}
                  onChange={(event) => setDraft((current) => ({ ...current, tipoLocal: event.target.value as Show["tipoLocal"] }))}
                >
                  <option value="PUBLICO">Público</option>
                  <option value="PRIVADO">Privado</option>
                </select>
              </label>

              <label>
                Data do evento
                <input
                  type="date"
                  value={draft.data}
                  onChange={(event) => setDraft((current) => ({ ...current, data: event.target.value }))}
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  Horário de início
                  <input
                    type="time"
                    value={draft.horarioInicio}
                    onChange={(event) => setDraft((current) => ({ ...current, horarioInicio: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Horário de término
                  <input
                    type="time"
                    value={draft.horarioFim}
                    onChange={(event) => setDraft((current) => ({ ...current, horarioFim: event.target.value }))}
                    required
                  />
                </label>
              </div>
              <label>
                Responsável pela venda
                <input
                  value={draft.responsavelVenda}
                  onChange={(event) => setDraft((current) => ({ ...current, responsavelVenda: event.target.value }))}
                  required
                />
              </label>

              <label>
                Status
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Show["status"] }))}
                >
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="EM_REVISAO">Aguardando confirmação</option>
                  <option value="CANCELADO">Cancelado</option>
                  <option value="REALIZADO">Realizado</option>
                </select>
              </label>

              <h4 className="form-section-title">Dados do contratante</h4>
              <label>
                Nome do contratante
                <input
                  value={draft.contratanteNome}
                  onChange={(event) => setDraft((current) => ({ ...current, contratanteNome: event.target.value }))}
                  required
                />
              </label>
              <label>
                Tipo de documento
                <select
                  value={draft.contratanteTipoDocumento}
                  onChange={(event) => {
                    const tipo = event.target.value as TipoDocumento;
                    setDraft((current) => ({
                      ...current,
                      contratanteTipoDocumento: tipo,
                      contratanteCpf: formatDocumentoFiscal(current.contratanteCpf, tipo),
                    }));
                  }}
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="RG">RG</option>
                </select>
              </label>
              <label>
                Número do {draft.contratanteTipoDocumento}
                <input
                  inputMode={draft.contratanteTipoDocumento === "RG" ? "text" : "numeric"}
                  maxLength={configuracaoDocumento(draft.contratanteTipoDocumento).maxLength}
                  value={draft.contratanteCpf}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    contratanteCpf: formatDocumentoFiscal(event.target.value, current.contratanteTipoDocumento),
                  }))}
                  placeholder={configuracaoDocumento(draft.contratanteTipoDocumento).placeholder}
                />
              </label>
              <label>
                E-mail do contratante
                <input
                  type="email"
                  value={draft.contratanteEmail}
                  onChange={(event) => setDraft((current) => ({ ...current, contratanteEmail: event.target.value }))}
                  placeholder="exemplo@email.com"
                />
              </label>
              <label>
                Telefone do contratante
                <input
                  type="tel"
                  value={draft.contratanteTelefone}
                  onChange={(event) => setDraft((current) => ({ ...current, contratanteTelefone: event.target.value }))}
                  placeholder="(83) 99999-9999"
                />
              </label>
              <label>
                Valor do show (cachê)
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.valorShow}
                  onChange={(event) => setDraft((current) => ({ ...current, valorShow: event.target.value }))}
                  placeholder="0,00"
                  required
                />
              </label>
              <section className="payment-plan-editor" aria-label="Condições de pagamento">
                <h4 className="form-section-title">Pagamento do cachê</h4>
                <label>
                  Entrada (%)
                  <span className="percentage-input">
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={7}
                      value={entryPercentDraft}
                      onChange={(event) => setEntryPercentDraft(event.target.value)}
                      placeholder="10"
                      aria-label="Percentual de entrada"
                      required
                    />
                    <span aria-hidden="true">%</span>
                  </span>
                </label>
                <div className="payment-plan-summary">
                  <span>Entrada prevista: {moedaDraft(entradaDraftCentavos)}</span>
                  <strong>Saldo a receber: {moedaDraft(saldoDraftCentavos)}</strong>
                </div>
                <small className="payment-plan-hint">
                  O contratante pode pagar o saldo como preferir. Registre cada valor somente quando receber.
                </small>
              </section>
              <label>
                Custo do show
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.valorCusto}
                  onChange={(event) => setDraft((current) => ({ ...current, valorCusto: event.target.value }))}
                  placeholder="0,00"
                />
              </label>

              <label>
                Local do evento
                <input
                  value={draft.localEvento}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    localEvento: event.target.value,
                    localId: "",
                  }))}
                  list="locais-evento"
                  placeholder="Digite o nome ou endereço do local"
                />
                <datalist id="locais-evento">
                  {locais.map((local) => (
                    <option key={local.id} value={local.nome}>{local.cidade}</option>
                  ))}
                </datalist>
              </label>

              <label>
                Observações
                <textarea
                  rows={4}
                  value={draft.observacoes}
                  onChange={(event) => setDraft((current) => ({ ...current, observacoes: event.target.value }))}
                />
              </label>

              <section className="contract-section" aria-label="Contratos do evento">
                <ContractManager
                  showId={editingId}
                  contracts={editingId ? contratosDoShow(editingId) : []}
                  pendingFiles={pendingContracts}
                  onFilesChange={setPendingContracts}
                  token={token}
                  disabled={savingShow}
                  onChange={() => loadData()}
                  onError={setError}
                />
              </section>

              <div className="form-actions">
                <button type="submit" disabled={savingShow}>
                  {savingShow
                    ? pendingContracts.length > 0 ? "Salvando show e anexando contrato(s)..." : "Salvando..."
                    : pendingContracts.length > 0
                      ? editingId ? "Salvar alterações e anexar contrato(s)" : "Cadastrar show e anexar contrato(s)"
                      : editingId ? "Salvar alterações" : "Cadastrar"}
                </button>
                {editingId && (
                  <button type="button" className="secondary" onClick={() => {
                    setEditingId(null);
                    setDraft(emptyDraft);
                    setEntryPercentDraft("10");
                    setPendingContracts([]);
                  }} disabled={savingShow}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>}

          {secaoAtiva === "eventos" && <div className="panel">
            <div className="panel-header">
              <h3>{user.role === "ADMIN" ? "Próximos eventos" : "Agenda de shows"}</h3>
            </div>

            <div className="show-list">
              {shows.length === 0 && <p className="empty-state">Nenhum show cadastrado ainda.</p>}
              {shows.map((show) => (
                <article id={`show-${show.id}`} key={show.id} className="show-item" tabIndex={-1}>
                  <div>
                    <span className={`status-badge ${show.status.toLowerCase()}`}>
                      {show.status === "EM_REVISAO" ? "Aguardando confirmação" : show.status}
                    </span>
                    <h4>{show.titulo}</h4>
                    <p>{show.cidade}</p>
                    <small>
                      {new Date(show.data).toLocaleDateString("pt-BR")} • {new Date(show.data).toLocaleTimeString("pt-BR", { timeStyle: "short" })}–{new Date(show.dataFim).toLocaleTimeString("pt-BR", { timeStyle: "short" })}
                    </small>
                  </div>

                  <div className="show-meta">
                    <span>Local: {show.localEvento || show.local?.nome || "Não informado"}</span>
                  </div>

                  {user.role === "ADMIN" && isAdminShow(show) && <>
                  <div className="show-meta">
                    <span>Tipo de Evento: {show.tipoLocal === "PUBLICO" ? "Público" : "Privado"}</span>
                    <span>Responsável pela venda do show: {show.responsavelVenda ?? "Não informado"}</span>
                  </div>

                  {show.contratos.length > 0 && (
                    <div className="show-contracts">
                      <strong>Contratos anexados</strong>
                      <ul className="contract-list">
                        {show.contratos.map((contract) => (
                          <li key={contract.id}>
                            <span>
                              <strong>{contract.nome}</strong>
                              <small>{formatFileSize(contract.tamanhoBytes)}</small>
                            </span>
                            <button
                              type="button"
                              className="contract-link-button"
                              onClick={() => void baixarContrato(contract)}
                            >
                              Baixar PDF
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="show-finances" aria-label={`Financeiro do evento ${show.titulo}`}>
                    <strong className="show-finances-title">Financeiro deste evento</strong>
                    <div className="show-finances-values">
                      <div>
                        <span>Cachê</span>
                        <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(show.valorShow))}</strong>
                      </div>
                      <div>
                        <span>Custo</span>
                        <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(show.valorCusto))}</strong>
                      </div>
                      <div>
                        <span>Lucro</span>
                        <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(show.valorShow) - Number(show.valorCusto))}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="item-actions">
                    <button type="button" className="secondary" onClick={() => fillDraft(show)}>
                      Editar
                    </button>
                    <button type="button" className="danger" onClick={() => void deleteShow(show.id)}>
                      Excluir
                    </button>
                  </div>
                  <PaymentManager
                    show={show}
                    token={token}
                    onChange={() => void loadData(user, false)}
                    onError={setError}
                  />
                  </>}
                </article>
              ))}
            </div>
          </div>}

          {user.role === "ADMIN" && secaoAtiva === "usuarios" && <div className="panel">
            <div className="panel-header">
              <h3>Contas com acesso à agenda</h3>
            </div>
            <p>Essas contas podem consultar somente datas, horários, cidades e locais dos shows.</p>
            <form className="show-form user-form" onSubmit={createUser}>
              <label>
                Nome
                <input
                  value={usuarioDraft.nome}
                  onChange={(event) => setUsuarioDraft((current) => ({ ...current, nome: event.target.value }))}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={usuarioDraft.email}
                  onChange={(event) => setUsuarioDraft((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Senha inicial (mínimo de 12 caracteres)
                <input
                  type="password"
                  value={usuarioDraft.password}
                  onChange={(event) => setUsuarioDraft((current) => ({ ...current, password: event.target.value }))}
                  minLength={12}
                  autoComplete="new-password"
                  required
                />
              </label>
              <small className="form-hint">Maiúsculas e símbolos são permitidos, mas não obrigatórios.</small>
              <button type="submit" disabled={savingUser}>
                {savingUser ? "Criando conta..." : "Criar usuário"}
              </button>
            </form>

            <div className="user-list">
              {usuarios.filter((account) => account.role === "USER").map((account) => (
                <div className="user-list-item" key={account.id}>
                  <strong>{account.nome}</strong>
                  <span>{account.email}</span>
                  <small>Criado em {new Date(account.createdAt).toLocaleDateString("pt-BR")}</small>
                </div>
              ))}
              {usuarios.every((account) => account.role !== "USER") && (
                <p className="empty-state">Nenhuma conta de usuário criada.</p>
              )}
            </div>
          </div>}

          {secaoAtiva === "conta" && <div className="panel">
            <div className="panel-header">
              <h3>Alterar senha</h3>
            </div>
            <p>Por segurança, informe sua senha atual. Após a alteração, será necessário entrar novamente em todos os dispositivos.</p>
            <form className="show-form user-form" onSubmit={changePassword}>
              <label>
                Senha atual
                <input
                  type="password"
                  value={passwordDraft.currentPassword}
                  onChange={(event) => setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value }))}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                Nova senha (mínimo de 12 caracteres)
                <input
                  type="password"
                  value={passwordDraft.newPassword}
                  onChange={(event) => setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))}
                  minLength={12}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                Confirmar nova senha
                <input
                  type="password"
                  value={passwordDraft.confirmPassword}
                  onChange={(event) => setPasswordDraft((current) => ({ ...current, confirmPassword: event.target.value }))}
                  minLength={12}
                  autoComplete="new-password"
                  required
                />
              </label>
              <small className="form-hint">Maiúsculas e símbolos são permitidos, mas não obrigatórios.</small>
              <button type="submit" disabled={savingPassword}>
                {savingPassword ? "Alterando senha..." : "Alterar senha"}
              </button>
            </form>
          </div>}
        </section>
        </main>
        )}
      </>}

      {message && <p className="toast success">{message}</p>}
      {error && <p className="toast error">{error}</p>}
      <button type="button" className="ghost logout-button" onClick={() => handleLogout(undefined, true)}>
        Sair
      </button>
    </div>
  );
}

function ContractManager({
  showId,
  contracts,
  pendingFiles,
  onFilesChange,
  token,
  disabled,
  onChange,
  onError,
}: {
  showId: number | null;
  contracts: Contract[];
  pendingFiles: File[];
  onFilesChange: (files: File[]) => void;
  token: string;
  disabled: boolean;
  onChange: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function selectContracts(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    if (pendingFiles.length + files.length > 10) {
      onError("Selecione no máximo 10 contratos por evento.");
      return;
    }

    const invalidFile = files.find((file) =>
      !file.name.toLowerCase().endsWith(".pdf") ||
      file.size > 8 * 1024 * 1024,
    );
    if (invalidFile) {
      onError(`"${invalidFile.name}" precisa ser um PDF de até 8 MB.`);
      return;
    }
    onError(null);
    onFilesChange([...pendingFiles, ...files]);
  }

  function removerPendente(index: number) {
    onFilesChange(pendingFiles.filter((_file, fileIndex) => fileIndex !== index));
  }

  async function downloadContract(contract: Contract) {
    onError(null);
    try {
      const response = await fetch(`/api/contratos/${contract.id}/arquivo`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) {
        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : null;
        throw new Error(data?.erro ?? "Não foi possível baixar o contrato.");
      }
      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = contract.nome;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    } catch (downloadError) {
      onError(downloadError instanceof Error ? downloadError.message : "Erro ao baixar contrato.");
    }
  }

  async function deleteContract(contract: Contract) {
    if (!window.confirm(`Deseja remover o contrato "${contract.nome}"?`)) return;

    setDeletingId(contract.id);
    onError(null);
    try {
      await apiRequest<void>(`/contratos/${contract.id}`, { method: "DELETE" }, token);
      await onChange();
      setMessage("Contrato removido.");
    } catch (deleteError) {
      onError(deleteError instanceof Error ? deleteError.message : "Erro ao remover contrato.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="contract-manager">
      <label className="contract-select-button">
        ＋ Anexar PDF
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          disabled={disabled}
          onChange={selectContracts}
        />
      </label>
      <span className="contract-help">PDF • até 8 MB por arquivo • até 10 por vez</span>
      {pendingFiles.length > 0 && (
        <ul className="contract-list pending-contract-list">
          {pendingFiles.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
              <span>
                <strong>{file.name}</strong>
                <small>{formatFileSize(file.size)} • será enviado ao salvar o evento</small>
              </span>
              <button type="button" className="contract-link-button contract-remove-button" onClick={() => removerPendente(index)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      <ul className="contract-list">
        {contracts.map((contract) => (
          <li key={contract.id}>
            <span>
              <strong>{contract.nome}</strong>
              <small>{formatFileSize(contract.tamanhoBytes)} • {new Date(contract.createdAt).toLocaleDateString("pt-BR")}</small>
            </span>
            {showId !== null && (
              <div className="contract-actions">
                <button type="button" className="contract-link-button" onClick={() => void downloadContract(contract)}>
                  Baixar
                </button>
                <button
                  type="button"
                  className="contract-link-button contract-remove-button"
                  onClick={() => void deleteContract(contract)}
                  disabled={deletingId === contract.id}
                >
                  {deletingId === contract.id ? "Removendo..." : "Remover"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function AgendaCalendario({
  shows,
  selectedDate,
  onSelectDate,
}: {
  shows: AgendaShow[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const quantidadeMeses = Math.max(0, (2028 - inicio.getFullYear()) * 12 + 4 - inicio.getMonth());
  const meses = Array.from({ length: quantidadeMeses }, (_, indice) => (
    new Date(inicio.getFullYear(), inicio.getMonth() + indice, 1)
  ));
  const statusPorData = new Map<string, "confirmado" | "reserva">();

  for (const show of shows) {
    if (show.status === "CANCELADO") continue;
    const data = new Date(show.data);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    if (show.status === "CONFIRMADO" || show.status === "REALIZADO") {
      statusPorData.set(chave, "confirmado");
    } else if (!statusPorData.has(chave)) {
      statusPorData.set(chave, "reserva");
    }
  }

  const diasDaSemana = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <section className="agenda-calendar" aria-label="Calendário de shows">
      <div className="calendar-heading">
        <h3>Calendário da agenda</h3>
        <div className="calendar-legend" aria-label="Legenda do calendário">
          <span><i className="calendar-legend-confirmed" /> Confirmado</span>
          <span><i className="calendar-legend-reserved" /> Reserva</span>
          <span><i className="calendar-legend-open" /> Aberta</span>
        </div>
      </div>
      <div className="calendar-months">
        {meses.map((mes) => {
          const ano = mes.getFullYear();
          const numeroMes = mes.getMonth();
          const diasNoMes = new Date(ano, numeroMes + 1, 0).getDate();
          const deslocamento = mes.getDay();

          return (
            <article className="calendar-month" key={`${ano}-${numeroMes}`}>
              <h4>{mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h4>
              <div className="calendar-grid">
                {diasDaSemana.map((dia, indice) => <span className="calendar-weekday" key={`${dia}-${indice}`}>{dia}</span>)}
                {Array.from({ length: deslocamento }, (_, indice) => <span className="calendar-day-empty" key={`vazio-${indice}`} />)}
                {Array.from({ length: diasNoMes }, (_, indice) => {
                  const numeroDia = indice + 1;
                  const data = `${ano}-${String(numeroMes + 1).padStart(2, "0")}-${String(numeroDia).padStart(2, "0")}`;
                  const status = statusPorData.get(data) ?? "aberta";
                  const hojeLocal = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                  const estaNoPassado = new Date(ano, numeroMes, numeroDia) < hojeLocal;

                  return (
                    <button
                      type="button"
                      className={`calendar-day ${status}${estaNoPassado ? " past" : ""}${selectedDate === data ? " selected" : ""}`}
                      key={data}
                      title={shows.filter((show) => {
                        const dataShow = new Date(show.data);
                        return dataShow.getFullYear() === ano && dataShow.getMonth() === numeroMes && dataShow.getDate() === numeroDia;
                      }).map((show) => show.titulo).join(", ") || undefined}
                      aria-label={`${numeroDia} de ${mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}, ${status === "confirmado" ? "confirmado" : status === "reserva" ? "reservado" : "data aberta"}`}
                      aria-pressed={selectedDate === data}
                      onClick={() => onSelectDate(data)}
                    >
                      {numeroDia}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PaymentManager({
  show,
  token,
  onChange,
  onError,
}: {
  show: Show;
  token: string;
  onChange: () => void;
  onError: (message: string | null) => void;
}) {
  const [valor, setValor] = useState("");
  const [dataPagamento, setDataPagamento] = useState(() => formatDateTimeLocal(new Date().toISOString()));
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const valorShowEmCentavos = Math.round(Number(show.valorShow) * 100);
  const totalPagoEmCentavos = show.pagamentos.reduce(
    (total, pagamento) => total + Math.round(Number(pagamento.valor) * 100),
    0,
  );
  const totalPago = totalPagoEmCentavos / 100;
  const saldo = Math.max(0, valorShowEmCentavos - totalPagoEmCentavos) / 100;
  const moeda = (amount: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  const dataShow = new Date(show.data);
  const prazoQuitacao = new Date(dataShow.getFullYear(), dataShow.getMonth(), dataShow.getDate() - 7);
  const hoje = new Date();
  const hojeLocal = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const prazoVencido = saldo > 0 && hojeLocal > prazoQuitacao;

  async function adicionarPagamento(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError(null);
    const valorNumerico = parseValorMonetario(valor);
    if (valorNumerico === null || valorNumerico <= 0 || valorNumerico > saldo) {
      onError(`Informe um valor válido maior que zero e até ${moeda(saldo)}.`);
      return;
    }
    setEnviando(true);

    const dados = new FormData();
    dados.set("valor", String(valorNumerico));
    dados.set("dataPagamento", new Date(dataPagamento).toISOString());
    if (comprovante) dados.set("comprovante", comprovante);

    try {
      await apiRequest(`/shows/${show.id}/pagamentos`, {
        method: "POST",
        body: dados,
      }, token);
      setValor("");
      setComprovante(null);
      onChange();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao registrar pagamento.");
    } finally {
      setEnviando(false);
    }
  }

  async function abrirComprovante(pagamentoId: number) {
    onError(null);
    const comprovanteWindow = window.open("about:blank");
    if (!comprovanteWindow) {
      onError("Permita pop-ups para abrir o comprovante.");
      return;
    }

    try {
      const response = await fetch(`/api/pagamentos/${pagamentoId}/comprovante`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) {
        throw new Error("Não foi possível carregar o comprovante.");
      }
      const fileUrl = URL.createObjectURL(await response.blob());
      comprovanteWindow.location.href = fileUrl;
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
    } catch (error) {
      comprovanteWindow.close();
      onError(error instanceof Error ? error.message : "Erro ao abrir comprovante.");
    }
  }

  return (
    <details className="payment-section">
      <summary>Pagamentos ({show.pagamentos.length}) · Saldo: {moeda(saldo)}</summary>
      <div className="payment-summary">
        <span>Valor fechado: {moeda(Number(show.valorShow))}</span>
        <span>Total recebido: {moeda(totalPago)}</span>
        <strong>Saldo restante: {moeda(saldo)}</strong>
        <span>Prazo para quitar o saldo: {prazoQuitacao.toLocaleDateString("pt-BR")}</span>
        {prazoVencido && <strong className="payment-deadline-overdue">O prazo de quitação passou e ainda há saldo pendente.</strong>}
      </div>

      {saldo === 0 && (
        <div className="payment-complete" role="status" aria-live="polite">
          <strong>Evento quitado</strong>
          <span>
            Cachê de {moeda(Number(show.valorShow))} recebido integralmente em {show.pagamentos.length} pagamento(s).
            Não é possível adicionar novos valores ou comprovantes.
          </span>
        </div>
      )}

      {show.pagamentos.length > 0 && (
        <section className="payment-history" aria-label="Resumo dos pagamentos">
          <h4>{saldo === 0 ? "Resumo dos pagamentos" : "Pagamentos registrados"}</h4>
          <ul className="payment-list">
            {[...show.pagamentos]
              .sort((a, b) => new Date(a.dataPagamento).getTime() - new Date(b.dataPagamento).getTime())
              .map((pagamento, index) => (
                <li key={pagamento.id}>
                  <span>Pagamento {index + 1} · {new Date(pagamento.dataPagamento).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                  <strong>{moeda(Number(pagamento.valor))}</strong>
                  {pagamento.comprovanteNome && (
                    <button type="button" className="ghost" onClick={() => void abrirComprovante(pagamento.id)}>
                      Ver comprovante
                    </button>
                  )}
                </li>
              ))}
          </ul>
          {saldo === 0 && <strong className="payment-history-total">Total recebido: {moeda(totalPago)}</strong>}
        </section>
      )}

      {saldo > 0 && (
        <form className="payment-form" onSubmit={adicionarPagamento}>
          <label>
            Valor recebido nesta vez
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              placeholder="0,00"
              required
            />
            <small className="payment-plan-hint">Registre cada recebimento separadamente. A entrada prevista só conta como recebida depois de ser lançada aqui.</small>
          </label>
          <label>
            Data e horário do pagamento
            <input
              type="datetime-local"
              value={dataPagamento}
              onChange={(event) => setDataPagamento(event.target.value)}
              required
            />
          </label>
          <label>
            Comprovante (PDF, JPG, PNG ou WEBP; até 8 MB)
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => setComprovante(event.target.files?.[0] ?? null)}
            />
          </label>
          <button type="submit" disabled={enviando}>
            {enviando ? "Registrando..." : "Registrar pagamento"}
          </button>
        </form>
      )}
    </details>
  );
}

export default App;
