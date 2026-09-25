import React, { useState, useRef } from 'react';

export function UserAvatar({ avatarUrl, email, size = 'md' }) {
  const emailChar = email ? email.charAt(0).toUpperCase() : '?';

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  if (avatarUrl && avatarUrl.startsWith('http')) {
    return (
      <div className={`${selectedSize} rounded-2xl overflow-hidden shadow-md border border-[#224986]/10 flex items-center justify-center select-none bg-white`}>
        <img 
          src={avatarUrl} 
          alt="Profile" 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none'; // fallback on error
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${selectedSize} rounded-2xl bg-gradient-to-br from-[#224986] to-[#1e3c6d] flex items-center justify-center shadow-md select-none border border-[#224986]/10 font-black text-[#FBFBE2]`}>
      {emailChar}
    </div>
  );
}

export default function AvatarSelector({ currentAvatarId, userEmail, onSelect }) {
  const [updating, setUpdating] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit.');
      return;
    }

    setUpdating(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;

      try {
        const response = await fetch('http://localhost:5000/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            avatar_url: base64Data
          })
        });

        if (response.ok) {
          const data = await response.json();
          onSelect(data.avatar_url);
        } else {
          alert('Failed to save profile picture.');
        }
      } catch (err) {
        console.error('Upload error:', err);
        alert('Network upload error.');
      } finally {
        setUpdating(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    if (!updating && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex items-center gap-3 relative z-[100] group select-none">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={updating}
      />

      {/* Interactive Avatar Container */}
      <div 
        onClick={triggerFileSelect}
        className="relative cursor-pointer active:scale-95 transition-all duration-200 z-10"
        title="Upload photo from device gallery"
      >
        <UserAvatar avatarUrl={currentAvatarId} email={userEmail} size="md" />

        {/* Hover Camera Overlay & Loading Indicator */}
        <div className="absolute inset-0 bg-black/45 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          {updating ? (
            <div className="w-4 h-4 border-2 border-[#FBFBE2] border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="text-[10px] text-white">📷</span>
          )}
        </div>

        {/* Loading Spinner overlay when updating outside hover */}
        {updating && (
          <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center z-20">
            <div className="w-4 h-4 border-2 border-[#224986] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Info Tag - Positioned inside layout flow with high z-index */}
      <div 
        onClick={triggerFileSelect}
        className="flex flex-col items-start cursor-pointer hover:translate-x-0.5 transition-transform duration-200 z-10"
      >
        <span className="text-[10px] text-[#224986]/70 font-black uppercase tracking-wider hover:text-[#224986]">
          {updating ? 'Uploading...' : 'Change Photo'}
        </span>
        <span className="text-[7px] text-[#224986]/45 font-bold uppercase tracking-widest mt-0.5">
          From Gallery
        </span>
      </div>
    </div>
  );
}
