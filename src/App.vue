<template>
  <div class="app-layout">
    <aside class="sidebar-left">
      <h1 class="sidebar-title">评论读取工具</h1>
      <a :href="`https://8.155.52.59?time=${Date.now()}`" rel="opener">-> 点击这里前往信任授权</a>

      <div class="control-group">
        <div class="control-item">
          <label>服务器</label>
          <select v-model="form.region">
            <option value="cn_gf01">国服</option>
            <option value="cn_qd01">B服</option>
            <option value="os_asia">亚服</option>
            <option value="os_usa">美服</option>
            <option value="os_euro">欧服</option>
            <option value="os_cht">港澳台</option>
          </select>
        </div>

        <div class="control-item">
          <label>关卡GUID</label>
          <input
            v-model="form.levelId"
            type="text"
            placeholder="请输入关卡GUID"
            :disabled="loading"
            @keyup.enter="fetchReplies"
          />
        </div>

        <div class="control-item">
          <label>排序</label>
          <select v-model="form.localSort">
            <option value="hot">按点赞数</option>
            <option value="time">按时间</option>
          </select>
        </div>

        <div class="control-item">
          <label>筛选</label>
          <select v-model="form.filter">
            <option value="all">全部</option>
            <option value="recommend">仅推荐</option>
            <option value="normal">仅不推荐</option>
          </select>
        </div>

        <div class="control-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.hideDefault" />
            <span>过滤默认评论</span>
          </label>
        </div>

        <div class="control-actions">
          <button class="btn-primary" :disabled="loading || !form.levelId.trim()" @click="fetchReplies">
            <span v-if="loading">加载中...</span>
            <span v-else>读取评论</span>
          </button>
          <button v-if="allReplies.length" class="btn-ghost" @click="resetAll">重置</button>
        </div>
      </div>

      <div v-if="error" class="error-bar">
        <span>{{ error }}</span>
        <button @click="error = ''">×</button>
      </div>

      <div v-if="allReplies.length || loading" class="stats-bar">
        <div class="stat">
          <span class="stat-label">已加载</span>
          <span class="stat-value">{{ allReplies.length }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">总楼层</span>
          <span class="stat-value">{{ maxFloorId }}</span>
        </div>
        <div v-if="loading" class="stat stat-highlight">
          <span class="stat-label">进度</span>
          <span class="stat-value">{{ loadProgress }}%</span>
        </div>
        <div v-else class="stat">
          <span class="stat-label">状态</span>
          <span class="stat-value">✓</span>
        </div>
      </div>
    </aside>

    <main class="center-content">
      <div class="reply-list">
        <div v-if="loading && !allReplies.length" class="loading-state">
          <div class="spinner"></div>
          <p>正在加载评论...</p>
        </div>

        <template v-else-if="allReplies.length">
          <article
            v-for="(reply, idx) in pagedReplies"
            :key="reply.reply_id"
            class="reply-card"
          >
            <div class="reply-header">
              <img
                :src="reply.user_info.avatar || defaultAvatar"
                :alt="reply.user_info.nickname"
                class="avatar"
                @error="onAvatarError"
              />
              <div class="user-meta">
                <div class="user-line">
                  <span class="nickname">{{ reply.user_info.nickname }}</span>
                  <span v-if="reply.is_recommend" class="badge-recommend">推荐</span>
                  <span v-else class="badge-normal">不推荐</span>
                  <span v-if="reply.is_owner" class="badge-owner">作者</span>
                </div>
                <div class="sub-line">
                  <span class="floor">#{{ reply.floor_id }}楼</span>
                  <span class="dot">·</span>
                  <span class="ip">{{ reply.client_ip }}</span>
                  <span class="dot">·</span>
                  <span class="time">{{ formatTime(reply.created_at) }}</span>
                </div>
              </div>
            </div>

            <div class="reply-content" v-html="formatContent(reply.content)"></div>

            <div class="reply-footer">
              <span class="stat-tag">👍 {{ reply.reply_stat.like_count }}</span>
              <span class="stat-tag">💬 {{ reply.reply_stat.reply_count }}</span>
              <button
                v-if="reply.sub_replies && reply.sub_replies.length"
                class="toggle-btn"
                @click="toggleSubReplies(idx)"
              >
                {{ expandedIdx === idx ? '收起回复' : `展开 ${reply.sub_replies.length} 条回复` }}
              </button>
            </div>

            <div
              v-if="expandedIdx === idx && reply.sub_replies && reply.sub_replies.length"
              class="sub-replies"
            >
              <article
                v-for="sr in reply.sub_replies"
                :key="sr.reply_id"
                class="sub-reply"
              >
                <img
                  :src="sr.user_info.avatar || defaultAvatar"
                  :alt="sr.user_info.nickname"
                  class="avatar avatar-sm"
                  @error="onAvatarError"
                />
                <div class="sub-body">
                  <div class="user-line">
                    <span class="nickname nickname-sm">{{ sr.user_info.nickname }}</span>
                    <span v-if="sr.is_owner" class="badge-owner">作者</span>
                    <span class="dot">·</span>
                    <span class="time">{{ formatTime(sr.created_at) }}</span>
                  </div>
                  <div class="reply-content reply-content-sm" v-html="formatContent(sr.content)"></div>
                </div>
              </article>
            </div>
          </article>

          <div v-if="loading" class="scroll-sentinel">
            <div class="spinner spinner-sm"></div>
          </div>

          <div v-if="sortedReplies.length > viewPageSize" class="pagination">
            <button class="btn-page" :disabled="viewPage === 1" @click="viewPage--">上一页</button>
            <span class="page-info">{{ viewPage }} / {{ totalViewPages }}</span>
            <button class="btn-page" :disabled="viewPage >= totalViewPages" @click="viewPage++">下一页</button>
          </div>
        </template>

        <div v-if="allReplies.length && !filteredReplies.length" class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>当前筛选下没有匹配的评论</p>
        </div>

        <div v-else-if="!allReplies.length && !loading" class="empty-state">
          <div class="empty-icon">💬</div>
          <p>输入关卡GUID后点击「读取评论」</p>
        </div>
      </div>
    </main>

    <div class="resizer" @mousedown="startResize"></div>

    <aside class="sidebar-right">
      <div class="chat-header">
        <div class="chat-header-left">
          <span class="chat-title">DeepSeek 对话</span>
          <select v-model="chatModel" class="chat-model-select">
            <option value="deepseek-v4-flash">V4-Flash</option>
            <option value="deepseek-v4-pro">V4-Pro</option>
          </select>
        </div>
        <div class="chat-header-right">
          <a href="https://platform.deepseek.com/api_keys" target="_blank" class="chat-link-btn">获取 API Key</a>
          <button class="chat-settings-btn" @click="showSettings = !showSettings">⚙</button>
        </div>
      </div>

      <div v-if="showSettings" class="chat-settings">
        <input
          v-model="deepseekApiKey"
          type="password"
          placeholder="输入 DeepSeek API Key"
        />
        <button class="btn-primary btn-sm" @click="showSettings = false">保存</button>
      </div>

      <div class="chat-messages" ref="chatContainer">
        <div v-if="!chatMessages.length" class="chat-empty">
          <p>点击下方按钮对评论进行总结</p>
          <!-- <p class="chat-hint">可以让我总结评论、分析反馈等</p> -->
        </div>
        <div
          v-for="msg in chatMessages"
          :key="msg.id"
          :class="['chat-msg', msg.role]"
        >
          <div class="chat-msg-content" v-html="formatChatContent(msg.content)"></div>
        </div>
        <div v-if="chatLoading" class="chat-msg assistant">
          <div class="chat-msg-content">
            <div class="spinner spinner-sm"></div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <textarea
          v-show="false"
          v-model="chatInput"
          :placeholder="loading ? '评论加载中，请等待...' : '输入消息...'"
          :disabled="loading"
          rows="2"
          @keydown.enter.exact.prevent="sendChat"
        ></textarea>
        <button class="btn-primary" :disabled="loading || chatLoading || !allReplies.length" @click="sendChat">
          {{ chatLoading ? '总结中...' : '总结一下' }}
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { getReplyList } from './api/reply.js'
import { chat } from './api/deepseek.js'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (__) {}
    }
    try {
      return hljs.highlightAuto(code).value
    } catch (__) {}
  },
  breaks: true,
  gfm: true
})

const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"%3E%3Crect width="48" height="48" rx="24" fill="%23e0e0e0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="central" text-anchor="middle" font-size="20" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'

const form = reactive({
  levelId: '',
  sortType: 'SORT_TYPE_HOT',
  localSort: 'time',
  size: 20,
  region: 'cn_gf01',
  filter: 'all',
  hideDefault: false
})

const loading = ref(false)
const error = ref('')
const allReplies = ref([])
const cursor = reactive({ next: '', has_more: false, sort_type: 'SORT_TYPE_HOT' })

const viewPage = ref(1)
const viewPageSize = 10

const maxFloorId = computed(() => {
  if (!allReplies.value.length) return 0
  return Math.max(...allReplies.value.map(r => r.floor_id || 0))
})

const loadProgress = computed(() => {
  const total = maxFloorId.value
  if (!total) return 0
  return Math.min(100, Math.round((allReplies.value.length / total) * 100))
})

const DEFAULT_CONTENTS = [
  '非常优秀的奇域，推荐大家游玩~',
  '奇域仍有待打磨，期待作者的更新~'
]

const filteredReplies = computed(() => {
  let list = allReplies.value
  if (form.filter === 'recommend') list = list.filter(r => r.is_recommend)
  else if (form.filter === 'normal') list = list.filter(r => !r.is_recommend)
  if (form.hideDefault) list = list.filter(r => !DEFAULT_CONTENTS.includes(r.content?.trim()))
  return list
})

const sortedReplies = computed(() => {
  const list = [...filteredReplies.value]
  if (form.localSort === 'hot') {
    list.sort((a, b) => parseInt(b.reply_stat?.like_count || 0) - parseInt(a.reply_stat?.like_count || 0))
  } else if (form.localSort === 'time') {
    list.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
  }
  return list
})

const totalViewPages = computed(() => Math.ceil(sortedReplies.value.length / viewPageSize) || 1)

const pagedReplies = computed(() => {
  const start = (viewPage.value - 1) * viewPageSize
  return sortedReplies.value.slice(start, start + viewPageSize)
})

watch([() => form.filter, () => form.hideDefault, () => form.localSort], () => {
  viewPage.value = 1
})

function onAvatarError(e) {
  e.target.src = defaultAvatar
}

function formatContent(content) {
  if (!content) return ''
  return content.replace(/\n/g, '<br>')
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const expandedIdx = ref(-1)

function toggleSubReplies(idx) {
  expandedIdx.value = expandedIdx.value === idx ? -1 : idx
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchReplies() {
  if (!form.levelId.trim()) {
    error.value = '请输入关卡GUID'
    return
  }

  loading.value = true
  error.value = ''
  allReplies.value = []
  expandedIdx.value = -1
  cursor.next = ''
  cursor.has_more = false
  cursor.sort_type = form.sortType

  try {
    while (true) {
      const res = await getReplyList({
        levelId: form.levelId.trim(),
        region: form.region,
        cursor: {
          next: cursor.next,
          size: form.size,
          sortType: cursor.sort_type
        }
      })

      const data = res.data
      if (data.retcode !== 0) {
        error.value = `接口错误: ${data.message || '未知错误'} (code: ${data.retcode})`
        break
      }

      const replyList = data.data.reply_list || []
      allReplies.value = [...allReplies.value, ...replyList]

      if (data.data.cursor) {
        cursor.next = data.data.cursor.next || ''
        cursor.has_more = data.data.cursor.has_more || false
        cursor.sort_type = data.data.cursor.sort_type || form.sortType
      }

      if (!cursor.has_more) break

      await sleep(500)
    }
  } catch (err) {
    console.error('API Error:', err)
    error.value = `请求失败: ${err.message || '网络错误'}`
  } finally {
    loading.value = false
    viewPage.value = 1
  }
}

function resetAll() {
  allReplies.value = []
  cursor.next = ''
  cursor.has_more = false
  expandedIdx.value = -1
  error.value = ''
  viewPage.value = 1
}

// ============ Resizer ============

const rightWidth = ref(parseInt(localStorage.getItem('right_width')) || 340)

function applyRightWidth() {
  document.documentElement.style.setProperty('--right-width', rightWidth.value + 'px')
}

applyRightWidth()

function startResize(e) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = rightWidth.value
  const resizerEl = e.target

  resizerEl.classList.add('dragging')
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  function onMouseMove(ev) {
    const delta = startX - ev.clientX
    const newWidth = Math.min(600, Math.max(240, startWidth + delta))
    rightWidth.value = newWidth
    applyRightWidth()
  }

  function onMouseUp() {
    resizerEl.classList.remove('dragging')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem('right_width', rightWidth.value)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// ============ DeepSeek Chat ============

const deepseekApiKey = ref(localStorage.getItem('deepseek_api_key') || '')
const showSettings = ref(false)
const chatModel = ref(localStorage.getItem('chat_model') || 'deepseek-v4-flash')
const chatInput = ref('')
const chatMessages = ref([])
const chatLoading = ref(false)
const chatContainer = ref(null)
let chatIdCounter = 0

watch(deepseekApiKey, (val) => {
  localStorage.setItem('deepseek_api_key', val)
})

watch(chatModel, (val) => {
  localStorage.setItem('chat_model', val)
})

function formatChatContent(content) {
  if (!content) return ''
  return marked.parse(content)
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

async function sendChat() {
  // 发送内容临时固定为『总结一下』
  const input = '总结一下'
  if (chatLoading.value || loading.value || !allReplies.value.length) return

  if (!deepseekApiKey.value) {
    showSettings.value = true
    return
  }

  const userMsg = { id: ++chatIdCounter, role: 'user', content: input }
  chatMessages.value.push(userMsg)
  scrollToBottom()

  const commentData = allReplies.value.length
    ? allReplies.value
        .filter(r => !DEFAULT_CONTENTS.includes(r.content?.trim()))
        .map(r => `[${r.is_recommend ? '推荐' : '不推荐'}] ${r.content}`)
        .join('\n')
    : ''

  const systemPrompt = allReplies.value.length
    ? `你是一个评论分析助手。以下是来自《原神·千星奇域》中的某一个关卡评论数据，用户可能会让你总结、分析或回答关于这些评论的问题。\n\n---评论数据---\n${commentData}\n---评论数据结束---`
    : '你是一个评论分析助手。当前没有加载评论数据。'

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatMessages.value.map(m => ({ role: m.role, content: m.content }))
  ]

  chatLoading.value = true
  scrollToBottom()

  try {
    const res = await chat({
      apiKey: deepseekApiKey.value,
      model: chatModel.value,
      messages
    })

    const data = res.data
    if (data.error) {
      throw new Error(data.message)
    }

    const reply = data.choices?.[0]?.message?.content || '(空回复)'

    chatMessages.value.push({ id: ++chatIdCounter, role: 'assistant', content: reply })
  } catch (err) {
    chatMessages.value.push({
      id: ++chatIdCounter,
      role: 'assistant',
      content: `请求失败: ${err.message}`
    })
  } finally {
    chatLoading.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: 260px 1fr 6px var(--right-width, 340px);
  gap: 0;
  height: 100vh;
  padding: 16px;
  overflow: hidden;
}

.sidebar-left {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-right: 16px;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  text-align: center;
}

.center-content {
  overflow-y: auto;
  border-radius: 12px;
  margin-right: 6px;
}

.reply-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reply-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
}

.reply-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.reply-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background: #eee;
  flex-shrink: 0;
}

.avatar-sm {
  width: 32px;
  height: 32px;
}

.user-meta {
  flex: 1;
  min-width: 0;
}

.user-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nickname {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.nickname-sm {
  font-size: 13px;
}

.badge-recommend {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.badge-normal {
  background: #f0f0f0;
  color: #999;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.badge-owner {
  background: #5b8dee;
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.sub-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.dot {
  color: #ccc;
}

.reply-content {
  font-size: 15px;
  line-height: 1.7;
  color: #333;
  margin-bottom: 12px;
  word-break: break-word;
}

.reply-content-sm {
  font-size: 14px;
}

.reply-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.stat-tag {
  font-size: 13px;
  color: #888;
}

.toggle-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #5b8dee;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: #f0f4ff;
}

.sub-replies {
  margin-top: 12px;
  padding: 12px;
  background: #f9f9fc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-reply {
  display: flex;
  gap: 10px;
}

.sub-body {
  flex: 1;
  min-width: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  color: #888;
  gap: 16px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e0e0e0;
  border-top-color: #5b8dee;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.scroll-sentinel {
  display: flex;
  justify-content: center;
  padding: 20px 0 10px;
  min-height: 50px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px 0 10px;
}

.btn-page {
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: #fff;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-page:hover:not(:disabled) {
  border-color: #5b8dee;
  color: #5b8dee;
}

.btn-page:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
  min-width: 60px;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
  color: #aaa;
  gap: 10px;
}

.empty-icon {
  font-size: 48px;
}

/* Left sidebar controls */
.control-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-item label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.control-item input,
.control-item select {
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  background: #fff;
}

.control-item input:focus,
.control-item select:focus {
  border-color: #5b8dee;
}

.control-item input::placeholder {
  color: #bbb;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  white-space: nowrap;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #5b8dee;
}

.control-actions {
  display: flex;
  gap: 8px;
}

.btn-primary,
.btn-ghost {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  flex: 1;
}

.btn-primary {
  background: linear-gradient(135deg, #5b8dee, #6c5ce7);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(91, 141, 238, 0.35);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  flex: none;
}

.btn-ghost {
  background: transparent;
  color: #888;
  border: 1px solid #ddd;
}

.btn-ghost:hover {
  background: #f5f5f5;
}

.error-bar {
  padding: 10px 14px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  color: #cf1322;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-bar button {
  background: none;
  border: none;
  color: #cf1322;
  cursor: pointer;
  font-size: 16px;
}

.stats-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat {
  background: #f9f9fc;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 60px;
}

.stat-label {
  font-size: 11px;
  color: #888;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-top: 2px;
}

.stat-highlight .stat-value {
  color: #5b8dee;
}

/* Right sidebar chat */
.resizer {
  cursor: col-resize;
  background: transparent;
  position: relative;
  z-index: 10;
}

.resizer::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e0e0e0;
  border-radius: 1px;
  transition: background 0.2s;
}

.resizer:hover::after,
.resizer.dragging::after {
  background: #5b8dee;
}

.sidebar-right {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  gap: 8px;
  flex-wrap: wrap;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.chat-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.chat-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.chat-link-btn {
  font-size: 12px;
  color: #5b8dee;
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.chat-link-btn:hover {
  opacity: 0.8;
}

.chat-model-select {
  height: 28px;
  padding: 0 6px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #333;
  background: #f9f9fc;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.chat-model-select:focus {
  border-color: #5b8dee;
}

.chat-settings-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.chat-settings-btn:hover {
  color: #5b8dee;
}

.chat-settings {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
}

.chat-settings input {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.chat-settings input:focus {
  border-color: #5b8dee;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-empty {
  text-align: center;
  color: #aaa;
  padding: 40px 0;
  font-size: 14px;
}

.chat-hint {
  font-size: 12px;
  color: #ccc;
  margin-top: 4px;
}

.chat-msg {
  max-width: 90%;
}

.chat-msg.user {
  align-self: flex-end;
}

.chat-msg.assistant {
  align-self: flex-start;
}

.chat-msg.user .chat-msg-content {
  background: linear-gradient(135deg, #5b8dee, #6c5ce7);
  color: #fff;
  border-radius: 12px 12px 2px 12px;
}

.chat-msg.assistant .chat-msg-content {
  background: #f4f5f9;
  color: #333;
  border-radius: 12px 12px 12px 2px;
}

.chat-msg-content {
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.chat-msg-content :deep(h1),
.chat-msg-content :deep(h2),
.chat-msg-content :deep(h3),
.chat-msg-content :deep(h4) {
  margin: 8px 0 4px;
  font-weight: 600;
  line-height: 1.3;
}

.chat-msg-content :deep(h1) { font-size: 18px; }
.chat-msg-content :deep(h2) { font-size: 16px; }
.chat-msg-content :deep(h3) { font-size: 15px; }
.chat-msg-content :deep(h4) { font-size: 14px; }

.chat-msg-content :deep(p) {
  margin: 4px 0;
}

.chat-msg-content :deep(ul),
.chat-msg-content :deep(ol) {
  margin: 4px 0;
  padding-left: 20px;
}

.chat-msg-content :deep(li) {
  margin: 2px 0;
}

.chat-msg-content :deep(blockquote) {
  margin: 4px 0;
  padding: 4px 12px;
  border-left: 3px solid #ddd;
  color: #666;
  background: rgba(0,0,0,0.03);
  border-radius: 0 4px 4px 0;
}

.chat-msg-content :deep(code) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.chat-msg-content :deep(:not(pre) > code) {
  padding: 1px 5px;
  background: rgba(0,0,0,0.06);
  border-radius: 4px;
}

.chat-msg-content :deep(pre) {
  margin: 6px 0;
  padding: 10px 12px;
  background: #f6f8fa;
  border-radius: 8px;
  overflow-x: auto;
}

.chat-msg-content :deep(pre > code) {
  background: none;
  padding: 0;
  font-size: 13px;
  line-height: 1.5;
}

.chat-msg-content :deep(table) {
  border-collapse: collapse;
  margin: 6px 0;
  width: 100%;
  font-size: 13px;
}

.chat-msg-content :deep(th),
.chat-msg-content :deep(td) {
  border: 1px solid #e0e0e0;
  padding: 5px 10px;
  text-align: left;
}

.chat-msg-content :deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}

.chat-msg-content :deep(tr:nth-child(even)) {
  background: #fafafa;
}

.chat-msg-content :deep(a) {
  color: #5b8dee;
  text-decoration: none;
}

.chat-msg-content :deep(a:hover) {
  text-decoration: underline;
}

.chat-msg-content :deep(hr) {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 8px 0;
}

.chat-msg-content :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}

.chat-msg-content :deep(input[type="checkbox"]) {
  margin-right: 4px;
}

.chat-input-area {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input-area textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
}

.chat-input-area textarea:focus {
  border-color: #5b8dee;
}

/* Responsive: collapse to single column on narrow screens */
@media (max-width: 1100px) {
  .app-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto auto;
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }

  .sidebar-left {
    overflow-y: visible;
    margin-right: 0;
    margin-bottom: 16px;
  }

  .center-content {
    overflow-y: visible;
    margin-right: 0;
    margin-bottom: 16px;
  }

  .resizer {
    display: none;
  }

  .sidebar-right {
    height: 400px;
  }
}
</style>