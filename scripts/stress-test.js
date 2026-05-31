const axios = require('axios');
const { EventSource } = require('eventsource');

// Парсинг аргументов
const args = process.argv.slice(2);
const BOT_COUNT = parseInt(args[0]) || 20;
const PROD_IP = args[1] || 'localhost';
const PROD_PORT = args[2] || '8080';
const BASE_URL = `http://${PROD_IP}:${PROD_PORT}/api`;

console.log(`Starting SMART stress test with ${BOT_COUNT} bots against ${BASE_URL}`);

const bots = [];
const randomString = (length = 8) => Math.random().toString(36).substring(2, length + 2);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Забавные фразы для имитации общения
const phrases = [
    "Привет! Как дела?", "Отлично, тестируем систему!", "Ого, работает быстро.", 
    "Да, коннект держит.", "А ты видел новые метрики?", "Пока нет, сейчас гляну.",
    "Слушай, а SSE не отваливается?", "У меня всё стабильно.", "Круто, продолжаем нагрузку.",
    "1001001 010101", "🤖 bip-bop", "Кто-нибудь тут живой?", "Да, мы все здесь.",
    "Пинг?", "Понг!", "Кажется, сервер выдерживает.", "Давай еще поддадим трафика."
];

class SmartBot {
    constructor(id) {
        this.id = id;
        this.username = `smartbot_${Date.now()}_${randomString(4)}`;
        this.password = 'password123';
        this.name = `Smart Bot ${id}`;
        this.token = null;
        this.userId = null;
        this.eventSource = null;
        
        // Предотвращение зацикливания ответов (чтобы не отвечал на одно и то же сообщение дважды)
        this.repliedMessages = new Set();
        this.isTyping = false;

        this.client = axios.create({
            baseURL: BASE_URL,
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true // чтобы не падать на 4xx/5xx
        });
        
        this.client.interceptors.request.use((config) => {
            if (this.token) config.headers.Authorization = `Bearer ${this.token}`;
            return config;
        });
    }

    async register() {
        try {
            const res = await this.client.post('/auth/register', {
                name: this.name,
                username: this.username,
                password: this.password
            });
            if (res.status === 200 || res.status === 201) {
                this.token = res.data.accessToken;
                this.userId = res.data.userId;
                console.log(`[Bot ${this.id}] Registered: ${this.username}`);
                return true;
            } else {
                console.error(`[Bot ${this.id}] Reg fail: ${res.status}`);
            }
        } catch (e) {
            console.error(`[Bot ${this.id}] Reg err:`, e.message);
        }
        return false;
    }

    connectSSE() {
        if (!this.token) return;
        return new Promise((resolve) => {
            this.eventSource = new EventSource(`${BASE_URL}/events/stream`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });

            this.eventSource.onopen = () => {
                console.log(`[Bot ${this.id}] SSE Ready`);
            };

            this.eventSource.onerror = (e) => {
                // Ignore silent reconnects
            };

            this.eventSource.onmessage = (e) => {
                try {
                    const eventData = JSON.parse(e.data);
                    
                    if (e.type === 'stream.ready') resolve();
                    
                    // Реакция на новые сообщения
                    if (e.type === 'message.created') {
                        this.handleIncomingMessage(eventData);
                    }
                } catch (err) {}
            };
            
            setTimeout(resolve, 2000);
        });
    }

    async handleIncomingMessage(msg) {
        // Если сообщение от нас самих, игнорируем
        if (msg.senderId === this.userId) return;
        // Если мы уже отвечаем, тоже не берем (простая блокировка)
        if (this.repliedMessages.has(msg.id)) return;
        this.repliedMessages.add(msg.id);

        if (this.isTyping) return; // Бот уже занят ответом кому-то другому
        this.isTyping = true;

        try {
            // 1. Читаем
            await this.client.post(`/conversations/${msg.conversationId}/read`);
            
            // 2. Ждем реакции как человек (1-3 секунды)
            await sleep(randomInt(1000, 3000));
            
            // 3. Печатаем
            await this.client.post(`/conversations/${msg.conversationId}/typing`, { conversationId: msg.conversationId, typing: true });
            await sleep(randomInt(1000, 4000));
            
            // 4. Отправляем ответ
            const phrase = phrases[Math.floor(Math.random() * phrases.length)];
            await this.client.post(`/conversations/${msg.conversationId}/messages`, {
                content: phrase,
                replyToId: msg.id
            });
            console.log(`[Bot ${this.id}] Replied to ${msg.senderName}: "${phrase}"`);
            
            // 5. Перестаем печатать
            await this.client.post(`/conversations/${msg.conversationId}/typing`, { conversationId: msg.conversationId, typing: false });
        } catch (e) {
            // ignore
        } finally {
            this.isTyping = false;
        }
    }

    async initiateConversation() {
        if (this.isTyping) return; // Не начинаем новый, если заняты
        try {
            // Ищем ботов
            const res = await this.client.get(`/users/search?q=smartbot`);
            if (res.status !== 200) return;

            const users = res.data.filter(u => u.id !== this.userId);
            if (users.length === 0) return;

            // Выбираем случайного и пишем
            const target = users[Math.floor(Math.random() * users.length)];
            const convRes = await this.client.post('/conversations', { targetUserId: target.id });
            if (convRes.status !== 200) return;

            const convId = convRes.data.id;
            this.isTyping = true;

            await this.client.post(`/conversations/${convId}/typing`, { conversationId: convId, typing: true });
            await sleep(randomInt(1000, 3000));
            
            const phrase = "Эй, я только что зашел. Проверяем лимиты?";
            await this.client.post(`/conversations/${convId}/messages`, { content: phrase });
            console.log(`[Bot ${this.id}] Started chat with ${target.username}`);
            
            await this.client.post(`/conversations/${convId}/typing`, { conversationId: convId, typing: false });
        } catch (e) {
        } finally {
            this.isTyping = false;
        }
    }

    async syncPresence() {
        await this.client.post('/presence/sync').catch(()=>{});
    }

    async backgroundLoop() {
        while (true) {
            await sleep(randomInt(10000, 30000)); // Раз в 10-30 сек
            await this.syncPresence();
            
            // С небольшим шансом бот сам инициирует диалог
            if (Math.random() < 0.3) {
                await this.initiateConversation();
            }
        }
    }
}

async function main() {
    console.log("=> Initializing SMART bots...");
    for (let i = 0; i < BOT_COUNT; i++) {
        bots.push(new SmartBot(i));
    }

    console.log("=> Registering...");
    for (let i = 0; i < bots.length; i += 10) {
        const chunk = bots.slice(i, i + 10);
        await Promise.all(chunk.map(b => b.register()));
        await sleep(500);
    }

    console.log("=> Connecting to SSE Streams...");
    for (let i = 0; i < bots.length; i += 10) {
        const chunk = bots.slice(i, i + 10);
        await Promise.all(chunk.map(b => b.connectSSE()));
        await sleep(500); // пауза чтобы сервер успел выдать коннекты
    }

    console.log(`\n--- ALL BOTS ARE ONLINE AND LISTENING ---\n`);
    
    // Запускаем фоновые процессы для каждого. 
    // Большая часть их активности теперь реактивная (через onmessage).
    for (const bot of bots) {
        bot.backgroundLoop();
    }

    // "Толчок" системы: один бот начинает первым, чтобы запустить цепную реакцию
    setTimeout(async () => {
        if (bots.length > 1) {
            console.log("=> Initial spark! Bot 0 starts a conversation...");
            await bots[0].initiateConversation();
        }
    }, 2000);
}

main().catch(console.error);
