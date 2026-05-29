const axios = require('axios');
const { EventSource } = require('eventsource');

// Парсинг аргументов
const args = process.argv.slice(2);
const BOT_COUNT = parseInt(args[0]) || 10;
const PROD_IP = args[1] || 'localhost';
const PROD_PORT = args[2] || '8080';
const BASE_URL = `http://${PROD_IP}:${PROD_PORT}/api`;

console.log(`Starting stress test with ${BOT_COUNT} bots against ${BASE_URL}`);

const bots = [];

// Вспомогательная функция для генерации случайных строк
const randomString = (length = 8) => Math.random().toString(36).substring(2, length + 2);

// Функция задержки
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ChatBot {
    constructor(id) {
        this.id = id;
        this.username = `bot_${Date.now()}_${randomString(4)}`;
        this.password = 'password123';
        this.name = `Bot User ${id}`;
        this.token = null;
        this.userId = null;
        this.conversations = [];
        this.eventSource = null;

        this.client = axios.create({
            baseURL: BASE_URL,
            headers: { 'Content-Type': 'application/json' }
        });
        
        this.client.interceptors.request.use((config) => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
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
            this.token = res.data.accessToken;
            this.userId = res.data.userId;
            console.log(`[Bot ${this.id}] Registered and logged in.`);
        } catch (e) {
            console.error(`[Bot ${this.id}] Registration failed:`, e.response?.data || e.message);
        }
    }

    connectSSE() {
        if (!this.token) return;
        this.eventSource = new EventSource(`${BASE_URL}/events/stream`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });

        this.eventSource.onopen = () => console.log(`[Bot ${this.id}] SSE connected`);
        this.eventSource.onerror = (e) => console.error(`[Bot ${this.id}] SSE error`);
        this.eventSource.onmessage = (e) => {
            // Обработка входящих событий, чтобы нагрузить клиентскую часть парсингом
            try {
                const event = JSON.parse(e.data);
                // console.log(`[Bot ${this.id}] received event ${e.type}`);
            } catch (err) {}
        };
    }

    async syncPresence() {
        try {
            await this.client.post('/presence/sync');
        } catch (e) {
            // ignore
        }
    }

    async searchAndOpenDialog() {
        try {
            // Ищем других ботов
            const res = await this.client.get(`/users/search?q=bot`);
            const users = res.data.filter(u => u.id !== this.userId);
            if (users.length > 0) {
                const target = users[Math.floor(Math.random() * users.length)];
                const convRes = await this.client.post('/conversations', { targetUserId: target.id });
                this.conversations.push(convRes.data.id);
                console.log(`[Bot ${this.id}] Opened dialog with ${target.username}`);
            }
        } catch (e) {
            console.error(`[Bot ${this.id}] Search/Open failed:`, e.response?.status);
        }
    }

    async fetchMessages() {
        if (this.conversations.length === 0) return;
        const convId = this.conversations[Math.floor(Math.random() * this.conversations.length)];
        try {
            await this.client.get(`/conversations/${convId}/messages?page=0&size=20`);
        } catch (e) {
            // ignore
        }
    }

    async sendMessage() {
        if (this.conversations.length === 0) return;
        const convId = this.conversations[Math.floor(Math.random() * this.conversations.length)];
        try {
            await this.client.post(`/conversations/${convId}/messages`, {
                content: `Hello from bot ${this.id} at ${new Date().toISOString()}`
            });
            console.log(`[Bot ${this.id}] Sent message to conv ${convId}`);
        } catch (e) {
            console.error(`[Bot ${this.id}] Send message failed:`, e.response?.status);
        }
    }

    async runBehaviorLoop() {
        while (true) {
            await sleep(1000 + Math.random() * 4000); // Случайная задержка 1-5 сек

            const actions = [
                () => this.searchAndOpenDialog(),
                () => this.fetchMessages(),
                () => this.sendMessage(),
                () => this.syncPresence()
            ];

            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            await randomAction();
        }
    }
}

async function main() {
    // 1. Инициализация и регистрация ботов с небольшой задержкой (чтобы не забанило rate limiter'ом сразу)
    for (let i = 0; i < BOT_COUNT; i++) {
        const bot = new ChatBot(i);
        bots.push(bot);
        await bot.register();
        await sleep(200); // 200ms между регистрациями
    }

    // 2. Подключение к SSE (WebSocket/EventStream)
    for (const bot of bots) {
        bot.connectSSE();
        await sleep(100);
    }

    // 3. Запуск циклов поведения
    console.log(`\n--- All bots registered and connected. Starting behavior loops. ---\n`);
    for (const bot of bots) {
        bot.runBehaviorLoop(); // Без await, чтобы они работали параллельно
    }
}

main().catch(console.error);
