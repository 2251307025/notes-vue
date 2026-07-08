<script setup>
import { ref, nextTick, watch, onMounted } from 'vue'
import { sendChatMessage, deleteMemory, getModels } from '@/api/chat.js'
import { Delete, Promotion } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch { /* fallthrough */ }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

function renderMarkdown(content) {
  if (!content) return ''
  return md.render(content)
}

const messages = ref([])
const inputText = ref('')
const isLoading = ref(false)
const abortController = ref(null)
const messagesRef = ref(null)

const models = ref([])          // 可用模型列表
const selectedModel = ref('')  // 当前选中的 modelId

let isNearBottom = true

function handleScroll() {
  const el = messagesRef.value
  if (!el) return
  isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value && isNearBottom) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 获取可用模型列表
async function fetchModels() {
  try {
    const res = await getModels()
    if (res?.data) {
      models.value = res.data
      // 默认选中第一个模型
      if (res.data.length > 0) {
        selectedModel.value = res.data[0].modelId
      }
    }
  } catch (err) {
    console.error('获取模型列表失败:', err)
  }
}

// 从 localStorage 恢复历史
onMounted(() => {
  fetchModels()

  const saved = localStorage.getItem('aiChatHistory')
  if (saved) {
    try {
      messages.value = JSON.parse(saved)
    } catch { /* ignore */ }
  }
  // 首次进入时 AI 打招呼
  if (messages.value.length === 0) {
    messages.value.push({
      role: 'assistant',
      content: '你好！我是你的 **AI 笔记助手** 📝，可以帮你管理笔记和分类，也能根据笔记内容回答你的问题。有什么需要帮忙的吗？'
    })
  }
})

// 持久化消息
watch(messages, (val) => {
  localStorage.setItem('aiChatHistory', JSON.stringify(val))
}, { deep: true })

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  isLoading.value = true
  scrollToBottom()

  const currentModel = models.value.find(m => m.modelId === selectedModel.value)

  const idx = messages.value.length
  messages.value.push({ role: 'assistant', content: '', modelName: currentModel ? currentModel.modelName : '' })

  abortController.value = sendChatMessage(text, {
    onMessage(data) {
      messages.value[idx].content += data
      scrollToBottom()
    },
    onError(msg) {
      messages.value[idx].content = messages.value[idx].content || `[错误] ${msg}`
      scrollToBottom()
    },
    onClose() {
      if (!messages.value[idx].content) {
        messages.value[idx].content = '（未获取到回复）'
      }
      isLoading.value = false
      abortController.value = null
      scrollToBottom()
    },
    onOpen() {
      // 连接已建立
    },
  }, selectedModel.value)
}

function cancelRequest() {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isLoading.value = false
    // 移除空白的 AI 消息
    const last = messages.value[messages.value.length - 1]
    if (last && last.role === 'assistant' && !last.content) {
      messages.value.pop()
    }
  }
}

function clearHistory() {
  if (messages.value.length === 0) return
  ElMessageBox.confirm('确认清空所有聊天记录？', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    messages.value = [{
      role: 'assistant',
      content: '你好！我是你的 **AI 笔记助手** 📝，可以帮你管理笔记和分类，也能根据笔记内容回答你的问题。有什么需要帮忙的吗？'
    }]
    localStorage.removeItem('aiChatHistory')
    await deleteMemory()
    ElMessage.success('已清空')
  }).catch(() => {})
}
</script>

<template>
  <div class="chat-page">
    <!-- 头部 -->
    <div class="chat-header">
      <div class="chat-header__info">
        <div class="chat-header__title">AI 助手</div>
        <div class="chat-header__subtitle">智能问答 · 笔记管理</div>
      </div>
      <div class="chat-header__actions">
        <el-select
          v-model="selectedModel"
          placeholder="选择模型"
          :disabled="isLoading"
          class="model-selector"
        >
          <el-option
            v-for="m in models"
            :key="m.modelId"
            :label="m.modelName"
            :value="m.modelId"
          />
        </el-select>
        <el-button :icon="Delete" text @click="clearHistory" :disabled="messages.length === 0">
          清空记录
        </el-button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="chat-messages" ref="messagesRef" @scroll="handleScroll">
      <div v-if="messages.length === 0" class="chat-empty">
        <el-empty description="开始与 AI 对话" />
      </div>

      <div v-for="(msg, i) in messages" :key="i" :class="['chat-message', msg.role]">
        <div class="avatar">{{ msg.role === 'user' ? '我' : 'AI' }}</div>
        <div v-if="msg.role === 'user'" class="bubble">{{ msg.content }}</div>
        <div v-else class="bubble markdown-body">
          <div v-if="msg.modelName" class="model-tag">{{ msg.modelName }}</div>
          <div v-html="renderMarkdown(msg.content)"></div>
        </div>
      </div>

      <!-- 正在输入 -->
      <div v-if="isLoading" class="chat-message assistant">
        <div class="avatar">AI</div>
        <div class="bubble thinking">
          <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="chat-input">
      <div class="chat-input__wrapper">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="2"
          placeholder="输入消息..."
          :disabled="isLoading"
          @keydown.enter.prevent="sendMessage"
        />
        <div class="chat-input__actions">
          <span class="chat-input__hint">Enter 发送</span>
          <el-button
            v-if="isLoading"
            type="warning"
            @click="cancelRequest"
          >
            停止
          </el-button>
          <el-button
            v-else
            type="primary"
            :icon="Promotion"
            :disabled="!inputText.trim()"
            @click="sendMessage"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
  }

  &__subtitle {
    font-size: 13px;
    color: #999;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.model-selector {
  width: 160px;
}

.model-tag {
  font-size: 11px;
  color: #999;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #e0e0e0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-message {
  display: flex;
  gap: 10px;
  max-width: 85%;

  &.user {
    align-self: flex-end;
    flex-direction: row-reverse;

    .avatar {
      background: #1677ff;
      color: #fff;
    }

    .bubble {
      background: #1677ff;
      color: #fff;
      border-radius: 12px 4px 12px 12px;
    }
  }

  &.assistant {
    align-self: flex-start;

    .avatar {
      background: #f0f0f0;
      color: #666;
    }

    .bubble {
      background: #f5f5f5;
      color: #1a1a1a;
      border-radius: 4px 12px 12px 12px;
    }
  }
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  margin-top: 4px;
}

.bubble {
  padding: 12px 16px;
  line-height: 1.7;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-word;
}

// Markdown 渲染样式
.markdown-body {
  white-space: normal;

  ::v-deep(p) {
    margin: 0 0 8px;
    &:last-child { margin-bottom: 0; }
  }

  ::v-deep(h1), ::v-deep(h2), ::v-deep(h3), ::v-deep(h4) {
    margin: 16px 0 8px;
    font-weight: 600;
    line-height: 1.4;

    &:first-child { margin-top: 0; }
  }
  ::v-deep(h1) { font-size: 18px; }
  ::v-deep(h2) { font-size: 16px; }
  ::v-deep(h3) { font-size: 15px; }
  ::v-deep(h4) { font-size: 14px; }

  ::v-deep(ul), ::v-deep(ol) {
    margin: 6px 0;
    padding-left: 22px;
  }
  ::v-deep(li) {
    margin-bottom: 4px;
  }

  ::v-deep(blockquote) {
    margin: 8px 0;
    padding: 6px 14px;
    border-left: 4px solid #d0d5dd;
    color: #666;
    background: #f9f9f9;
    border-radius: 0 6px 6px 0;
  }

  ::v-deep(code) {
    padding: 2px 6px;
    background: #e8e8e8;
    border-radius: 4px;
    font-size: 13px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }

  ::v-deep(pre) {
    margin: 10px 0;
    border-radius: 8px;
    overflow-x: auto;
    background: #f6f8fa;

    code {
      padding: 0;
      background: none;
      border-radius: 0;
      font-size: 13px;
      line-height: 1.6;
    }
  }

  ::v-deep(a) {
    color: #1677ff;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  ::v-deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 13px;
  }
  ::v-deep(th), ::v-deep(td) {
    padding: 8px 12px;
    border: 1px solid #e0e0e0;
    text-align: left;
  }
  ::v-deep(th) {
    background: #f5f5f5;
    font-weight: 600;
  }

  ::v-deep(hr) {
    margin: 14px 0;
    border: none;
    border-top: 1px solid #e0e0e0;
  }

  ::v-deep(img) {
    max-width: 100%;
    border-radius: 6px;
  }

  ::v-deep(strong) {
    font-weight: 600;
  }
}

.thinking {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 16px 20px;
  min-width: 48px;
  justify-content: center;

  .dot {
    font-size: 28px;
    line-height: 1;
    color: #999;
    animation: blink 1.4s infinite;
    font-weight: 700;

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes blink {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

.chat-input {
  flex-shrink: 0;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;

  &__wrapper {
    max-width: 100%;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }

  &__hint {
    font-size: 12px;
    color: #bbb;
  }
}
</style>
