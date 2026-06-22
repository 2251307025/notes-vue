import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useTokenStore } from '@/stores/token.js'
import request from '@/util/request.js'

export const deleteMemory = () => request.delete('/chat')

// 根据提示词生成图片
export const generateImage = (prompt) => request.post('/chat/image', { userInput: prompt })

export function sendChatMessage(userInput, { onMessage, onError, onClose, onOpen }) {
  const tokenStore = useTokenStore()

  const ctrl = new AbortController()

  fetchEventSource('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': tokenStore.token,
    },
    body: JSON.stringify({ userInput }),
    signal: ctrl.signal,

    onopen: async (response) => {
      if (!response.ok) {
        onError?.(`请求失败 (${response.status})`)
        throw new Error(`HTTP ${response.status}`)
      }
      onOpen?.()
    },

    onmessage(event) {
      if (event.event === 'message') {
        onMessage?.(event.data)
      }
      if (event.event === 'error') {
        try {
          const err = JSON.parse(event.data)
          onError?.(err.error)
        } catch {
          onError?.(event.data)
        }
      }
    },

    onclose() {
      onClose?.()
    },

    onerror(err) {
      onError?.('连接失败，请稍后重试')
      return
    },
  })

  return ctrl
}
