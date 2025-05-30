let tokenClient;
let accessToken = null;


// ConfiguraÃ§Ã£o do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAXC8XI_Q8jM5MrTpboorCMqti5Yn-B7gI",
  authDomain: "projeto-remediar.firebaseapp.com",
  databaseURL: "https://projeto-remediar-default-rtdb.firebaseio.com",
  projectId: "projeto-remediar",
  storageBucket: "projeto-remediar.appspot.com",
  messagingSenderId: "624372151070",
  appId: "1:624372151070:web:cfb199116b5d2c7dfb8f0f",
  measurementId: "G-3D989EEEQ1"
};

// Configuração da Google API
const CLIENT_ID = '810891313360-frc3ivhj7njfdboln4e61tqiphq8p52j.apps.googleusercontent.com';
const API_KEY = ''; // Pode deixar em branco para testes simples
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

// InicializaÃ§Ã£o do Firebase
let auth, db;
try {
  const firebaseApp = firebase.initializeApp(firebaseConfig);
  auth = firebaseApp.auth();
  db = firebaseApp.database();
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
  alert("Erro ao conectar com o servidor");
}

function initGoogleClient() {
  gapi.load('client', () => {
    gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES
    }).then(() => {
      console.log("Google Calendar API pronta.");
    }).catch(error => {
      console.error("Erro ao inicializar Google API:", error);
    });
  });
}

google.accounts.id.initialize({
  client_id: CLIENT_ID,
  callback: handleCredentialResponse,
});

// VariÃ¡vel para controle da ediÃ§Ã£o
let currentEditId = null;

// FunÃ§Ã£o para mostrar telas
function showScreen(id) {
  // Método mais robusto que força a ocultação
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.display = 'none';
    screen.classList.remove('active');
  });
  
  const targetScreen = document.getElementById(id);
  if (targetScreen) {
    targetScreen.style.display = 'flex'; // Força o display flex
    targetScreen.classList.add('active');
    console.log('Mostrando tela:', id); // Para debug
  }
}

// Atualiza a interface conforme o estado de login
function updateUI(user) {
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginStatus = document.getElementById('login-status');
  const mainNav = document.getElementById('main-nav');

  if (user) {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none'; // Oculta o botão de registro também
    logoutBtn.style.display = 'inline-block';
    loginStatus.textContent = `Logado como: ${user.email}`;
    mainNav.style.display = 'block';
    showScreen('home'); // Garante que a tela inicial seja mostrada
  } else {
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    loginStatus.textContent = '';
    mainNav.style.display = 'none';
    showScreen('login'); // Mostra a tela de login se não houver usuário
  }
}

// Monitora o estado de autenticaÃ§Ã£o
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("Usuário logado:", user.email);
    document.getElementById('user-email').textContent = `Bem-vindo(a), ${user.email}`;
    loadEvents(user.uid);
  }
  updateUI(user); 
});

// ConfiguraÃ§Ã£o dos event listeners
function setupEventListeners() {
  // NavegaÃ§Ã£o
  document.getElementById('login-btn').addEventListener('click', () => showScreen('login'));
  document.getElementById('register-btn').addEventListener('click', () => showScreen('register'));
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('home-btn').addEventListener('click', () => showScreen('home'));
  document.getElementById('schedule-btn').addEventListener('click', () => showScreen('schedule'));
  document.getElementById('history-btn').addEventListener('click', () => showScreen('history'));

  // AutenticaÃ§Ã£o
  document.getElementById('login-submit').addEventListener('click', login);
  document.getElementById('register-submit').addEventListener('click', register);

  // Agendamentos
  document.getElementById('add-event-btn').addEventListener('click', addEvent);

  // Modal de ediÃ§Ã£o
  document.getElementById('save-edit-btn').addEventListener('click', saveEdit);
  document.getElementById('cancel-edit-btn').addEventListener('click', closeModal);

  // Fecha modal ao clicar fora
  window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('edit-modal')) {
      closeModal();
    }
  });
}

// FunÃ§Ã£o de login
function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorElement = document.getElementById('login-error');

  if (!email || !password) {
    errorElement.textContent = "Por favor, preencha todos os campos.";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById('login-email').value = '';
      document.getElementById('login-password').value = '';
    })
    .catch(error => {
      let errorMessage = "Erro ao fazer login: ";
      switch (error.code) {
        case 'auth/user-not-found': errorMessage += "UsuÃ¡rio nÃ£o encontrado."; break;
        case 'auth/wrong-password': errorMessage += "Senha incorreta."; break;
        case 'auth/invalid-email': errorMessage += "E-mail invÃ¡lido."; break;
        default: errorMessage += error.message;
      }
      errorElement.textContent = errorMessage;
    });
}

// FunÃ§Ã£o de cadastro
function register() {
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const errorElement = document.getElementById('register-error');

  if (!email || !password) {
    errorElement.textContent = "Por favor, preencha todos os campos.";
    return;
  }

  if (password.length < 6) {
    errorElement.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById('register-email').value = '';
      document.getElementById('register-password').value = '';
      showScreen('login');
    })
    .catch(error => {
      let errorMessage = "Erro ao cadastrar: ";
      switch (error.code) {
        case 'auth/email-already-in-use': errorMessage += "E-mail jÃ¡ em uso."; break;
        case 'auth/invalid-email': errorMessage += "E-mail invÃ¡lido."; break;
        case 'auth/weak-password': errorMessage += "Senha muito fraca."; break;
        default: errorMessage += error.message;
      }
      errorElement.textContent = errorMessage;
    });
}

// FunÃ§Ã£o de logout
function logout() {
  auth.signOut().catch(error => {
    alert("Erro ao sair: " + error.message);
  });
}

// Adiciona um novo evento
function addEvent() {
  const user = auth.currentUser;
  const errorElement = document.getElementById('event-error');

  if (!user) {
    errorElement.textContent = "Você precisa estar logado.";
    showScreen('login');
    return;
  }

  const type = document.getElementById("event-type").value;
  const title = document.getElementById("event-title").value.trim();
  const date = document.getElementById("event-date").value;
  const time = document.getElementById("event-time").value;

  if (!title || !date || !time) {
    errorElement.textContent = "Por favor, preencha todos os campos.";
    return;
  }

  const resumo =
    `Tipo: ${type === "medicamento" ? "Lembrete de Medicamento" : "Compromisso Médico"}\n` +
    `Título: ${title}\n` +
    `Data: ${date}\n` +
    `Horário: ${time}\n\nDeseja confirmar?`;

  showConfirmDialog(resumo, () => {
    const event = { type, title, date, time };

    db.ref(`users/${user.uid}/events`).push(event)
    .then(() => {
      document.getElementById("event-title").value = "";
      document.getElementById("event-date").value = "";
      document.getElementById("event-time").value = "";
      errorElement.textContent = "";
      loadEvents(user.uid);
      addToGoogleCalendar(event); // <- aqui
      alert("Evento adicionado com sucesso!");
    })
      .catch(error => {
        errorElement.textContent = "Erro ao salvar: " + error.message;
      });
  });
}



// Abre o modal de ediÃ§Ã£o
// Função para abrir modal de edição (ajustes mínimos)
function openEditModal(eventId, eventData) {
  console.log('Preparando para editar:', eventId, eventData);
  currentEditId = eventId;
  document.getElementById('edit-type').value = eventData.type;
  document.getElementById('edit-title').value = eventData.title;
  document.getElementById('edit-date').value = eventData.date;
  document.getElementById('edit-time').value = eventData.time;
  document.getElementById('edit-error').textContent = '';
  document.getElementById('edit-modal').style.display = 'block';
}

// Função para excluir evento (com mais logs)
function deleteEvent(eventId) {
  if (!confirm("Tem certeza que deseja excluir este agendamento?")) {
    console.log('Exclusão cancelada pelo usuário');
    return;
  }
  
  const user = auth.currentUser;
  if (!user) {
    console.error('Nenhum usuário logado ao tentar excluir');
    return;
  }

  console.log('Enviando exclusão para o Firebase...');
  db.ref(`users/${user.uid}/events/${eventId}`).remove()
    .then(() => {
      console.log('Evento excluído com sucesso!');
      loadEvents(user.uid); // Recarrega a lista
    })
    .catch(error => {
      console.error('Falha ao excluir:', error);
      alert("Erro ao excluir: " + error.message);
    });
}

// Fecha o modal
function closeModal() {
  document.getElementById('edit-modal').style.display = 'none';
  currentEditId = null;
}

// Salva as ediÃ§Ãµes
function saveEdit() {
  const user = auth.currentUser;
  if (!user || !currentEditId) {
    console.error('Usuário não logado ou ID de edição inválido');
    return;
  }

  const type = document.getElementById("edit-type").value;
  const title = document.getElementById("edit-title").value.trim();
  const date = document.getElementById("edit-date").value;
  const time = document.getElementById("edit-time").value;
  const errorElement = document.getElementById('edit-error');

  if (!title || !date || !time) {
    errorElement.textContent = "Por favor, preencha todos os campos.";
    return;
  }

  console.log('Salvando edição para o evento:', currentEditId);
  const updatedEvent = { type, title, date, time };

  db.ref(`users/${user.uid}/events/${currentEditId}`).update(updatedEvent)
    .then(() => {
      console.log('Evento atualizado com sucesso');
      closeModal();
      loadEvents(user.uid); // Recarrega a lista
    })
    .catch(error => {
      console.error('Erro ao atualizar:', error);
      errorElement.textContent = "Erro ao atualizar: " + error.message;
    });
}

// Exclui um evento
function deleteEvent(eventId) {
  console.log('Iniciando exclusão do evento:', eventId); // Debug
  if (!confirm("Tem certeza que deseja excluir este agendamento?")) {
    console.log('Exclusão cancelada pelo usuário');
    return;
  }
  
  const user = auth.currentUser;
  if (!user) {
    console.error('Nenhum usuário logado ao tentar excluir evento');
    return;
  }

  console.log('Enviando exclusão para o Firebase...');
  db.ref(`users/${user.uid}/events/${eventId}`).remove()
    .then(() => {
      console.log('Evento excluído com sucesso');
      loadEvents(user.uid); // Recarrega a lista
    })
    .catch(error => {
      console.error('Erro ao excluir:', error);
      alert("Erro ao excluir: " + error.message);
    });
}

// Carrega os eventos
function loadEvents(uid) {
  const todayList = document.getElementById('today-list');
  const historyList = document.getElementById('history-list');
  todayList.innerHTML = "";
  historyList.innerHTML = "";

  db.ref(`users/${uid}/events`).once("value")
    .then(snapshot => {
      if (!snapshot.exists()) {
        todayList.innerHTML = "<li>Nenhum evento agendado para hoje.</li>";
        historyList.innerHTML = "<li>Nenhum evento no historico.</li>";
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      let hasTodayEvents = false;
      let hasHistoryEvents = false;

      snapshot.forEach(child => {
        const ev = child.val();
        const eventId = child.key;
        const text = `${ev.date} ${ev.time} - ${ev.title} (${ev.type === "medicamento" ? "Lembrete" : "Compromisso"})`;

        // Cria item para o histórico
        const historyLi = document.createElement('li');
        historyLi.className = 'event-item';

        const historyText = document.createElement('span');
        historyText.textContent = text;

        const historyActions = document.createElement('div');
        historyActions.className = 'event-actions';

        const historyEditBtn = document.createElement('button');
        historyEditBtn.className = 'edit-btn';
        historyEditBtn.textContent = 'Editar';
        historyEditBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditModal(eventId, ev);
        });

        const historyDeleteBtn = document.createElement('button');
        historyDeleteBtn.className = 'delete-btn';
        historyDeleteBtn.textContent = 'Excluir';
        historyDeleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteEvent(eventId);
        });

        historyActions.appendChild(historyEditBtn);
        historyActions.appendChild(historyDeleteBtn);

        historyLi.appendChild(historyText);
        historyLi.appendChild(historyActions);
        historyList.appendChild(historyLi);
        hasHistoryEvents = true;

        // Se for evento de hoje, cria outro item separado
        if (ev.date === today) {
          const todayLi = document.createElement('li');
          todayLi.className = 'event-item';

          const todayText = document.createElement('span');
          todayText.textContent = text;

          const todayActions = document.createElement('div');
          todayActions.className = 'event-actions';

          const todayEditBtn = document.createElement('button');
          todayEditBtn.className = 'edit-btn';
          todayEditBtn.textContent = 'Editar';
          todayEditBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(eventId, ev);
          });

          const todayDeleteBtn = document.createElement('button');
          todayDeleteBtn.className = 'delete-btn';
          todayDeleteBtn.textContent = 'Excluir';
          todayDeleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteEvent(eventId);
          });

          todayActions.appendChild(todayEditBtn);
          todayActions.appendChild(todayDeleteBtn);

          todayLi.appendChild(todayText);
          todayLi.appendChild(todayActions);
          todayList.appendChild(todayLi);
          hasTodayEvents = true;
        }
      });

      if (!hasTodayEvents) {
        todayList.innerHTML = "<li>Nenhum evento agendado para hoje.</li>";
      }
      if (!hasHistoryEvents) {
        historyList.innerHTML = "<li>Nenhum evento no historico.</li>";
      }
    })
    .catch(error => {
      console.error("Erro ao carregar eventos:", error);
      todayList.innerHTML = "<li>Erro ao carregar eventos.</li>";
      historyList.innerHTML = "<li>Erro ao carregar histórico.</li>";
    });
}

// Inicializa a aplicaÃ§Ã£o quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initGoogleClient(); // Inicializa Google API
  if (!auth.currentUser) {
    showScreen('login');
  }
});



// Debug temporário (remova depois)
console.log('=== TESTE DE FUNCIONAMENTO DOS BOTÕES ===');
if (auth.currentUser) {
  db.ref(`users/${auth.currentUser.uid}/events`).once('value').then(snap => {
    snap.forEach(child => {
      console.log(`Evento disponível para teste - ID: ${child.key}`, child.val());
    });
  });
}

function showConfirmDialog(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const text = document.getElementById('confirm-text');
  const btnOk = document.getElementById('confirm-ok');
  const btnCancel = document.getElementById('confirm-cancel');

  text.innerHTML = message.replace(/\n/g, "<br>");
  modal.style.display = 'block';

  // Remove handlers anteriores
  const cloneOk = btnOk.cloneNode(true);
  btnOk.parentNode.replaceChild(cloneOk, btnOk);
  const cloneCancel = btnCancel.cloneNode(true);
  btnCancel.parentNode.replaceChild(cloneCancel, btnCancel);

  // Botão Confirmar
  cloneOk.addEventListener('click', () => {
    modal.style.display = 'none';
    onConfirm(); // chama a função passada
  });

  // Botão Cancelar
  cloneCancel.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

function handleCredentialResponse(response) {
  const idToken = response.credential;

  // Firebase Auth com o idToken
  const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
  firebase.auth().signInWithCredential(credential)
    .then(userCredential => {
      console.log("Usuário autenticado com Firebase via Google.");

      // Agora inicializa o OAuth 2 para obter access_token do Google Calendar
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            accessToken = tokenResponse.access_token;
            gapi.client.setToken({ access_token }); // aplica token no client
            console.log("Token de acesso definido para Google Calendar.");
          } else {
            console.error("Erro ao obter token de acesso OAuth:", tokenResponse);
          }
        }
      });

      // Solicita consentimento de acesso (irá abrir popup)
      tokenClient.requestAccessToken();
    })
    .catch(error => {
      console.error("Erro ao autenticar com Firebase:", error);
    });
}

function addToGoogleCalendar(event) {
  if (!accessToken) {
    console.error("Token de acesso ao Google Calendar não disponível.");
    alert("Você precisa autorizar o acesso ao Google Agenda.");
    return;
  }

  const startDateTime = `${event.date}T${event.time}:00`;

  const resource = {
    summary: event.title,
    description: event.type === "medicamento" ? "Lembrete de Medicamento" : "Compromisso Médico",
    start: {
      dateTime: startDateTime,
      timeZone: "America/Sao_Paulo"
    },
    end: {
      dateTime: startDateTime,
      timeZone: "America/Sao_Paulo"
    }
  };

  gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: resource
  }).then(response => {
    console.log('Evento adicionado ao Google Agenda:', response);
  }).catch(error => {
    console.error('Erro ao adicionar ao Google Agenda:', error);
    alert("Erro ao adicionar ao Google Agenda. Verifique se as permissões foram concedidas.");
  });
}



