import React, { useState } from 'react';
import axios from 'axios';
import './PostListingForm.css';

function PostListingForm({ email, onClose }) {
  const [title, setTitle] = useState('');
  const [size, setSize] = useState('');
  const [itemType, setItemType] = useState('');
  const [condition, setCondition] = useState('');
  const [washInstructions, setWashInstructions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [image, setImage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactEmail, setContactEmail] = useState(email || '');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    calculateTotalPrice(e.target.value, endDate, pricePerDay);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    calculateTotalPrice(startDate, e.target.value, pricePerDay);
  };

  const handlePricePerDayChange = (e) => {
    const price = e.target.value;
    setPricePerDay(price);
    calculateTotalPrice(startDate, endDate, price);
  };

  const calculateTotalPrice = (start, end, price) => {
    if (start && end && price) {
      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      const timeDiff = Math.abs(endDateObj.getTime() - startDateObj.getTime());
      const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      setTotalPrice(days * parseFloat(price));
    } else {
      setTotalPrice(0);
    }
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadProgress(0);
    setUploadError('');
    setPostSuccess(false);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('size', size);
    formData.append('itemType', itemType);
    formData.append('condition', condition);
    formData.append('washInstructions', washInstructions);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('pricePerDay', pricePerDay);
    formData.append('totalPrice', totalPrice);
    formData.append('phoneNumber', phoneNumber);
    formData.append('contactEmail', contactEmail);
    if (image) {
      formData.append('image', image);
    }

    try {
      const response = await axios.post('/listings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'user-id': email,
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      console.log('Listing posted successfully:', response.data);
      setPostSuccess(true);
      // Reset form fields after successful submission
      setTitle('');
      setSize('');
      setItemType('');
      setCondition('');
      setWashInstructions('');
      setStartDate('');
      setEndDate('');
      setPricePerDay('');
      setTotalPrice(0);
      setImage(null);
      setPhoneNumber('');
      setContactEmail(email || '');
      setUploadProgress(0);
      setUploadError('');

      // Optionally close the form after a delay
      setTimeout(onClose, 1500);

    } catch (error) {
      console.error('Error posting listing:', error);
      setUploadError('Failed to upload listing. Please try again.');
      // Optionally display a more user-friendly error message
    }
  };

  return (
    <div className="post-listing-form">
      <h2>Post a New Listing</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="size">Size:</label>
          <input type="text" id="size" value={size} onChange={(e) => setSize(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="itemType">Item Type:</label>
          <input type="text" id="itemType" value={itemType} onChange={(e) => setItemType(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="condition">Condition:</label>
          <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)} required>
            <option value="">Select Condition</option>
            <option value="new">New</option>
            <option value="like new">Like New</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="washInstructions">Wash Instructions:</label>
          <textarea id="washInstructions" value={washInstructions} onChange={(e) => setWashInstructions(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="startDate">Start Date:</label>
          <input type="date" id="startDate" value={startDate} onChange={handleStartDateChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="endDate">End Date:</label>
          <input type="date" id="endDate" value={endDate} onChange={handleEndDateChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="pricePerDay">Price Per Day ($):</label>
          <input type="number" id="pricePerDay" value={pricePerDay} onChange={handlePricePerDayChange} required />
        </div>
        <div className="form-group">
          <label>Total Price ($):</label>
          <input type="text" value={totalPrice.toFixed(2)} readOnly />
        </div>
        <div className="form-group">
          <label htmlFor="image">Image Upload:</label>
          <input type="file" id="image" accept="image/*" onChange={handleImageChange} required />
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }}>
              {uploadProgress}%
            </div>
          )}
          {uploadError && <p className="error">{uploadError}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number:</label>
          <input type="tel" id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="contactEmail">Contact Email:</label>
          <input type="email" id="contactEmail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
        </div>
        <button type="submit" disabled={uploadProgress > 0 && uploadProgress < 100}>Post Listing</button>
        {postSuccess && <p className="success">Listing posted successfully!</p>}
      </form>
    </div>
  );
}

export default PostListingForm;