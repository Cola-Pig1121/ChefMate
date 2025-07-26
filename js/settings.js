// 设置页面JavaScript功能

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
    bindEventListeners();
});

// 初始化设置
function initializeSettings() {
    // 从localStorage加载设置
    loadSettings();
    
    // 设置默认值
    setDefaultValues();
}

// 绑定事件监听器
function bindEventListeners() {
    // 音量滑块
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    if (volumeSlider && volumeValue) {
        volumeSlider.addEventListener('input', function() {
            const value = this.value;
            volumeValue.textContent = value + '%';
            saveSettings();
            
            // 播放测试音效
            playTestSound(value / 100);
        });
    }

    // 语速滑块
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', function() {
            const value = parseFloat(this.value);
            let speedText = '正常';
            
            if (value < 0.8) {
                speedText = '慢';
            } else if (value > 1.2) {
                speedText = '快';
            }
            
            speedValue.textContent = speedText;
            saveSettings();
        });
    }

    // 开关按钮
    const toggleSwitches = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('change', function() {
            saveSettings();
        });
    });
}

// 加载设置
function loadSettings() {
    const settings = getSettings();
    
    // 音量设置
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    if (volumeSlider && settings.volume !== undefined) {
        volumeSlider.value = settings.volume;
        volumeValue.textContent = settings.volume + '%';
    }

    // 语速设置
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    if (speedSlider && settings.speechRate !== undefined) {
        speedSlider.value = settings.speechRate;
        let speedText = '正常';
        if (settings.speechRate < 0.8) {
            speedText = '慢';
        } else if (settings.speechRate > 1.2) {
            speedText = '快';
        }
        speedValue.textContent = speedText;
    }

    // 开关设置
    const pushNotification = document.getElementById('pushNotification');
    const soundAlert = document.getElementById('soundAlert');
    
    if (pushNotification && settings.pushNotification !== undefined) {
        pushNotification.checked = settings.pushNotification;
    }
    if (soundAlert && settings.soundAlert !== undefined) {
        soundAlert.checked = settings.soundAlert;
    }
}

// 设置默认值
function setDefaultValues() {
    const settings = getSettings();
    
    // 如果没有保存的设置，使用默认值
    if (Object.keys(settings).length === 0) {
        const defaultSettings = {
            volume: 70,
            speechRate: 1.0,
            pushNotification: true,
            soundAlert: true
        };
        
        localStorage.setItem('chefmate_settings', JSON.stringify(defaultSettings));
        loadSettings();
    }
}

// 获取设置
function getSettings() {
    const settings = localStorage.getItem('chefmate_settings');
    return settings ? JSON.parse(settings) : {};
}

// 保存设置
function saveSettings() {
    const volumeSlider = document.getElementById('volumeSlider');
    const speedSlider = document.getElementById('speedSlider');
    const pushNotification = document.getElementById('pushNotification');
    const soundAlert = document.getElementById('soundAlert');
    
    const settings = {
        volume: volumeSlider ? parseInt(volumeSlider.value) : 70,
        speechRate: speedSlider ? parseFloat(speedSlider.value) : 1.0,
        pushNotification: pushNotification ? pushNotification.checked : true,
        soundAlert: soundAlert ? soundAlert.checked : true
    };
    
    localStorage.setItem('chefmate_settings', JSON.stringify(settings));
    
    // 触发设置更新事件
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
}

// 播放测试音效
function playTestSound(volume) {
    // 创建音频上下文
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const audioContext = new AudioContext();
            
            // 创建振荡器
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // 连接节点
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 设置参数
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(volume * 0.1, audioContext.currentTime);
            
            // 播放短暂的提示音
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    } catch (error) {
        console.warn('无法播放测试音效:', error);
    }
}

// 清除缓存
function clearCache() {
    if (confirm('确定要清除所有缓存数据吗？这将删除您的收藏、历史记录等信息。')) {
        // 清除localStorage中的应用数据（保留设置）
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('chefmate_') && key !== 'chefmate_settings') {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        showToast('缓存已清除');
    }
}

// 显示关于信息
function showAbout() {
    const aboutInfo = `
ChefMate 智能厨房助手
版本：1.0.0
开发者：ChefMate Team

功能特色：
• 智能食谱推荐
• 语音烹饪指导
• 购物清单管理
• 个人收藏夹
• 营养分析

感谢您使用ChefMate！
    `;
    
    alert(aboutInfo);
}

// 显示提示消息
function showToast(message) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 10000;
        animation: fadeInOut 2s ease-in-out;
    `;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            20%, 80% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // 显示提示
    document.body.appendChild(toast);
    
    // 2秒后移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    }, 2000);
}

// 导出设置获取函数供其他页面使用
window.getChefMateSettings = getSettings;