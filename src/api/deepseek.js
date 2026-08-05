import request from './index'

export function chat({ apiKey, model, messages, reasoningEffort = 'high', stream = false }) {
  return request.post('/api/deepseek/chat', {
    model,
    messages,
    reasoning_effort: reasoningEffort,
    stream
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })
}

export const MODELS = {
  V4_FLASH: 'deepseek-v4-flash',
  V4_PRO: 'deepseek-v4-pro'
}
