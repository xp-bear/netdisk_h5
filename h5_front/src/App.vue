<template>
  <router-view />
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f7f8fa;
}

#app {
  width: 100%;
  min-height: 100vh;
}

/* 全局设置: 确保 Vant ImagePreview 组件始终在最顶层 */
.van-image-preview {
  z-index: 10020 !important;
}

.van-image-preview__overlay {
  z-index: 10019 !important;
}

/* 当ImagePreview打开时,确保其遮罩层也在正确层级 */
body > .van-overlay:last-of-type {
  z-index: 10019 !important;
}

body > .van-image-preview:last-of-type {
  z-index: 10020 !important;
}

</style>
