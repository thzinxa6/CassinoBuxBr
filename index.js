// api/index.js (Backend do CassinoBuxBr, pronto para a nuvem)

const express = require('express');
const cors = require('cors');
const axios =require('axios');

const app = express();

// Nosso cache para guardar os dados dos usuários e evitar sobrecarregar a API da Roblox.
const userCache = new Map();
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // Cache dura 5 minutos

// Middlewares essenciais
app.use(cors());
app.use(express.json());

// --- ENDPOINT PARA BUSCAR USUÁRIO DE FORMA SEGURA (PROXY COM CACHE) ---
// O front-end chama este endpoint para encontrar usuários Roblox.
app.get('/search-user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const usernameKey = username.toLowerCase();

        // 1. VERIFICA SE O USUÁRIO JÁ ESTÁ NO CACHE
        if (userCache.has(usernameKey)) {
            console.log(`[API] Usuário '${username}' encontrado no CACHE.`);
            return res.json(userCache.get(usernameKey));
        }
        
        console.log(`[API] Buscando usuário '${username}' na API da Roblox (CACHE MISS).`);

        // 2. SE NÃO ESTIVER NO CACHE, BUSCA NA API DA ROBLOX
        const userSearchResponse = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${username}&limit=10`);

        if (!userSearchResponse.data || userSearchResponse.data.data.length === 0) {
            return res.status(404).json({ message: 'Usuário Roblox não encontrado.' });
        }
        const user = userSearchResponse.data.data[0];

        const thumbResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${user.id}&size=420x420&format=Png&isCircular=false`);
        const avatarUrl = thumbResponse.data.data[0].imageUrl;
        
        const userData = {
            id: user.id,
            name: user.name,
            displayName: user.displayName,
            avatarUrl: avatarUrl
        };

        // 3. SALVA O RESULTADO COMPLETO NO CACHE
        userCache.set(usernameKey, userData);
        console.log(`[API] Usuário '${username}' salvo no cache.`);
        // Define um tempo para limpar essa entrada do cache
        setTimeout(() => {
            userCache.delete(usernameKey);
            console.log(`[API] Cache para '${username}' expirou e foi removido.`);
        }, CACHE_EXPIRATION_MS);

        // 4. Envia os dados de volta para o front-end
        res.json(userData);

    } catch (error) {
        console.error(`[API] Erro no endpoint /search-user:`, error.message);
        res.status(500).json({ message: 'Erro ao buscar dados na API do Roblox.' });
    }
});


// --- ENDPOINT DE VERIFICAÇÃO ---
// O front-end chama este endpoint para confirmar se o código está na bio do usuário.
app.post('/verify', async (req, res) => {
  try {
    const { userId, verificationCode } = req.body;

    if (!userId || !verificationCode) {
      return res.status(400).json({ success: false, message: 'Dados insuficientes para verificação.' });
    }

    console.log(`[API] Verificando biografia do usuário ID: ${userId}`);
    const userProfileResponse = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    const description = userProfileResponse.data.description;

    if (description && description.includes(verificationCode)) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(200).json({ success: false, message: 'Código não encontrado na sua biografia (no campo "Sobre").' });
    }

  } catch (error) {
    console.error('[API] Erro no endpoint /verify:', error.message);
    return res.status(500).json({ success: false, message: 'Erro interno ao verificar o perfil.' });
  }
});

// A MÁGICA PARA VERCEL/RENDER:
// Em vez de iniciar o servidor com app.listen, nós apenas o exportamos.
// A plataforma de hospedagem se encarregará de executá-lo.
module.exports = app;