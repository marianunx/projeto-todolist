document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos do DOM ---
    const loginArea = document.getElementById('login-area');
    const welcomeArea = document.getElementById('welcome-area');
    const mainContent = document.getElementById('main-content');
    
    const emailInput = document.getElementById('email-input');
    const loadTasksBtn = document.getElementById('load-tasks-btn');
    const errorMessage = document.getElementById('error-message');
    
    const welcomeUser = document.querySelector('.welcome-user');
    const taskCount = document.getElementById('task-count');
    
    const addTaskForm = document.getElementById('add-task-form');
    const newTaskInput = document.getElementById('new-task-input');
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');

    let currentUserEmail = '';
    let tasks = []; // Armazena a lista de tarefas localmente
    const API_URL = 'http://localhost:3000/api';

    // --- Funções Auxiliares de UI ---
    
    // Atualiza o contador de tarefas pendentes
    const updateTaskSummary = () => {
        const pendingTasks = tasks.filter(task => !task.completed).length;
        if (pendingTasks === 0) {
            taskCount.textContent = 'Você não tem tarefas pendentes! 🎉';
        } else if (pendingTasks === 1) {
            taskCount.textContent = 'Você tem 1 tarefa pendente.';
        } else {
            taskCount.textContent = `Você tem ${pendingTasks} tarefas pendentes.`;
        }
    };

    // Verifica se a lista está vazia para mostrar/esconder a mensagem
    const checkEmptyState = () => {
        emptyState.classList.toggle('hidden', tasks.length > 0);
    };

    // --- Funções de Renderização e API ---

    // Renderiza uma única tarefa na lista
    const renderTask = (task) => {
        const li = document.createElement('li');
        li.dataset.taskId = task.id;
        if (task.completed) li.classList.add('completed');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTaskCompletion(task.id, checkbox.checked));

        const span = document.createElement('span');
        span.textContent = task.description;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteBtn);
        taskList.insertBefore(li, emptyState); // Insere antes do emptyState
    };
    
    // Carrega as tarefas do usuário
    const loadTasks = async () => {
        errorMessage.textContent = '';
        const email = emailInput.value.trim();
        if (!email) {
            errorMessage.textContent = 'Por favor, insira um e-mail válido.';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/tasks?email=${encodeURIComponent(email)}`);
            if (!response.ok) throw new Error('Não foi possível carregar as tarefas.');
            
            tasks = await response.json(); // Atualiza a lista local
            currentUserEmail = email;

            document.querySelectorAll('#task-list li').forEach(li => li.remove());
            tasks.forEach(renderTask);

            // Atualiza a UI
            welcomeUser.textContent = `Olá, ${currentUserEmail.split('@')[0]}!`;
            updateTaskSummary();
            checkEmptyState();

            // Transição de telas
            loginArea.classList.add('hidden');
            welcomeArea.classList.remove('hidden');
            mainContent.classList.remove('hidden');

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    };
    
    // Adiciona uma nova tarefa
    const addTask = async (event) => {
        event.preventDefault();
        const description = newTaskInput.value.trim();
        if (!description) return;

        try {
            const response = await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUserEmail, description }),
            });
            if (!response.ok) throw new Error('Não foi possível adicionar a tarefa.');
            
            const newTask = await response.json();
            tasks.push(newTask); // Adiciona na lista local
            renderTask(newTask);
            
            newTaskInput.value = '';
            updateTaskSummary();
            checkEmptyState();
        } catch (error) {
            alert(error.message);
        }
    };

    // Altera o status de uma tarefa
    const toggleTaskCompletion = async (taskId, completed) => {
        const task = tasks.find(t => t.id == taskId);
        if (task) task.completed = completed; // Atualiza o estado local primeiro

        const li = document.querySelector(`li[data-task-id='${taskId}']`);
        li.classList.toggle('completed', completed);
        updateTaskSummary(); // Atualiza o contador
        
        try {
            await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed }),
            });
        } catch (error) {
            alert('Erro ao sincronizar. Revertendo alteração.');
            task.completed = !completed; // Reverte se der erro
            li.classList.toggle('completed', !completed);
            updateTaskSummary();
        }
    };
    
    // Deleta uma tarefa
    const deleteTask = async (taskId) => {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
        
        try {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
            
            tasks = tasks.filter(t => t.id != taskId); // Remove da lista local
            document.querySelector(`li[data-task-id='${taskId}']`).remove();
            
            updateTaskSummary();
            checkEmptyState();
        } catch (error) {
            alert('Não foi possível excluir a tarefa.');
        }
    };

    // --- Event Listeners ---
    loadTasksBtn.addEventListener('click', loadTasks);
    addTaskForm.addEventListener('submit', addTask);
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadTasks();
    });
});