import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { validateImageFile, createImagePreview, formatFileSize } from '../../utils/fileValidation';

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
  currentPreview?: string | null;
  maxSize?: number;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export const FileDropzone = ({
  onFileAccepted,
  currentPreview,
  maxSize = 5 * 1024 * 1024, // 5MB default
  label = 'Upload Image',
  helperText = 'Drag and drop an image here, or click to browse',
  disabled = false,
}: FileDropzoneProps) => {
  const [preview, setPreview] = useState<string | null>(currentPreview || null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      setIsProcessing(true);

      const file = acceptedFiles[0];
      if (!file) {
        setIsProcessing(false);
        return;
      }

      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        setIsProcessing(false);
        return;
      }

      try {
        // Create preview
        const previewUrl = await createImagePreview(file);
        setPreview(previewUrl);

        // Pass file to parent
        onFileAccepted(file);
      } catch (err) {
        setError('Failed to process image');
        console.error('Error processing image:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxSize,
    multiple: false,
    disabled: disabled || isProcessing,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          {label}
        </label>
      )}

      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${
            error
              ? '#ff6b6b'
              : isDragReject
              ? '#ff6b6b'
              : isDragActive
              ? 'var(--accent)'
              : 'var(--border)'
          }`,
          borderRadius: '12px',
          padding: preview ? '0' : '32px',
          textAlign: 'center',
          cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: isDragActive
            ? 'var(--background)'
            : preview
            ? 'transparent'
            : 'var(--surface)',
          position: 'relative',
          opacity: disabled || isProcessing ? 0.6 : 1,
        }}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div style={{ position: 'relative' }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                width: '100%',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '10px',
              }}
            />
            {!disabled && (
              <button
                onClick={handleRemove}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                }}
              >
                <X size={18} />
              </button>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(76, 175, 80, 0.9)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Check size={14} />
              Image selected
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '12px',
              }}
            >
              {isProcessing ? (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid var(--border)',
                    borderTop: '4px solid var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              ) : isDragReject || error ? (
                <AlertCircle size={48} color="#ff6b6b" />
              ) : (
                <Upload
                  size={48}
                  color={isDragActive ? 'var(--accent)' : 'var(--text-muted)'}
                />
              )}
            </div>

            {isProcessing ? (
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Processing...
              </p>
            ) : (
              <>
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isDragActive ? 'var(--accent)' : 'var(--text)',
                  }}
                >
                  {isDragReject
                    ? 'Invalid file type'
                    : isDragActive
                    ? 'Drop image here'
                    : helperText}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  PNG, JPG, GIF or WEBP (max {formatFileSize(maxSize)})
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} color="#ff6b6b" />
          <span style={{ fontSize: '13px', color: '#c33' }}>{error}</span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
