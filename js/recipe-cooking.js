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
            
            // --- 改动：页面加载完成后自动启动语音通信 ---
            startCommunication();
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
    let isCommunicating = false; // 用户意图的总开关
    
    // --- 语音交互状态变量 ---
    let audioContext;
    let stream;
    let processor;
    let ws;
    const SAMPLE_RATE = 16000;

    let isAiSpeaking = false;
    let audioQueue = [];
    let currentAudioPlayer = null;
    let userSpeaking = false;
    let vadTimeout = null;
    let reconnectTimeout = null; // 用于自动重连的定时器

    function isNextStepIntent(text) {
        const nextStepWords = ['下一步', '继续', '往下', '下一个', '接着来', '然后呢', '接下来', '下一步是什么'];
        return nextStepWords.some(word => text.toLowerCase().includes(word));
    }

    function isPrevStepIntent(text) {
        const prevStepWords = ['上一步', '返回', '回去', '上一个', '刚才', '之前', '退回去', '退回'];
        return prevStepWords.some(word => text.toLowerCase().includes(word));
    }

    function processUserTranscript(text) {
        showStepToast(`您说: ${text}`);
        if (isNextStepIntent(text)) {
            goToNextSubStep();
            return;
        }
        if (isPrevStepIntent(text)) {
            goToPrevSubStep();
            return;
        }
    }

    function playFromQueue() {
        if (isAiSpeaking || audioQueue.length === 0) {
            return;
        }
        isAiSpeaking = true;
        
        const audioData = audioQueue.shift();
        showStepToast(`助手: ${audioData.text}`);
        currentAudioPlayer = new Audio(audioData.audio_url);
        
        currentAudioPlayer.onended = () => {
            isAiSpeaking = false;
            const filename = audioData.audio_url.split('/').pop();
            fetch(`/api/delete_audio/${filename}`, { method: 'DELETE' });
            playFromQueue();
        };
        
        currentAudioPlayer.onerror = (e) => {
            console.error('音频播放错误:', e);
            isAiSpeaking = false;
            playFromQueue();
        };
        
        currentAudioPlayer.play().catch(e => {
            console.error('播放失败:', e);
            isAiSpeaking = false;
        });
    }

    function stopAndClearAudio() {
        if (currentAudioPlayer) {
            currentAudioPlayer.pause();
            currentAudioPlayer.onended = null;
            currentAudioPlayer = null;
        }
        audioQueue = [];
        isAiSpeaking = false;
    }

    // --- 核心语音通信逻辑 ---
    function toggleCommunication() {
        if (isCommunicating) {
            stopCommunication();
        } else {
            startCommunication();
        }
    }

    // --- 改动：清理资源的辅助函数 ---
    function cleanupConnection() {
        clearTimeout(reconnectTimeout); // 清除任何待处理的重连

        if (ws) {
            ws.onopen = null;
            ws.onmessage = null;
            ws.onerror = null;
            ws.onclose = null;
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            ws = null;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (processor) {
            processor.disconnect();
            processor = null;
        }
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
            audioContext = null;
        }
    }

    async function startCommunication() {
        // 如果正在连接或已连接，则不执行任何操作
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
            return;
        }
        
        isCommunicating = true;
        if (waveBtn) waveBtn.classList.add('active');
        showStepToast('正在连接语音服务...');

        // 在创建新连接前，确保旧资源已清理
        cleanupConnection();

        const wsUrl = `ws://${window.location.host}/ws/transcribe`;
        ws = new WebSocket(wsUrl);

        ws.onopen = async () => {
            showStepToast('麦克风已激活，请说话');
            clearTimeout(reconnectTimeout); // 成功连接后，清除重连定时器
            try {
                const constraints = {
                    audio: {
                        sampleRate: SAMPLE_RATE,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                };
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
                const source = audioContext.createMediaStreamSource(stream);
                processor = audioContext.createScriptProcessor(4096, 1, 1);

                const VAD_THRESHOLD = 0.01;

                processor.onaudioprocess = (e) => {
                    if (!isCommunicating || !ws || ws.readyState !== WebSocket.OPEN) return;

                    const inputData = e.inputBuffer.getChannelData(0);
                    
                    let sum = 0;
                    for (let i = 0; i < inputData.length; i++) { sum += inputData[i] * inputData[i]; }
                    const rms = Math.sqrt(sum / inputData.length);

                    if (rms > VAD_THRESHOLD) {
                        if (!userSpeaking) {
                            userSpeaking = true;
                            if (isAiSpeaking) {
                                console.log("用户打断AI！");
                                stopAndClearAudio();
                                if (ws && ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({ type: "interrupt" }));
                                }
                            }
                        }
                        clearTimeout(vadTimeout);
                        vadTimeout = setTimeout(() => { userSpeaking = false; }, 1000);
                    }
                    
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        let s = Math.max(-1, Math.min(1, inputData[i]));
                        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    ws.send(pcmData.buffer);
                };

                source.connect(processor);
                processor.connect(audioContext.destination);

            } catch (err) {
                console.error('麦克风或音频上下文初始化失败:', err);
                showStepToast('无法访问麦克风');
                // 即使失败，也保持 isCommunicating 为 true，以便重连
                handleDisconnection();
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'transcript':
                    processUserTranscript(data.text);
                    break;
                case 'audio':
                    audioQueue.push(data);
                    playFromQueue();
                    break;
                case 'end_of_response':
                    isAiSpeaking = false;
                    playFromQueue();
                    break;
                case 'error':
                    showStepToast(`AI 遇到问题: ${data.message}`);
                    break;
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket 错误:', error);
            // 错误时也触发重连逻辑
            handleDisconnection();
        };

        ws.onclose = () => {
            console.log('WebSocket 连接已关闭');
            // 连接关闭时触发重连逻辑
            handleDisconnection();
        };
    }

    // --- 改动：手动停止函数 ---
    function stopCommunication() {
        if (!isCommunicating) return;

        isCommunicating = false; // 这是关键，设置总开关为关闭
        if (waveBtn) waveBtn.classList.remove('active');
        showStepToast('语音识别已停止');

        stopAndClearAudio();
        cleanupConnection(); // 使用辅助函数清理所有资源
    }

    // --- 改动：处理断开和自动重连的函数 ---
    function handleDisconnection() {
        cleanupConnection(); // 先清理旧的连接资源
        // 只有在用户没有手动关闭总开关的情况下才重连
        if (isCommunicating) {
            showStepToast('连接中断，正在尝试重连...');
            reconnectTimeout = setTimeout(startCommunication, 2000); // 2秒后尝试重连
        }
    }

    if (waveBtn) {
        waveBtn.addEventListener('click', toggleCommunication);
    }

    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            stopCommunication();
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
            setTimeout(() => { toast.style.display = 'none'; }, 2500);
        }, 400);
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