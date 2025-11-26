// chatbot-widget.js
(function () {
  const DEFAULTS = {
    primaryColor: "#2563eb",
    bubbleColor: "#e5e7eb",
      botChatColor: "#ffffff",
      userChatColor: "#ffffff",
      chatButtons: "blue",
    logoUrl: "",
    companyName: "Chat Assistant",
    initialGreeting: "Hi! How can I help you?",
    webhookUrl: "",

    chatSessionKey: "sessionId",
    chatInputKey: "userInput",
    replyKey: "output",

    renderPreChatForm: false,
    preChatFormUrl: "",
    sendFormDataWithMessages: true,

    offsetRight: 24,
    offsetBottom: 24,
    zIndex: 999999
  };

  let config = {};
  let dom = {};

  function mergeConfig(user) {
    return { ...DEFAULTS, ...(user || {}) };
  }

  function escapeHtml(s) {
      return s;
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function getSessionId() {
    let id = sessionStorage.getItem("cbw-session-id");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now();
      sessionStorage.setItem("cbw-session-id", id);
    }
    return id;
  }

  function savePreChat(data) {
      sessionStorage.setItem("cbw-prechat", JSON.stringify(data));
  }

  function loadPreChat() {
    const d = sessionStorage.getItem("cbw-prechat");
    return d ? JSON.parse(d) : null;
  }

  //-------------------------------------------------------------
  // HOST
  //-------------------------------------------------------------
  function createHost() {
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.bottom = config.offsetBottom + "px";
    host.style.right = config.offsetRight + "px";
    host.style.zIndex = config.zIndex;
    document.body.appendChild(host);

    dom.shadow = host.attachShadow({ mode: "open" });
  }

  //-------------------------------------------------------------
  // STYLES
  //-------------------------------------------------------------
  function buildStyles() {
    const css = document.createElement("style");
    css.textContent = `
      :host { font-family: system-ui, sans-serif; }

      .cbw-bubble-btn,
      .cbw-bubble-btn-close {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 60px; height: 60px;
        background: var(--chat-buttons-color);
        border-radius: 50%;
        box-shadow: 0 6px 20px rgba(0,0,0,.25);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer;
      }
      .cbw-bubble-btn svg,
      .cbw-bubble-btn-close svg { 
        width: 28px; height: 28px; fill:#fff; 
      }

      .cbw-window {
        width: 400px; background:#fff;
        height: 600px; max-height: 70vh;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,.25);
        display:none; flex-direction:column;
        overflow:hidden;
        animation:fadeIn .25s ease;
        position: absolute;
        bottom: 65px;
        right: 0;
      }

      @keyframes fadeIn {
        from { opacity:0; transform:translateY(10px); }
        to { opacity:1; transform:translateY(0); }
      }

      .cbw-header {
        background: var(--cbw-primary);
        padding:10px; color:#fff;
        display:flex; align-items:center;
      }

      .cbw-header-logo img {
        width: auto;
        max-height: 50px;
      }

      .cbw-body {
        flex:1; overflow-y:auto;
        padding:10px;
        background:#fafafa;
      }

      .cbw-start-btn {
        width:100%; padding:12px;
        background:var(--chat-buttons-color);
        color:#fff; border:none;
        border-radius:6px; cursor:pointer;
      }

      /* Pre-chat form FIXED visibility */
      .cbw-prechat-form {
        display:none;
        padding:10px;
      }

      .cbw-prechat-field { margin-bottom:12px; }
      .cbw-prechat-field label { font-weight:600; margin-bottom:5px; display:block; }
      .cbw-prechat-input {
        width:91%;
        border-radius:6px;
        padding:10px;
        border:1px solid #ccc;
      }
      .cbw-prechat-submit {
        width:100%; margin-top:10px;
        background:var(--cbw-primary);
        border:none; padding:10px; color:#fff;
        border-radius:6px; cursor:pointer;
      }

      .cbw-messages { display:none; }

      .cbw-msg-row { display:flex; margin-bottom:8px; }
      .cbw-msg-row-user { justify-content:flex-end; }
      .cbw-msg-row-bot { justify-content:flex-start; }

      .cbw-msg {
        padding:8px 12px; border-radius:12px;
        max-width:75%; font-size:14px;
      }
      .cbw-msg-user { background:var(--cbw-primary); color:var(--user-chat-color); }
      .cbw-msg-bot { background:var(--cbw-bubble); color:var(--bot-chat-color); }

      .cbw-typing {
        display:none;
        position: absolute;
        border-radius: 12px;
        bottom: 55px;
        left: 15px;
      }
      .cbw-typing span {
        display: inline-block;
        width: 6px;
        height: 6px;
        background: #888;
        border-radius: 50%;
        margin-right: 4px;
        animation: typing 1s infinite;
      }
      .cbw-typing span:nth-child(2) { animation-delay: 0.2s; }
      .cbw-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes typing {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }

      .cbw-footer {
        display:flex; gap:6px;
        border-top:1px solid #ddd;
        padding:8px;
      }
      .cbw-input {
        flex:1; padding:8px;
        border-radius:20px;
        border:1px solid #ccc;
        display:none;
      }
      .cbw-send-btn {
        padding:8px 12px;
        background:var(--cbw-primary);
        color:#fff; border:none;
        border-radius:20px;
        cursor:pointer;
        display:none;
      }
    `;
    return css;
  }

  //-------------------------------------------------------------
  // HTML
  //-------------------------------------------------------------
  function buildHTML() {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="cbw-window">
        <div class="cbw-header">
          <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
            <div class="cbw-header-logo" style="margin-bottom:8px;">
              ${
        config.logoUrl
            ? `<img src="${config.logoUrl}">`
            : `<div style="min-width: 28px;height: 28px;border-radius: 6px;background: #ffffff33;padding: 3px 10px 0px 10px;">Live Chat</div>`
    }
            </div>
            ${
        config.companyName
            ? `<div style="font-size: 12px; color: #ffffffcc; font-weight: 600;">${escapeHtml(config.companyName)}</div>` : ''
    }
            
          </div>
        </div>

        <div class="cbw-body">         
          <button class="cbw-start-btn">
            <svg width="20" viewBox="0 0 24 24" style="fill: white;
    margin-top: -15px;
    position: relative;
    top: 6px;
  right: 3px;">
              <path d="M20 2H4C2.897 2 2 2.897 2 4V22L6 18H20C21.103 18 22 17.103 22 16V4C22 2.897 21.103 2 20 2ZM20 16H5.172L4 17.172V4H20V16Z"/>
              <path d="M7 9H17V11H7zM7 13H14V15H7z"/>
            </svg>
            Start Chat
          </button>

          <form class="cbw-prechat-form">
            <div class="cbw-prechat-field">
              <label>Name *</label>
              <input name="name" class="cbw-prechat-input" required>
            </div>
            <div class="cbw-prechat-field">
              <label>Email *</label>
              <input name="email" class="cbw-prechat-input" required>
            </div>
            <div class="cbw-prechat-field">
              <label>Phone (optional)</label>
              <input name="phone" class="cbw-prechat-input">
            </div>
            <label class="form-error-message" style="color: red; display: none; font-size: 9pt;">Sorry, there was an error submitting your information. Please try again.</label>
            <button class="cbw-prechat-submit" type="submit">Continue</button>
          </form>

          <div class="cbw-messages"></div>
          <div class="cbw-typing">
            <span></span><span></span><span></span>
          </div>
        </div>

        <div class="cbw-footer">
          <input class="cbw-input" placeholder="Type a message...">
          <button class="cbw-send-btn">Send</button>
        </div>
      </div>
      
      <div class="cbw-bubble-btn">
        <svg viewBox="0 0 24 24"><path d="M20 2H4C2.897 2 2 2.897 2 4V22L6 18H20C21.103 18 22 17.103 22 16V4C22 2.897 21.103 2 20 2Z"/></svg>
      </div>
      
      <div class="cbw-bubble-btn-close" style="display:none">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
      </div>
    `;

    dom.bubble = root.querySelector(".cbw-bubble-btn");
      dom.bubbleClose = root.querySelector(".cbw-bubble-btn-close");
      dom.window = root.querySelector(".cbw-window");
    dom.startBtn = root.querySelector(".cbw-start-btn");
    dom.form = root.querySelector(".cbw-prechat-form");
    dom.messages = root.querySelector(".cbw-messages");
      dom.typing = root.querySelector(".cbw-typing");
      dom.input = root.querySelector(".cbw-input");
    dom.sendBtn = root.querySelector(".cbw-send-btn");

    root.style.setProperty("--cbw-primary", config.primaryColor);
    root.style.setProperty("--cbw-bubble", config.bubbleColor);
    root.style.setProperty("--bot-chat-color", config.botChatColor);
    root.style.setProperty("--user-chat-color", config.userChatColor);
    root.style.setProperty("--chat-buttons-color", config.chatButtons);

    return root;
  }

    let formData = {};

  //-------------------------------------------------------------
  // CHAT
  //-------------------------------------------------------------
  function startChat(forceChat=false) {
	  if(config.renderPreChatForm && !forceChat)
	  {
		dom.form.style.display = "block";  
	  } else {		  
		dom.form.style.display = "none";
		dom.messages.style.display = "block";
		dom.input.style.display = "block";
		dom.sendBtn.style.display = "block";

          const formName = dom.form?.name?.value || '';
          const greeting = config.initialGreeting.replace("{name}", formName ? formName : '');
          addMessage(greeting, "bot");
      }
  }

  function addMessage(text, sender) {
    const row = document.createElement("div");
    row.className = `cbw-msg-row cbw-msg-row-${sender}`;

    const msg = document.createElement("div");
    msg.className = `cbw-msg cbw-msg-${sender}`;
    // msg.textContent = text;
    msg.innerHTML = text;

    row.appendChild(msg);
    dom.messages.appendChild(row);
    dom.messages.parentElement.scrollTop = dom.messages.parentElement.scrollHeight;
      // dom.messages.scrollTop = dom.messages.scrollHeight;
  }

  function sendMsg(text) {
    addMessage(text, "user");
    dom.input.value = "";

    const sessionId = getSessionId();
    const pre = loadPreChat();

    const payload = {
      action: "sendMessage",
      sessionId,
      [config.chatSessionKey]: sessionId,
      [config.chatInputKey]: text
    };

    if (config.sendFormDataWithMessages && pre) payload.preChat = pre;

      const formEmail = formData.email;
      if (formEmail) {
          payload.name = formData.name;
          payload.email = formData.email;
          payload.phone = formData.phone;
      }

      dom.typing.style.display = "block";
      fetch(config.webhookUrl, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(payload)
      })
          .then(r => r.json())
          .then(r => {
              dom.typing.style.display = "none";
              addMessage(r[config.replyKey] || "No reply", "bot");
          })
          .catch(() => {
              dom.typing.style.display = "none";
              addMessage("Server error", "bot");
          });
  }

  //-------------------------------------------------------------
  // EVENTS
  //-------------------------------------------------------------
  function attachEvents() {
    dom.messages.style.display = "none";

    dom.bubble.addEventListener("click", () => {
      dom.window.style.display = "flex";
        dom.bubble.style.display = "none";
        dom.bubbleClose.style.display = "flex";
    });

      dom.bubbleClose.addEventListener("click", () => {
          dom.window.style.display = "none";
          dom.bubble.style.display = "flex";
          dom.bubbleClose.style.display = "none";
      });

    dom.startBtn.addEventListener("click", () => {
      dom.startBtn.style.display = "none";

      if (config.renderPreChatForm && !loadPreChat()) {
        dom.form.style.display = "block";
      } else {
        startChat();
      }
    });

      dom.form.addEventListener("submit", async (e) => {
	  e.preventDefault();

        formData = {
            name: dom.form.name.value.trim(),
            email: dom.form.email.value.trim(),
            phone: dom.form.phone.value.trim(),
            sessionId: getSessionId()
        };

          // Send form data to configured backend
	  if (config.preChatFormUrl && config.preChatFormUrl.length > 0) {
		try {
            const errorLabel = dom.form.querySelector('.form-error-message');
            errorLabel.style.display = 'none';

            const response = await fetch(config.preChatFormUrl, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Form submission failed');
            }

            // Save locally
            savePreChat(formData);
            startChat(true);
        } catch (err) {
            console.warn("Pre-chat form submission failed:", err);
            const errorLabel = dom.form.querySelector('.form-error-message');
            errorLabel.style.display = 'block';
            return;
        }
	  }
	});

    dom.sendBtn.addEventListener("click", () => {
      const t = dom.input.value.trim();
      if (t) sendMsg(t);
    });

    dom.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const t = dom.input.value.trim();
        if (t) sendMsg(t);
      }
    });
  }

  //-------------------------------------------------------------
  // INIT
  //-------------------------------------------------------------
  function init(userConfig) {
    config = mergeConfig(userConfig);

    createHost();

    const styles = buildStyles();
    const html = buildHTML();

    dom.shadow.appendChild(styles);
    dom.shadow.appendChild(html);

    attachEvents();
  }

  window.ChatbotWidget = { init };
})();
