// script.js (LÓGICA DA PÁGINA DE LOGIN/VERIFICAÇÃO ATUALIZADA)

// --- Elementos do DOM ---
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const searchBtn = document.getElementById('searchBtn');
const verifyBtn = document.getElementById('verifyBtn');
const usernameInput = document.getElementById('username');
const searchResultEl = document.getElementById('search-result');
const phraseEl = document.getElementById('verificationPhrase');
const profileLink = document.getElementById('profileLink');
const messageEl = document.getElementById('message');
const userAvatarContainer = document.getElementById('user-avatar-container');
const animatedTextElement = document.querySelector('.animated-text');

// --- Estado da Aplicação ---
let state = {
    username: '',
    userId: null,
    verificationCode: '',
    avatarUrl: ''
};

// --- Gerador de Frase Aleatória ---
const words = {
    adjectives: ["Urso", "Leão", "Tigre", "Lobo", "Raposa", "Falcão", "Dragão", "Fantasma", "Sombra", "Trovão"],
    nouns: ["Astuto", "Valente", "Rápido", "Brilhante", "Sombrio", "Dourado", "Místico", "Veloz", "Poderoso", "Secreto"],
    verbs: ["Corre", "Salta", "Voa", "Brilha", "Ruge", "Caça", "Dança", "Luta", "Sonha", "Vence"]
};
function generateVerificationPhrase() {
    const adj = words.adjectives[Math.floor(Math.random() * words.adjectives.length)];
    const noun = words.nouns[Math.floor(Math.random() * words.nouns.length)];
    const verb = words.verbs[Math.floor(Math.random() * words.verbs.length)];
    return `${adj} ${noun} ${verb}`;
}

// --- Funções da UI ---
function showMessage(type, text) {
    messageEl.textContent = text || '';
    messageEl.className = 'message';
    if (type) {
        messageEl.classList.add(type);
    }
}

function renderSearchResult(user) {
    searchResultEl.innerHTML = `
        <div class="user-card" data-userid="${user.id}" data-username="${user.name}">
            <img src="${user.avatarUrl}" alt="Avatar de ${user.name}">
            <span>${user.name}</span>
        </div>
    `;
    searchResultEl.classList.remove('hidden');
    document.querySelector('.user-card').addEventListener('click', handleUserSelection);
}

// --- Lógica Principal ---
function startTypewriter() {
    const textToAnimate = animatedTextElement.dataset.text;
    if (!textToAnimate) return;
    animatedTextElement.textContent = '';
    let i = 0;
    const typingSpeed = 70;

    function type() {
      if (i < textToAnimate.length) {
        animatedTextElement.textContent += textToAnimate.charAt(i);
        i++;
        setTimeout(type, typingSpeed);
      } else {
        animatedTextElement.style.borderRightColor = 'transparent';
      }
    }
    type();
}
window.addEventListener('load', () => {
    setTimeout(startTypewriter, 500);
});

searchBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    if (!username) {
        showMessage('error', 'Por favor, digite um nome de usuário.');
        return;
    }
    showMessage('loading', 'Buscando...');
    searchResultEl.classList.add('hidden');

    try {
        const response = await fetch(`http://localhost:3000/search-user/${username}`);
        const userData = await response.json();

        if (!response.ok) {
            throw new Error(userData.message || 'Erro ao buscar usuário.');
        }

        state.avatarUrl = userData.avatarUrl;
        renderSearchResult(userData);
        showMessage();

    } catch (error) {
        showMessage('error', error.message);
    }
});

function handleUserSelection(event) {
    const userCard = event.currentTarget;
    state.username = userCard.dataset.username;
    state.userId = userCard.dataset.userid;
    state.verificationCode = generateVerificationPhrase();

    phraseEl.textContent = state.verificationCode;
    profileLink.href = `https://www.roblox.com/users/${state.userId}/profile`;
    userAvatarContainer.innerHTML = `<img src="${state.avatarUrl}" alt="Avatar de ${state.username}">`;
    
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    step2.classList.add('fade-in');
    
    showMessage();
}

verifyBtn.addEventListener('click', async () => {
    showMessage('loading', 'Verificando...');
    verifyBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.userId,
                verificationCode: state.verificationCode
            })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            showMessage('success', 'Verificado com sucesso! Redirecionando...');
            verifyBtn.textContent = "Verificado!";
            
            // 1. Salva o nome de usuário na memória do navegador para a próxima página usar
            sessionStorage.setItem('verifiedUser', state.username);
            
            // 2. Aguarda 2 segundos para o usuário ler a mensagem e depois redireciona
            setTimeout(() => {
                window.location.href = 'site/site.html'; // <<< ESTA É A LINHA ATUALIZADA
            }, 2000);

        } else {
            showMessage('error', data.message || 'Ocorreu um erro desconhecido.');
            verifyBtn.disabled = false;
        }

    } catch (error) {
        showMessage('error', 'Não foi possível conectar ao servidor.');
        verifyBtn.disabled = false;
    }
});