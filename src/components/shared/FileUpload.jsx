import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { uploadProof } from '../../services/supabase';
import { validateFileType } from '../../utils/validators';

const FileUpload = ({ applicationId, onUploadSuccess, onUploadError }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [previewType, setPreviewType] = useState(null); // 'image' or 'pdf'
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = validateFileType(file);
        if (!validation.valid) {
            onUploadError(validation.message);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedFile(file);

        // Create preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
                setPreviewType('image');
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
                setPreviewType('pdf');
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
            setPreviewType(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            setUploading(true);
            // If no applicationId is provided, sending null/undefined will cause uploadProof 
            // to use the temporary naming convention we implemented in supabase.js
            const result = await uploadProof(selectedFile, applicationId);
            onUploadSuccess(result);
            // Reset state after successful upload
            setSelectedFile(null);
            setPreview(null);
            setPreviewType(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
        setPreviewType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="w-full">
            <div className="relative group">
                <input
                    type="file"
                    id="file-input"
                    ref={fileInputRef}
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                />

                {!selectedFile ? (
                    <label
                        htmlFor="file-input"
                        className="flex flex-col items-center justify-center p-8 sm:p-10 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-2xl bg-purple-50 dark:bg-gray-800 cursor-pointer transition-all hover:bg-purple-100 dark:hover:bg-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md group-hover:scale-[1.01]"
                    >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:bg-purple-500 transition-colors">
                            <Upload className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
                        </div>
                        <span className="block text-center text-gray-800 dark:text-gray-200 font-bold text-lg mb-2">
                            Click to Upload Proof
                        </span>
                        <span className="block text-center text-gray-500 dark:text-gray-400 text-sm max-w-xs">
                            Supported formats: JPG, PNG, PDF (Max 5MB)
                        </span>
                    </label>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    {previewType === 'pdf' ? (
                                        <FileText className="w-4 h-4 text-purple-600" />
                                    ) : (
                                        <ImageIcon className="w-4 h-4 text-purple-600" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{selectedFile.name}</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <button
                                onClick={handleRemove}
                                disabled={uploading}
                                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Remove file"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Preview Area */}
                        <div className="bg-gray-100 flex items-center justify-center p-4 min-h-[200px] max-h-[400px] overflow-hidden">
                            {previewType === 'image' && (
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="max-w-full max-h-[300px] object-contain rounded-lg shadow-sm"
                                />
                            )}
                            {previewType === 'pdf' && (
                                <div className="w-full h-[300px] bg-white rounded-lg shadow-sm overflow-hidden">
                                    <iframe
                                        src={preview + '#toolbar=0&navpanes=0&scrollbar=0'}
                                        title="PDF Preview"
                                        className="w-full h-full"
                                    />
                                </div>
                            )}
                            {!previewType && (
                                <div className="flex flex-col items-center justify-center text-gray-400 py-10">
                                    <FileText className="w-16 h-16 mb-2" />
                                    <p>No preview available</p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 flex gap-3">
                            <button
                                onClick={handleRemove}
                                disabled={uploading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold transition-all hover:bg-gray-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                Remove
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold transition-all hover:bg-purple-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Upload File
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUpload;
