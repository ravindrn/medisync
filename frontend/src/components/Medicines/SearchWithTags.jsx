import React, { useState, useRef } from 'react';

const SearchWithTags = ({ onSearch, tags, setTags, selectedDistrict, setSelectedDistrict, districts }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // All 24 districts of Sri Lanka
  const allDistricts = [
    'Colombo', 'Gampaha', 'Kalutara', 
    'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 
    'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu',
    'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 
    'Anuradhapura', 'Polonnaruwa',
    'Badulla', 'Monaragala', 
    'Ratnapura', 'Kegalle'
  ];

  const districtList = districts && districts.length > 0 ? districts : allDistricts;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        if (selectedDistrict) {
          onSearch(newTags, selectedDistrict);
        }
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    if (selectedDistrict) {
      onSearch(newTags, selectedDistrict);
    }
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    if (tags.length > 0) {
      onSearch(tags, district);
    }
  };

  const handleSearch = () => {
    if (tags.length > 0 && selectedDistrict) {
      onSearch(tags, selectedDistrict);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <div style={{
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
        minHeight: '100px'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px'
        }}>
          {tags.map((tag, index) => (
            <div key={index} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '14px'
            }}>
              <span>{tag}</span>
              <span 
                onClick={() => removeTag(tag)} 
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </span>
            </div>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? "Type medicine name prefix and press Enter (e.g., 'amo', 'para')..." : "Add more tags..."}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              padding: '8px 0',
              width: '300px',
              color: '#000000',
              backgroundColor: 'transparent'
            }}
          />
        </div>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '8px'
        }}>
          💡 Tip: Type first few letters of medicine name (like 'amo', 'para', 'clop') and press Enter
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '500',
          color: '#374151',
          fontSize: '14px'
        }}>
          Select District *
        </label>
        <select
          value={selectedDistrict}
          onChange={(e) => handleDistrictChange(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: 'white',
            color: '#000000',
            cursor: 'pointer'
          }}
        >
          <option value="">-- Choose your district --</option>
          {districtList.map(district => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
      </div>

      <button 
        onClick={handleSearch}
        disabled={tags.length === 0 || !selectedDistrict}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: tags.length === 0 || !selectedDistrict ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: tags.length === 0 || !selectedDistrict ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        🔍 {tags.length === 0 ? 'Add search tags first' : !selectedDistrict ? 'Select district' : 'Search Medicines'}
      </button>
    </div>
  );
};

export default SearchWithTags;