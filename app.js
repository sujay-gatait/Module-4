const API_BASE_URL = 'http://localhost:5000/api';

// State Management
let posts = [];
let currentUser = JSON.parse(localStorage.getItem('devwrite_user')) || null;
let token = localStorage.getItem('devwrite_token') || null;
let selectedCategory = 'All';

// Selectors
const navMenu = document.getElementById('navMenu');
const mobileToggle = document.getElementById('mobileToggle');
const guestNav = document.getElementById('guestNav');
const userNav = document.getElementById('userNav');
const navUsername = document.getElementById('navUsername');
const logoutBtn = document.getElementById('logoutBtn');

// Router Navigation
function handleRouting() {
    const hash = window.location.hash.substring(1) || 'home';
    const pages = document.querySelectorAll('.view-page');
    
    pages.forEach(page => {
        page.classList.toggle('active', page.id === `page-${hash}`);
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-page') === hash);
    });

    navMenu.classList.remove('show');

    if (hash === 'home') fetchPosts();
    if (hash === 'dashboard') renderDashboard();
    if (hash === 'create' && !document.getElementById('postId').value) resetForm();
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    handleRouting();
});

mobileToggle.addEventListener('click', () => navMenu.classList.toggle('show'));

function updateAuthUI() {
    if (currentUser && token) {
        guestNav.classList.add('hidden');
        userNav.classList.remove('hidden');
        navUsername.textContent = currentUser.name;
    } else {
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
    }
}

// ==================== READ + SEARCH & FILTER ====================
async function fetchPosts() {
    const searchVal = document.getElementById('searchInput').value.trim();
    const queryParams = new URLSearchParams();

    if (selectedCategory !== 'All') queryParams.append('category', selectedCategory);
    if (searchVal) queryParams.append('search', searchVal);

    try {
        const response = await fetch(`${API_BASE_URL}/posts?${queryParams.toString()}`);
        posts = await response.json();
        renderHomePosts();
    } catch (err) {
        showToast('Error connecting to backend server');
    }
}

function renderHomePosts() {
    const container = document.getElementById('postsContainer');

    if (posts.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No articles found matching criteria.</p>`;
        return;
    }

    container.innerHTML = posts.map(post => `
        <article class="card" onclick="openArticleModal('${post._id}')">
            <img src="${post.image}" alt="${post.title}" class="card-img">
            <div class="card-body">
                <span class="card-badge">${post.category}</span>
                <h3 class="card-title">${post.title}</h3>
                <p class="card-excerpt">${post.excerpt}</p>
                <div class="card-footer">
                    <span class="card-author"><i class="fa-regular fa-user"></i> ${post.author}</span>
                    <span>${post.date}</span>
                </div>
            </div>
        </article>
    `).join('');
}

// Live Search Input Listener with Debounce
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchPosts, 300);
});

// Category Chips Filter Listener
document.getElementById('categoryChips').addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        selectedCategory = e.target.getAttribute('data-cat');
        fetchPosts();
    }
});

// View Single Blog Details
async function openArticleModal(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/posts/${id}`);
        const post = await res.json();
        if (!res.ok) throw new Error(post.message);

        const articleContainer = document.getElementById('modalArticle');
        articleContainer.innerHTML = `
            <span class="card-badge">${post.category}</span>
            <h1 style="margin: 10px 0;">${post.title}</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 15px;">
                By <strong>${post.author}</strong> | Published on ${post.date} | 👁️ ${post.views} Views
            </p>
            <img src="${post.image}" alt="${post.title}" class="modal-hero-img">
            <div style="line-height: 1.8; margin-top: 20px;">${post.content}</div>
        `;

        document.getElementById('postModal').classList.add('active');
    } catch (err) {
        showToast('Could not load article details.');
    }
}

document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('postModal').classList.remove('active');
});

// ==================== AUTHENTICATION ====================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        token = data.token;
        currentUser = data.user;
        localStorage.setItem('devwrite_token', token);
        localStorage.setItem('devwrite_user', JSON.stringify(currentUser));

        updateAuthUI();
        showToast(`Welcome, ${currentUser.name}!`);
        window.location.hash = '#dashboard';
    } catch (err) {
        showToast(err.message);
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        token = data.token;
        currentUser = data.user;
        localStorage.setItem('devwrite_token', token);
        localStorage.setItem('devwrite_user', JSON.stringify(currentUser));

        updateAuthUI();
        showToast('Successfully logged in!');
        window.location.hash = '#dashboard';
    } catch (err) {
        showToast(err.message);
    }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    token = null;
    localStorage.removeItem('devwrite_user');
    localStorage.removeItem('devwrite_token');
    updateAuthUI();
    showToast('Logged out');
    window.location.hash = '#home';
});

// ==================== DASHBOARD & CRUD ACTIONS ====================
async function renderDashboard() {
    if (!currentUser || !token) {
        window.location.hash = '#login';
        return;
    }

    await fetchPosts();
    const userPosts = posts.filter(p => p.author === currentUser.name);

    document.getElementById('statTotalPosts').textContent = userPosts.length;
    document.getElementById('statTotalViews').textContent = userPosts.reduce((acc, p) => acc + (p.views || 0), 0);
    document.getElementById('statTotalLikes').textContent = userPosts.reduce((acc, p) => acc + (p.likes || 0), 0);

    const tbody = document.getElementById('dashboardTableBody');
    if (userPosts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No articles published yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = userPosts.map(post => `
        <tr>
            <td><strong>${post.title}</strong></td>
            <td><span class="card-badge">${post.category}</span></td>
            <td>${post.date}</td>
            <td><span style="color: green; font-weight: 500;">Published</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editPost('${post._id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deletePost('${post._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// 1. CREATE or UPDATE Submission
document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!token) {
        showToast('Please login to publish.');
        window.location.hash = '#login';
        return;
    }

    const id = document.getElementById('postId').value;
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const image = document.getElementById('postImage').value;
    const excerpt = document.getElementById('postExcerpt').value;
    const content = document.getElementById('postContent').value;

    const payload = { title, category, image, excerpt, content };
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `${API_BASE_URL}/posts/${id}` : `${API_BASE_URL}/posts`;

    try {
        const res = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast(id ? 'Article updated successfully!' : 'Article published successfully!');
        resetForm();
        window.location.hash = '#dashboard';
    } catch (err) {
        showToast(err.message);
    }
});

// 2. TRIGGER UPDATE (Populate Form)
async function editPost(id) {
    const post = posts.find(p => p._id === id);
    if (!post) return;

    document.getElementById('editorTitle').textContent = 'Edit Article';
    document.getElementById('postId').value = post._id;
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postCategory').value = post.category;
    document.getElementById('postImage').value = post.image || '';
    document.getElementById('postExcerpt').value = post.excerpt;
    document.getElementById('postContent').value = post.content;

    window.location.hash = '#create';
}

// 3. DELETE Action
async function deletePost(id) {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/posts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast('Post deleted successfully');
        renderDashboard();
    } catch (err) {
        showToast(err.message);
    }
}

// Reset Form & Helper Utilities
function resetForm() {
    document.getElementById('editorTitle').textContent = 'Write a New Story';
    document.getElementById('postForm').reset();
    document.getElementById('postId').value = '';
}

document.getElementById('cancelPostBtn').addEventListener('click', () => {
    resetForm();
    window.location.hash = '#dashboard';
});

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}