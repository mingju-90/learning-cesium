// 存储主题的本地键名
const THEME_KEY = 'app-theme';

// 获取当前主题（默认浅色）
export const getCurrentTheme = () => {
  return localStorage.getItem(THEME_KEY) || 'light';
};

// 设置主题（切换根元素类名）
export const setTheme = (theme) => {
  const html = document.documentElement;
  // 移除所有主题类名
  html.classList.remove('theme-light', 'theme-dark');
  // 添加目标主题类名
  html.classList.add(`theme-${theme}`);
  // 保存到本地存储
  localStorage.setItem(THEME_KEY, theme);
};

// 初始化主题（页面加载时生效）
export const initTheme = () => {
  setTheme(getCurrentTheme());
};