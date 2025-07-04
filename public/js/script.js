document.addEventListener('DOMContentLoaded', () => {
    const loginArea = document.getElementById('login-area');
    const welcomeArea = document.getElementById('welcome-area');
    const mainContent = document.getElementById('main-content');
    
    const emailInput = document.getElementById('email-input');
    const timeInput = document.getElementById('time-input');
    const loadTasksBtn = document.getElementById('load-tasks-btn');
    const errorMessage = document.getElementById('error-message');
    
    const welcomeUser = document.querySelector('.welcome-user');
    const taskCount = document.getElementById('task-count');
    const addTaskForm = document.getElementById('add-task-form');
    const newTaskInput = document.getElementById('new-task-input');
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');

    let currentUserEmail = '';
    let tasks = [];
    const API_URL = 'http://localhost:3001/api';

    const loginAndLoadTasks = async () => {
        errorMessage.textContent = '';
        const email = emailInput.value.trim();
        const notificationTime = timeInput.value;

        if (!email) {
            errorMessage.textContent = 'Por favor, insira um e-mail válido.';
            return;
        }

        try {
            await fetch(`${API_URL}/user/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, notificationTime }),
            });

            const response = await fetch(`${API_URL}/tasks?email=${encodeURIComponent(email)}`);
            if (!response.ok) throw new Error('Não foi possível carregar as tarefas.');
            
            tasks = await response.json();
            currentUserEmail = email;

            document.querySelectorAll('#task-list li').forEach(li => li.remove());
            tasks.forEach(renderTask);

            welcomeUser.textContent = `Olá, ${currentUserEmail.split('@')[0]}!`;
            updateTaskSummary();
            checkEmptyState();

            loginArea.classList.add('hidden');
            welcomeArea.classList.remove('hidden');
            mainContent.classList.remove('hidden');

        } catch (error) {
            errorMessage.textContent = `Ocorreu um erro: ${error.message}`;
        }
    };

    const updateTaskSummary = () => {
        const pendingTasks = tasks.filter(task => !task.completed).length;
        if (pendingTasks === 0) { taskCount.textContent = 'Você não tem tarefas pendentes! '; } 
        else if (pendingTasks === 1) { taskCount.textContent = 'Você tem 1 tarefa pendente.'; } 
        else { taskCount.textContent = `Você tem ${pendingTasks} tarefas pendentes.`; }
    };
    const checkEmptyState = () => { 
        emptyState.classList.toggle('hidden', tasks.length > 0);
    };
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
        taskList.insertBefore(li, emptyState);
    };
    const addTask = async (event) => { 
        event.preventDefault();
        const description = newTaskInput.value.trim();
        if (!description) return;
        try {
            const response = await fetch(`${API_URL}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: currentUserEmail, description }), });
            if (!response.ok) throw new Error('Não foi possível adicionar a tarefa.');
            const newTask = await response.json();
            tasks.push(newTask);
            renderTask(newTask);
            newTaskInput.value = '';
            updateTaskSummary();
            checkEmptyState();
        } catch (error) { alert(error.message); }
    };
    const toggleTaskCompletion = async (taskId, completed) => { 
        const task = tasks.find(t => t.id == taskId);
        if (task) task.completed = completed;
        document.querySelector(`li[data-task-id='${taskId}']`).classList.toggle('completed', completed);
        updateTaskSummary();
        try {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed }), });
        } catch (error) {
            alert('Erro ao sincronizar.');
            task.completed = !completed;
            document.querySelector(`li[data-task-id='${taskId}']`).classList.toggle('completed', !completed);
            updateTaskSummary();
        }
    };
    const deleteTask = async (taskId) => { 
        if (!confirm('Tem certeza?')) return;
        try {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
            tasks = tasks.filter(t => t.id != taskId);
            document.querySelector(`li[data-task-id='${taskId}']`).remove();
            updateTaskSummary();
            checkEmptyState();
        } catch (error) { alert('Não foi possível excluir a tarefa.'); }
    };

    loadTasksBtn.addEventListener('click', loginAndLoadTasks);
    addTaskForm.addEventListener('submit', addTask);
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginAndLoadTasks();
    });
});