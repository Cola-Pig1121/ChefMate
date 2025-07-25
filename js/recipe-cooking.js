document.addEventListener('DOMContentLoaded', function() {
    // 获取元素
    const stepsContainer = document.querySelector('.steps-container');
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    
    // 当前步骤状态
    let currentStep = 0;
    let currentSubStep = 0;
    let totalSteps = 0;
    let stepPages = [];
    
    // 获取URL参数，决定显示哪个菜谱
    function getRecipeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('recipe') || 'salad';
    }
    
    // 获取食谱名称参数
    function getRecipeNameFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('name');
    }
    
    const recipeType = getRecipeFromUrl();
    const recipeName = getRecipeNameFromUrl();

    // 沙拉步骤
    const saladStepData = [
        {
            name: "步骤1",
            subtitle: "处理食材",
            subSteps: [
                { name: "牛油果", steps: ["对半切开", "去除中间果核", "用勺子挖3果肉", "把果肉切成一手指盖的长宽大小"] },
                { name: "番茄", steps: ["洗干净去掉小绿帽子", "切片", "然后每片切4块"] },
                { name: "洋葱", steps: ["去皮", "切成细条（根据个人爱好）"] }
            ]
        },
        {
            name: "步骤2", 
            subtitle: "处理料汁",
            subSteps: [
                { name: "料汁", steps: ["去一个柠檬", "围人一点橄榄油（笑似一个瓶盖）", "挤一片柠檬汁", "加入四分之一勺和适量黑胡椒"] }
            ]
        },
        {
            name: "步骤3",
            subtitle: "混合食材", 
            subSteps: [
                { name: "混合沙拉", steps: ["将牛油果、番茄、洋葱放入大碗", "倒入一勺橄榄油和黑胡椒油（笑似一个瓶盖）", "加入汁料并次搅拌，确保均匀混合上酱汁"] }
            ]
        }
    ];

    // 糖醋排骨步骤
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

    // 根据参数切换
    let stepData = (recipeType === 'paigu') ? paiguStepData : saladStepData;
    
    // 生成步骤页面HTML
    function generateStepPages() {
        // 清空现有步骤容器
        stepsContainer.innerHTML = '';
        
        // 根据stepData生成步骤页面
        stepData.forEach((step, index) => {
            const stepPage = document.createElement('div');
            stepPage.className = 'step-page';
            stepPage.id = 'step' + (index + 1);
            
            // 如果不是第一个步骤，添加下一张卡片预览
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
            
            // 添加步骤内容
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
        
        // 更新步骤页面引用和总步骤数
        stepPages = document.querySelectorAll('.step-page');
        totalSteps = stepPages.length;
    }
    
    // 生成子步骤HTML
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
    
    // 生成步骤页面
    generateStepPages();
    
    // 根据食谱类型设置背景图片
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
    
    // 设置背景图片
    setRecipeImage();
    
    // 初始化
    setTimeout(() => {
        updateStepDisplay();
        updateSubStepDisplay();
        setupScrollLimiter();
        addTouchEvents(); // 添加触摸事件
        ensureScrollToCurrentSubStep(4); // 多次尝试滚动
    }, 100);
    
    // 多次尝试滚动，确保聚焦
    function ensureScrollToCurrentSubStep(retry = 3) {
        scrollToCurrentSubStep();
        if (retry > 0) {
            setTimeout(() => ensureScrollToCurrentSubStep(retry - 1), 120);
        }
    }
    
    // 按钮事件
    if (nextBtn) {
        nextBtn.addEventListener('click', goToNextSubStep);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', goToPrevSubStep);
    }
    
    // 取消按钮返回食谱详情页
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const params = new URLSearchParams(window.location.search);
            const from = params.get('from');
            const name = params.get('name');
            const recipe = params.get('recipe');
            
            // 根据食谱类型构建正确的返回URL
            let returnUrl = 'recipe-detail.html';
            
            if (name) {
                // 如果有name参数，直接使用
                returnUrl = `recipe-detail.html?name=${name}`;
            } else if (from === 'paigu' || recipe === 'paigu') {
                // 排骨食谱
                returnUrl = 'recipe-detail.html?name=' + encodeURIComponent('糖醋排骨');
            } else if (from === 'salad' || recipe === 'salad') {
                // 沙拉食谱
                returnUrl = 'recipe-detail.html?name=' + encodeURIComponent('牛油果番茄沙拉');
            } else {
                // 默认返回沙拉
                returnUrl = 'recipe-detail.html?name=' + encodeURIComponent('牛油果番茄沙拉');
            }
            
            window.location.href = returnUrl;
        });
    }
    
    // 触摸事件变量
    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let isScrolling = false;
    
    // 为每个卡牌添加触摸事件
    function addTouchEvents() {
        stepPages.forEach((page, index) => {
            page.addEventListener('touchstart', handleTouchStart, { passive: false });
            page.addEventListener('touchmove', handleTouchMove, { passive: false });
            page.addEventListener('touchend', handleTouchEnd, { passive: false });
        });
    }
    
    // 触摸开始
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
    
    // 触摸移动
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
    
    // 触摸结束
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
    
    // 滚动限制函数
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
    
    // 滚动到当前小步骤，确保在屏幕30%以上区域，且底部不会超出
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
        
        // 计算最大允许滚动的scrollTop
        const maxScrollTop = stepsContainer.scrollHeight - containerHeight;
        
        // 期望的scrollTop
        let desiredScrollTop = stepGroupTop - targetPosition;
        
        // 如果当前小步骤底部会超出容器底部，则只滚到最底部
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
    
    // 动态设置当前卡片的最小高度，确保填满底部
    function adjustStepPageMinHeight() {
        const stepsContainer = document.querySelector('.steps-container');
        const currentPage = stepPages[currentStep];
        if (!stepsContainer || !currentPage) return;

        // 计算可用高度
        const containerHeight = stepsContainer.clientHeight;
        // 设置当前卡片的最小高度
        currentPage.style.minHeight = containerHeight + 'px';
    }

    // 监听窗口变化，实时调整高度
    window.addEventListener('resize', () => {
        adjustStepPageMinHeight();
    });

    // 更新步骤显示
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
                // 切换卡片时动态调整高度
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
        // 延迟滚动，确保DOM更新完成
        setTimeout(() => {
            scrollToCurrentSubStep();
        }, 100);
    }
    
    // 更新小步骤显示
    function updateSubStepDisplay() {
        const currentPage = stepPages[currentStep];
        if (!currentPage) return;
        
        const flowDots = currentPage.querySelectorAll('.flow-dot:not(.end)');
        const stepGroups = currentPage.querySelectorAll('.step-group');
        
        // 重置所有小点的状态
        flowDots.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            dot.innerHTML = '';
        });
        
        // 设置当前小步骤为绿色
        if (currentSubStep < flowDots.length) {
            flowDots[currentSubStep].classList.add('active');
        }
        
        // 设置已完成的小步骤为带对勾的状态
        for (let i = 0; i < currentSubStep && i < flowDots.length; i++) {
            flowDots[i].classList.add('completed');
            flowDots[i].innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
        
        // 高亮当前小步骤组
        stepGroups.forEach((group, index) => {
            group.classList.remove('current-substep');
            if (index === currentSubStep) {
                group.classList.add('current-substep');
            }
        });
        
        // 延迟滚动，确保DOM更新完成
        setTimeout(() => {
            scrollToCurrentSubStep();
        }, 100);
    }
    
    // Toast提示函数
    function showStepToast(text) {
        const toast = document.getElementById('step-toast');
        if (!toast) return;
        toast.textContent = text;
        toast.style.display = 'block';
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => { toast.style.display = 'none'; }, 400);
        }, 1800);
    }
    
    // 前往下一个子步骤
    function goToNextSubStep() {
        const currentStepData = stepData[currentStep];
        if (!currentStepData) return;
        
        const totalSubSteps = currentStepData.subSteps.length;
        
        if (currentSubStep < totalSubSteps - 1) {
            // 还在当前大步骤内
            currentSubStep++;
            updateSubStepDisplay();
        } else {
            // 当前大步骤已完成，切换到下一个大步骤
            if (currentStep < totalSteps - 1) {
                currentStep++;
                currentSubStep = 0;
                updateStepDisplay();
                updateSubStepDisplay();
                // 滚动到容器顶部
                const stepsContainer = document.querySelector('.steps-container');
                if (stepsContainer) {
                    stepsContainer.scrollTop = 0;
                }
                // 显示大步骤切换提示
                showStepToast('已进入 ' + stepData[currentStep].name + '：' + stepData[currentStep].subtitle);
            } else {
                // 已经是最后一个大步骤的最后一个小步骤，记录做菜完成并跳转奖杯页面
                recordCookingCompletion();
                window.location.href = 'trophy.html';
            }
        }
    }
    
    // 前往上一个子步骤
    function goToPrevSubStep() {
        if (currentSubStep > 0) {
            // 还在当前大步骤内
            currentSubStep--;
            updateSubStepDisplay();
        } else {
            // 当前大步骤的第一个子步骤，切换到上一个大步骤的最后一个子步骤
            if (currentStep > 0) {
                currentStep--;
                const prevStepData = stepData[currentStep];
                if (prevStepData) {
                    currentSubStep = prevStepData.subSteps.length - 1;
                    updateStepDisplay();
                    updateSubStepDisplay();
                    // 滚动到容器顶部
                    const stepsContainer = document.querySelector('.steps-container');
                    if (stepsContainer) {
                        stepsContainer.scrollTop = 0;
                    }
                    // 显示大步骤切换提示
                    showStepToast('已进入 ' + stepData[currentStep].name + '：' + stepData[currentStep].subtitle);
                }
            }
        }
    }
    
    // 前往指定步骤
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
    
    // 记录做菜完成
    function recordCookingCompletion() {
        const today = new Date();
        const dateKey = formatDateKey(today);
        
        // 获取现有的做菜频率数据
        let cookingFrequency = JSON.parse(localStorage.getItem('chefmate_cooking_frequency') || '{}');
        
        // 增加今天的做菜次数
        if (cookingFrequency[dateKey]) {
            cookingFrequency[dateKey]++;
        } else {
            cookingFrequency[dateKey] = 1;
        }
        
        // 保存更新后的数据
        localStorage.setItem('chefmate_cooking_frequency', JSON.stringify(cookingFrequency));
        
        // 记录完成的食谱信息（可选，用于更详细的统计）
        const completedRecipes = JSON.parse(localStorage.getItem('chefmate_completed_recipes') || '[]');
        const recipeInfo = {
            date: today.toISOString(),
            type: recipeType,
            name: recipeName || (recipeType === 'paigu' ? '糖醋排骨' : '牛油果番茄沙拉'),
            timestamp: Date.now()
        };
        completedRecipes.push(recipeInfo);
        localStorage.setItem('chefmate_completed_recipes', JSON.stringify(completedRecipes));
        
        // 标记为真实数据，避免被示例数据覆盖
        localStorage.setItem('chefmate_has_real_data', 'true');
        
        console.log('做菜完成记录已保存:', dateKey, cookingFrequency[dateKey]);
    }
    
    // 格式化日期为键值（YYYY-MM-DD）
    function formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
});