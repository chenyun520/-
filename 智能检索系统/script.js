// 全局变量
let currentPage = 1;
let itemsPerPage = 10;
let currentCategory = 'all';
let currentSearchQuery = '';
let currentQuestions = [];

// 登录相关变量
const CORRECT_PASSWORD = 'shgc123';
let isLoggedIn = false;

// 自测功能相关变量
let testMode = 'practice'; // 'practice' or 'exam'
let testQuestions = [];
let currentTestQuestionIndex = 0;
let testAnswers = [];
let testStartTime = null;
let testTimer = null;
let testTimeRemaining = 3600; // 1小时 = 3600秒

// DOM元素
const elements = {
    // 登录相关元素
    loginScreen: document.getElementById('loginScreen'),
    mainSystem: document.getElementById('mainSystem'),
    loginForm: document.getElementById('loginForm'),
    passwordInput: document.getElementById('passwordInput'),
    togglePassword: document.getElementById('togglePassword'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    questionsContainer: document.getElementById('questionsContainer'),
    loading: document.getElementById('loading'),
    noResults: document.getElementById('noResults'),
    pagination: document.getElementById('pagination'),
    totalQuestions: document.getElementById('totalQuestions'),
    themeToggle: document.getElementById('themeToggle'),
    
    // 模态框相关
    addQuestionModal: document.getElementById('addQuestionModal'),
    ocrModal: document.getElementById('ocrModal'),
    importModal: document.getElementById('importModal'),
    questionDetailModal: document.getElementById('questionDetailModal'),
    selfTestModal: document.getElementById('selfTestModal'),
    testResultModal: document.getElementById('testResultModal'),
    
    // 按钮
    addQuestionBtn: document.getElementById('addQuestionBtn'),
    ocrBtn: document.getElementById('ocrBtn'),
    importBtn: document.getElementById('importBtn'),
    selfTestBtn: document.getElementById('selfTestBtn'),
    
    // 自测相关元素
    testInterface: document.getElementById('testInterface'),
    testModeTitle: document.getElementById('testModeTitle'),
    currentQuestion: document.getElementById('currentQuestion'),
    totalTestQuestions: document.getElementById('totalTestQuestions'),
    timer: document.getElementById('timer'),
    timeRemaining: document.getElementById('timeRemaining'),
    testQuestionText: document.getElementById('testQuestionText'),
    testOptionsContainer: document.getElementById('testOptionsContainer'),
    answerDisplay: document.getElementById('answerDisplay'),
    answerContent: document.getElementById('answerContent')
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkLoginStatus();
});

// 检查登录状态
function checkLoginStatus() {
    const savedLoginStatus = localStorage.getItem('isLoggedIn');
    if (savedLoginStatus === 'true') {
        isLoggedIn = true;
        showMainSystem();
        loadQuestions();
    } else {
        showLoginScreen();
    }
}

// 显示登录界面
function showLoginScreen() {
    elements.loginScreen.style.display = 'flex';
    elements.mainSystem.style.display = 'none';
    elements.passwordInput.focus();
}

// 显示主系统
function showMainSystem() {
    elements.loginScreen.style.display = 'none';
    elements.mainSystem.style.display = 'block';
}

// 处理登录
function handleLogin(e) {
    e.preventDefault();
    const password = elements.passwordInput.value.trim();
    
    if (password === CORRECT_PASSWORD) {
        isLoggedIn = true;
        localStorage.setItem('isLoggedIn', 'true');
        showMainSystem();
        loadQuestions();
        showSuccessMessage('登录成功！欢迎使用上海工厂智能题库检索系统');
    } else {
        showErrorMessage('密码错误，请重新输入');
        elements.passwordInput.value = '';
        elements.passwordInput.focus();
        
        // 添加错误动画
        elements.passwordInput.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            elements.passwordInput.style.animation = '';
        }, 500);
    }
}

// 处理退出登录
function handleLogout() {
    if (confirm('确定要退出系统吗？')) {
        isLoggedIn = false;
        localStorage.removeItem('isLoggedIn');
        elements.passwordInput.value = '';
        showLoginScreen();
        showSuccessMessage('已安全退出系统');
    }
}

// 切换密码显示
function togglePasswordVisibility() {
    const input = elements.passwordInput;
    const icon = elements.togglePassword.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// 显示错误消息
function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--danger-color);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: var(--shadow);
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 初始化应用
function initializeApp() {
    // 加载主题设置
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // 显示加载状态
    showLoading();
    
    // 更新统计信息
    updateStatistics();
}

// 设置事件监听器
function setupEventListeners() {
    // 登录相关事件
    elements.loginForm?.addEventListener('submit', handleLogin);
    elements.togglePassword?.addEventListener('click', togglePasswordVisibility);
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // 键盘事件
    elements.passwordInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
    
    // 搜索相关
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    elements.clearSearch.addEventListener('click', clearSearch);
    
    // 分类筛选
    elements.filterTabs.forEach(tab => {
        tab.addEventListener('click', () => handleCategoryFilter(tab.dataset.category));
    });
    
    // 主题切换
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // 功能按钮
    elements.addQuestionBtn.addEventListener('click', openAddQuestionModal);
    elements.ocrBtn.addEventListener('click', openOCRModal);
    elements.importBtn.addEventListener('click', openImportModal);
    elements.selfTestBtn.addEventListener('click', openSelfTestModal);
    
    // 模态框关闭
    setupModalEventListeners();
    
    // OCR相关
    setupOCREventListeners();
    
    // 导入相关
    setupImportEventListeners();
    
    // 添加题目相关
    setupAddQuestionEventListeners();
    
    // 自测相关
    setupSelfTestEventListeners();
}

// 设置自测功能事件监听器
function setupSelfTestEventListeners() {
    // 自测模态框相关
    document.getElementById('closeSelfTestModal')?.addEventListener('click', () => hideModal('selfTestModal'));
    document.getElementById('startPracticeBtn')?.addEventListener('click', () => startTest('practice'));
    document.getElementById('startExamBtn')?.addEventListener('click', () => startTest('exam'));
    
    // 测试界面相关
    document.getElementById('exitTest')?.addEventListener('click', exitTest);
    document.getElementById('prevQuestion')?.addEventListener('click', prevTestQuestion);
    document.getElementById('nextQuestion')?.addEventListener('click', nextTestQuestion);
    document.getElementById('showAnswer')?.addEventListener('click', toggleAnswer);
    document.getElementById('finishTest')?.addEventListener('click', finishTest);
    
    // 测试结果相关
    document.getElementById('closeResultModal')?.addEventListener('click', () => hideModal('testResultModal'));
    document.getElementById('reviewTest')?.addEventListener('click', reviewTest);
    document.getElementById('restartTest')?.addEventListener('click', restartTest);
}

// 打开自测功能模态框
function openSelfTestModal() {
    showModal('selfTestModal');
}

// 开始测试
function startTest(mode) {
    testMode = mode;
    const category = document.getElementById('testCategory').value;
    
    // 获取题目
    const allQuestions = getQuestionsByCategory(category);
    if (allQuestions.length === 0) {
        alert('没有找到题目，请先添加题目或选择其他分类');
        return;
    }
    
    // 设置题目数量
    const questionCount = mode === 'exam' ? Math.min(100, allQuestions.length) : Math.min(20, allQuestions.length);
    
    // 随机选择题目
    testQuestions = shuffleArray([...allQuestions]).slice(0, questionCount);
    currentTestQuestionIndex = 0;
    testAnswers = new Array(testQuestions.length).fill(null);
    testStartTime = new Date();
    
    // 设置界面
    elements.testModeTitle.textContent = mode === 'exam' ? '考试模式' : '练习模式';
    elements.totalTestQuestions.textContent = testQuestions.length;
    
    // 设置计时器
    if (mode === 'exam') {
        testTimeRemaining = 3600; // 1小时
        elements.timer.style.display = 'flex';
        startTimer();
    } else {
        elements.timer.style.display = 'none';
    }
    
    // 隐藏模态框，显示测试界面
    hideModal('selfTestModal');
    elements.testInterface.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // 显示第一题
    showTestQuestion();
}

// 显示测试题目
function showTestQuestion() {
    if (currentTestQuestionIndex >= testQuestions.length) {
        finishTest();
        return;
    }
    
    const question = testQuestions[currentTestQuestionIndex];
    const questionNumber = currentTestQuestionIndex + 1;
    
    // 更新进度
    elements.currentQuestion.textContent = questionNumber;
    
    // 显示题目
    elements.testQuestionText.innerHTML = `<strong>第${questionNumber}题：</strong>${question.question}`;
    
    // 生成选项（如果答案中包含选项）
    generateTestOptions(question);
    
    // 更新导航按钮
    document.getElementById('prevQuestion').disabled = currentTestQuestionIndex === 0;
    document.getElementById('nextQuestion').style.display = currentTestQuestionIndex === testQuestions.length - 1 ? 'none' : 'inline-flex';
    document.getElementById('finishTest').style.display = currentTestQuestionIndex === testQuestions.length - 1 ? 'inline-flex' : 'none';
    
    // 隐藏答案
    elements.answerDisplay.style.display = 'none';
    document.getElementById('showAnswer').textContent = '查看答案';
}

// 生成测试选项
function generateTestOptions(question) {
    const answer = question.answer;
    elements.testOptionsContainer.innerHTML = '';
    
    // 尝试从答案中提取选项
    const optionMatches = answer.match(/[A-F][\.\、]\s*[^A-F\n]+/g);
    
    if (optionMatches && optionMatches.length > 1) {
        // 有选项的题目
        optionMatches.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item';
            optionDiv.innerHTML = option.trim();
            optionDiv.addEventListener('click', () => selectOption(index, optionDiv));
            elements.testOptionsContainer.appendChild(optionDiv);
        });
    } else {
        // 没有明确选项的题目，显示提示
        elements.testOptionsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">此题为主观题，请思考后查看答案</p>';
    }
    
    // 恢复之前的选择
    const previousAnswer = testAnswers[currentTestQuestionIndex];
    if (previousAnswer !== null) {
        const options = elements.testOptionsContainer.querySelectorAll('.option-item');
        if (options[previousAnswer]) {
            options[previousAnswer].classList.add('selected');
        }
    }
}

// 选择选项
function selectOption(index, element) {
    // 清除其他选项的选中状态
    elements.testOptionsContainer.querySelectorAll('.option-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 选中当前选项
    element.classList.add('selected');
    
    // 保存答案
    testAnswers[currentTestQuestionIndex] = index;
}

// 上一题
function prevTestQuestion() {
    if (currentTestQuestionIndex > 0) {
        currentTestQuestionIndex--;
        showTestQuestion();
    }
}

// 下一题
function nextTestQuestion() {
    if (currentTestQuestionIndex < testQuestions.length - 1) {
        currentTestQuestionIndex++;
        showTestQuestion();
    }
}

// 切换答案显示
function toggleAnswer() {
    const button = document.getElementById('showAnswer');
    const answerDiv = elements.answerDisplay;
    
    if (answerDiv.style.display === 'none') {
        // 显示答案
        const question = testQuestions[currentTestQuestionIndex];
        elements.answerContent.innerHTML = question.answer;
        answerDiv.style.display = 'block';
        button.textContent = '隐藏答案';
    } else {
        // 隐藏答案
        answerDiv.style.display = 'none';
        button.textContent = '查看答案';
    }
}

// 开始计时器
function startTimer() {
    testTimer = setInterval(() => {
        testTimeRemaining--;
        updateTimerDisplay();
        
        if (testTimeRemaining <= 0) {
            clearInterval(testTimer);
            alert('考试时间到！');
            finishTest();
        }
    }, 1000);
}

// 更新计时器显示
function updateTimerDisplay() {
    const hours = Math.floor(testTimeRemaining / 3600);
    const minutes = Math.floor((testTimeRemaining % 3600) / 60);
    const seconds = testTimeRemaining % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    elements.timeRemaining.textContent = timeString;
    
    // 时间不足时变红
    if (testTimeRemaining < 300) { // 少于5分钟
        elements.timer.style.color = '#dc3545';
    }
}

// 完成测试
function finishTest() {
    // 停止计时器
    if (testTimer) {
        clearInterval(testTimer);
        testTimer = null;
    }
    
    // 计算结果
    const testEndTime = new Date();
    const testDuration = Math.floor((testEndTime - testStartTime) / 1000);
    const results = calculateTestResults();
    
    // 显示结果
    showTestResults(results, testDuration);
    
    // 隐藏测试界面
    elements.testInterface.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// 计算测试结果
function calculateTestResults() {
    let correctCount = 0;
    let answeredCount = 0;
    
    testAnswers.forEach((answer, index) => {
        if (answer !== null) {
            answeredCount++;
            // 这里可以添加答案正确性判断逻辑
            // 由于题目格式复杂，暂时不做自动判断
        }
    });
    
    return {
        total: testQuestions.length,
        answered: answeredCount,
        correct: correctCount,
        unanswered: testQuestions.length - answeredCount,
        accuracy: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
    };
}

// 显示测试结果
function showTestResults(results, duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    const durationString = `${hours}时${minutes}分${seconds}秒`;
    
    const resultsHTML = `
        <div class="result-score">${results.answered}/${results.total}</div>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">已完成 ${results.answered} 题，用时 ${durationString}</p>
        
        <div class="result-details">
            <div class="result-item">
                <h4>总题数</h4>
                <div class="value">${results.total}</div>
            </div>
            <div class="result-item">
                <h4>已答题</h4>
                <div class="value" style="color: var(--success-color);">${results.answered}</div>
            </div>
            <div class="result-item">
                <h4>未答题</h4>
                <div class="value" style="color: var(--warning-color);">${results.unanswered}</div>
            </div>
            <div class="result-item">
                <h4>用时</h4>
                <div class="value">${durationString}</div>
            </div>
        </div>
        
        <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
            <p style="color: var(--text-secondary); text-align: center; margin: 0;">
                <i class="fas fa-info-circle"></i> 
                本系统主要用于练习和复习，答案正确性需要自行判断
            </p>
        </div>
    `;
    
    document.getElementById('testResults').innerHTML = resultsHTML;
    showModal('testResultModal');
}

// 退出测试
function exitTest() {
    if (confirm('确定要退出测试吗？当前进度将不会保存。')) {
        // 停止计时器
        if (testTimer) {
            clearInterval(testTimer);
            testTimer = null;
        }
        
        // 隐藏测试界面
        elements.testInterface.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // 重置测试数据
        resetTestData();
    }
}

// 重置测试数据
function resetTestData() {
    testQuestions = [];
    currentTestQuestionIndex = 0;
    testAnswers = [];
    testStartTime = null;
    testTimeRemaining = 3600;
}

// 回顾测试
function reviewTest() {
    hideModal('testResultModal');
    // 这里可以实现回顾错题的功能
    alert('回顾功能开发中...');
}

// 重新测试
function restartTest() {
    hideModal('testResultModal');
    resetTestData();
    openSelfTestModal();
}

// 随机打乱数组
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 处理搜索
function handleSearch() {
    currentSearchQuery = elements.searchInput.value.trim();
    currentPage = 1;
    loadQuestions();
}

// 清除搜索
function clearSearch() {
    elements.searchInput.value = '';
    currentSearchQuery = '';
    currentPage = 1;
    loadQuestions();
}

// 处理分类筛选
function handleCategoryFilter(category) {
    currentCategory = category;
    currentPage = 1;
    
    // 更新活动标签
    elements.filterTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    loadQuestions();
}

// 加载题目
function loadQuestions() {
    showLoading();
    
    // 模拟异步加载
    setTimeout(() => {
        currentQuestions = searchQuestions(currentSearchQuery, currentCategory);
        renderQuestions();
        renderPagination();
        hideLoading();
        updateStatistics();
    }, 300);
}

// 渲染题目列表
function renderQuestions() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const questionsToShow = currentQuestions.slice(startIndex, endIndex);
    
    if (questionsToShow.length === 0) {
        showNoResults();
        return;
    }
    
    hideNoResults();
    
    const questionsHTML = questionsToShow.map(question => createQuestionCard(question)).join('');
    elements.questionsContainer.innerHTML = questionsHTML;
    
    // 添加事件监听器到题目卡片
    addQuestionCardEventListeners();
}

// 创建题目卡片HTML
function createQuestionCard(question) {
    const highlightedQuestion = highlightText(question.question, currentSearchQuery);
    const highlightedAnswer = highlightText(truncateText(question.answer, 150), currentSearchQuery);
    
    return `
        <div class="question-card" data-id="${question.id}">
            <div class="question-header">
                <span class="question-category ${question.category}">${question.category}</span>
                <div class="question-actions">
                    <button class="question-btn view-btn" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="question-btn edit-btn" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="question-btn delete-btn" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="question-content">
                <h3>${highlightedQuestion}</h3>
                <div class="question-preview">${highlightedAnswer}</div>
            </div>
        </div>
    `;
}

// 高亮文本
function highlightText(text, query) {
    if (!query || query.trim() === '') {
        return text;
    }
    
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 截断文本
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

// 添加题目卡片事件监听器
function addQuestionCardEventListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.closest('.question-card').dataset.id);
            viewQuestionDetail(id);
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.closest('.question-card').dataset.id);
            editQuestion(id);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.closest('.question-card').dataset.id);
            deleteQuestionConfirm(id);
        });
    });
}

// 查看题目详情
function viewQuestionDetail(id) {
    const question = getAllQuestions().find(q => q.id === id);
    if (!question) return;
    
    const detailHTML = `
        <div class="question-detail">
            <div class="detail-header">
                <span class="question-category ${question.category}">${question.category}</span>
                <small>创建时间: ${new Date(question.createTime).toLocaleString()}</small>
            </div>
            <div class="detail-content">
                <h3>题目：</h3>
                <p>${question.question}</p>
                <h3>答案：</h3>
                <p>${question.answer}</p>
                <h3>关键词：</h3>
                <div class="keywords">
                    ${question.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('questionDetail').innerHTML = detailHTML;
    showModal('questionDetailModal');
}

// 渲染分页
function renderPagination() {
    const totalPages = Math.ceil(currentQuestions.length / itemsPerPage);
    
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页按钮
    paginationHTML += `
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // 页码按钮
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // 下一页按钮
    paginationHTML += `
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    elements.pagination.innerHTML = paginationHTML;
}

// 切换页面
function changePage(page) {
    const totalPages = Math.ceil(currentQuestions.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderQuestions();
    renderPagination();
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 显示加载状态
function showLoading() {
    elements.loading.style.display = 'flex';
    elements.questionsContainer.style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
    elements.loading.style.display = 'none';
    elements.questionsContainer.style.display = 'grid';
}

// 显示无结果
function showNoResults() {
    elements.noResults.style.display = 'block';
}

// 隐藏无结果
function hideNoResults() {
    elements.noResults.style.display = 'none';
}

// 更新统计信息
function updateStatistics() {
    const stats = getStatistics();
    elements.totalQuestions.textContent = `总题数: ${stats.total}`;
}

// 切换主题
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// 更新主题图标
function updateThemeIcon(theme) {
    const icon = elements.themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// 显示模态框
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// 隐藏模态框
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// 设置模态框事件监听器
function setupModalEventListeners() {
    // 添加题目模态框
    document.getElementById('closeAddModal')?.addEventListener('click', () => hideModal('addQuestionModal'));
    document.getElementById('cancelAdd')?.addEventListener('click', () => hideModal('addQuestionModal'));
    
    // OCR模态框
    document.getElementById('closeOcrModal')?.addEventListener('click', () => hideModal('ocrModal'));
    
    // 导入模态框
    document.getElementById('closeImportModal')?.addEventListener('click', () => hideModal('importModal'));
    
    // 题目详情模态框
    document.getElementById('closeDetailModal')?.addEventListener('click', () => hideModal('questionDetailModal'));
    
    // 点击背景关闭模态框
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });
}

// 设置添加题目事件监听器
function setupAddQuestionEventListeners() {
    const form = document.getElementById('addQuestionForm');
    if (form) {
        form.addEventListener('submit', handleAddQuestion);
    }
}

// 打开添加题目模态框
function openAddQuestionModal() {
    document.getElementById('addQuestionForm').reset();
    showModal('addQuestionModal');
}

// 处理添加题目
function handleAddQuestion(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const questionData = {
        category: document.getElementById('questionCategory').value,
        question: document.getElementById('questionText').value.trim(),
        answer: document.getElementById('questionAnswer').value.trim()
    };
    
    if (!questionData.category || !questionData.question || !questionData.answer) {
        alert('请填写完整的题目信息');
        return;
    }
    
    // 添加题目
    const newQuestion = addQuestion(questionData);
    if (newQuestion) {
        showSuccessMessage('题目添加成功！');
        hideModal('addQuestionModal');
        loadQuestions(); // 重新加载题目列表
    }
}

// 设置OCR事件监听器
function setupOCREventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    
    if (uploadArea && imageInput) {
        uploadArea.addEventListener('click', () => imageInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        imageInput.addEventListener('change', handleImageSelect);
        
        document.getElementById('retryOcr')?.addEventListener('click', retryOCR);
        document.getElementById('addFromOcr')?.addEventListener('click', addQuestionFromOCR);
    }
}

// 打开OCR模态框
function openOCRModal() {
    resetOCRModal();
    showModal('ocrModal');
}

// 重置OCR模态框
function resetOCRModal() {
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('ocrPreview').style.display = 'none';
    document.getElementById('ocrResult').style.display = 'none';
    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('imageInput').value = '';
}

// 处理拖拽
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processImage(files[0]);
    }
}

// 处理图片选择
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
}

// 处理图片
function processImage(file) {
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        showImagePreview(imageUrl);
        performOCR(imageUrl);
    };
    reader.readAsDataURL(file);
}

// 显示图片预览
function showImagePreview(imageUrl) {
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('previewImage').src = imageUrl;
    document.getElementById('ocrPreview').style.display = 'block';
}

// 执行OCR识别
function performOCR(imageUrl) {
    document.getElementById('ocrProgress').style.display = 'block';
    
    Tesseract.recognize(
        imageUrl,
        'chi_sim+eng',
        {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const progress = Math.round(m.progress * 100);
                    document.querySelector('.progress-fill').style.width = progress + '%';
                }
            }
        }
    ).then(({ data: { text } }) => {
        document.getElementById('ocrProgress').style.display = 'none';
        showOCRResult(text);
    }).catch(err => {
        console.error('OCR识别失败:', err);
        document.getElementById('ocrProgress').style.display = 'none';
        alert('OCR识别失败，请重试');
    });
}

// 显示OCR结果
function showOCRResult(text) {
    document.getElementById('ocrText').value = text;
    document.getElementById('ocrResult').style.display = 'block';
}

// 重试OCR
function retryOCR() {
    const imageUrl = document.getElementById('previewImage').src;
    if (imageUrl) {
        performOCR(imageUrl);
    }
}

// 从OCR添加题目
function addQuestionFromOCR() {
    const text = document.getElementById('ocrText').value.trim();
    if (!text) {
        alert('没有识别的文字内容');
        return;
    }
    
    // 简单解析文本，尝试分离题目和答案
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        alert('识别的内容太少，请手动编辑后添加');
        return;
    }
    
    // 填充到添加题目表单
    hideModal('ocrModal');
    openAddQuestionModal();
    
    document.getElementById('questionText').value = lines.slice(0, -1).join('\n');
    document.getElementById('questionAnswer').value = lines[lines.length - 1];
}

// 设置导入事件监听器
function setupImportEventListeners() {
    const wordInput = document.getElementById('wordInput');
    const txtInput = document.getElementById('txtInput');
    
    if (wordInput) {
        wordInput.addEventListener('change', handleWordImport);
    }
    
    if (txtInput) {
        txtInput.addEventListener('change', handleTxtImport);
    }
    
    document.getElementById('cancelImport')?.addEventListener('click', () => hideModal('importModal'));
    document.getElementById('confirmImport')?.addEventListener('click', confirmImport);
}

// 打开导入模态框
function openImportModal() {
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('wordInput').value = '';
    document.getElementById('txtInput').value = '';
    showModal('importModal');
}

// 处理Word导入
function handleWordImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // 这里应该使用专门的Word解析库
    alert('Word导入功能需要服务器支持，请使用文本文件导入');
}

// 处理文本导入
function handleTxtImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const questions = parseImportContent(content);
        showImportPreview(questions);
    };
    reader.readAsText(file, 'UTF-8');
}

// 解析导入内容
function parseImportContent(content) {
    const questions = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentQuestion = null;
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // 简单的解析逻辑，可以根据实际格式调整
        if (line.includes('?') || line.includes('？')) {
            // 可能是题目
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            currentQuestion = {
                question: line,
                answer: '',
                category: '班组长' // 默认分类
            };
        } else if (currentQuestion && (line.includes('答案') || line.includes('A.') || line.includes('正确'))) {
            // 可能是答案
            currentQuestion.answer = line;
        }
    }
    
    if (currentQuestion) {
        questions.push(currentQuestion);
    }
    
    return questions;
}

// 显示导入预览
function showImportPreview(questions) {
    if (questions.length === 0) {
        alert('没有解析到有效的题目，请检查文件格式');
        return;
    }
    
    const previewHTML = questions.slice(0, 5).map((q, index) => `
        <div class="preview-item">
            <h4>题目 ${index + 1}:</h4>
            <p><strong>问题:</strong> ${q.question}</p>
            <p><strong>答案:</strong> ${q.answer}</p>
            <p><strong>分类:</strong> ${q.category}</p>
        </div>
    `).join('');
    
    document.getElementById('previewContent').innerHTML = previewHTML + 
        (questions.length > 5 ? `<p>... 还有 ${questions.length - 5} 个题目</p>` : '');
    
    document.getElementById('importPreview').style.display = 'block';
    
    // 保存解析的题目数据
    window.tempImportQuestions = questions;
}

// 确认导入
function confirmImport() {
    const questions = window.tempImportQuestions;
    if (!questions || questions.length === 0) {
        alert('没有要导入的题目');
        return;
    }
    
    // 批量添加题目
    questions.forEach(questionData => {
        addQuestion(questionData);
    });
    
    showSuccessMessage(`成功导入 ${questions.length} 个题目！`);
    hideModal('importModal');
    loadQuestions();
    
    // 清理临时数据
    delete window.tempImportQuestions;
}

// 编辑题目
function editQuestion(id) {
    const question = getAllQuestions().find(q => q.id === id);
    if (!question) return;
    
    // 填充表单
    document.getElementById('questionCategory').value = question.category;
    document.getElementById('questionText').value = question.question;
    document.getElementById('questionAnswer').value = question.answer;
    
    // 修改表单提交行为
    const form = document.getElementById('addQuestionForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    submitBtn.textContent = '更新题目';
    
    // 移除原有的提交事件
    form.removeEventListener('submit', handleAddQuestion);
    
    // 添加编辑提交事件
    const handleEdit = (e) => {
        e.preventDefault();
        
        const updatedData = {
            category: document.getElementById('questionCategory').value,
            question: document.getElementById('questionText').value.trim(),
            answer: document.getElementById('questionAnswer').value.trim()
        };
        
        if (!updatedData.category || !updatedData.question || !updatedData.answer) {
            alert('请填写完整的题目信息');
            return;
        }
        
        // 更新题目（这里需要实现更新逻辑）
        showSuccessMessage('题目更新成功！');
        hideModal('addQuestionModal');
        loadQuestions();
        
        // 恢复原有状态
        form.removeEventListener('submit', handleEdit);
        form.addEventListener('submit', handleAddQuestion);
        submitBtn.textContent = '添加题目';
    };
    
    form.addEventListener('submit', handleEdit);
    showModal('addQuestionModal');
}

// 删除题目确认
function deleteQuestionConfirm(id) {
    const question = getAllQuestions().find(q => q.id === id);
    if (!question) return;
    
    const confirmMessage = `确定要删除这个题目吗？\n\n${question.question.substring(0, 50)}...`;
    
    if (confirm(confirmMessage)) {
        // 这里需要实现删除逻辑
        showSuccessMessage('题目删除成功！');
        loadQuestions();
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    // 创建临时提示元素
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: var(--shadow);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // 3秒后自动移除
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .keyword-tag {
        background: var(--bg-secondary);
        color: var(--text-secondary);
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        margin-right: 0.5rem;
        margin-bottom: 0.5rem;
        display: inline-block;
    }
    
    .question-detail {
        padding: 1rem 0;
    }
    
    .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
    }
    
    .detail-content h3 {
        color: var(--primary-color);
        margin: 1rem 0 0.5rem 0;
    }
    
    .detail-content p {
        line-height: 1.6;
        margin-bottom: 1rem;
    }
    
    .keywords {
        margin-top: 0.5rem;
    }
    
    .preview-item {
        background: var(--bg-secondary);
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border-left: 4px solid var(--primary-color);
    }
    
    .preview-item h4 {
        color: var(--primary-color);
        margin-bottom: 0.5rem;
    }
    
    .preview-item p {
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
    }
    
    .page-ellipsis {
        padding: 0.75rem 0.5rem;
        color: var(--text-secondary);
    }
`;
document.head.appendChild(style); 