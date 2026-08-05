import axios from 'axios'

const request = axios.create({
  // baseURL: 'https://8.155.52.59',
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export function getReplyList({ levelId, cursor = {}, uid = '', region = 'cn_gf01' }) {
  return request.post('/api/reply/list', {
    uid,
    region,
    level_id: levelId,
    cursor: {
      next: cursor.next || '',
      size: cursor.size || 15,
      sort_type: cursor.sortType || 'SORT_TYPE_HOT'
    }
  })
}

export const SORT_TYPES = {
  HOT: 'SORT_TYPE_HOT',
  TIME: 'SORT_TYPE_FLOOR_DESC'
}

export const REGIONS = {
  cn_gf01: '国服',
  os_usa: '美服',
  os_europe: '欧服',
  os_asia: '亚服'
}