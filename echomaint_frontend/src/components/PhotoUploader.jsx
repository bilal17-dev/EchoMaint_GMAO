import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './PhotoUploader.css'

const MAX_SIZE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

// canUpload : false si l'OT n'est pas en statut assignee ou en_cours (RG-PHOTO-01)
export default function PhotoUploader({ typePhoto, canUpload, onUpload }) {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError('')

    // Validation format (RG-PHOTO-02)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('photos.errorFormat'))
      return
    }

    // Validation taille (RG-PHOTO-01 — 5 Mo par fichier)
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(t('photos.errorSize'))
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!preview) return
    setUploading(true)
    setError('')

    // --- Mode mock (en attendant POST /interventions/:id/photos multipart) ---
    await new Promise(resolve => setTimeout(resolve, 800))
    setUploading(false)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (onUpload) onUpload({ type_photo: typePhoto, url: preview })

    // --- À activer une fois l'API prête ---
    // try {
    //   const formData = new FormData()
    //   formData.append('file', fileInputRef.current.files[0])
    //   formData.append('type_photo', typePhoto)
    //   await api.post(`/interventions/${interventionId}/photos`, formData, {
    //     headers: { 'Content-Type': 'multipart/form-data' }
    //   })
    //   onUpload()
    // } catch (err) {
    //   setError(err.response?.data?.message || t('common.error'))
    // } finally {
    //   setUploading(false)
    // }
  }

  const label = typePhoto === 'avant' ? t('photos.typeAvant') : t('photos.typeApres')

  if (!canUpload) {
    return (
      <div className="photo-uploader photo-uploader-blocked">
        <i className="ti ti-lock" aria-hidden="true" />
        <p>{t('photos.blockedStatus')}</p>
      </div>
    )
  }

  return (
    <div className="photo-uploader">
      <p className="photo-uploader-label">{label}</p>

      {!preview ? (
        <div
          className="photo-dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="ti ti-photo" aria-hidden="true" />
          <p>{t('photos.selectFile')}</p>
          <span>{t('photos.formats')}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="photo-preview">
          <img src={preview} alt="preview" />
          <div className="photo-preview-actions">
            <button
              className="btn-cancel"
              onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
            <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? t('photos.uploading') : t('common.upload')}
            </button>
          </div>
        </div>
      )}

      {error && <p className="photo-error">{error}</p>}
    </div>
  )
}