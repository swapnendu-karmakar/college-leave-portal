import { useState } from 'react';
import { uploadProof } from '../../services/supabase';
import { validateFileType } from '../../utils/validators';

const FileUpload = ({ applicationId, onUploadSuccess, onUploadError }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = validateFileType(file);
        if (!validation.valid) {
            onUploadError(validation.message);
            return;
        }

        setSelectedFile(file);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !applicationId) return;

        try {
            setUploading(true);
            const result = await uploadProof(selectedFile, applicationId);
            onUploadSuccess(result);
            setSelectedFile(null);
            setPreview(null);
        } catch (error) {
            console.error('Error uploading file:', error);
            onUploadError(error.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setSelectedFile(null);
        setPreview(null);
    };

    return (
        <div className="my-6">
            <div className="relative">
                <input
                    type="file"
                    id="file-input"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                />
                <label
                    htmlFor="file-input"
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-green-500 rounded-xl bg-green-50 cursor-pointer transition-all hover:bg-green-100 hover:border-green-600"
                >
                    <svg
                        className="w-12 h-12 text-green-500 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                    <span className="block text-center text-gray-700 font-semibold text-lg mb-2">
                        Choose File
                    </span>
                    <span className="block text-center text-gray-500 text-sm">
                        JPG, PNG, or PDF (Max 5MB)
                    </span>
                </label>
            </div>

            {selectedFile && (
                <div className="mt-6 p-6 border border-gray-200 rounded-xl bg-white">
                    {preview && (
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-w-full max-h-72 rounded-lg mb-4 object-contain"
                        />
                    )}
                    <div className="mb-4">
                        <p className="font-semibold text-gray-700 mb-1">{selectedFile.name}</p>
                        <p className="text-gray-500 text-sm">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold transition-all hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                        <button
                            onClick={handleRemove}
                            disabled={uploading}
                            className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold transition-all hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
