const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const expiredList = document.getElementById('expiredList');

let recentlyDeleted = null;
let undoTimer = null;
let lastAddedId = null;
let lastToggledId = null;
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// Function to handle adding a task
function addTask() {
    const rawText = taskInput.value.trim();
    if (!rawText) return;

    const text = rawText.charAt(0).toUpperCase() + rawText.slice(1);

    const newTask = {
        taskId: Date.now(),
        task: text,
        done: false,
        timestamp: Date.now()
    };

    tasks.push(newTask);
    lastAddedId = newTask.taskId;
    saveAndRender();
    taskInput.value = '';
    taskInput.focus();

    updateAddButtonState();
}

// CLICK event for the button
addBtn.addEventListener('click', addTask);

// ENTER KEY event for the input field
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Enable / disable Add button while typing
taskInput.addEventListener('input', updateAddButtonState);


function toggleDone(id) {
    lastToggledId = id;
    tasks = tasks.map(t =>
        t.taskId === id ? { ...t, done: !t.done } : t
    );
    saveAndRender();
}

function deleteTask(id) {
    const li = document.querySelector(`li[data-id="${id}"]`);
    if (!li) return;

    li.classList.add('removing');

    setTimeout(() => {
        recentlyDeleted = tasks.find(t => t.taskId === id);
        tasks = tasks.filter(t => t.taskId !== id);
        saveAndRender();
        showUndoToast();
    }, 200);
}

function readdTask(id) {
    tasks = tasks.map(t => t.taskId === id ? { ...t, timestamp: Date.now() } : t);
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderTasks();
}

function updateAddButtonState() {
    addBtn.disabled = taskInput.value.trim() === '';
}

function renderTasks() {
    taskList.innerHTML = '';
    expiredList.innerHTML = '';

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    const activeTasks = tasks.filter(t => (now - t.timestamp) <= ONE_DAY);

    if (activeTasks.length === 0) {
        taskList.innerHTML = `<p style="text-align:center; color:#a0aec0; width:100%;">No tasks yet. Start by adding one!</p>`;
    }

    tasks.forEach(task => {
        const isExpired = (now - task.timestamp) > ONE_DAY;
        const li = document.createElement('li');
        li.dataset.id = task.taskId;

        if (task.taskId === lastAddedId) {
            li.classList.add('animate-in');
        }

        if (task.taskId === lastToggledId) {
            li.classList.add('animate-check');
        }

        if (isExpired) li.classList.add('expired-item');

        li.innerHTML = `
            <span class="task-text ${task.done ? 'done' : ''}"
                  ondblclick="enableEdit(this, ${task.taskId})">
                ${task.task}
            </span>

            <div class="task-actions">
                <input type="checkbox" ${task.done ? 'checked' : ''}
                       onchange="toggleDone(${task.taskId})">

                ${isExpired ? `
                    <button class="readd-btn"
                            onclick="readdTask(${task.taskId})"
                            title="Restore">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>` : ''
                }

                <button class="delete-btn"
                        onclick="deleteTask(${task.taskId})"
                        title="Delete">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;

        isExpired ? expiredList.appendChild(li) : taskList.appendChild(li);
    });

    // ✅ CRITICAL: reset animation flags
    lastAddedId = null;
    lastToggledId = null;
}

function enableEdit(span, id) {
    const oldText = span.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldText;
    input.className = 'edit-input';

    span.replaceWith(input);
    input.focus();

    function saveEdit() {
        const newText = input.value.trim();
        if (!newText) return cancelEdit();

        tasks = tasks.map(t =>
            t.taskId === id
                ? { ...t, task: newText.charAt(0).toUpperCase() + newText.slice(1) }
                : t
        );

        saveAndRender();
    }

    function cancelEdit() {
        saveAndRender();
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') cancelEdit();
    });

    input.addEventListener('blur', cancelEdit);
}

function showUndoToast() {
    clearTimeout(undoTimer);
    removeToast();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = 'undoToast';

    toast.innerHTML = `
        Task deleted
        <button onclick="undoDelete()">Undo</button>
    `;

    document.body.appendChild(toast);

    undoTimer = setTimeout(() => {
        recentlyDeleted = null;
        removeToast();
    }, 5000);
}

function undoDelete() {
    if (recentlyDeleted) {
        tasks.push(recentlyDeleted);
        recentlyDeleted = null;
        saveAndRender();
    }
    removeToast();
}

function removeToast() {
    const toast = document.getElementById('undoToast');
    if (toast) toast.remove();
}


// Initial render
renderTasks();
updateAddButtonState();

// Check for expired tasks every 1 minute without needing a refresh
setInterval(renderTasks, 60000);