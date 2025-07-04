const express = require('express');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const TASKS_FILE = path.join(__dirname, 'tasks.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const readData = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
        const data = fs.readFileSync(filePath);
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
};

const writeData = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};


app.post('/api/user/preferences', (req, res) => {
    const { email, notificationTime } = req.body;
    if (!email || !notificationTime) {
        return res.status(400).json({ message: 'E-mail e horário são obrigatórios.' });
    }

    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(user => user.email === email);

    if (userIndex !== -1) {
        users[userIndex].notificationTime = notificationTime;
    } else {
        users.push({ email, notificationTime });
    }
    
    writeData(USERS_FILE, users);
    res.status(200).json({ message: 'Preferências salvas com sucesso.' });
});

app.get('/api/tasks', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'O e-mail é obrigatório.' });
    const tasks = readData(TASKS_FILE);
    res.json(tasks.filter(task => task.email === email));
});

app.post('/api/tasks', (req, res) => {
    const { email, description } = req.body;
    if (!email || !description) return res.status(400).json({ message: 'E-mail e descrição são obrigatórios.' });
    const tasks = readData(TASKS_FILE);
    const newTask = { id: Date.now(), email, description, completed: false };
    tasks.push(newTask);
    writeData(TASKS_FILE, tasks);
    res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    const tasks = readData(TASKS_FILE);
    const taskIndex = tasks.findIndex(task => task.id == id);
    if (taskIndex === -1) return res.status(404).json({ message: 'Tarefa não encontrada.' });
    tasks[taskIndex].completed = completed;
    writeData(TASKS_FILE, tasks);
    res.json(tasks[taskIndex]);
});

app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    let tasks = readData(TASKS_FILE);
    const filteredTasks = tasks.filter(task => task.id != id);
    if (tasks.length === filteredTasks.length) return res.status(404).json({ message: 'Tarefa não encontrada.' });
    writeData(TASKS_FILE, filteredTasks);
    res.status(200).json({ message: 'Tarefa excluída com sucesso.' });
});

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, port: process.env.EMAIL_PORT, secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

cron.schedule('* * * * *', () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    console.log(`[${new Date().toLocaleString('pt-BR')}] Verificando agendamentos para ${currentTime}`);

    const users = readData(USERS_FILE);
    const allTasks = readData(TASKS_FILE);

    const usersToNotify = users.filter(user => user.notificationTime === currentTime);

    if (usersToNotify.length === 0) return;

    console.log(`Encontrado(s) ${usersToNotify.length} usuário(s) para notificar.`);

    usersToNotify.forEach(user => {
        const pendingTasks = allTasks.filter(task => task.email === user.email && !task.completed);

        if (pendingTasks.length > 0) {
            console.log(`Enviando e-mail para ${user.email} com ${pendingTasks.length} tarefa(s).`);
            const mailOptions = {
                from: `"Seu Lembrete de Tarefas" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: 'Você tem tarefas pendentes! 📝',
                html: `
                  <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Olá! ✨</h2>
                    <p>Só passando para lembrar que você tem algumas coisinhas para fazer às ${user.notificationTime}:</p>
                    <ul>
                      ${pendingTasks.map(task => `<li style="margin-bottom: 5px;">${task.description}</li>`).join('')}
                    </ul>
                    <p>Vamos lá, você consegue!</p>
                  </div>
                `,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) return console.error(`Erro ao enviar e-mail para ${user.email}:`, error);
                console.log(`E-mail de lembrete enviado para ${user.email}: ${info.response}`);
            });
        }
    });
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});