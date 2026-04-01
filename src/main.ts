import { createApp } from "vue";
import App from "./App.vue";
import { isTauri } from "@tauri-apps/api/core";

// 全局错误处理
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, source, lineno, colno, error);
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled rejection:', event.reason);
});

// Tauri 2.x 初始化
if (isTauri()) {
  console.log("Tauri environment detected, initializing...");
}

const app = createApp(App);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err, info);
};
app.mount("#app");
