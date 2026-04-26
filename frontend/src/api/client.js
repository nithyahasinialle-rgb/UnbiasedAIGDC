// src/api/client.js – Axios instance + API calls

import axios from 'axios'

const api = axios.create({
  baseURL: 'https://unbiasedaigdc.onrender.com/api',
  timeout: 120000,
})

// ---- Upload ----
export const uploadCSV = (file, onUploadProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

// ---- Audit ----
export const startAudit = (fileId, targetCol, protectedAttr) =>
  api.post('/audit', { file_id: fileId, target_col: targetCol, protected_attr: protectedAttr })

export const pollStatus = (jobId) => api.get(`/status/${jobId}`)

export const getResult = (jobId) => api.get(`/result/${jobId}`)

// ---- Mitigation ----
export const applyMitigation = (jobId, method) =>
  api.post('/mitigate', { job_id: jobId, method })

// ---- Report ----
export const generateReport = (jobId, mitigationMethod) =>
  api.post('/report', { job_id: jobId, mitigation_method: mitigationMethod })

// ---- Health ----
export const healthCheck = () => api.get('/health')

export const wakeUpBackend = () => api.get('/health').catch(() => {})

export default api