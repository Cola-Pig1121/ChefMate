document.addEventListener('DOMContentLoaded', function() {
    // 获取URL参数
    function getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
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
        const recipeType = getQueryParam('recipe');
        const recipeName = getQueryParam('name');
        
        // 根据参数获取食谱数据
        let recipe;
        
        // 如果有recipeId，根据ID获取食谱数据
        if (recipeId) {
            recipe = await fetchRecipeData(recipeId);
            // 如果API失败，尝试根据name参数查找示例数据
            if (!recipe && recipeName) {
                // 查找示例数据中匹配的食谱
                const decodedName = decodeURIComponent(recipeName);
                for (const key in sampleRecipes) {
                    if (sampleRecipes[key].title === decodedName) {
                        recipe = sampleRecipes[key];
                        break;
                    }
                }
                // 如果还是没找到，使用默认数据
                if (!recipe) {
                    recipe = sampleRecipes['沙拉'];
                }
            }
            // 如果API失败且没有name参数，使用默认数据
            else if (!recipe) {
                recipe = sampleRecipes['沙拉'];
            }
        } 
        // 向后兼容：如果没有ID但有type参数
        else if (recipeType) {
            recipe = sampleRecipes[recipeType] || sampleRecipes['沙拉'];
        } 
        // 默认情况
        else {
            recipe = sampleRecipes['沙拉'];
        }

        // 设置图片
        const imageElement = document.querySelector('.recipe-image');
        if (imageElement) {
            imageElement.style.backgroundImage = `url('${recipe.image}')`;
        }

        // 生成步骤页面
        const stepPagesContainer = document.querySelector('.step-pages');
        if (stepPagesContainer && recipe.steps) {
            stepPagesContainer.innerHTML = '';
            recipe.steps.forEach((step, index) => {
                const stepPage = document.createElement('div');
                stepPage.className = 'step-page';
                stepPage.dataset.stepIndex = index;
                
                // 主步骤描述
                const stepHeader = document.createElement('div');
                stepHeader.className = 'step-header';
                stepHeader.innerHTML = `
                    <div class="step-number">步骤 ${index + 1}</div>
                    <div class="step-description">${step.description}</div>
                `;
                
                // 子步骤容器
                const subStepsContainer = document.createElement('div');
                subStepsContainer.className = 'sub-steps';
                
                // 生成子步骤
                if (step.subSteps) {
                    step.subSteps.forEach((subStep, subIndex) => {
                        const subStepElement = document.createElement('div');
                        subStepElement.className = 'sub-step';
                        subStepElement.dataset.subStepIndex = subIndex;
                        subStepElement.innerHTML = `
                            <div class="sub-step-circle">${subIndex + 1}</div>
                            <div class="sub-step-content">${subStep}</div>
                        `;
                        subStepsContainer.appendChild(subStepElement);
                    });
                }
                
                stepPage.appendChild(stepHeader);
                stepPage.appendChild(subStepsContainer);
                stepPagesContainer.appendChild(stepPage);
            });
        }

        // 生成步骤指示器
        const stepIndicator = document.querySelector('.step-indicator');
        if (stepIndicator && recipe.steps) {
            stepIndicator.innerHTML = '';
            recipe.steps.forEach((_, index) => {
                const indicator = document.createElement('div');
                indicator.className = 'indicator-dot';
                indicator.dataset.stepIndex = index;
                if (index === 0) {
                    indicator.classList.add('active');
                }
                stepIndicator.appendChild(indicator);
            });
        }

        // 初始化当前步骤
        let currentStep = 0;
        let currentSubStep = 0;
        
        // 获取所有步骤页面
        const stepPages = document.querySelectorAll('.step-page');
        
        // 更新步骤显示
        function updateStepDisplay() {
            stepPages.forEach((page, index) => {
                if (index === currentStep) {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });
            
            // 更新指示器
            const indicators = document.querySelectorAll('.indicator-dot');
            indicators.forEach((indicator, index) => {
                if (index === currentStep) {
                    indicator.classList.add('active');
                } else {
                    indicator.classList.remove('active');
                }
            });
            
            // 更新子步骤显示
            updateSubStepDisplay();
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
            
            // 滚动到当前子步骤
            scrollToCurrentSubStep();
        }
        
        // 滚动到当前子步骤
        function scrollToCurrentSubStep() {
            const currentPage = stepPages[currentStep];
            if (!currentPage) return;
            
            const activeSubStep = currentPage.querySelector('.sub-step.active');
            if (activeSubStep) {
                const container = document.querySelector('.step-content');
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
        
        // 步骤切换提示
        function showStepToast(message) {
            const existingToast = document.querySelector('.step-toast');
            if (existingToast) {
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
        
        if (prevBtn) {
            prevBtn.addEventListener('click', goToPrevSubStep);
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', goToNextSubStep);
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
        const stepContent = document.querySelector('.step-content');
        if (stepContent) {
            stepContent.addEventListener('touchstart', handleTouchStart);
            stepContent.addEventListener('touchend', handleTouchEnd);
        }
        
        // 滚动限制器
        function limitScroll() {
            const container = document.querySelector('.step-content');
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
            const container = document.querySelector('.step-content');
            if (!container) return;
            
            container.addEventListener('scroll', limitScroll);
            
            // 初始调用一次
            setTimeout(limitScroll, 100);
        }
        
        // 调整步骤页面最小高度
        function adjustStepPageMinHeight() {
            const stepContent = document.querySelector('.step-content');
            const stepPages = document.querySelectorAll('.step-page');
            
            if (stepContent && stepPages.length > 0) {
                const containerHeight = stepContent.clientHeight;
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

    // 启动页面初始化
    initPage();
});
