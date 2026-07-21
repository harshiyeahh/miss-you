// ==========================================================================
// SCENES DATA DEFINITIONS
// ==========================================================================
const scenes = [
    {
        type: 'welcome',
        title: 'For Ettayyii ❤️',
        caption: 'I made something for you.\nTake your time.',
        duration: null
    },
    {
        type: 'photo',
        image: 'images/photo1.jpg',
        caption: 'Every single moment spent with you is a memory I hold close.',
        duration: 6000
    },
    {
        type: 'photo',
        image: 'images/photo2.jpg',
        caption: 'The warmth of your laughter makes everything brighter.',
        duration: 6000
    },
    {
        type: 'photo',
        image: 'images/photo3.jpg',
        caption: 'In the quietest times, you have been my favorite comfort.',
        duration: 6000
    },
    {
        type: 'photo',
        image: 'images/photo4.jpg',
        caption: 'A single picture holds a moment, but my heart holds it all.',
        duration: 6000
    },
    {
        type: 'photo',
        image: 'images/photo5.jpg',
        caption: 'Distance means absolutely nothing when someone means so much.',
        duration: 6000
    },
    {
        type: 'photo',
        image: 'images/photo6.jpg',
        caption: 'No matter where you go, a part of me goes with you.',
        duration: 6000
    },
    {
        type: 'video',
        video: 'videos/video1.mp4',
        caption: 'A little slice of our happiness captured in motion.',
        duration: null // Advances automatically when video ends
    },
    {
        type: 'letter',
        letter: `Dear Ettayyii,\n\nWriting this is my way of keeping a piece of us close. You are going to Dubai soon, and while I am so incredibly happy and excited for your new adventure, a part of me is already missing you. This little space is for you to look back at our moments whenever you want.\n\nPromise me you will take care of yourself. I will be counting down the days.\n\nAlways, \nYour favorite annoyance. ❤️`,
        duration: null // Advancing requires clicking the Continue button
    },
    {
        type: 'question',
        title: 'Will you miss me?',
        duration: null // Answer is required (YES click)
    }
];

// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let currentSceneIndex = 0;
let isTransitioning = false;
let sceneTimer = null;
let typingTimeout = null;
let captionTimeout = null;
let noBtnAttempts = 0;
let proximityDetectionActive = false;

// Mouse coordinates tracker
let mouseX = 0;
let mouseY = 0;

// Elements caching
let frame, contentOverlay, sceneTitle, sceneSubtitle, sceneImage, sceneVideo;
let beginBtn, continueBtn, yesBtn, noBtn, skipBtn;
let letterContainer, letterText, endingContainer, progressBarFill, loadingLabel;
let endingMessage, destinationTitle, personalMessage, bgMusic;

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    preloadAssets();
    setupEventListeners();
    
    // Start with the first scene (welcome scene)
    renderScene(0);
});

function cacheElements() {
    frame = document.getElementById('cinematic-frame');
    contentOverlay = document.getElementById('content-overlay');
    sceneTitle = document.getElementById('scene-title');
    sceneSubtitle = document.getElementById('scene-subtitle');
    sceneImage = document.getElementById('scene-image');
    sceneVideo = document.getElementById('scene-video');
    
    // Safety onerror handlers for missing assets
    sceneImage.onerror = () => {
        sceneImage.classList.add('hidden');
        console.warn("Memory image failed to load. Gracefully skipping visual render.");
    };
    
    sceneVideo.onerror = () => {
        sceneVideo.classList.add('hidden');
        console.warn("Video file failed to load. A fallback timer will auto-advance the scene.");
        // Set a fallback auto-advance after 5 seconds since video can ended event won't fire
        setTimeout(() => {
            const videoSceneIndex = scenes.findIndex(s => s.type === 'video');
            if (currentSceneIndex === videoSceneIndex && !isTransitioning) {
                nextScene();
            }
        }, 5000);
    };
    
    beginBtn = document.getElementById('begin-btn');
    continueBtn = document.getElementById('continue-btn');
    yesBtn = document.getElementById('yes-btn');
    noBtn = document.getElementById('no-btn');
    skipBtn = document.getElementById('skip-btn');
    
    letterContainer = document.getElementById('letter-container');
    letterText = document.getElementById('letter-text');
    
    endingContainer = document.getElementById('ending-container');
    progressBarFill = document.getElementById('progress-bar-fill');
    loadingLabel = document.getElementById('loading-label');
    endingMessage = document.getElementById('ending-message');
    destinationTitle = document.getElementById('destination-title');
    personalMessage = document.getElementById('personal-message');
    
    bgMusic = document.getElementById('bg-music');
}

function setupEventListeners() {
    // Buttons
    beginBtn.addEventListener('click', () => {
        startMusic();
        nextScene();
    });
    
    continueBtn.addEventListener('click', () => {
        nextScene();
    });
    
    skipBtn.addEventListener('click', () => {
        nextScene();
    });
    
    // YES button click -> Ending sequence
    yesBtn.addEventListener('click', startEndingSequence);
    
    // NO button escape actions
    noBtn.addEventListener('mouseenter', escapeNoButton);
    noBtn.addEventListener('mouseover', escapeNoButton);
    noBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Stop mobile from clicking
        escapeNoButton();
    });
    
    // Track mouse coordinates for proximity detection
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        const questionSceneIndex = scenes.findIndex(s => s.type === 'question');
        if (currentSceneIndex === questionSceneIndex && !yesBtn.classList.contains('hidden')) {
            checkProximity();
        }
    });

    // Fallback audio trigger for strict browser policies
    document.addEventListener('click', () => {
        const questionSceneIndex = scenes.findIndex(s => s.type === 'question');
        if (bgMusic && bgMusic.paused && currentSceneIndex > 0 && currentSceneIndex <= questionSceneIndex) {
            bgMusic.play().catch(e => console.log("Autoplay fallback play failed:", e));
        }
    });
}

// ==========================================================================
// ASSET PRELOADER
// ==========================================================================
function preloadAssets() {
    const imagesToPreload = [];
    const videosToPreload = [];
    
    scenes.forEach(scene => {
        if (scene.image) imagesToPreload.push(scene.image);
        if (scene.video) videosToPreload.push(scene.video);
    });
    
    // Preload Images
    imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
    });
    
    // Preload Videos
    videosToPreload.forEach(src => {
        const video = document.createElement('video');
        video.src = src;
        video.preload = 'auto';
    });
}

// ==========================================================================
// SCENE CONTROLLER (TRANSITION ENGINE)
// ==========================================================================
function nextScene() {
    if (currentSceneIndex + 1 < scenes.length) {
        transitionToScene(currentSceneIndex + 1);
    }
}

function transitionToScene(index) {
    if (isTransitioning) return;
    isTransitioning = true;
    
    // 1. Clear any active timers
    clearTimeout(sceneTimer);
    clearTimeout(typingTimeout);
    clearTimeout(captionTimeout);
    
    // 2. Fade out current overlay and active media elements
    contentOverlay.classList.remove('fade-in');
    contentOverlay.classList.add('fade-out');
    
    sceneImage.classList.remove('active');
    sceneVideo.classList.remove('active');
    
    // Wait for fade-out to complete (800ms)
    setTimeout(() => {
        renderScene(index);
        
        // Fade in new contents
        contentOverlay.classList.remove('fade-out');
        contentOverlay.classList.add('fade-in');
        
        isTransitioning = false;
    }, 800);
}

function renderScene(index) {
    currentSceneIndex = index;
    const scene = scenes[index];
    
    // Reset standard UI structures
    document.getElementById('text-group').classList.remove('hidden');
    letterContainer.classList.add('hidden');
    endingContainer.classList.add('hidden');
    document.getElementById('actions-group').classList.add('hidden');
    document.getElementById('question-actions').classList.add('hidden');
    
    // Reset media
    sceneImage.classList.add('hidden');
    sceneImage.classList.remove('ken-burns');
    sceneVideo.classList.add('hidden');
    sceneVideo.pause();
    sceneVideo.src = "";
    
    // HUD overlay manager
    if (scene.type === 'photo' || scene.type === 'video') {
        skipBtn.classList.remove('hidden');
        skipBtn.classList.add('fade-in');
    } else {
        skipBtn.classList.add('hidden');
    }
    
    // Build scene specifics
    if (scene.type === 'welcome') {
        sceneTitle.textContent = scene.title;
        sceneSubtitle.innerHTML = scene.caption.replace('\n', '<br>');
        document.getElementById('actions-group').classList.remove('hidden');
        beginBtn.classList.remove('hidden');
        continueBtn.classList.add('hidden');
        
    } else if (scene.type === 'photo') {
        // Load photo
        sceneImage.src = scene.image;
        sceneImage.classList.remove('hidden');
        
        // Force reflow and trigger Ken Burns
        void sceneImage.offsetWidth;
        sceneImage.classList.add('ken-burns');
        sceneImage.classList.add('active');
        
        // Text setup (title empty, caption revealed with delay)
        sceneTitle.textContent = "";
        sceneSubtitle.textContent = scene.caption;
        sceneSubtitle.classList.remove('visible');
        sceneSubtitle.classList.add('caption-reveal');
        
        captionTimeout = setTimeout(() => {
            sceneSubtitle.classList.add('visible');
        }, 2000);
        
        // Auto progress
        if (scene.duration) {
            sceneTimer = setTimeout(() => {
                nextScene();
            }, scene.duration);
        }
        
    } else if (scene.type === 'video') {
        // Load video
        sceneVideo.src = scene.video;
        sceneVideo.classList.remove('hidden');
        sceneVideo.classList.add('active');
        sceneVideo.muted = true; // Required for reliable autoplay
        
        // Text setup
        sceneTitle.textContent = "";
        sceneSubtitle.textContent = scene.caption;
        
        sceneVideo.play().catch(err => console.log("Video playback error:", err));
        
        // Auto progress when video completes
        sceneVideo.onended = () => {
            nextScene();
        };
        
    } else if (scene.type === 'letter') {
        document.getElementById('text-group').classList.add('hidden');
        letterContainer.classList.remove('hidden');
        
        document.getElementById('actions-group').classList.remove('hidden');
        continueBtn.classList.add('hidden');
        
        // Start typewriter
        typeWriter(scene.letter, letterText, 35, () => {
            // Typewriter finished -> reveal Continue button
            continueBtn.classList.remove('hidden');
            continueBtn.classList.add('fade-in');
        });
        
    } else if (scene.type === 'question') {
        sceneTitle.textContent = scene.title;
        sceneSubtitle.textContent = "";
        
        // Set up YES/NO escaping layout
        setupQuestionButtons();
    }
}

// ==========================================================================
// AUDIO CONTROLLER
// ==========================================================================
function startMusic() {
    bgMusic.volume = 0;
    bgMusic.play().catch(err => console.log("Audio playback error:", err));
    
    let vol = 0;
    const fadeInterval = setInterval(() => {
        if (vol < 0.95) {
            vol += 0.05;
            bgMusic.volume = vol;
        } else {
            bgMusic.volume = 1.0;
            clearInterval(fadeInterval);
        }
    }, 150);
}

// ==========================================================================
// TYPEWRITER ENGINE
// ==========================================================================
function typeWriter(text, element, speed, callback) {
    element.innerHTML = "";
    element.classList.add('typewriter-caret');
    let i = 0;
    
    const scrollContainer = element.parentElement;
    
    function type() {
        if (i < text.length) {
            const char = text.charAt(i);
            element.textContent += char;
            
            // Auto scroll container
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
            
            i++;
            
            // Realistic pacing checks
            let currentSpeed = speed;
            if (char === '.' || char === ',' || char === '!' || char === '?') {
                currentSpeed = speed * 6; // Pause at marks
            } else if (char === '\n') {
                currentSpeed = speed * 10; // Pause at linebreaks
            }
            
            typingTimeout = setTimeout(type, currentSpeed);
        } else {
            element.classList.remove('typewriter-caret');
            if (callback) callback();
        }
    }
    
    type();
}

// ==========================================================================
// QUESTION LAYOUT & ESCAPING NO BUTTON
// ==========================================================================
function setupQuestionButtons() {
    // Append YES/NO directly to the main cinematic frame
    frame.appendChild(yesBtn);
    frame.appendChild(noBtn);
    
    yesBtn.classList.remove('hidden');
    noBtn.classList.remove('hidden');
    
    // Set initial layout (shifted slightly to avoid cursor overlap on load)
    yesBtn.style.position = 'absolute';
    yesBtn.style.bottom = '75px';
    yesBtn.style.top = 'auto';
    yesBtn.style.left = 'calc(50% - 140px)';
    yesBtn.style.zIndex = '100';
    
    noBtn.style.position = 'absolute';
    noBtn.style.bottom = '75px';
    noBtn.style.top = 'auto';
    noBtn.style.left = 'calc(50% + 30px)';
    noBtn.style.zIndex = '100';
    
    // Reset escape state
    noBtnAttempts = 0;
    noBtn.textContent = "NO";
    
    // Clear margins so absolute positions are clean
    yesBtn.style.margin = '0';
    noBtn.style.margin = '0';
    
    // Add activation delay to prevent instant escape when user clicked "Continue" in the center
    proximityDetectionActive = false;
    setTimeout(() => {
        proximityDetectionActive = true;
    }, 1200);
}

function checkProximity() {
    if (!proximityDetectionActive) return;
    const noRect = noBtn.getBoundingClientRect();
    const noCenterX = noRect.left + noRect.width / 2;
    const noCenterY = noRect.top + noRect.height / 2;
    
    const dx = mouseX - noCenterX;
    const dy = mouseY - noCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Escape when cursor is within 85px radius of button center
    if (distance < 85) {
        escapeNoButton();
    }
}

function getRelativeRect(elem, parent) {
    const elemRect = elem.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    return {
        left: elemRect.left - parentRect.left,
        top: elemRect.top - parentRect.top,
        right: elemRect.right - parentRect.left,
        bottom: elemRect.bottom - parentRect.top,
        width: elemRect.width,
        height: elemRect.height
    };
}

function rectsOverlap(r1, r2, buffer = 20) {
    return !(
        r1.right + buffer < r2.left ||
        r1.left - buffer > r2.right ||
        r1.bottom + buffer < r2.top ||
        r1.top - buffer > r2.bottom
    );
}

function escapeNoButton() {
    if (!proximityDetectionActive) return;
    const frameRect = frame.getBoundingClientRect();
    const btnWidth = noBtn.offsetWidth || 110;
    const btnHeight = noBtn.offsetHeight || 45;
    const padding = 30; // Safety boundary offset
    
    const yesRect = getRelativeRect(yesBtn, frame);
    const titleRect = getRelativeRect(sceneTitle, frame);
    
    let bestLeft = 0;
    let bestTop = 0;
    let found = false;
    
    // Collision-free coordinate generator loop
    for (let i = 0; i < 100; i++) {
        const testLeft = Math.random() * (frameRect.width - btnWidth - 2 * padding) + padding;
        const testTop = Math.random() * (frameRect.height - btnHeight - 2 * padding) + padding;
        
        const candidate = {
            left: testLeft,
            top: testTop,
            right: testLeft + btnWidth,
            bottom: testTop + btnHeight
        };
        
        // 1. Collision check against YES button
        if (rectsOverlap(candidate, yesRect, 20)) continue;
        
        // 2. Collision check against Question title text
        if (rectsOverlap(candidate, titleRect, 20)) continue;
        
        // 3. Proximity check against cursor to prevent instant teleport-clicks
        const mouseRelX = mouseX - frameRect.left;
        const mouseRelY = mouseY - frameRect.top;
        const mouseDistance = Math.sqrt(
            Math.pow((testLeft + btnWidth/2) - mouseRelX, 2) + 
            Math.pow((testTop + btnHeight/2) - mouseRelY, 2)
        );
        if (mouseDistance < 100) continue;
        
        bestLeft = testLeft;
        bestTop = testTop;
        found = true;
        break;
    }
    
    // Fallback if loop yields no clean locations
    if (!found) {
        bestLeft = Math.random() * (frameRect.width - btnWidth - 2 * padding) + padding;
        bestTop = Math.random() * (frameRect.height - btnHeight - 2 * padding) + padding;
    }
    
    // Apply new positions smoothly via CSS transitions
    noBtn.style.bottom = 'auto'; // Clear bottom so top takes precedence
    noBtn.style.left = `${bestLeft}px`;
    noBtn.style.top = `${bestTop}px`;
    
    // Increment escape index and change button wording
    noBtnAttempts++;
    const noTexts = [
        "NO",
        "Nope 😜",
        "Over here! 🏃‍♂️",
        "Still trying?",
        "Missed me! 💨",
        "Nice try 😂",
        "Almost! 😉",
        "Not happening 😆",
        "Click YES instead! 👉",
        "Just press YES ❤️"
    ];
    // Change text every 2 escapes
    const textIndex = Math.min(Math.floor(noBtnAttempts / 2), noTexts.length - 1);
    noBtn.textContent = noTexts[textIndex];
}

// ==========================================================================
// ENDING SEQUENCE & FINAL CREDITS FADEOUT
// ==========================================================================
function startEndingSequence() {
    // 1. Remove YES/NO buttons immediately
    yesBtn.classList.add('hidden');
    noBtn.classList.add('hidden');
    
    // 2. Fade container overlay to black
    contentOverlay.classList.remove('fade-in');
    contentOverlay.classList.add('fade-out');
    
    setTimeout(() => {
        // Apply full screen black and hide titles
        frame.classList.add('black-screen');
        document.getElementById('text-group').classList.add('hidden');
        
        // Reveal loader structure
        endingContainer.classList.remove('hidden');
        contentOverlay.classList.remove('fade-out');
        contentOverlay.classList.add('fade-in');
        
        // 3. Progress bar 0% to 100%
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 1;
            progressBarFill.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                
                // Progress complete -> transition to Dubai message
                setTimeout(() => {
                    loadingLabel.classList.add('hidden');
                    document.querySelector('.progress-bar-container').classList.add('hidden');
                    
                    endingMessage.classList.remove('hidden');
                    destinationTitle.textContent = "Destination: Dubai 🇦🇪";
                    destinationTitle.classList.add('fade-in');
                    
                    // Pause for 1.5s then print final message
                    setTimeout(() => {
                        const finalMsg = "Can't wait to annoy you when you get there. ❤️";
                        typeWriter(finalMsg, personalMessage, 50, fadeOutMusic);
                    }, 1500);
                }, 800);
            }
        }, 35); // Approx 3.5 seconds
    }, 800);
}

function fadeOutMusic() {
    let vol = bgMusic.volume;
    const fadeOutInterval = setInterval(() => {
        if (vol > 0.05) {
            vol -= 0.05;
            bgMusic.volume = vol;
        } else {
            bgMusic.volume = 0;
            bgMusic.pause();
            clearInterval(fadeOutInterval);
        }
    }, 250); // Mutes slowly over ~5 seconds
}
