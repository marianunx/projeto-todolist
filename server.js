// Importação dos módulos necessários
const express = require('express');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Inicialização do aplicativo Express
const app = express();
const PORT = process.env.PORT || 3000;
const TASKS_FILE = './tasks.json';

// Middlewares
app.use(cors()); // Permite requisições de outras origens (seu front-end)
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições
app.use(express.static('public')); // Serve os arquivos estáticos da pasta 'public'

// --- Funções Auxiliares para Manipular o Arquivo de Tarefas ---

// Função para ler as tarefas do arquivo JSON
const readTasks = () => {
  if (!fs.existsSync(TASKS_FILE)) {
    return []; // Se o arquivo não existe, retorna um array vazio
  }
  const data = fs.readFileSync(TASKS_FILE);
  return JSON.parse(data);
};

// Função para escrever as tarefas no arquivo JSON
const writeTasks = (tasks) => {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
};


// --- Rotas da API (Endpoints) ---

// [GET] /api/tasks?email=... - Obter tarefas por e-mail
app.get('/api/tasks', (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ message: 'O e-mail é obrigatório.' });
  }
  const tasks = readTasks();
  const userTasks = tasks.filter(task => task.email === email);
  res.json(userTasks);
});

// [POST] /api/tasks - Criar uma nova tarefa
app.post('/api/tasks', (req, res) => {
  const { email, description } = req.body;
  if (!email || !description) {
    return res.status(400).json({ message: 'E-mail e descrição são obrigatórios.' });
  }

  const tasks = readTasks();
  const newTask = {
    id: Date.now(), // ID único baseado no timestamp
    email,
    description,
    completed: false
  };

  tasks.push(newTask);
  writeTasks(tasks);
  res.status(201).json(newTask);
});

// [PUT] /api/tasks/:id - Atualizar o status de uma tarefa
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  const tasks = readTasks();
  const taskIndex = tasks.findIndex(task => task.id == id);

  if (taskIndex === -1) {
    return res.status(404).json({ message: 'Tarefa não encontrada.' });
  }

  tasks[taskIndex].completed = completed;
  writeTasks(tasks);
  res.json(tasks[taskIndex]);
});

// [DELETE] /api/tasks/:id - Excluir uma tarefa
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  
  let tasks = readTasks();
  const filteredTasks = tasks.filter(task => task.id != id);

  if (tasks.length === filteredTasks.length) {
      return res.status(404).json({ message: 'Tarefa não encontrada.' });
  }
  
  writeTasks(filteredTasks);
  res.status(200).json({ message: 'Tarefa excluída com sucesso.' });
});


// --- Sistema de Alerta por E-mail ---

// Configuração do Nodemailer (transporter)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, // true para porta 465, false para outras
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
});

// Função para enviar os e-mails
const sendEmailAlerts = () => {
  console.log('Executando verificação diária de tarefas pendentes...');
  const tasks = readTasks();
  const pendingTasksByUser = {};

  // Agrupa tarefas pendentes por usuário
  tasks.forEach(task => {
    if (!task.completed) {
      if (!pendingTasksByUser[task.email]) {
        pendingTasksByUser[task.email] = [];
      }
      pendingTasksByUser[task.email].push(task.description);
    }
  });

  // Envia um e-mail para cada usuário com tarefas pendentes
  for (const email in pendingTasksByUser) {
    const userTasks = pendingTasksByUser[email];
    const mailOptions = {
      from: `"Seu Lembrete de Tarefas" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Você tem tarefas pendentes! 📝',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Olá! ✨</h2>
          <p>Só passando para lembrar que você tem algumas coisinhas para fazer:</p>
          <ul>
            ${userTasks.map(desc => `<li style="margin-bottom: 5px;">${desc}</li>`).join('')}
          </ul>
          <p>Vamos lá, você consegue!</p>
          <p><em>Atenciosamente,<br>Seu Assistente de Tarefas</em></p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.error(`Erro ao enviar e-mail para ${email}:`, error);
      }
      console.log(`E-mail de lembrete enviado para ${email}: ${info.response}`);
    });
  }
};

// Agenda a tarefa para rodar todo dia às 9h da manhã
// Formato: (segundo minuto hora dia-do-mês mês dia-da-semana)
cron.schedule('0 9 * * *', sendEmailAlerts, {
  timezone: "America/Sao_Paulo"
});


// --- Inicialização do Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Front-end disponível em http://localhost:${PORT}`);
});