document.addEventListener('DOMContentLoaded', function () {
    const stepsContainer = document.querySelector('.steps-container');
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    let currentStep = 0;
    let currentSubStep = 0;
    let totalSteps = 0;
    let stepPages = [];

    function getRecipeIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    const recipeId = getRecipeIdFromUrl();
    let stepData = null;
    let recipeTitle = null;

    async function fetchRecipeData(recipeId) {
        try {
            const response = await fetch(`/api/recipes/${recipeId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const recipeKey = Object.keys(data)[0];
            return data[recipeKey];
        } catch (error) {
            console.error('获取食谱数据失败:', error);
            return null;
        }
    }

    function convertRecipeDataToSteps(recipeData) {
        if (!recipeData) return null;
        if (recipeData.cookingSteps && Array.isArray(recipeData.cookingSteps)) {
            return recipeData.cookingSteps;
        }
        if (!recipeData.steps || !Array.isArray(recipeData.steps)) return null;

        const steps = recipeData.steps;
        const convertedSteps = [];
        const stepsPerGroup = Math.min(3, Math.ceil(steps.length / 3));

        for (let i = 0; i < steps.length; i += stepsPerGroup) {
            const groupSteps = steps.slice(i, i + stepsPerGroup);
            const stepNumber = Math.floor(i / stepsPerGroup) + 1;

            let subtitle = `第${stepNumber}阶段`;
            if (stepNumber === 1) subtitle = "准备工作";
            else if (stepNumber === 2) subtitle = "制作过程";
            else if (stepNumber === 3) subtitle = "完成收尾";

            convertedSteps.push({
                name: `步骤${stepNumber}`,
                subtitle: subtitle,
                subSteps: groupSteps.map((step, index) => {
                    const stepText = typeof step === 'string' ? step : (step.description || step.name || '操作步骤');
                    return {
                        name: `操作${index + 1}`,
                        steps: [stepText]
                    };
                })
            });
        }

        return convertedSteps;
    }

    async function initializeStepData() {
        if (recipeId) {
            const recipeData = await fetchRecipeData(recipeId);
            if (recipeData) {
                recipeTitle = recipeData.title;
                const convertedSteps = convertRecipeDataToSteps(recipeData);
                if (convertedSteps && convertedSteps.length > 0) {
                    stepData = convertedSteps;
                    return;
                }
            }
        }
    }

    function generateStepPages() {
        if (!stepData) return;

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

    async function initializePage() {
        await initializeStepData();
        if (!stepData) {
            console.error('无法加载食谱数据');
            return;
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

    async function setRecipeImage() {
        const recipeHero = document.querySelector('.recipe-hero');
        if (!recipeHero) return;

        if (recipeId) {
            const recipeData = await fetchRecipeData(recipeId);
            if (recipeData && recipeData.image) {
                recipeHero.style.backgroundImage = `url('${recipeData.image}')`;
                return;
            }
        }
    }

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
    let recognition = null;
    let spokenResponses = new Set();

    function isConfirmationIntent(text) {
        const confirmationWords = ['好了', '完成', '做好了', '可以', '行', 'OK', '嗯', '是的', '没问题', '对', '对的', '对了'];
        return confirmationWords.some(word => text.includes(word));
    }

    function isNextStepIntent(text) {
        const nextStepWords = ['下一步', '继续', '往下', '下一个', '接着来', '然后呢', '接下来', '下一步是什么'];
        return nextStepWords.some(word => text.includes(word));
    }

    function isPrevStepIntent(text) {
        const prevStepWords = ['上一步', '返回', '回去', '上一个', '刚才', '之前', '退回去', '退回'];
        return prevStepWords.some(word => text.includes(word));
    }

    function isRepeatIntent(text) {
        const repeatWords = ['再说一遍', '没听清', '重复一下', '刚才说什么', '重说', '重复', '再说', '什么', '啥'];
        return repeatWords.some(word => text.includes(word));
    }

    function isIngredientReplacementIntent(text) {
        const replacementWords = ['没有', '缺', '少了', '不够', '替代', '换成', '替换', '过敏', '不能吃', '不想用'];
        return replacementWords.some(word => text.includes(word)) &&
            (text.includes('没有') || text.includes('缺') || text.includes('少了') || text.includes('替代') || text.includes('换成'));
    }

    function isTimeQuestionIntent(text) {
        const timeWords = ['多久', '几分钟', '时间', '要多久', '需要多久', '还要多久', '什么时候', '何时', '几时'];
        return timeWords.some(word => text.includes(word));
    }

    function isConfusedIntent(text) {
        const confusedWords = ['怎么办', '怎么', '不会', '不懂', '不清楚', '不明白', '困惑', '卡住了', '停住了'];
        return confusedWords.some(word => text.includes(word));
    }

    function extractIngredient(text) {
        const ingredients = ['洋葱', '大蒜', '盐', '糖', '酱油', '醋', '油', '姜', '葱', '辣椒', '番茄', '牛油果', '排骨', '料酒', '胡椒粉'];
        for (const ingredient of ingredients) {
            if (text.includes(ingredient)) {
                return ingredient;
            }
        }
        return '该食材';
    }

    function getProgressDescription(progress) {
        if (progress < 25) {
            return '我们已经完成了四分之一，继续保持！';
        } else if (progress < 50) {
            return '已经完成近一半了，这道菜正在成形！';
        } else if (progress < 75) {
            return '太棒了，已经完成大部分了，很快就能享用美食了。';
        } else {
            return '几乎完成了！最后几步会让这道菜更加完美。';
        }
    }

    function generateSystemPrompt(userText, currentStepData, currentSubStepData, recipeDisplayName, currentStep, totalSteps) {
        const isConfirmation = isConfirmationIntent(userText);
        const isNextStep = isNextStepIntent(userText);
        const isRepeat = isRepeatIntent(userText);
        const isIngredientReplacement = isIngredientReplacementIntent(userText);
        const isTimeQuestion = isTimeQuestionIntent(userText);
        const isConfused = isConfusedIntent(userText);

        const progress = Math.round(((currentStep + 1) * 100) / totalSteps);
        const progressDescription = getProgressDescription(progress);

        let systemPrompt = `你是一个友好的中文烹饪助手，正在指导用户制作「${recipeDisplayName}」。\n`;

        systemPrompt += `当前步骤：${currentStepData.name} - ${currentStepData.subtitle}。\n`;
        systemPrompt += `具体操作：${currentSubStepData.name} - ${currentSubStepData.steps.join('，')}。\n`;
        systemPrompt += `当前进度：${progress}%（第${currentStep + 1}步/共${totalSteps}步）。\n`;

        if (isConfirmation || isNextStep) {
            systemPrompt += `用户表示已完成或想继续下一步，请用自然的对话方式确认完成并引导进入下一步。\n`;
            systemPrompt += `请根据进度提供适当的鼓励，例如${progressDescription}。\n`;
        } else if (isRepeat) {
            systemPrompt += `用户希望重复当前步骤说明，请完整、清晰地重复当前步骤的指导。\n`;
            systemPrompt += `可以添加小技巧或注意事项，帮助用户更好地完成这一步骤。\n`;
        } else if (isIngredientReplacement) {
            const ingredient = extractIngredient(userText);
            systemPrompt += `用户表示没有「${ingredient}」或需要替换食材，请推荐1-2种常见替代食材。\n`;
            systemPrompt += `请说明替换后的风味变化和用量调整，确保菜品整体风味平衡。\n`;
        } else if (isTimeQuestion) {
            systemPrompt += `用户询问关于时间的问题（如剩余时间、完成判断标准等），请提供明确的时间指导和判断标准。\n`;
            systemPrompt += `可以给出小技巧，帮助用户更好地判断完成状态。\n`;
        } else if (isConfused) {
            systemPrompt += `用户表达困惑或不确定，需要更详细的解释，请提供清晰、分步骤的指导。\n`;
            systemPrompt += `可以添加常见问题解答或小技巧，帮助用户克服困难。\n`;
        } else {
            systemPrompt += `请用简短、自然、鼓励的语气回答用户关于本步骤的问题。\n`;
            systemPrompt += `如果用户询问食材替换、时间、火候等问题，请主动给出实用建议。\n`;
        }

        systemPrompt += `回答要求：\n`;
        systemPrompt += `- 保持回答简短（50-100字），适合语音播报\n`;
        systemPrompt += `- 使用口语化、自然的表达，避免专业术语\n`;
        systemPrompt += `- 添加适当的情感表达和鼓励，增强用户体验\n`;
        systemPrompt += `- 如果是关键步骤，强调注意事项\n`;
        systemPrompt += `- 避免一次性提供过多信息，保持步骤清晰\n`;

        return systemPrompt;
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
        if (!stepData || !stepData[currentStep]) return;

        if (isNextStepIntent(text)) {
            goToNextSubStep();
            speakResponse('好的，已进入下一步。');
            return;
        }

        if (isPrevStepIntent(text)) {
            goToPrevSubStep();
            speakResponse('好的，已返回上一步。');
            return;
        }

        const currentStepData = stepData[currentStep];
        const currentSubStepData = currentStepData.subSteps[currentSubStep];
        const recipeDisplayName = recipeTitle || '这道菜';

        const systemContent = generateSystemPrompt(
            text,
            currentStepData,
            currentSubStepData,
            recipeDisplayName,
            currentStep,
            stepData.length
        );

        fetch('/api/ask', {
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
                const audioUrl = data.audio_url ? `${data.audio_url}` : null;
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
                fetch(`/api/delete_audio/${filename}`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json'
                    }
                }).catch(error => console.error('Delete audio error:', error));
            };
            audio.onerror = function (e) {
                console.error('Audio playback error:', e);
                const filename = audioUrl.split('/').pop();
                fetch(`/api/delete_audio/${filename}`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
            };
            audio.play().catch(e => {
                showStepToast('请点击页面以播放语音');
            });
        }
    }

    function initSpeech() {
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.log('No recognition to stop');
            }
            recognition = null;
        }

        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = function (event) {
            const speechResult = event.results[0][0].transcript;
            processUserSpeech(speechResult);
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error:', event.error);
            stopCommunication();
            if (event.error === 'not-allowed') {
                showStepToast('请允许使用麦克风权限');
            } else if (event.error === 'aborted') {
                // 忽略，可能是正常停止
            } else {
                showStepToast(`语音识别错误: ${event.error}`);
            }
        };

        recognition.onend = function () {
            if (isCommunicating && recognition) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error('Error restarting recognition:', e);
                    stopCommunication();
                }
            }
        };
    }

    function toggleCommunication() {
        if (isCommunicating) {
            stopCommunication();
        } else {
            startCommunication();
        }
    }

    function startCommunication() {
        if (isCommunicating) {
            return;
        }

        if (!recognition) {
            initSpeech();
        }

        if (!recognition) {
            showStepToast('语音识别不可用');
            return;
        }

        isCommunicating = true;
        if (waveBtn) {
            waveBtn.classList.add('active');
        }

        try {
            recognition.start();
        } catch (e) {
            console.error('Error starting recognition:', e);
            isCommunicating = false;
            if (waveBtn) {
                waveBtn.classList.remove('active');
            }
            if (e.message.includes('already started')) {
                showStepToast('语音识别已启动');
            } else {
                showStepToast('语音识别启动失败');
            }
        }
    }

    function stopCommunication() {
        isCommunicating = false;
        if (waveBtn) {
            waveBtn.classList.remove('active');
        }
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.error('Error stopping recognition:', e);
            }
        }
    }

    if (waveBtn) {
        waveBtn.addEventListener('click', toggleCommunication);
    }

    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            let returnUrl = 'recipe-detail.html';
            if (id) {
                returnUrl = `recipe-detail.html?id=${id}`;
            }
            window.location.href = returnUrl;
        });
    }

    function addTouchEvents() {
        stepPages.forEach((page, index) => {
            page.addEventListener('touchstart', handleTouchStart, { passive: false });
            page.addEventListener('touchmove', handleTouchMove, { passive: false });
            page.addEventListener('touchend', handleTouchEnd, { passive: false });
        });
    }

    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let isScrolling = false;

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
        if (!stepPages || stepPages.length === 0) return;
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
        setTimeout(() => {
            scrollToCurrentSubStep();
        }, 100);
    }

    function updateSubStepDisplay() {
        if (!stepPages || !stepPages[currentStep]) return;
        const currentPage = stepPages[currentStep];
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
        }, 1800);
    }

    function goToNextSubStep() {
        if (!stepData || !stepData[currentStep]) return;
        const currentStepData = stepData[currentStep];
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
            name: recipeTitle || '这道菜',
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

    initializePage();
});
