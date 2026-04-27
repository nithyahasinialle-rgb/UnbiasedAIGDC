import axios from 'axios'

const BASE_URL = 'https://unbiasedai-production.up.railway.app/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
})

export const uploadCSV = (file, onUploadProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

export const startAudit = (fileId, targetCol, protectedAttr) =>
  api.post('/audit', { file_id: fileId, target_col: targetCol, protected_attr: protectedAttr })

export const pollStatus = (jobId) => api.get(`/status/${jobId}`)
export const getResult = (jobId) => api.get(`/result/${jobId}`)
export const applyMitigation = (jobId, method) =>
  api.post('/mitigate', { job_id: jobId, method })
export const generateReport = (jobId, mitigationMethod) =>
  api.post('/report', { job_id: jobId, mitigation_method: mitigationMethod })
export const healthCheck = () => api.get('/health')

export const wakeUpBackend = async () => {
  const res = await axios.get(`${BASE_URL}/health`, { timeout: 60000 })
  return res
}

export default api