import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './Dashboard.css'; // Reusing Dashboard styles

/**
 * PostListingForm Component
 *
 * This component provides a form for users to create and submit a new listing
 * for a clothing item. It handles input collection for item details,
 * image upload, and submission to the backend API, including fields for
 * phone number and contact email.
 *
 * @component
 * @param {string} email - The email of the currently logged-in user (used for authentication and default contact email).
 * @param {function} onClose - A function to call to close the form after successful submission or cancellation.
 * @returns {JSX.Element} The PostListingForm component.
 */
function PostListingForm({ email, onClose }) {
    const [title, setTitle] = useState('');
    /** @type {string} The title of the clothing item being listed. */

    const [size, setSize] = useState('S');
    /** @type {string} The size of the clothing item, selected from a dropdown. */

    const [itemType, setItemType] = useState('jeans');
    /** @type {string} The type of clothing item, selected from a dropdown. */

    const [condition, setCondition] = useState('');
    /** @type {string} The condition of the clothing item, selected from a dropdown. */

    const [washInstructions, setWashInstructions] = useState('');
    /** @type {string} Specific wash instructions for the item. */

    const [startDate, setStartDate] = useState(null);
    /** @type {Date | null} The date the item becomes available for rent. */

    const [endDate, setEndDate] = useState(null);
    /** @type {Date | null} The date the item is no longer available for rent. */

    const [pricePerDay, setPricePerDay] = useState('');
    /** @type {string} The price per day for renting the item. */

    const [totalPrice, setTotalPrice] = useState(0);
    /** @type {number} The calculated total price based on the selected rental period. */

    const [image, setImage] = useState(null);
    /** @type {File | null} The image file selected by the user. */

    const [message, setMessage] = useState('');
    /** @type {string} A message to display to the user (success or error). */

    const [isSubmitting, setIsSubmitting] = useState(false);
    /** @type {boolean} Indicates whether the form is currently being submitted. */

    const [previewUrl, setPreviewUrl] = useState('');
    /** @type {string} A URL for displaying a preview of the selected image. */

    const [phoneNumber, setPhoneNumber] = useState('');
    /** @type {string} The phone number of the user posting the listing. */

    const [contactEmail, setContactEmail] = useState(email);
    /** @type {string} The contact email of the user posting the listing (defaults to the logged-in user's email). */

    /**
     * Calculates the total price when the start date, end date, or price per day changes.
     * @effect
     * @dependency {startDate}
     * @dependency {endDate}
     * @dependency {pricePerDay}
     */
    useEffect(() => {
        if (startDate && endDate && pricePerDay) {
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            setTotalPrice(days * parseFloat(pricePerDay));
        } else {
            setTotalPrice(0);
        }
    }, [startDate, endDate, pricePerDay]);

    /**
     * Resets the message after a short delay.
     * @effect
     * @dependency {message}
     */
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    /**
     * Generates a preview URL for the selected image.
     * @effect
     * @dependency {image}
     */
    useEffect(() => {
        if (image) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(image);
        } else {
            setPreviewUrl('');
        }
    }, [image]);

    /**
     * Handles the form submission to post a new listing.
     * It prevents the default form submission, sets the submitting state,
     * validates required fields, prepares form data, and sends the data
     * to the backend API endpoint, including phone number and contact email.
     *
     * @async
     * @function handlePostListing
     * @param {React.FormEvent} e - The form submit event.
     * @returns {Promise<void>}
     */
    const handlePostListing = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        // Basic form validation
        if (!startDate || !endDate) {
            setMessage('Please select both start and end dates');
            setIsSubmitting(false);
            return;
        }

        if (!image) {
            setMessage('Please upload an image of your item');
            setIsSubmitting(false);
            return;
        }

        if (!pricePerDay || isNaN(parseFloat(pricePerDay)) || parseFloat(pricePerDay) <= 0) {
            setMessage('Please enter a valid price per day');
            setIsSubmitting(false);
            return;
        }

        if (!phoneNumber) {
            setMessage('Please enter your phone number');
            setIsSubmitting(false);
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('size', size);
        formData.append('itemType', itemType);
        formData.append('condition', condition);
        formData.append('washInstructions', washInstructions);
        formData.append('startDate', startDate.toISOString());
        formData.append('endDate', endDate.toISOString());
        formData.append('pricePerDay', pricePerDay);
        formData.append('totalPrice', totalPrice);
        if (image) formData.append('image', image);
        formData.append('phoneNumber', phoneNumber);
        formData.append('contactEmail', contactEmail);

        try {
            await axios.post('/listings', formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'user-id': email }
            });
            setMessage('✅ Listing posted successfully!');
            // Reset form after successful submission, including phone number and contact email
            setTitle('');
            setCondition('');
            setWashInstructions('');
            setStartDate(null);
            setEndDate(null);
            setPricePerDay('');
            setTotalPrice(0);
            setImage(null);
            setPreviewUrl('');
            setPhoneNumber('');
            setContactEmail(email);

            // Close form after a short delay to show success message.
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            setMessage('❌ Error posting listing: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="listing-form">
            <h3>Post a Clothing Listing</h3>

            <form onSubmit={handlePostListing}>
                <label>Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., Black Formal Dress"
                    required
                />

                <label>Size</label>
                <select value={size} onChange={(e) => setSize(e.target.value)}>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                </select>

                <label>Item Type</label>
                <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
                    <option value="jeans">Jeans</option>
                    <option value="dress">Dress</option>
                    <option value="skirt">Skirt</option>
                    <option value="pants">Pants</option>
                    <option value="sweater">Sweater</option>
                    <option value="shirt">Shirt</option>
                    <option value="jacket">Jacket</option>
                    <option value="blazer">Blazer</option>
                    <option value="formal">Formal Wear</option>
                    <option value="accessories">Accessories</option>
                    <option value="other">Other</option>
                </select>

                <label>Condition</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)} required>
                    <option value="">Select condition...</option>
                    <option value="New with tags">New with tags</option>
                    <option value="Like new">Like new</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                </select>

                <label>Wash Instructions</label>
                <input
                    type="text"
                    value={washInstructions}
                    onChange={(e) => setWashInstructions(e.target.value)}
                    placeholder="E.g., Machine wash cold"
                    required
                />

                <label>Available From</label>
                <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    minDate={new Date()}
                    placeholderText="Select start date"
                    className="date-input"
                />

                <label>Available Until</label>
                <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate || new Date()}
                    placeholderText="Select end date"
                    className="date-input"
                />

                <label>Price per day ($)</label>
                <input
                    type="number"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder="E.g., 4.99"
                    required
                />

                {totalPrice > 0 && (
                    <p className="total-price">
                        Total Price for {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1} days:
                        <span>${totalPrice.toFixed(2)}</span>
                    </p>
                )}

                <label>Upload Image</label>
                <div className="file-upload-container">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImage(e.target.files[0])}
                        className="file-input"
                    />

                    {previewUrl && (
                        <div className="image-preview">
                            <img src={previewUrl} alt="Preview" />
                        </div>
                    )}
                </div>

                <label>Phone Number</label>
                <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                />

                <label>Contact Email</label>
                <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Enter your contact email"
                    required
                    readOnly // Set to readOnly, assuming you want to use the logged-in user's email
                />

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={isSubmitting ? "submitting" : ""}
                >
                    {isSubmitting ? "Posting..." : "Post Listing"}
                </button>
            </form>

            {message && (
                <div className={`message ${message.startsWith('❌') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
        </div>
    );
}

export default PostListingForm;