import React from 'react';

const ImageUploader = ({ onImageLoad }) => {
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => onImageLoad(img);
    img.src = URL.createObjectURL(file);
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
};

export default ImageUploader;
