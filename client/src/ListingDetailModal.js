import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import axios from 'axios';
import 'react-datepicker/dist/react-datepicker.css';
import './ListingDetailModal.css';

function ListingDetailModal({ listing, onClose, userEmail }) {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('initial');
  const [errorMessage, setErrorMessage] = useState('');
  const [squarePaymentForm, setSquarePaymentForm] = useState(null);
  const [cardButtonRendered, setCardButtonRendered] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');

  // Calculate available date range (from listing's startDate to endDate)
  const availableStartDate = new Date(listing.startDate);
  const availableEndDate = new Date(listing.endDate);
  const appId = process.env.REACT_APP_SQUARE_APP_ID;
  const locationId = process.env.REACT_APP_SQUARE_LOCATION_ID;

  // Calculate total price when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      setTotalPrice(days * parseFloat(listing.pricePerDay));
    } else {
      setTotalPrice(0);
    }
  }, [startDate, endDate, listing.pricePerDay]);

  // Initialize Square payment form
  useEffect(() => {
    if (window.Square && totalPrice > 0 && !cardButtonRendered) {
      initializeSquarePayment();
    }

    return () => {
      // Clean up Square payment form if it exists
      if (squarePaymentForm) {
        squarePaymentForm.destroy();
      }
    };
  }, [totalPrice, cardButtonRendered]);

  const initializeSquarePayment = async () => {
    try {
      if (!window.Square) {
        console.error('Square.js failed to load');
        return;
      }

      const payments = window.Square.payments(appId, locationId);
      const card = await payments.card();
      await card.attach('#card-container');

      setSquarePaymentForm(card);
      setCardButtonRendered(true);
    } catch (error) {
      console.error('Failed to initialize Square payment form:', error);
      setErrorMessage('Payment system initialization failed. Please try again later.');
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();

    // Update the validation to include pickup and dropoff locations
    if (!startDate || !endDate || !pickupLocation || !dropoffLocation) {
      setErrorMessage('Please select rental dates and specify pickup/drop-off locations.');
      return;
    }

    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      // Get a payment token from Square
      let result;
      try {
        result = await squarePaymentForm.tokenize();
        if (result.status !== 'OK') {
          throw new Error(result.errors?.[0]?.message || 'Tokenization failed');
        }
      } catch (err) {
        setPaymentStatus('error');
        setErrorMessage(err.message || 'Tokenization failed');
        return;
      }

      // Send the payment token to your server
      const response = await axios.post('/api/process-payment', {
        sourceId: result.token,
        amount: totalPrice,
        listingId: listing.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userEmail: userEmail,
        pickupLocation: pickupLocation, // Add pickup location to the request
        dropoffLocation: dropoffLocation // Add drop-off location to the request
      });

      if (response.data.success) {
        setPaymentStatus('success');
      } else {
        setPaymentStatus('error');
        setErrorMessage(response.data.message || 'Payment processing failed');
      }
    } catch (error) {
      setPaymentStatus('error');
      setErrorMessage(error.message || 'Payment processing failed');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>

        <div className="modal-grid">
          <div className="modal-image">
            <img src={listing.imageURL} alt={listing.title} />
          </div>

          <div className="modal-details">
            <h2>{listing.title}</h2>

            <div className="item-details">
              <p><strong>Size:</strong> {listing.size}</p>
              <p><strong>Type:</strong> {listing.itemType}</p>
              <p><strong>Condition:</strong> {listing.condition}</p>
              <p><strong>Wash Instructions:</strong> {listing.washInstructions}</p>
              <p><strong>Price:</strong> ${listing.pricePerDay}/day</p>
            </div>

            <div className="availability">
              <h3>Available for Rent</h3>
              <p>From {availableStartDate.toLocaleDateString()} to {availableEndDate.toLocaleDateString()}</p>
            </div>

            {/* Section to display the seller's contact information */}
            <div className="contact-info">
              <h3>Seller Contact Information</h3>
              {/* Display the phone number from the listing data */}
              <p><strong>Phone:</strong> {listing.phone_number}</p>
              {/* Display the contact email from the listing data */}
              <p><strong>Email:</strong> {listing.contact_email}</p>
            </div>

            {paymentStatus !== 'success' && (
              <form onSubmit={handlePayment} className="rental-form">
                <h3>Select Rental Period</h3>

                <div className="date-inputs">
                  <div>
                    <label>Start Date</label>
                    <DatePicker
                      selected={startDate}
                      onChange={date => setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      minDate={availableStartDate}
                      maxDate={availableEndDate}
                      placeholderText="Select start date"
                      className="date-input"
                    />
                  </div>

                  <div>
                    <label>End Date</label>
                    <DatePicker
                      selected={endDate}
                      onChange={date => setEndDate(date)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate || availableStartDate}
                      maxDate={availableEndDate}
                      placeholderText="Select end date"
                      className="date-input"
                    />
                  </div>
                </div>
                {/* Pickup and drop off location*/}
                <div>
                  <label htmlFor="pickupLocation">Pickup Location:</label>
                  <input
                    type="text"
                    id="pickupLocation"
                    className="date-input"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="dropoffLocation">Drop-off Location:</label>
                  <input
                    type="text"
                    id="dropoffLocation"
                    className="date-input"
                    value={dropoffLocation}
                    onChange={(e) => setDropoffLocation(e.target.value)}
                    required
                  />
                </div>

                {totalPrice > 0 && (
                  <div className="payment-section">
                    <div className="total-price-display">
                      <span>Total:</span>
                      <span className="price">${totalPrice.toFixed(2)}</span>
                      <span className="days">({Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1} days)</span>
                    </div>

                    <div className="payment-form">
                      <h3>Payment Details</h3>
                      <div id="card-container" className="square-card"></div>

                      <button
                        type="submit"
                        className="pay-button"
                        disabled={paymentStatus === 'processing' || !cardButtonRendered || !startDate || !endDate}
                      >
                        {paymentStatus === 'processing' ? 'Processing...' : 'Complete Rental'}
                      </button>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="error-message">
                    {errorMessage}
                  </div>
                )}
              </form>
            )}

            {paymentStatus === 'success' && (
              <div className="success-message">
                <h3>Rental Confirmed!</h3>
                <p>You've successfully rented this item from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}.</p>
                <p>A confirmation email has been sent to your inbox.</p>
                <button onClick={onClose} className="close-success-btn">Done</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListingDetailModal;