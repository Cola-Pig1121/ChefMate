document.addEventListener('DOMContentLoaded', function () {
    const stepsContainer = document.querySelector('.steps-container');
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    let currentStep = 0;
    let currentSubStep = 0;
    let totalSteps = 0;
    let stepPages = [];
    let stepData = [];

    // 获取URL参数
    function getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    }

    function getRecipeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('recipe') || 'salad';
    }
    
    function getRecipeNameFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('name');
    }

    // 根据UUID获取本地食谱数据
    async function fetchLocalRecipeData(uuid) {
        try {
            const response = await fetch(`recipes/${uuid}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // 返回食谱对象（JSON文件中的第一个键）
            const recipeKey = Object.keys(data)[0];
            return data[recipeKey];
        } catch (error) {
            console.error('获取本地食谱数据失败:', error);
            // 如果本地文件不可用，返回null
            return null;
        }
    }

    // 根据UUID获取食谱数据
    async function fetchRecipeData(recipeId) {
        // 首先尝试从本地UUID文件获取数据
        if (recipeId && recipeId.includes('-')) {
            const localData = await fetchLocalRecipeData(recipeId);
            if (localData) {
                return localData;
            }
        }
        
        // 如果本地获取失败，尝试从API获取
        try {
            const response = await fetch(`http://localhost:3000/api/recipes/${recipeId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // 返回食谱对象（JSON文件中的第一个键）
            const recipeKey = Object.keys(data)[0];
            return data[recipeKey];
        } catch (error) {
            console.error('获取食谱数据失败:', error);
            // 如果API不可用，返回null
            return null;
        }
    }

    // 示例食谱数据
    const sampleRecipes = {
        '沙拉': {
            image: 'images/沙拉.jpeg',
            title: '牛油果番茄沙拉',
            steps: [
                {
                    description: '将西红柿、牛油果、黄瓜、洋葱洗净切块。',
                    subSteps: [
                        '将西红柿用清水冲洗干净，切成大小均匀的块状',
                        '牛油果对半切开，去核后用勺子挖出果肉，切成块',
                        '黄瓜洗净后切成厚片，再切成条状',
                        '洋葱剥去外皮，切成细丝'
                    ]
                },
                {
                    description: '将所有蔬菜放入大碗中，加入沙拉酱。',
                    subSteps: [
                        '取一个大碗，将切好的所有蔬菜放入',
                        '用量杯量取150ml沙拉酱',
                        '将沙拉酱均匀地淋在蔬菜上'
                    ]
                },
                {
                    description: '轻轻拌匀，使酱料均匀包裹蔬菜。',
                    subSteps: [
                        '用大勺子或沙拉夹轻轻翻拌',
                        '确保每一片蔬菜都沾上酱料',
                        '避免过度搅拌导致蔬菜出水'
                    ]
                },
                {
                    description: '装盘，点缀香菜即可享用。',
                    subSteps: [
                        '将拌好的沙拉盛入盘中',
                        '洗净香菜，切碎后撒在沙拉表面',
                        '立即享用以保证最佳口感'
                    ]
                }
            ]
        },
        '排骨': {
            image: 'images/排骨.jpg',
            title: '糖醋排骨',
            steps: [
                {
                    description: '排骨冷水下锅，焯水去血沫，捞出沥干。',
                    subSteps: [
                        '将500g排骨用清水冲洗干净',
                        '锅中加入足量冷水，放入排骨',
                        '大火煮开后撇去浮沫',
                        '捞出排骨用温水冲洗干净，沥干水分'
                    ]
                },
                {
                    description: '锅中加油，放入排骨煎至微黄。',
                    subSteps: [
                        '锅中倒入适量食用油',
                        '油热后放入排骨，中小火煎制',
                        '煎至排骨表面微黄，油脂渗出'
                    ]
                },
                {
                    description: '加入姜片、葱段、蒜炒香。',
                    subSteps: [
                        '将3片生姜切片，1根葱切段，2瓣蒜拍碎',
                        '将调料放入锅中，与排骨一起翻炒',
                        '炒出香味约1分钟'
                    ]
                },
                {
                    description: '倒入生抽、老抽、醋、糖、料酒，翻炒均匀。',
                    subSteps: [
                        '加入2勺生抽、1勺老抽调色',
                        '加入2勺醋、3勺糖',
                        '最后加入1勺料酒',
                        '快速翻炒使调料均匀裹在排骨上'
                    ]
                },
                {
                    description: '加适量清水，盖锅小火炖30分钟。',
                    subSteps: [
                        '加入刚好没过排骨的清水',
                        '盖上锅盖，转小火慢炖',
                        '炖煮30分钟至排骨软烂'
                    ]
                },
                {
                    description: '大火收汁，至汤汁浓稠即可出锅。',
                    subSteps: [
                        '开盖转大火收汁',
                        '用勺子不断翻动排骨防止粘锅',
                        '待汤汁变得浓稠即可关火'
                    ]
                }
            ]
        }
    };

    // 初始化页面
    async function initPage() {
        // 获取参数
        const recipeId = getQueryParam('id');
        
        // 根据参数获取食谱数据
        let apiData = null;
        
        // 如果有recipeId，根据ID获取食谱数据
        if (recipeId) {
            apiData = await fetchRecipeData(recipeId);
        }
        
        // 根据获取的数据或默认数据设置stepData
        if (apiData) {
            const convertedData = convertApiDataToStepData(apiData);
            if (convertedData) {
                stepData = convertedData;
            } else {
                stepData = (recipeType === 'paigu') ? paiguStepData : saladStepData;
            }
        } else {
            stepData = (recipeType === 'paigu') ? paiguStepData : saladStepData;
        }

        generateStepPages();
        setRecipeImage();
        
        setTimeout(() => {
            updateStepDisplay();
            updateSubStepDisplay();
            setupScrollLimiter();
            addTouchEvents();
            ensureScrollToCurrentSubStep(4);
        }, 100);
    }

    function generateStepPages() {
        if (!stepsContainer) return;
        
        stepsContainer.innerHTML = '';
        stepData.forEach((step, index) => {
            const stepPage = document.createElement('div');
            stepPage.className = 'step-page';
            stepPage.id = 'step' + (index + 1);
            
            if (index > 0) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'next-card-preview';
                previewDiv.innerHTML = `
                    <div>
                        <h3>步骤${index + 1} / ${stepData.length}</h3>
                        <p>${step.subtitle}</p>
                    </div>
                `;
                stepPage.appendChild(previewDiv);
            }
            
            const contentHTML = `
                <div class="recipe-content">
                    <div class="content-wrapper">
                        <div class="recipe-info-section">
                            <div class="recipe-header">
                                <div class="recipe-title">
                                    <h1 class="recipe-name" style="font-size: 30px;">步骤${index + 1} <span class="step-total" style="opacity: 0.5;">/ ${stepData.length}</span></h1>
                                    <div class="recipe-subtitle" style="opacity: 0.5; font-size: 20px;">${step.subtitle}</div>
                                </div>
                            </div>
                        </div>
                        <div class="process-flow">
                            <div class="flow-line"></div>
                            <div class="flow-steps">
                                ${generateSubSteps(step.subSteps)}
                                <div class="step-group">
                                    <div class="step-header">
                                        <div class="flow-dot end"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            stepPage.innerHTML += contentHTML;
            stepsContainer.appendChild(stepPage);
        });
        stepPages = document.querySelectorAll('.step-page');
        totalSteps = stepPages.length;
    }

    function generateSubSteps(subSteps) {
        let html = '';
        subSteps.forEach(subStep => {
            html += `
                <div class="step-group">
                    <div class="step-header">
                        <div class="flow-dot"></div>
                        <div class="ingredient-name">${subStep.name}</div>
                    </div>
                    <div class="ingredient-steps">
                        ${subStep.steps.map(step => `<div>${step}</div>`).join('')}
                    </div>
                </div>
            `;
        });
        return html;
    }

    function setRecipeImage() {
        const recipeHero = document.querySelector('.recipe-hero');
        if (recipeHero) {
            if (recipeType === 'paigu') {
                recipeHero.style.backgroundImage = "url('images/排骨.jpg')";
            } else {
                recipeHero.style.backgroundImage = "url('images/沙拉.jpeg')";
            }
        }
    }

    function ensureScrollToCurrentSubStep(retry = 3) {
        scrollToCurrentSubStep();
        if (retry > 0) {
            setTimeout(() => ensureScrollToCurrentSubStep(retry - 1), 120);
        }
    }
    // 按钮事件绑定
    if (nextBtn) {
        nextBtn.addEventListener('click', goToNextSubStep);
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', goToPrevSubStep);
    }

    // 语音交互功能
    const waveBtn = document.querySelector('.wave-btn');
    let isCommunicating = false;
    let recognition;
    let isFirstCommunication = true;
    let spokenResponses = new Set();

    function initSpeech() {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = function (event) {
            const speechResult = event.results[0][0].transcript;
            processUserSpeech(speechResult);
        };
        recognition.onerror = function (event) {
            stopCommunication();
        };
        recognition.onend = function () {
            if (isCommunicating) {
                recognition.start();
            }
        };
    }

    function containsSensitiveWords(text) {
        const sensitiveWords = ['你妹', '妈的', '傻逼', '混蛋', 'fuck', 'shit'];
        return sensitiveWords.some(word => text.includes(word));
    }

    function processUserSpeech(text) {
        showStepToast(`您说: ${text}`);
        if (containsSensitiveWords(text)) {
            speakResponse('请使用文明用语');
            return;
        }
        const currentStepData = stepData[currentStep];
        const currentSubStepData = currentStepData.subSteps[currentSubStep];
        const recipeDisplayName = recipeName || (recipeType === 'paigu' ? '糖醋排骨' : '牛油果番茄沙拉');
        const systemContent = `你是一个烹饪助手，正在指导用户完成${recipeDisplayName}的制作。当前是${currentStepData.name}:${currentStepData.subtitle}，具体步骤是${currentSubStepData.name}:${currentSubStepData.steps.join('，')}。请用简短易懂的中文回答用户关于当前步骤的问题。`;
        fetch('http://127.0.0.1:5000/api/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userText: text,
                systemContent: systemContent
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const responseText = data.answer;
                const audioUrl = data.audio_url ? `http://127.0.0.1:5000${data.audio_url}` : null;
                speakResponse(responseText, audioUrl);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                if (error.message.includes('Failed to fetch')) {
                    speakResponse('无法连接到服务器，请检查后端服务是否启动');
                } else if (error.message.includes('NetworkError')) {
                    speakResponse('网络连接异常，请检查网络设置');
                } else {
                    speakResponse('服务暂时不可用，请稍后再试');
                }
            });
    }

    function speakResponse(text, audioUrl) {
        if (spokenResponses.has(text)) {
            return;
        }
        
        // 更新子步骤显示
        function updateSubStepDisplay() {
            const currentPage = stepPages[currentStep];
            if (!currentPage) return;
            
            const subSteps = currentPage.querySelectorAll('.sub-step');
            subSteps.forEach((subStep, index) => {
                if (index === currentSubStep) {
                    subStep.classList.add('active');
                } else {
                    subStep.classList.remove('active');
                }
            });
        s   
            // 滚动到当前子步骤
            scrollToCurrentSubStep(s);
        }
        
        // 滚动到当前子步骤
        function scrollToCurrentSubStep() {
            const currentPage = stepPages[currentStep];
            if (!currentPage) return;
            
            const activeSubStep = currentPage.querySelector('.sub-step.active');
            if (activeSubStep) {
                const container = document.querySelector('.steps-container');
                // 添加检查确保container元素存在
                if (container) {
                    const containerRect = container.getBoundingClientRect();
                    const subStepRect = activeSubStep.getBoundingClientRect();
                    
                    // 计算滚动位置，使当前子步骤位于容器中间
                    const scrollTop = subStepRect.top - containerRect.top - containerRect.height / 2 + subStepRect.height / 2;
                    container.scrollBy({
                        top: scrollTop,
                        behavior: 'smooth'
                    });
                }
            }
        }
        
        // 步骤切换提示
        function showStepToast(message) {
            const existingToast = document.querySelector('.step-toast');
            if (existingToast) {s
                existingToast.remove();
            }
            
            const toast = document.createElement('div');
            toast.className = 'step-toast';
            toast.textContent = message;
            document.body.appendChild(toast);
            
            // 添加动画类
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            // 移除提示
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }, 2000);
        }
        
        // 跳转到下一步骤
        function goToNextSubStep() {
            const currentPage = stepPages[currentStep];
            if (!currentPage) return;
            
            const subSteps = currentPage.querySelectorAll('.sub-step');
            
            if (currentSubStep < subSteps.length - 1) {
                // 还有子步骤
                currentSubStep++;
                updateSubStepDisplay();
            } else {
                // 没有更多子步骤，跳转到下一个主步骤
                if (currentStep < stepPages.length - 1) {
                    currentStep++;
                    currentSubStep = 0;
                    updateStepDisplay();
                    showStepToast(`步骤 ${currentStep + 1}`);
                } else {
                    // 已经是最后一个步骤
                    showStepToast('已完成所有步骤');
                    // 记录完成情况
                    recordCookingCompletion(recipe);
                }
            }
        }
        
        // 跳转到上一步骤
        function goToPrevSubStep() {
            if (currentSubStep > 0) {
                // 还有子步骤可以返回
                currentSubStep--;
                updateSubStepDisplay();
            } else {
                // 需要返回到上一个主步骤
                if (currentStep > 0) {
                    currentStep--;
                    // 设置为上一个步骤的最后一个子步骤
                    const prevPage = stepPages[currentStep];
                    const subSteps = prevPage.querySelectorAll('.sub-step');
                    currentSubStep = subSteps.length - 1;
                    updateStepDisplay();
                    showStepToast(`步骤 ${currentStep + 1}`);
                }
            }
        }
        
        // 跳转到指定步骤
        function goToStep(stepIndex) {
            if (stepIndex >= 0 && stepIndex < stepPages.length) {
                currentStep = stepIndex;
                currentSubStep = 0;
                updateStepDisplay();
                showStepToast(`步骤 ${currentStep + 1}`);
            }
        }
        
        // 记录烹饪完成情况
        function recordCookingCompletion(recipeData) {
            const completion = {
                date: new Date().toISOString(),
                recipeType: recipeType || 'unknown',
                recipeName: recipeData.title || '未知食谱'
            };
            
            // 从localStorage获取现有的完成记录
            const completions = JSON.parse(localStorage.getItem('chefmate_cooking_completions') || '[]');
            completions.push(completion);
            localStorage.setItem('chefmate_cooking_completions', JSON.stringify(completions));
        }
        
        // 按钮事件
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        const closeBtn = document.querySelector('.close-btn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', goToPrevSubStep);
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', goToNextSubStep);
        }
        
        // 关闭按钮事件处理程序
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                // 获取来源页面参数
                const fromPage = getQueryParam('from') || 'recipe-detail.html';
                const recipeId = getQueryParam('id');
                const recipeName = getQueryParam('name');
                
                // 构建返回URL
                let returnUrl = fromPage;
                if (recipeId) {
                    returnUrl += `?id=${encodeURIComponent(recipeId)}`;
                } else if (recipeName) {
                    returnUrl += `?name=${encodeURIComponent(recipeName)}`;
                }
                
                // 跳转回食谱详情页
                window.location.href = returnUrl;
            });
        }
        
        // 指示器点击事件
        const indicators = document.querySelectorAll('.indicator-dot');
        indicators.forEach(indicator => {
            indicator.addEventListener('click', function() {
                const stepIndex = parseInt(this.dataset.stepIndex);
                goToStep(stepIndex);
            });
        });
        
        // 触摸事件
        let touchStartY = 0;
        
        function handleTouchStart(e) {
            touchStartY = e.touches[0].clientY;
        }
        
        function handleTouchEnd(e) {
            if (touchStartY === 0) return;
            
            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchStartY - touchEndY;
            
            // 判断滑动方向
            if (Math.abs(deltaY) > 50) { // 最小滑动距离
                if (deltaY > 0) {
                    // 上滑，下一页
                    goToNextSubStep();
                } else {
                    // 下滑，上一页
                    goToPrevSubStep();
                }
            }
            
            touchStartY = 0;
        }
        
        // 添加触摸事件监听器
        const touchContainer = document.querySelector('.steps-container');
        if (touchContainer) {
            touchContainer.addEventListener('touchstart', handleTouchStart);
            touchContainer.addEventListener('touchend', handleTouchEnd);
        }
        
        // 滚动限制器
        function limitScroll() {
            const container = document.querySelector('.steps-container');
            if (!container) return;
            
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            
            // 如果滚动到顶部，阻止继续向下滚动
            if (scrollTop <= 0) {
                container.scrollTop = 1;
            }
            // 如果滚动到底部，阻止继续向上滚动
            else if (scrollTop + clientHeight >= scrollHeight) {
                container.scrollTop = scrollHeight - clientHeight - 1;
            }
        }
        
        // 设置滚动限制器
        function setupScrollLimiter() {
            const container = document.querySelector('.steps-container');
            if (!container) return;
            
            container.addEventListener('scroll', limitScroll);
            
            // 初始调用一次
            setTimeout(limitScroll, 100);
        }
        
        // 调整步骤页面最小高度
        function adjustStepPageMinHeight() {
            const stepsContainer = document.querySelector('.steps-container');
            const stepPages = document.querySelectorAll('.step-page');
            
            if (stepsContainer && stepPages.length > 0) {
                const containerHeight = stepsContainer.clientHeight;
                stepPages.forEach(page => {
                    page.style.minHeight = `${containerHeight}px`;
                });
            }
        }
        
        // 初始显示第一个步骤
        updateStepDisplay();
        
        // 设置滚动限制器
        setupScrollLimiter();
        
        // 调整步骤页面高度
        adjustStepPageMinHeight();
        
        // 窗口大小改变时重新调整
        window.addEventListener('resize', adjustStepPageMinHeight);
    }
    function formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const stepsContainer = document.querySelector('.steps-container');
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    let currentStep = 0;
    let currentSubStep = 0;
    let totalSteps = 0;
    let stepPages = [];
    function getRecipeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('recipe') || 'salad';
    }
    function getRecipeNameFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('name');
    }
    const recipeType = getRecipeFromUrl();
    const recipeName = getRecipeNameFromUrl();
    const saladStepData = [
        {
            name: "步骤1",
            subtitle: "处理食材",
            subSteps: [
                { name: "牛油果", steps: ["对半切开", "去除中间果核", "用勺子挖果肉", "把果肉切成一手指盖的长宽大小"] },
                { name: "番茄", steps: ["洗干净去掉小绿帽子", "切片", "然后每片切4块"] },
                { name: "洋葱", steps: ["去皮", "切成细条（根据个人爱好）"] }
            ]
        },
        {
            name: "步骤2",
            subtitle: "处理料汁",
            subSteps: [
                { name: "料汁", steps: ["去一个柠檬", "倒一点橄榄油", "挤一片柠檬汁", "加入四分之一勺和适量黑胡椒"] }
            ]
        },
        {
            name: "步骤3",
            subtitle: "混合食材",
            subSteps: [
                { name: "混合沙拉", steps: ["将牛油果、番茄、洋葱放入大碗", "倒入一勺橄榄油和黑胡椒油", "加入汁料并搅拌，确保均匀混合上酱汁"] }
            ]
        }
    ];
    const paiguStepData = [
        {
            name: "步骤1",
            subtitle: "准备排骨",
            subSteps: [
                { name: "排骨", steps: ["清洗排骨", "剁成小段", "冷水下锅焯水", "捞出沥干"] },
                { name: "配料", steps: ["姜切片", "葱切段"] }
            ]
        },
        {
            name: "步骤2",
            subtitle: "腌制排骨",
            subSteps: [
                { name: "腌制", steps: ["排骨加料酒、盐、胡椒粉", "腌制15分钟"] }
            ]
        },
        {
            name: "步骤3",
            subtitle: "煎炸排骨",
            subSteps: [
                { name: "煎炸", steps: ["锅中倒油烧热", "排骨下锅中小火煎至两面金黄", "捞出沥油"] }
            ]
        },
        {
            name: "步骤4",
            subtitle: "调制糖醋汁",
            subSteps: [
                { name: "糖醋汁", steps: ["碗中加糖、醋、生抽、老抽、清水", "搅拌均匀"] }
            ]
        },
        {
            name: "步骤5",
            subtitle: "收汁出锅",
            subSteps: [
                { name: "收汁", steps: ["锅中留底油，放姜葱爆香", "倒入排骨翻炒", "倒入糖醋汁", "大火收汁至粘稠", "撒芝麻出锅"] }
            ]
        }
    ];
    let stepData = (recipeType === 'paigu') ? paiguStepData : saladStepData;
    function generateStepPages() {
        stepsContainer.innerHTML = '';
        stepData.forEach((step, index) => {
            const stepPage = document.createElement('div');
            stepPage.className = 'step-page';
            stepPage.id = 'step' + (index + 1);
            if (index > 0) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'next-card-preview';
                previewDiv.innerHTML = `<div><h3>步骤${index + 1} / ${stepData.length}</h3><p>${step.subtitle}</p></div>`;
                stepPage.appendChild(previewDiv);
            }
            const contentHTML = `<div class="recipe-content">
                    <div class="content-wrapper">
                        <div class="recipe-info-section">
                            <div class="recipe-header">
                                <div class="recipe-title">
                                    <h1 class="recipe-name" style="font-size: 30px;">步骤${index + 1} <span class="step-total" style="opacity: 0.5;">/ ${stepData.length}</span></h1>
                                    <div class="recipe-subtitle" style="opacity: 0.5; font-size: 20px;">${step.subtitle}</div>
                                </div>
                            </div>
                        </div>
                        <div class="process-flow">
                            <div class="flow-line"></div>
                            <div class="flow-steps">
                                ${generateSubSteps(step.subSteps)}
                                <div class="step-group">
                                    <div class="step-header">
                                        <div class="flow-dot end"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            stepPage.innerHTML += contentHTML;
            stepsContainer.appendChild(stepPage);
        });
        stepPages = document.querySelectorAll('.step-page');
        totalSteps = stepPages.length;
    }
    function generateSubSteps(subSteps) {
        let html = '';
        subSteps.forEach(subStep => {
            html += `<div class="step-group">
                    <div class="step-header">
                        <div class="flow-dot"></div>
                        <div class="ingredient-name">${subStep.name}</div>
                    </div>
                    <div class="ingredient-steps">
                        ${subStep.steps.map(step => `<div>${step}</div>`).join('')}
                    </div>
                </div>`;
        });
        return html;
    }
    generateStepPages();
    function generateStepIndicators() {
        const indicatorContainer = document.getElementById('step-indicators');
        if (!indicatorContainer) return;
        indicatorContainer.innerHTML = '';
        for (let i = 0; i < stepData.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'step-indicator';
            indicatorContainer.appendChild(dot);
        }
    }
    function updateStepIndicators() {
        const indicatorContainer = document.getElementById('step-indicators');
        if (!indicatorContainer) return;
        const dots = indicatorContainer.querySelectorAll('.step-indicator');
        dots.forEach((dot, index) => {
            dot.className = 'step-indicator';
            if (index < currentStep) {
                dot.classList.add('done');
                dot.innerHTML = '';
            } else if (index === currentStep) {
                dot.classList.add('active');
            }
        });
    }
    generateStepIndicators();
    function setRecipeImage() {
        const recipeHero = document.querySelector('.recipe-hero');
        if (recipeHero) {
            if (recipeType === 'paigu') {
                recipeHero.style.backgroundImage = "url('images/排骨.jpg')";
            } else {
                recipeHero.style.backgroundImage = "url('images/沙拉.jpeg')";
            }
        }
    }
    setRecipeImage();
    setTimeout(() => {
        updateStepDisplay();
        updateSubStepDisplay();
        setupScrollLimiter();
        addTouchEvents();
        ensureScrollToCurrentSubStep(4);
    }, 100);
    function ensureScrollToCurrentSubStep(retry = 3) {
        scrollToCurrentSubStep();
        if (retry > 0) {
            setTimeout(() => ensureScrollToCurrentSubStep(retry - 1), 120);
        }
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', goToNextSubStep);
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', goToPrevSubStep);
    }
    const waveBtn = document.querySelector('.wave-btn');
    let isCommunicating = false;
    let recognition;
    let isFirstCommunication = true;
    let spokenResponses = new Set();
    function initSpeech() {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = function (event) {
            const speechResult = event.results[0][0].transcript;
            processUserSpeech(speechResult);
        };
        recognition.onerror = function (event) {
            stopCommunication();
        };
        recognition.onend = function () {
            if (isCommunicating) {
                recognition.start();
            }
        };
    }
    function containsSensitiveWords(text) {
        const sensitiveWords = ['你妹', '妈的', '傻逼', '混蛋', 'fuck', 'shit'];
        return sensitiveWords.some(word => text.includes(word));
    }
    function processUserSpeech(text) {
        showStepToast(`您说: ${text}`);
        if (containsSensitiveWords(text)) {
            speakResponse('请使用文明用语');
            return;
        }
        const currentStepData = stepData[currentStep];
        const currentSubStepData = currentStepData.subSteps[currentSubStep];
        const recipeDisplayName = recipeName || (recipeType === 'paigu' ? '糖醋排骨' : '牛油果番茄沙拉');
        const systemContent = `你是一个烹饪助手，正在指导用户完成${recipeDisplayName}的制作。当前是${currentStepData.name}:${currentStepData.subtitle}，具体步骤是${currentSubStepData.name}:${currentSubStepData.steps.join('，')}。请用简短易懂的中文回答用户关于当前步骤的问题。`;
        fetch('http://127.0.0.1:5000/api/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userText: text,
                systemContent: systemContent
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const responseText = data.answer;
                const audioUrl = data.audio_url ? `http://127.0.0.1:5000${data.audio_url}` : null;
                speakResponse(responseText, audioUrl);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                console.error('Error details:', error.message);
                if (error.message.includes('Failed to fetch')) {
                    speakResponse('无法连接到服务器，请检查后端服务是否启动');
                } else if (error.message.includes('NetworkError')) {
                    speakResponse('网络连接异常，请检查网络设置');
                } else {
                    speakResponse('服务暂时不可用，请稍后再试');
                }
            });
    }
    function speakResponse(text, audioUrl) {
        if (spokenResponses.has(text)) {
            return;
        }
        spokenResponses.add(text);
        showStepToast(`助手: ${text}`);
        if (audioUrl) {
            let audio = document.getElementById('tts-audio');
            if (!audio) {
                audio = document.createElement('audio');
                audio.id = 'tts-audio';
                document.body.appendChild(audio);
            }
            audio.src = audioUrl;
            audio.onended = function () {
                const filename = audioUrl.split('/').pop();
                fetch(`http://127.0.0.1:5000/api/delete_audio/${filename}`, { method: 'DELETE' })
                    .catch(error => console.error('Delete audio error:', error));
            };
            audio.play().catch(e => {
                showStepToast('请点击页面以播放语音');
            });
        }
    }
    function toggleCommunication() {
        if (isCommunicating) {
            stopCommunication();
        } else {
            startCommunication();
        }
    }
    function startCommunication() {
        if (!recognition) {
            initSpeech();
        }
        isCommunicating = true;
        waveBtn.classList.add('active');
        recognition.start();
        if (isFirstCommunication) {
            const initialText = `已进入沟通模式，请问关于${stepData[currentStep].subtitle}的什么问题？`;
            fetch('http://127.0.0.1:5000/api/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userText: initialText,
                    systemContent: 'dummy',
                    is_initial: true
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    const responseText = data.answer;
                    const audioUrl = data.audio_url ? `http://127.0.0.1:5000${data.audio_url}` : null;
                    speakResponse(responseText, audioUrl);
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                });
            isFirstCommunication = false;
        }
    }
    function stopCommunication() {
        isCommunicating = false;
        waveBtn.classList.remove('active');
        if (recognition) {
            recognition.stop();
        }
    }
    if (waveBtn) {
        waveBtn.addEventListener('click', toggleCommunication);
    }
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const params = new URLSearchParams(window.location.search);
            const from = params.get('from');
            const name = params.get('name');
            const recipe = params.get('recipe');
            let returnUrl = 'recipe-detail.html';
            if (name) {
                returnUrl = `recipe-detail.html?name=${name}`;
            } else if (from === 'paigu' || recipe === 'paigu') {
                returnUrl = 'recipe-detail.html?name=' + encodeURIComponent('糖醋排骨');
            } else if (from === 'salad' || recipe === 'salad') {
                returnUrl = 'recipe-detail.html?name=' + encodeURIComponent('牛油果番茄沙拉');
            } else {
                returnUrl = 'recipe-detail.html?name=' + encodeURIComponent('牛油果番茄沙拉');
            }
            window.location.href = returnUrl;
        });
    }
    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let isScrolling = false;
    function addTouchEvents() {
        stepPages.forEach((page, index) => {
            page.addEventListener('touchstart', handleTouchStart, { passive: false });
            page.addEventListener('touchmove', handleTouchMove, { passive: false });
            page.addEventListener('touchend', handleTouchEnd, { passive: false });
        });
    }
    function handleTouchStart(e) {
        startY = e.touches[0].clientY;
        currentY = startY;
        startTime = Date.now();
        const stepsContainer = document.querySelector('.steps-container');
        if (stepsContainer) {
            const scrollHeight = stepsContainer.scrollHeight;
            const clientHeight = stepsContainer.clientHeight;
            const scrollTop = stepsContainer.scrollTop;
            isScrolling = scrollHeight > clientHeight;
            window.lastScrollTop = scrollTop;
        } else {
            isScrolling = false;
        }
    }
    function handleTouchMove(e) {
        if (!startY) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (isScrolling) {
            const stepsContainer = document.querySelector('.steps-container');
            if (stepsContainer) {
                const scrollTop = stepsContainer.scrollTop;
                const scrollHeight = stepsContainer.scrollHeight;
                const clientHeight = stepsContainer.clientHeight;
                if ((scrollTop <= 5 && deltaY > 0) || (scrollTop + clientHeight >= scrollHeight - 5 && deltaY < 0)) {
                    isScrolling = false;
                }
            }
        }
        if (!isScrolling && Math.abs(deltaY) > 15) {
            e.preventDefault();
        }
    }
    function handleTouchEnd(e) {
        if (!startY) return;
        const deltaY = currentY - startY;
        const swipeTime = Date.now() - startTime;
        const isQuickSwipe = swipeTime < 300;
        const minSwipeDistance = 50;
        if (!isScrolling) {
            if (deltaY < -minSwipeDistance || (isQuickSwipe && deltaY < -30)) {
                goToNextSubStep();
            } else if (deltaY > minSwipeDistance || (isQuickSwipe && deltaY > 30)) {
                goToPrevSubStep();
            }
        }
        startY = 0;
        currentY = 0;
        isScrolling = false;
    }
    let scrollLimiterAttached = false;
    function limitScroll() {
        const stepsContainer = document.querySelector('.steps-container');
        const currentPage = stepPages[currentStep];
        if (stepsContainer && currentPage) {
            const pageContent = currentPage.querySelector('.recipe-content');
            if (pageContent) {
                const contentHeight = pageContent.offsetHeight;
                const containerHeight = stepsContainer.clientHeight;
                const backgroundOffset = 200;
                const bottomPadding = 100;
                const maxScroll = Math.max(0, contentHeight - containerHeight + backgroundOffset + bottomPadding);
                if (stepsContainer.scrollTop > maxScroll) {
                    stepsContainer.scrollTop = maxScroll;
                }
            }
        }
    }
    function setupScrollLimiter() {
        const stepsContainer = document.querySelector('.steps-container');
        if (stepsContainer && !scrollLimiterAttached) {
            stepsContainer.addEventListener('scroll', limitScroll, { passive: true });
            scrollLimiterAttached = true;
        }
    }
    function scrollToCurrentSubStep() {
        const currentPage = stepPages[currentStep];
        if (!currentPage) return;
        const currentSubStepGroup = currentPage.querySelectorAll('.step-group')[currentSubStep];
        if (!currentSubStepGroup) return;
        const stepsContainer = document.querySelector('.steps-container');
        if (!stepsContainer) return;
        const containerHeight = stepsContainer.clientHeight;
        const targetPosition = containerHeight * 0.3;
        const stepGroupRect = currentSubStepGroup.getBoundingClientRect();
        const containerRect = stepsContainer.getBoundingClientRect();
        const stepGroupTop = stepGroupRect.top - containerRect.top + stepsContainer.scrollTop;
        const stepGroupHeight = stepGroupRect.height;
        const maxScrollTop = stepsContainer.scrollHeight - containerHeight;
        let desiredScrollTop = stepGroupTop - targetPosition;
        if (desiredScrollTop + stepGroupHeight > stepsContainer.scrollHeight - targetPosition) {
            desiredScrollTop = maxScrollTop;
        }
        if (desiredScrollTop < 0) desiredScrollTop = 0;
        const currentScrollTop = stepsContainer.scrollTop;
        const scrollDistance = desiredScrollTop - currentScrollTop;
        if (Math.abs(scrollDistance) > 10) {
            stepsContainer.scrollTo({
                top: desiredScrollTop,
                behavior: 'smooth'
            });
        }
    }
    function adjustStepPageMinHeight() {
        const stepsContainer = document.querySelector('.steps-container');
        const currentPage = stepPages[currentStep];
        if (!stepsContainer || !currentPage) return;
        const containerHeight = stepsContainer.clientHeight;
        currentPage.style.minHeight = containerHeight + 'px';
    }
    window.addEventListener('resize', () => {
        adjustStepPageMinHeight();
    });
    function updateStepDisplay() {
        stepPages.forEach((page, index) => {
            page.classList.remove('current', 'next', 'completed', 'hidden');
            const preview = page.querySelector('.next-card-preview');
            if (preview) {
                preview.style.display = 'none';
            }
            page.style.transform = '';
            page.style.zIndex = '';
            if (index === currentStep) {
                page.classList.add('current');
                adjustStepPageMinHeight();
            } else if (index === currentStep + 1) {
                page.classList.add('next');
            } else if (index < currentStep) {
                page.classList.add('completed');
                const stackOffset = (currentStep - index) * 5;
                page.style.transform = `translateY(-${20 + stackOffset}px) scale(${0.9 - (currentStep - index) * 0.02})`;
                page.style.zIndex = index + 1;
            } else {
                page.classList.add('hidden');
            }
        });
        updateStepIndicators();
        setTimeout(() => {
            scrollToCurrentSubStep();
        }, 100);
    }
    function updateSubStepDisplay() {
        const currentPage = stepPages[currentStep];
        if (!currentPage) return;
        const flowDots = currentPage.querySelectorAll('.flow-dot:not(.end)');
        const stepGroups = currentPage.querySelectorAll('.step-group');
        flowDots.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            dot.innerHTML = '';
        });
        if (currentSubStep < flowDots.length) {
            flowDots[currentSubStep].classList.add('active');
        }
        for (let i = 0; i < currentSubStep && i < flowDots.length; i++) {
            flowDots[i].classList.add('completed');
            flowDots[i].innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
        stepGroups.forEach((group, index) => {
            group.classList.remove('current-substep');
            if (index === currentSubStep) {
                group.classList.add('current-substep');
            }
        });
        setTimeout(() => {
            scrollToCurrentSubStep();
        }, 100);
    }
    function showStepToast(text) {
        const toast = document.getElementById('step-toast');
        if (!toast) return;
        toast.textContent = text;
        toast.style.display = 'block';
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => { toast.style.display = 'none'; }, 400);
        }, 3000);
    }
    function goToNextSubStep() {
        const currentStepData = stepData[currentStep];
        if (!currentStepData) return;
        const totalSubSteps = currentStepData.subSteps.length;
        if (currentSubStep < totalSubSteps - 1) {
            currentSubStep++;
            updateSubStepDisplay();
        } else {
            if (currentStep < totalSteps - 1) {
                currentStep++;
                currentSubStep = 0;
                updateStepDisplay();
                updateSubStepDisplay();
                const stepsContainer = document.querySelector('.steps-container');
                if (stepsContainer) {
                    stepsContainer.scrollTop = 0;
                }
                showStepToast('已进入 ' + stepData[currentStep].name + '：' + stepData[currentStep].subtitle);
            } else {
                recordCookingCompletion();
                window.location.href = 'trophy.html';
            }
        }
    }
    function goToPrevSubStep() {
        if (currentSubStep > 0) {
            currentSubStep--;
            updateSubStepDisplay();
        } else {
            if (currentStep > 0) {
                currentStep--;
                const prevStepData = stepData[currentStep];
                if (prevStepData) {
                    currentSubStep = prevStepData.subSteps.length - 1;
                    updateStepDisplay();
                    updateSubStepDisplay();
                    const stepsContainer = document.querySelector('.steps-container');
                    if (stepsContainer) {
                        stepsContainer.scrollTop = 0;
                    }
                    showStepToast('已进入 ' + stepData[currentStep].name + '：' + stepData[currentStep].subtitle);
                }
            }
        }
    }
    function goToStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < totalSteps) {
            currentStep = stepIndex;
            currentSubStep = 0;
            updateStepDisplay();
            updateSubStepDisplay();
            const stepsContainer = document.querySelector('.steps-container');
            if (stepsContainer) {
                stepsContainer.scrollTop = 0;
            }
        }
    }
    function recordCookingCompletion() {
        const today = new Date();
        const dateKey = formatDateKey(today);
        let cookingFrequency = JSON.parse(localStorage.getItem('chefmate_cooking_frequency') || '{}');
        if (cookingFrequency[dateKey]) {
            cookingFrequency[dateKey]++;
        } else {
            cookingFrequency[dateKey] = 1;
        }
        localStorage.setItem('chefmate_cooking_frequency', JSON.stringify(cookingFrequency));
        const completedRecipes = JSON.parse(localStorage.getItem('chefmate_completed_recipes') || '[]');
        const recipeInfo = {
            date: today.toISOString(),
            type: recipeType,
            name: recipeName || (recipeType === 'paigu' ? '糖醋排骨' : '牛油果番茄沙拉'),
            timestamp: Date.now()
        };
        completedRecipes.push(recipeInfo);
        localStorage.setItem('chefmate_completed_recipes', JSON.stringify(completedRecipes));
        localStorage.setItem('chefmate_has_real_data', 'true');
    }
    function formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
});
