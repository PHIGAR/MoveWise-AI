const KEY = 'movewise_preferences';
export function initializePreferences() {
    const theme = document.getElementById('theme-preference');
    const motion = document.getElementById('motion-preference');
    const skeleton = document.getElementById('skeleton-toggle');
    const status = document.getElementById('preferences-status');
    const system = matchMedia('(prefers-color-scheme: dark)');
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { /* Use accessible defaults. */ }
    theme.value = ['light', 'dark', 'system'].includes(saved.theme) ? saved.theme : 'system';
    motion.checked = saved.reducedMotion === true;
    skeleton.checked = saved.skeleton !== false;
    function apply() {
        document.documentElement.dataset.theme = theme.value === 'system' ? (system.matches ? 'dark' : 'light') : theme.value;
        document.documentElement.classList.toggle('reduce-motion', motion.checked);
        document.body.classList.toggle('skeleton-hidden', !skeleton.checked);
    }
    function save() {
        apply();
        try {
            localStorage.setItem(KEY, JSON.stringify({ theme: theme.value, reducedMotion: motion.checked, skeleton: skeleton.checked }));
            status.textContent = 'บันทึกการตั้งค่าแล้ว';
        } catch { status.textContent = 'ใช้การตั้งค่าแล้ว แต่เบราว์เซอร์ไม่อนุญาตให้บันทึก'; }
    }
    [theme, motion, skeleton].forEach(control => control.addEventListener('change', save));
    system.addEventListener('change', apply);
    apply();
}
