import { useEffect, useRef, useState } from 'react'
import { uploadPhoto, getPhotoUrl } from '../../api/client'

/**
 * PhotoUpload — file picker + thumbnail grid for a single profile.
 *
 * Props:
 *   profileId          (number)        — required; backend profile id
 *   initialPhotoPaths  (string[])      — paths returned by the backend (from
 *                                        ProfileOut.photo_paths)
 *   initialCaptions    (string[])      — matching photo_descriptions
 *   onUploaded         (ProfileOut)    — called with the updated ProfileOut
 *                                        so the parent can refresh state
 */
export default function PhotoUpload({
  profileId,
  initialPhotoPaths = [],
  initialCaptions = [],
  onUploaded,
}) {
  const [paths, setPaths]       = useState(initialPhotoPaths)
  const [captions, setCaptions] = useState(initialCaptions)
  const [urls, setUrls]         = useState({}) // path → presigned URL
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState(null)
  const inputRef = useRef(null)

  // Keep local state in sync if parent passes new initial arrays
  useEffect(() => { setPaths(initialPhotoPaths) }, [initialPhotoPaths])
  useEffect(() => { setCaptions(initialCaptions) }, [initialCaptions])

  // Resolve presigned URLs lazily for any path we haven't fetched yet.
  // Backend stores paths like "<profile_id>/<unique>-<filename>" — we strip
  // the prefix to get the filename the GET /photos/{filename} route expects.
  useEffect(() => {
    let cancelled = false
    paths.forEach(path => {
      if (urls[path]) return
      const filename = path.includes('/') ? path.split('/').slice(1).join('/') : path
      getPhotoUrl(profileId, filename)
        .then(url => { if (!cancelled) setUrls(prev => ({ ...prev, [path]: url })) })
        .catch(() => { /* ignore — thumbnail just stays as a placeholder */ })
    })
    return () => { cancelled = true }
  }, [paths, profileId, urls])

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const updated = await uploadPhoto(profileId, file)
      // Backend returns the full ProfileOut with refreshed photo arrays
      setPaths(updated.photo_paths || [])
      setCaptions(updated.photo_descriptions || [])
      onUploaded?.(updated)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Photo upload failed.')
    } finally {
      setUploading(false)
      // Reset the input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-text-secondary uppercase mb-1">
            Profile Photos
          </p>
          <p className="font-mono text-[10px] text-text-muted">
            Optional · adds visual context to your skills passport
          </p>
        </div>
        <label
          className={`px-4 py-2 border border-green/40 bg-green-faint text-green font-mono text-[11px] tracking-widest rounded cursor-pointer hover:bg-green-muted transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {uploading ? 'UPLOADING…' : '+ ADD PHOTO'}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <p className="font-mono text-xs text-red mb-3">{error}</p>
      )}

      {paths.length === 0 ? (
        <p className="font-mono text-[11px] text-text-muted italic">No photos uploaded.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {paths.map((path, i) => (
            <figure key={path} className="bg-raised border border-border rounded overflow-hidden flex flex-col">
              {urls[path] ? (
                <img
                  src={urls[path]}
                  alt={captions[i] || 'Profile photo'}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 animate-pulse bg-surface" />
              )}
              <figcaption className="p-2 font-mono text-[10px] text-text-secondary leading-snug">
                {captions[i] || 'No caption'}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
