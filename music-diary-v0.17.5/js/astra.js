// ===== ASTRA ASSISTANT =====

// Astra responses database
const astraResponses = {
  help: {
    'Como editar meu perfil?': `
      <div class="astra-message">
        Oiii! Vou te mostrar! ✨<br><br>
        <strong>Passo 1:</strong> Vá para "Meu perfil"<br>
        <strong>Passo 2:</strong> Clique em "⚙️ Editar perfil quando quiser"<br>
        <strong>Passo 3:</strong> Preencha seus dados: nome, bio, foto e banner<br>
        <strong>Passo 4:</strong> Clique em "Salvar alterações"<br><br>
        Pronto! Seu perfil tá com vibe de protagonista dos anos 2000! 💖
      </div>
    `,
    'Como trocar foto?': `
      <div class="astra-message">
        Miga, bora mudar sua foto! 📸<br><br>
        <strong>Opção 1 (por link):</strong><br>
        - Vá em "Editar perfil"<br>
        - Cole o link da imagem em "Link da foto de perfil"<br>
        - Clique "Carregar foto por link"<br><br>
        <strong>Opção 2 (do computador):</strong><br>
        - Clique em "Upload da foto"<br>
        - Escolha uma imagem do seu PC<br>
        - Ajuste o enquadramento com "Pré-visualizar corte"<br><br>
        Pronto! Sua foto tá pronta! 🚀
      </div>
    `,
    'Como trocar banner?': `
      <div class="astra-message">
        Quer personalizar seu banner? Claro que sim! ✨<br><br>
        <strong>Via link:</strong><br>
        - Vá em "Editar perfil"<br>
        - Cole o link em "Link da capa/banner"<br>
        - Clique "Editar banner" para ajustar<br><br>
        <strong>Via computador:</strong><br>
        - Clique em "Upload do banner"<br>
        - Selecione uma imagem<br><br>
        <strong>Dica:</strong> Seu banner pode ter diferentes aparências no PC e celular! 📱💻
      </div>
    `,
    'Como criar playlist?': `
      <div class="astra-message">
        Vamos criar uma playlist incrível! 🎵<br><br>
        <strong>Passo 1:</strong> Vá para "Playlists"<br>
        <strong>Passo 2:</strong> Clique em "Criar nova playlist"<br>
        <strong>Passo 3:</strong> Escolha um nome legal<br>
        <strong>Passo 4:</strong> Adicione músicas procurando por artista/música<br>
        <strong>Passo 5:</strong> Salve sua playlist<br><br>
        Pronto! Sua playlist tá pronta pra compartilhar! 💿
      </div>
    `,
    'Como postar?': `
      <div class="astra-message">
        Quer compartilhar uma vibe? Let's go! 🎧<br><br>
        <strong>No Feed:</strong><br>
        - Digite o que quer postar na caixinha<br>
        - (Opcional) Adicione um link de música<br>
        - (Opcional) Adicione uma foto/imagem<br>
        - Clique "Postar"<br><br>
        <strong>Dicas:</strong><br>
        - Você pode usar links de YouTube, Spotify e MP3<br>
        - Imagens tornam seus posts mais legais<br><br>
        Vamos lá, mostre sua personalidade! ✨
      </div>
    `,
    'Como mandar mensagem?': `
      <div class="astra-message">
        Quer falar com alguém? Bora! 💬<br><br>
        <strong>Passo 1:</strong> Clique em "Chat" no menu<br>
        <strong>Passo 2:</strong> Procure pelo nome de usuário<br>
        <strong>Passo 3:</strong> Abra a conversa<br>
        <strong>Passo 4:</strong> Digite sua mensagem<br>
        <strong>Passo 5:</strong> Pressione Enter ou clique em enviar<br><br>
        Ops... acho que um satélite passou na frente. Tenta de novo? 🚀
      </div>
    `,
    'Como mudar tema?': `
      <div class="astra-message">
        Quer uma nova vibe visual? Vamo mudar! 🌌<br><br>
        <strong>Temas disponíveis:</strong><br>
        - Sakura (rosa e suave)<br>
        - Frutiger Aero (colorido dos anos 2000)<br>
        - Galaxy (cósmico e dark)<br>
        - Dark (clássico e minimalista)<br><br>
        <strong>Como mudar:</strong><br>
        - Vá em "Editar perfil"<br>
        - Encontre "Tema" e escolha um<br>
        - Salve as alterações<br><br>
        Pronto! Seu Music Diary tem uma vibe nova! ✨
      </div>
    `,
    'Como funcionam notificações?': `
      <div class="astra-message">
        Quer saber tudo que tá acontecendo? 🔔<br><br>
        <strong>Tipos de notificações:</strong><br>
        - <strong>Curtidas:</strong> Quando alguém curte seu post<br>
        - <strong>Comentários:</strong> Quando respondem seus posts<br>
        - <strong>Seguidores:</strong> Quando alguém te segue<br>
        - <strong>Mensagens:</strong> Quando recebe mensagem privada<br><br>
        <strong>Como ver:</strong><br>
        - Clique no sino 🔔 no topo da página<br>
        - Lá aparece tudo que é novo!<br><br>
        Balãozinho = mensagens • Sino = notificações! 💖
      </div>
    `
  },
  tips: [
    "Você pode personalizar seu perfil com temas diferentes. Escolha um que combine com você! 🎨",
    "Mensagens ficam no balãozinho 💬, notificações ficam no sino 🔔. Não confunde! 😄",
    "Você pode enviar imagens pelo computador usando upload. Suas fotos ficarão mais legais! 📸",
    "Seu banner pode ter ajustes diferentes no PC e no celular. Fica atento! 📱💻",
    "Siga pessoas que gostam das mesmas músicas que você! É assim que a comunidade cresce. 💖",
    "Dica da Astra: Playlists públicas são ótimas pra compartilhar suas vibes musicais! 🎧",
    "Você pode editar seus posts depois de publicar. Sem pressure, miga! ✨",
    "Os temas Y2K deixam seu perfil nostálgico dos anos 2000. Qual é seu favorito? 💿"
  ],
  missions: [
    { id: 'mission-photo', text: 'Coloque uma foto de perfil', emoji: '📸' },
    { id: 'mission-banner', text: 'Escolha um banner legal', emoji: '🖼️' },
    { id: 'mission-bio', text: 'Escreva sua bio', emoji: '✍️' },
    { id: 'mission-music', text: 'Adicione uma música no perfil', emoji: '🎵' },
    { id: 'mission-playlist', text: 'Crie uma playlist', emoji: '📝' },
    { id: 'mission-post', text: 'Faça seu primeiro post', emoji: '📢' },
    { id: 'mission-follow', text: 'Siga alguém', emoji: '👥' },
    { id: 'mission-message', text: 'Envie uma mensagem', emoji: '💬' }
  ]
};

// Initialize Astra
function initAstra() {
  createAstraButton();
  createAstraPanel();
  setupEventListeners();
  loadMissionProgress();
}

function createAstraButton() {
  const button = document.createElement('button');
  button.id = 'astraButton';
  button.innerHTML = '🚀 Astra';
  button.type = 'button';
  button.title = 'Abrir assistente Astra';
  document.body.appendChild(button);
}

function createAstraPanel() {
  const panel = document.createElement('div');
  panel.id = 'astraPanel';
  panel.className = 'hidden';
  panel.innerHTML = `
    <div class="astra-header">
      <h3>✨ Astra - Assistente do Music Diary</h3>
      <button class="astra-close-btn" type="button">×</button>
    </div>
    
    <div class="astra-tabs">
      <button class="astra-tab-btn active" data-tab="help" type="button">Ajuda</button>
      <button class="astra-tab-btn" data-tab="missions" type="button">Missões</button>
      <button class="astra-tab-btn" data-tab="tips" type="button">Dicas</button>
    </div>
    
    <div class="astra-content">
      <!-- Help Tab -->
      <div class="astra-tab active" data-tab-content="help">
        <div class="astra-message">Oiiii! Eu sou a Astra! ✨<br>Vou te ajudar a explorar o Music Diary!</div>
        ${Object.keys(astraResponses.help).map(q => `<button class="astra-question" data-question="${q}" type="button">${q}</button>`).join('')}
      </div>
      
      <!-- Missions Tab -->
      <div class="astra-tab" data-tab-content="missions">
        <div class="astra-message">🎯 Missões da Astra<br>Complete os primeiros passos!</div>
        <ul class="astra-checklist">
          ${astraResponses.missions.map(m => `<li data-mission="${m.id}"><input type="checkbox" class="mission-checkbox"> ${m.emoji} ${m.text}</li>`).join('')}
        </ul>
      </div>
      
      <!-- Tips Tab -->
      <div class="astra-tab" data-tab-content="tips">
        <div class="astra-message">💡 Dicas da Astra</div>
        ${astraResponses.tips.map(tip => `<div class="astra-tip">${tip}</div>`).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(panel);
}

function setupEventListeners() {
  const button = document.getElementById('astraButton');
  const panel = document.getElementById('astraPanel');
  const closeBtn = panel.querySelector('.astra-close-btn');
  const tabBtns = panel.querySelectorAll('.astra-tab-btn');
  const questionBtns = panel.querySelectorAll('.astra-question');
  const missionCheckboxes = panel.querySelectorAll('.mission-checkbox');

  // Toggle panel
  button.addEventListener('click', () => {
    panel.classList.toggle('hidden');
  });

  // Close panel
  closeBtn.addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Question answers
  questionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const question = btn.getAttribute('data-question');
      const answer = astraResponses.help[question];
      const content = panel.querySelector('.astra-content');
      const helpTab = content.querySelector('[data-tab-content="help"]');
      
      // Show answer or back to questions
      if (helpTab.querySelector('.astra-answer')) {
        helpTab.innerHTML = `
          <button class="astra-question" id="backBtn" type="button">← Voltar</button>
          <div class="astra-answer">${answer}</div>
        `;
        helpTab.querySelector('#backBtn').addEventListener('click', () => {
          location.reload(); // Simple way to reset
        });
      } else {
        helpTab.innerHTML = `
          <button class="astra-question" id="backBtn" type="button">← Voltar</button>
          <div class="astra-answer">${answer}</div>
        `;
        helpTab.querySelector('#backBtn').addEventListener('click', () => {
          location.reload();
        });
      }
    });
  });

  // Mission checkboxes
  missionCheckboxes.forEach(checkbox => {
    const li = checkbox.closest('li');
    const missionId = li.getAttribute('data-mission');
    
    // Load saved state
    if (localStorage.getItem(missionId)) {
      checkbox.checked = true;
      li.classList.add('checked');
    }
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        li.classList.add('checked');
        localStorage.setItem(missionId, 'true');
      } else {
        li.classList.remove('checked');
        localStorage.removeItem(missionId);
      }
    });
  });
}

function switchTab(tabName) {
  const panel = document.getElementById('astraPanel');
  const tabs = panel.querySelectorAll('.astra-tab');
  const tabBtns = panel.querySelectorAll('.astra-tab-btn');

  // Hide all tabs
  tabs.forEach(tab => tab.classList.remove('active'));
  tabBtns.forEach(btn => btn.classList.remove('active'));

  // Show selected tab
  panel.querySelector(`[data-tab-content="${tabName}"]`).classList.add('active');
  panel.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

function loadMissionProgress() {
  const checkboxes = document.querySelectorAll('.mission-checkbox');
  checkboxes.forEach(checkbox => {
    const li = checkbox.closest('li');
    const missionId = li.getAttribute('data-mission');
    if (localStorage.getItem(missionId)) {
      checkbox.checked = true;
      li.classList.add('checked');
    }
  });
}

// Close panel when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('astraPanel');
  const button = document.getElementById('astraButton');
  
  if (panel && !panel.classList.contains('hidden')) {
    if (!panel.contains(e.target) && !button.contains(e.target)) {
      panel.classList.add('hidden');
    }
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAstra);
} else {
  initAstra();
}
